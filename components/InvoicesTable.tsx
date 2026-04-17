import React, { useState, useEffect, useMemo, useRef } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';
import type { Invoice, InvoiceItem, RevenueEntry, ShopItem, ConsignmentItem } from '../types';
import { RevenueStatus, ConsignmentStatus } from '../types';
import { EditIcon, TrashIcon, PdfIcon, TrashIcon as ClearIcon, CameraIcon, SplitIcon } from './Icons';
import InvoiceModal from './InvoiceModal';
import SplitInvoiceModal from './SplitInvoiceModal';
import html2canvas from 'html2canvas';
import ImportModal from './ImportModal';
import { transformToInvoiceData } from '../utils/importer';
import { generateInvoicesTemplate } from '../utils/templateGenerator';
import { generateInvoicePDF } from '../utils/pdfGenerator';
import { generateUniqueId } from '../utils/helpers';
import { useAuditLog } from '../hooks/useAuditLog';

const initialData: Invoice[] = [];

const InvoicesTable = () => {
    const [invoices, setInvoices] = useLocalStorage<Invoice[]>('invoicesData', initialData);
    const [revenueData] = useLocalStorage<RevenueEntry[]>('revenueData', []);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
    const [activeTab, setActiveTab] = useState<RevenueStatus>(RevenueStatus.HOLDING);
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);
    const [splittingInvoice, setSplittingInvoice] = useState<Invoice | null>(null);

    const receiptRef = useRef<HTMLDivElement>(null);
    const [exportingInvoice, setExportingInvoice] = useState<Invoice | null>(null);

    const currentUserData = window.localStorage.getItem('currentUser');
    const currentUser = currentUserData ? JSON.parse(currentUserData) : null;
    const isAdmin = currentUser?.role === 'ADMIN';

    const logAction = useAuditLog();

    useEffect(() => {
        const handleStorageChange = () => {
            const latest = window.localStorage.getItem('invoicesData');
            if (latest) setInvoices(JSON.parse(latest));
            else setInvoices([]);
        };
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [setInvoices]);

    // Effect for image capture REMOVED

    const handleOpenModal = (invoice: Invoice | null = null) => {
        setEditingInvoice(invoice);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingInvoice(null);
    };

    const handleSave = (invoice: Invoice) => {
        if (editingInvoice) {
            logAction('HOA_DON', 'Cập nhật hóa đơn', `Khách: ${invoice.customerName}`);
            setInvoices(prev => prev.map(i => i.id === invoice.id ? invoice : i));
        } else {
            logAction('HOA_DON', 'Tạo hóa đơn', `Khách: ${invoice.customerName}`);
            setInvoices(prev => [...prev, invoice]);
        }
        handleCloseModal();
    };

    const handleOpenSplitModal = (invoice: Invoice) => {
        // Quick check
        const totalItemsCount = invoice.items.reduce((s, i) => s + i.quantity, 0);
        if (totalItemsCount <= 1) {
            alert("Hóa đơn chỉ có 1 sản phẩm duy nhất, không thể tách thêm được!");
            return;
        }
        setSplittingInvoice(invoice);
        setIsSplitModalOpen(true);
    };

    const handleCloseSplitModal = () => {
        setIsSplitModalOpen(false);
        setSplittingInvoice(null);
    };

    const handleSplitSave = (updatedOriginal: Invoice, newInvoice: Invoice) => {
        logAction('HOA_DON', 'Tách hóa đơn', `Từ ${updatedOriginal.customerName} sang ${newInvoice.customerName}`);
        let revenueUpdated = false;
        const revenueDataRaw = window.localStorage.getItem('revenueData');
        let revenueEntries: RevenueEntry[] = revenueDataRaw ? JSON.parse(revenueDataRaw) : [];

        newInvoice.items.forEach((item, index) => {
            if (item.revenueEntryId) {
                const revIdx = revenueEntries.findIndex(re => re.id === item.revenueEntryId);
                if (revIdx !== -1) {
                    const origRev = revenueEntries[revIdx];
                    
                    // Did reducing the quantity mean we split it, or moved it completely?
                    const origStillHasIt = updatedOriginal.items.some(oi => oi.revenueEntryId === item.revenueEntryId);

                    if (origStillHasIt) {
                        // The item was partially split (Quantity > 1). Create a discrete RevenueEntry!
                        const newRevId = generateUniqueId();
                        newInvoice.items[index].revenueEntryId = newRevId; // Hook new ID
                        
                        const splitRevEntry: RevenueEntry = {
                            ...origRev,
                            id: newRevId,
                            customerName: newInvoice.customerName,
                            quantity: item.quantity
                        };
                        revenueEntries.push(splitRevEntry);
                        
                        origRev.quantity -= item.quantity;
                        revenueUpdated = true;
                    } else {
                        // The entire item was moved to the new invoice. Just rename its customer.
                        origRev.customerName = newInvoice.customerName;
                        revenueUpdated = true;
                    }
                }
            }
        });

        if (revenueUpdated) {
            window.localStorage.setItem('revenueData', JSON.stringify(revenueEntries));
        }

        setInvoices(prev => {
            const result = [...prev];
            const origIdx = result.findIndex(i => i.id === updatedOriginal.id);
            if (origIdx !== -1) {
                result[origIdx] = updatedOriginal;
            }
            result.push(newInvoice);
            return result;
        });

        if (revenueUpdated) {
            setTimeout(() => window.dispatchEvent(new Event('storage')), 100);
        }

        handleCloseSplitModal();
        alert("Đã tách phần sản phẩm được chọn sang 1 Hóa Đơn mới!");
    };

    const handleDelete = (id: string) => {
        if (!isAdmin) {
            alert('Bạn không có quyền thực hiện chức năng xóa!');
            return;
        }
        const invoice = invoices.find(i => i.id === id);
        if (invoice && window.confirm('Bạn có chắc chắn muốn xóa hóa đơn này?\nKho hàng sẽ được cộng lại số lượng tương ứng.')) {
            logAction('HOA_DON', 'Xóa hóa đơn', `Khách: ${invoice.customerName}`);
            // Revert Stock
            try {
                const shopDataRaw = window.localStorage.getItem('shopInventoryData');
                const consDataRaw = window.localStorage.getItem('consignmentData');
                let shopData: ShopItem[] = shopDataRaw ? JSON.parse(shopDataRaw) : [];
                let consData: ConsignmentItem[] = consDataRaw ? JSON.parse(consDataRaw) : [];
                let shopChanged = false;
                let consChanged = false;

                invoice.items.forEach(item => {
                    if (item.shopItemId) {
                        const shopItemIdx = shopData.findIndex(s => s.id === item.shopItemId);
                        if (shopItemIdx !== -1) {
                            shopData[shopItemIdx].quantity += item.quantity;
                            shopChanged = true;
                        }
                    } else if (item.consignmentItemId) {
                        const conIdx = consData.findIndex(c => c.id === item.consignmentItemId);
                        if (conIdx !== -1) {
                            consData[conIdx].quantity += item.quantity;
                            if ((consData[conIdx].status === ConsignmentStatus.DEPOSITED || consData[conIdx].status === ConsignmentStatus.SOLD) && consData[conIdx].quantity > 0) {
                                consData[conIdx].status = ConsignmentStatus.IN_STOCK;
                            }
                            consChanged = true;
                        }
                    }
                });
                
                if (shopChanged) window.localStorage.setItem('shopInventoryData', JSON.stringify(shopData));
                if (consChanged) window.localStorage.setItem('consignmentData', JSON.stringify(consData));
                if (shopChanged || consChanged) window.dispatchEvent(new Event('storage'));
            } catch (e) {
                console.error("Lỗi hoàn kho:", e);
            }
            setInvoices(prev => prev.filter(i => i.id !== id));
            setSelectedIds(prev => prev.filter(selId => selId !== id));
        }
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === filteredInvoices.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredInvoices.map(i => i.id));
        }
    };

    const toggleSelectOne = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (selectedIds.includes(id)) {
            setSelectedIds(prev => prev.filter(i => i !== id));
        } else {
            setSelectedIds(prev => [...prev, id]);
        }
    };

    const handleBulkDelete = () => {
        if (!isAdmin) {
            alert('Bạn không có quyền thực hiện chức năng xóa!');
            return;
        }
        if (window.confirm(`Bạn có chắc muốn xóa ${selectedIds.length} hóa đơn đã chọn?\nKho hàng sẽ được cộng lại số lượng tương ứng.`)) {
            logAction('HOA_DON', 'Xóa hàng loạt', `SLL: ${selectedIds.length}`);
            // Revert Stock loop
            try {
                const shopDataRaw = window.localStorage.getItem('shopInventoryData');
                const consDataRaw = window.localStorage.getItem('consignmentData');
                let shopData: ShopItem[] = shopDataRaw ? JSON.parse(shopDataRaw) : [];
                let consData: ConsignmentItem[] = consDataRaw ? JSON.parse(consDataRaw) : [];
                let shopChanged = false;
                let consChanged = false;

                selectedIds.forEach(id => {
                    const invoice = invoices.find(i => i.id === id);
                    if (invoice) {
                        invoice.items.forEach(item => {
                            if (item.shopItemId) {
                                const shopItemIdx = shopData.findIndex(s => s.id === item.shopItemId);
                                if (shopItemIdx !== -1) {
                                    shopData[shopItemIdx].quantity += item.quantity;
                                    shopChanged = true;
                                }
                            } else if (item.consignmentItemId) {
                                const conIdx = consData.findIndex(c => c.id === item.consignmentItemId);
                                if (conIdx !== -1) {
                                    consData[conIdx].quantity += item.quantity;
                                    if ((consData[conIdx].status === ConsignmentStatus.DEPOSITED || consData[conIdx].status === ConsignmentStatus.SOLD) && consData[conIdx].quantity > 0) {
                                        consData[conIdx].status = ConsignmentStatus.IN_STOCK;
                                    }
                                    consChanged = true;
                                }
                            }
                        });
                    }
                });

                if (shopChanged) window.localStorage.setItem('shopInventoryData', JSON.stringify(shopData));
                if (consChanged) window.localStorage.setItem('consignmentData', JSON.stringify(consData));
                if (shopChanged || consChanged) window.dispatchEvent(new Event('storage'));
            } catch (e) {
                console.error("Lỗi hoàn kho bulk:", e);
            }

            setInvoices(prev => prev.filter(i => !selectedIds.includes(i.id)));
            setSelectedIds([]);
        }
    };

    const handleBulkStatusChange = (newStatus: RevenueStatus) => {
        if (selectedIds.length === 0) return;

        const confirmMsg = `Bạn có chắc muốn đổi trạng thái cho ${selectedIds.length} hóa đơn đã chọn sang "${newStatus}"?`;

        if (window.confirm(confirmMsg)) {
            logAction('HOA_DON', 'Đổi trạng thái hóa đơn hàng loạt', `${selectedIds.length} hóa đơn -> ${newStatus}`);
            const updatedInvoices = [...invoices];
            const revenueDataRaw = window.localStorage.getItem('revenueData');
            let revenueEntries: RevenueEntry[] = revenueDataRaw ? JSON.parse(revenueDataRaw) : [];
            let revenueChanged = false;

            const shopDataRaw = window.localStorage.getItem('shopInventoryData');
            const consDataRaw = window.localStorage.getItem('consignmentData');
            let shopData: ShopItem[] = shopDataRaw ? JSON.parse(shopDataRaw) : [];
            let consData: ConsignmentItem[] = consDataRaw ? JSON.parse(consDataRaw) : [];
            let shopChanged = false;
            let consChanged = false;

            selectedIds.forEach(id => {
                const invIdx = updatedInvoices.findIndex(inv => inv.id === id);
                if (invIdx !== -1) {
                    const invoice = updatedInvoices[invIdx];

                    // Update all items in this invoice
                    const updatedItems = invoice.items.map(item => {
                        // Handle Inventory Reversal if status becomes RETURNED
                        if (newStatus === RevenueStatus.RETURNED && item.status !== RevenueStatus.RETURNED) {
                            if (item.shopItemId) {
                                const shopIdx = shopData.findIndex(s => s.id === item.shopItemId);
                                if (shopIdx !== -1) {
                                    shopData[shopIdx].quantity += item.quantity;
                                    shopChanged = true;
                                }
                            } else if (item.consignmentItemId) {
                                const conIdx = consData.findIndex(c => c.id === item.consignmentItemId);
                                if (conIdx !== -1) {
                                    consData[conIdx].quantity += item.quantity;
                                    if ((consData[conIdx].status === ConsignmentStatus.DEPOSITED || consData[conIdx].status === ConsignmentStatus.SOLD) && consData[conIdx].quantity > 0) {
                                        consData[conIdx].status = ConsignmentStatus.IN_STOCK;
                                    }
                                    consChanged = true;
                                }
                            }
                        } else if (newStatus !== RevenueStatus.RETURNED && item.consignmentItemId) {
                            const conIdx = consData.findIndex(c => c.id === item.consignmentItemId);
                            if (conIdx !== -1) {
                                consData[conIdx].status = newStatus === RevenueStatus.DELIVERED ? ConsignmentStatus.SOLD : ConsignmentStatus.DEPOSITED;
                                consChanged = true;
                            }
                        }

                        // Sync back to Revenue
                        let currentRevenueEntryId = item.revenueEntryId;
                        if (currentRevenueEntryId) {
                            const revIdx = revenueEntries.findIndex(re => re.id === currentRevenueEntryId);
                            if (revIdx !== -1) {
                                revenueEntries[revIdx].status = newStatus;
                                revenueChanged = true;
                            }
                        } else if (newStatus === RevenueStatus.SHIPPING || newStatus === RevenueStatus.DELIVERED) {
                            let costPrice = 0;
                            let consignor = '';
                            
                            if (item.shopItemId) {
                                const shopIdx = shopData.findIndex(s => s.id === item.shopItemId);
                                if (shopIdx !== -1) costPrice = shopData[shopIdx].importPrice;
                            } else if (item.consignmentItemId) {
                                const conIdx = consData.findIndex(c => c.id === item.consignmentItemId);
                                if (conIdx !== -1) {
                                    costPrice = consData[conIdx].consignmentPrice;
                                    consignor = consData[conIdx].customerName;
                                }
                            }

                            currentRevenueEntryId = generateUniqueId();
                            const newRevEntry: RevenueEntry = {
                                id: currentRevenueEntryId,
                                date: new Date().toISOString().slice(0, 10),
                                customerName: invoice.customerName,
                                productName: item.productName,
                                costPrice: costPrice,
                                retailPrice: item.sellingPrice,
                                quantity: item.quantity,
                                status: newStatus,
                                shopItemId: item.shopItemId,
                                consignmentItemId: item.consignmentItemId,
                                consignor: consignor || undefined
                            };
                            revenueEntries.push(newRevEntry);
                            revenueChanged = true;
                        }

                        return { ...item, status: newStatus, revenueEntryId: currentRevenueEntryId };
                    });

                    updatedInvoices[invIdx] = { ...invoice, items: updatedItems };
                }
            });

            if (revenueChanged) {
                window.localStorage.setItem('revenueData', JSON.stringify(revenueEntries));
            }
            if (shopChanged) {
                window.localStorage.setItem('shopInventoryData', JSON.stringify(shopData));
            }
            if (consChanged) {
                window.localStorage.setItem('consignmentData', JSON.stringify(consData));
            }
            if (revenueChanged || shopChanged || consChanged) {
                window.dispatchEvent(new Event('storage'));
            }

            setInvoices(updatedInvoices);
            setSelectedIds([]);
            alert(`Đã cập nhật trạng thái cho ${selectedIds.length} hóa đơn.`);
        }
    };

    const handleClearAll = () => {
        if (!isAdmin) {
             alert('Bạn không có quyền thực hiện chức năng xóa!');
             return;
        }
        if (window.confirm('CẢNH BÁO: BẠN SẼ XÓA TOÀN BỘ HÓA ĐƠN. HÀNH ĐỘNG NÀY KHÔNG THỂ KHÔI PHỤC!')) {
            logAction('HOA_DON', 'Xóa TOÀN BỘ hóa đơn', '');
            setInvoices([]);
        }
    };

    const handleResetFilters = () => {
        setSearchTerm('');
        setStartDate('');
        setEndDate('');
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    const filteredInvoices = useMemo(() => {
        let processedInvoices = invoices.map(inv => {
            const itemsInTab = inv.items.filter(item => item.status === activeTab);
            return {
                ...inv,
                items: itemsInTab
            };
        }).filter(inv => inv.items.length > 0);

        // Date filter logic: Find customers who had transactions in the date range from revenue data.
        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);

            const customersInDateRange = new Set(
                revenueData
                    .filter(entry => {
                        if (!entry.date) return false;
                        const entryDate = new Date(entry.date);
                        return entryDate >= start && entryDate <= end;
                    })
                    .map(entry => entry.customerName)
            );

            processedInvoices = processedInvoices.filter(inv => customersInDateRange.has(inv.customerName));
        }

        // Search filter
        if (searchTerm.trim() !== '') {
            const lowercasedFilter = searchTerm.toLowerCase();
            processedInvoices = processedInvoices.filter(invoice => {
                const customerMatch = invoice.customerName.toLowerCase().includes(lowercasedFilter);
                const productMatch = invoice.items.some(item =>
                    item.productName.toLowerCase().includes(lowercasedFilter)
                );
                return customerMatch || productMatch;
            });
        }

        return processedInvoices;
    }, [invoices, activeTab, searchTerm, startDate, endDate, revenueData]);

    const handleExportInvoicePdf = (invoice: Invoice) => {
        generateInvoicePDF(invoice);
    };

    const handleExportInvoiceImage = async (invoice: Invoice) => {
        setExportingInvoice(invoice);
        // Wait for React to render the hidden DOM element
        setTimeout(async () => {
            if (receiptRef.current) {
                try {
                    const canvas = await html2canvas(receiptRef.current, { scale: 3, useCORS: true, backgroundColor: null });
                    canvas.toBlob(blob => {
                        if (blob) {
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `Bill_${invoice.customerName.replace(/\s+/g, '_')}.png`;
                            a.click();
                            window.URL.revokeObjectURL(url);
                            
                            // Try copying to clipboard for quick paste to Zalo
                            try {
                                const item = new (window as any).ClipboardItem({ "image/png": blob });
                                navigator.clipboard.write([item]).then(() => {
                                    alert('Đã Tải Ảnh hóa đơn và Copy Ảnh!\nBạn có thể nhấn Ctrl+V (Dán) thẳng vào đoạn Chat Zalo để gửi ngay.');
                                }).catch(() => {
                                    alert('Đã tải Ảnh hóa đơn thành công! (Không dán tự động được, bạn gửi file ảnh nhé)');
                                });
                            } catch (e) {
                                alert('Đã tải Ảnh hóa đơn thành công! Hãy mở thư mục Tải xuống để gửi cho khách.');
                            }
                        }
                    }, 'image/png');
                } catch (err) {
                    console.error("Lỗi xuất ảnh:", err);
                    alert("Không thể tạo ảnh hóa đơn.");
                }
                setExportingInvoice(null);
            }
        }, 500); // 500ms allows the DOM to comfortably mount
    };

    const getTabColor = (status: RevenueStatus) => {
        switch (status) {
            case RevenueStatus.HOLDING: return 'border-primary text-primary';
            case RevenueStatus.SHIPPING: return 'border-green-600 text-green-700';
            case RevenueStatus.DELIVERED: return 'border-yellow-500 text-yellow-600';
            case RevenueStatus.RETURNED: return 'border-gray-500 text-gray-600';
            default: return 'border-transparent text-gray-500';
        }
    };

    const canModify = activeTab === RevenueStatus.HOLDING;

    return (
        <div className="bg-white p-6 rounded-lg shadow-lg">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-bold text-gray-800">Quản lý Hóa đơn</h2>
                    <button onClick={handleClearAll} className="text-red-500 hover:text-red-700 text-sm flex items-center gap-1 font-medium bg-red-50 px-2 py-1 rounded">
                        <ClearIcon className="w-3 h-3" /> Clear HĐ
                    </button>
                </div>
                <div className="flex items-center gap-2">
                    {selectedIds.length > 0 && (
                        <div className="flex items-center gap-2 bg-blue-50 p-1 rounded-lg border border-blue-200">
                            <span className="text-[10px] font-black text-blue-600 px-2 uppercase line-clamp-1">Đổi {selectedIds.length} HĐ:</span>
                            <button onClick={() => handleBulkStatusChange(RevenueStatus.HOLDING)} className="text-[9px] font-bold bg-white text-gray-700 px-2 py-1 rounded border border-gray-200 hover:bg-gray-50 uppercase shadow-sm whitespace-nowrap">Dồn đơn</button>
                            <button onClick={() => handleBulkStatusChange(RevenueStatus.SHIPPING)} className="text-[9px] font-bold bg-white text-green-700 px-2 py-1 rounded border border-green-200 hover:bg-green-50 uppercase shadow-sm whitespace-nowrap">Đang đi</button>
                            <button onClick={() => handleBulkStatusChange(RevenueStatus.DELIVERED)} className="text-[9px] font-bold bg-white text-yellow-700 px-2 py-1 rounded border border-yellow-200 hover:bg-yellow-50 uppercase shadow-sm whitespace-nowrap">Hoàn thành</button>
                            <button onClick={() => handleBulkStatusChange(RevenueStatus.RETURNED)} className="text-[9px] font-bold bg-white text-red-700 px-2 py-1 rounded border border-red-200 hover:bg-red-50 uppercase shadow-sm whitespace-nowrap">Hoàn/Trả</button>
                            <button onClick={() => setSelectedIds([])} className="ml-1 text-[10px] font-bold text-gray-400 hover:text-gray-600 uppercase underline">Hủy</button>
                        </div>
                    )}
                    {selectedIds.length > 0 && isAdmin && (
                        <button onClick={handleBulkDelete} className="bg-red-50 text-red-600 px-4 py-2 rounded-md border border-red-200 hover:bg-red-100 transition-colors shadow-sm font-bold text-sm flex items-center gap-2">
                            <TrashIcon className="w-5 h-5" /> Xóa ({selectedIds.length})
                        </button>
                    )}
                    <button onClick={() => setIsImportModalOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors">Nhập Excel</button>
                    <button onClick={() => handleOpenModal()} className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-700 transition-colors">Tạo Hóa Đơn</button>
                </div>
            </div>

            <div className="flex border-b mb-6 overflow-x-auto">
                <button
                    onClick={() => setActiveTab(RevenueStatus.HOLDING)}
                    className={`py-3 px-6 font-bold text-sm transition-all border-b-2 whitespace-nowrap ${activeTab === RevenueStatus.HOLDING ? getTabColor(RevenueStatus.HOLDING) : 'border-transparent text-gray-400'}`}
                >
                    Dồn Đơn
                </button>
                <button
                    onClick={() => setActiveTab(RevenueStatus.SHIPPING)}
                    className={`py-3 px-6 font-bold text-sm transition-all border-b-2 whitespace-nowrap ${activeTab === RevenueStatus.SHIPPING ? getTabColor(RevenueStatus.SHIPPING) : 'border-transparent text-gray-400'}`}
                >
                    Đang Giao
                </button>
                <button
                    onClick={() => setActiveTab(RevenueStatus.DELIVERED)}
                    className={`py-3 px-6 font-bold text-sm transition-all border-b-2 whitespace-nowrap ${activeTab === RevenueStatus.DELIVERED ? getTabColor(RevenueStatus.DELIVERED) : 'border-transparent text-gray-400'}`}
                >
                    Đã Hoàn Thành
                </button>
                <button
                    onClick={() => setActiveTab(RevenueStatus.RETURNED)}
                    className={`py-3 px-6 font-bold text-sm transition-all border-b-2 whitespace-nowrap ${activeTab === RevenueStatus.RETURNED ? getTabColor(RevenueStatus.RETURNED) : 'border-transparent text-gray-400'}`}
                >
                    Đã Hoàn/Trả
                </button>
            </div>

            {/* Filter Section */}
            <div className="mb-6 bg-gray-50 p-4 rounded-xl border border-gray-100 flex flex-col md:flex-row gap-4 items-center">
                <div className="w-full md:flex-1">
                    <input
                        type="text"
                        placeholder="Tìm theo tên khách hoặc sản phẩm..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-4 py-2 rounded-lg border-gray-200 focus:ring-primary focus:border-primary text-sm"
                    />
                </div>
                <div className="w-full md:w-auto flex gap-2 items-center text-sm">
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="px-3 py-2 rounded-lg border-gray-200 focus:ring-primary focus:border-primary text-xs"
                    />
                    <span className="text-gray-400 font-bold">-</span>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="px-3 py-2 rounded-lg border-gray-200 focus:ring-primary focus:border-primary text-xs"
                    />
                </div>
                <button onClick={handleResetFilters} className="text-xs font-bold text-gray-500 hover:text-primary p-2 rounded-lg">Reset</button>
                <div className="flex items-center ml-4 gap-2">
                    <input
                        type="checkbox"
                        checked={filteredInvoices.length > 0 && selectedIds.length === filteredInvoices.length}
                        onChange={toggleSelectAll}
                        id="selectAllInvoices"
                        className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                    />
                    <label htmlFor="selectAllInvoices" className="text-sm font-bold text-gray-700 cursor-pointer select-none">Chọn Tất Cả</label>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredInvoices.length > 0 ? filteredInvoices.map((invoice) => {
                    const baseTotal = invoice.items.reduce((sum, item) => sum + item.sellingPrice * item.quantity, 0);
                    const shippingFee = invoice.shippingFee || 0;
                    const discount = invoice.discount || 0;
                    const totalPrice = baseTotal - discount + shippingFee;
                    const isSelected = selectedIds.includes(invoice.id);
                    return (
                        <div key={invoice.id} onClick={(e) => toggleSelectOne(invoice.id, e)} className={`border rounded-2xl p-5 shadow-sm transition-all hover:shadow-md cursor-pointer ${isSelected ? 'ring-2 ring-primary bg-blue-50/20' : ''} ${activeTab === RevenueStatus.HOLDING ? 'bg-white border-gray-100' : activeTab === RevenueStatus.SHIPPING ? 'bg-green-50/30 border-green-100' : 'bg-yellow-50/30 border-yellow-100'}`}>
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-start gap-3">
                                    <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={(e) => toggleSelectOne(invoice.id, e)}
                                        className="mt-1 rounded border-gray-300 text-primary focus:ring-primary"
                                    />
                                    <div>
                                        <h3 className="font-black text-gray-400 uppercase text-[10px] tracking-widest mb-1">Khách hàng</h3>
                                        <p className="font-bold text-lg text-gray-900 leading-tight">{invoice.customerName}</p>
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => handleExportInvoicePdf(invoice)}
                                        className="p-1.5 text-green-600 hover:bg-white rounded-lg shadow-sm border border-transparent hover:border-green-100"
                                        title="Xuất File PDF"
                                    >
                                        <PdfIcon />
                                    </button>
                                    <button
                                        onClick={() => handleExportInvoiceImage(invoice)}
                                        className="p-1.5 text-purple-600 hover:bg-white rounded-lg shadow-sm border border-transparent hover:border-purple-100"
                                        title="Lưu Ảnh Hóa Đơn (Gửi Zalo)"
                                    >
                                        <CameraIcon />
                                    </button>

                                    {canModify && (
                                        <>
                                            <button
                                                onClick={() => handleOpenSplitModal(invoice)}
                                                className="p-1.5 text-blue-600 hover:bg-white rounded-lg shadow-sm border border-transparent hover:border-blue-100"
                                                title="Tách Hóa Đơn"
                                            >
                                                <SplitIcon />
                                            </button>
                                            <button
                                                onClick={() => handleOpenModal(invoice)}
                                                className="p-1.5 text-primary-600 hover:bg-white rounded-lg shadow-sm border border-transparent hover:border-primary-100"
                                                title="Sửa hóa đơn"
                                            >
                                                <EditIcon />
                                            </button>
                                            {isAdmin && (
                                                <button
                                                    onClick={() => handleDelete(invoice.id)}
                                                    className="p-1.5 text-red-600 hover:bg-white rounded-lg shadow-sm border border-transparent hover:border-red-100"
                                                    title="Xóa hóa đơn"
                                                >
                                                    <TrashIcon />
                                                </button>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>

                            {!canModify && (
                                <div className="mb-3 px-2 py-1 bg-gray-100 text-[9px] font-bold text-gray-500 rounded uppercase tracking-tighter inline-block">
                                    Đã chốt - Không thể chỉnh sửa
                                </div>
                            )}

                            <div className="space-y-2 mb-4">
                                {invoice.items.map((item, idx) => (
                                    <div key={idx} className="flex justify-between text-xs items-center bg-white/50 p-2 rounded-lg border border-gray-50">
                                        <div className="flex flex-col">
                                            <span className="text-gray-800 font-medium truncate max-w-[150px]">{item.productName}</span>
                                            <span className="text-gray-400 text-[10px]">SL: {item.quantity} x {formatCurrency(item.sellingPrice)}</span>
                                        </div>
                                        <span className="font-bold text-gray-700">
                                            {formatCurrency(item.sellingPrice * item.quantity)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                            <div className="pt-3 border-t border-dashed space-y-2">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-gray-500">Tiền hàng:</span>
                                    <span className="font-bold text-gray-800">{formatCurrency(baseTotal)}</span>
                                </div>
                                {(discount > 0 || shippingFee > 0) && (
                                    <div className="flex justify-between items-center text-[11px]">
                                        <span className="text-gray-400">Ship: <span className="text-blue-500">{formatCurrency(shippingFee)}</span> | Giảm: <span className="text-green-500">-{formatCurrency(discount)}</span></span>
                                        <span className="font-bold text-gray-600">Tổng: {formatCurrency(totalPrice)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-gray-500">Đã cọc:</span>
                                    <span className="font-bold text-green-600">{formatCurrency(invoice.deposit)}</span>
                                </div>
                                <div className="flex justify-between items-center font-bold mt-1 p-2 bg-gray-100 rounded-lg">
                                    <span className="text-[10px] text-gray-600 uppercase tracking-tighter">Còn lại:</span>
                                    <span className={`text-lg ${activeTab === RevenueStatus.DELIVERED ? 'text-yellow-700' : 'text-teal-700'}`}>
                                        {formatCurrency(totalPrice - invoice.deposit)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                }) : (
                    <div className="col-span-full py-20 text-center text-gray-400 italic bg-gray-50 rounded-2xl border border-dashed">
                        Không có hóa đơn nào khớp với bộ lọc trong tab "{activeTab}"
                    </div>
                )}
            </div>

            {isModalOpen && <InvoiceModal invoice={editingInvoice} onSave={handleSave} onClose={handleCloseModal} />}
            {isSplitModalOpen && splittingInvoice && <SplitInvoiceModal invoice={splittingInvoice} onSave={handleSplitSave} onClose={handleCloseSplitModal} />}
            {isImportModalOpen && <ImportModal onClose={() => setIsImportModalOpen(false)} onImport={async (f) => { const d = await transformToInvoiceData(f); setInvoices(prev => [...prev, ...d]); }} title="Nhập hóa đơn" instructions={<p>Tên khách hàng trùng nhau sẽ được gộp.</p>} onDownloadTemplate={generateInvoicesTemplate} />}
            
            {/* Hidden Receipt Template for Image Export */}
            <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', pointerEvents: 'none' }}>
                {exportingInvoice && (
                    <div ref={receiptRef} className="w-[480px] bg-white p-8 relative font-sans text-gray-800 shadow-2xl rounded-2xl overflow-hidden" style={{ backgroundImage: "linear-gradient(to bottom, #fdf2f8, #ffffff)" }}>
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary-100 rounded-full blur-3xl opacity-50 -mr-10 -mt-10"></div>
                        <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-100 rounded-full blur-3xl opacity-50 -ml-10 -mb-10"></div>
                        
                        <div className="text-center mb-8 border-b-2 border-dashed border-primary-200 pb-6 relative z-10">
                            <div className="mx-auto w-12 h-12 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center mb-3">
                                🍒
                            </div>
                            <h1 className="text-3xl font-black text-primary-600 mb-2 tracking-tighter">CHERRY SHOP KIDS</h1>
                            <p className="text-xs text-gray-500 uppercase tracking-widest font-black bg-white inline-block px-3 py-1 rounded-full border border-gray-100 shadow-sm">Phiếu Thanh Toán</p>
                        </div>
                        
                        <div className="mb-8 space-y-2 text-sm bg-white/60 p-4 rounded-xl border border-gray-50 relative z-10">
                            <p className="flex justify-between"><span className="text-gray-500">Khách hàng:</span> <span className="font-black text-gray-900 text-lg uppercase">{exportingInvoice.customerName}</span></p>
                            <p className="flex justify-between"><span className="text-gray-500">Ngày xuất:</span> <span className="font-bold text-gray-800">{new Date().toLocaleDateString('vi-VN')}</span></p>
                        </div>

                        <div className="space-y-4 mb-8 relative z-10">
                            {exportingInvoice.items.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-start">
                                    <div className="flex-1 pr-6 border-b border-gray-100 pb-2">
                                        <p className="font-bold text-gray-800 leading-snug">{item.productName}</p>
                                        <p className="text-xs text-gray-500 mt-1">{item.quantity} x {formatCurrency(item.sellingPrice)}</p>
                                    </div>
                                    <p className="font-black text-gray-900 shrink-0 text-base border-b border-gray-100 pb-2">{formatCurrency(item.quantity * item.sellingPrice)}</p>
                                </div>
                            ))}
                        </div>

                        <div className="border-t-[3px] border-solid border-gray-100 pt-6 space-y-3 relative z-10">
                            {(() => {
                                const baseTotal = exportingInvoice.items.reduce((s,i) => s + i.sellingPrice*i.quantity, 0);
                                const discount = exportingInvoice.discount || 0;
                                const shippingFee = exportingInvoice.shippingFee || 0;
                                const finalPrice = baseTotal - discount + shippingFee;
                                return (
                                    <>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-500 font-bold uppercase">Tiền hàng:</span>
                                            <span className="font-black text-gray-900 text-lg">{formatCurrency(baseTotal)}</span>
                                        </div>
                                        {discount > 0 && (
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-gray-500 font-bold uppercase">Giảm giá:</span>
                                                <span className="font-black text-green-600 text-lg">- {formatCurrency(discount)}</span>
                                            </div>
                                        )}
                                        {shippingFee > 0 && (
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-gray-500 font-bold uppercase">Phí ship:</span>
                                                <span className="font-black text-blue-600 text-lg">+ {formatCurrency(shippingFee)}</span>
                                            </div>
                                        )}
                                        {(discount > 0 || shippingFee > 0) && (
                                            <div className="flex justify-between items-center text-sm border-t border-dashed border-gray-200 pt-2">
                                                <span className="text-gray-600 font-bold uppercase">Tổng thanh toán:</span>
                                                <span className="font-black text-gray-900 text-lg">{formatCurrency(finalPrice)}</span>
                                            </div>
                                        )}
                                        {exportingInvoice.deposit > 0 && (
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-gray-500 font-bold uppercase">Đã cọc/Trả:</span>
                                                <span className="font-black text-orange-500 text-lg">- {formatCurrency(exportingInvoice.deposit)}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between items-center bg-primary-50 p-4 rounded-2xl mt-4 border border-primary-100 shadow-sm">
                                            <span className="text-sm font-black text-primary-700 uppercase">Còn Lại:</span>
                                            <span className="text-2xl font-black text-red-600">
                                                {formatCurrency(Math.max(0, finalPrice - exportingInvoice.deposit))}
                                            </span>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>

                        <div className="mt-10 space-y-1.5 relative z-10 bg-red-50/80 p-4 rounded-xl border border-red-100 text-[9px] text-red-600 leading-relaxed font-bold">
                            <p className="font-black text-xs mb-1 uppercase tracking-widest text-red-700">Lưu ý:</p>
                            <p>- GIÁ PHÍA TRÊN CHƯA BAO GỒM PHÍ SHIP, PHÍ SHIP TÍNH SAU KHI LÊN ĐƠN.</p>
                            <p>- QUÝ KHÁCH VUI LÒNG QUAY VIDEO KHI BÓC HÀNG. SHOP CHỈ GIẢI QUYẾT KHI CÓ VIDEO, XIN CẢM ƠN.</p>
                        </div>
                        
                        {/* Decorative top/bottom bars */}
                        <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-primary-400 via-purple-400 to-primary-400"></div>
                    </div>
                )}
            </div>
        </div >
    );
};

export default InvoicesTable;