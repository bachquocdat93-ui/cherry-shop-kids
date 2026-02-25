import React, { useState, useMemo } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';
import { RevenueEntry, RevenueStatus, Invoice, InvoiceItem, ShopItem } from '../types';
import { PlusIcon, EditIcon, TrashIcon, UploadIcon, TrashIcon as ClearIcon, SettingsIcon, RefreshIcon, PdfIcon } from './Icons';
import RevenueModal from './RevenueModal';
import ImportModal from './ImportModal';
import { transformToRevenueData } from '../utils/importer';
import { generateRevenueTemplate } from '../utils/templateGenerator';
import { generateRevenuePDF } from '../utils/pdfGenerator';
import { generateUniqueId } from '../utils/helpers';
import ColumnToggler from './ColumnToggler';

const initialData: RevenueEntry[] = [];

const REVENUE_COLUMNS = [
    { key: 'date', label: 'Ngày' },
    { key: 'customerName', label: 'Khách hàng' },
    { key: 'productName', label: 'Sản Phẩm' },
    { key: 'costPrice', label: 'Giá Nhập' },
    { key: 'retailPrice', label: 'Giá Bán' },
    { key: 'quantity', label: 'SL' },
    { key: 'total', label: 'Tổng' },
    { key: 'profit', label: 'Lãi Cuối' },
    { key: 'consignor', label: 'Ký Gửi' },
    { key: 'status', label: 'Trạng thái' },
    { key: 'actions', label: 'Sửa/Xóa' },
];

const RevenueTable: React.FC = () => {
    const [revenueData, setRevenueData] = useLocalStorage<RevenueEntry[]>('revenueData', initialData);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [editingEntry, setEditingEntry] = useState<RevenueEntry | null>(null);
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [visibleColumns, setVisibleColumns] = useLocalStorage<string[]>('revenueVisibleColumns', REVENUE_COLUMNS.map(c => c.key));
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    const syncWithInvoices = (entry: RevenueEntry, action: 'add' | 'update' | 'remove') => {
        try {
            const rawInvoices = window.localStorage.getItem('invoicesData');
            let invoices: Invoice[] = rawInvoices ? JSON.parse(rawInvoices) : [];
            let changed = false;

            const customerKey = (entry.customerName || 'Khách lẻ').trim().toLowerCase();

            if (action === 'add') {
                const existingInvoiceIndex = invoices.findIndex(inv =>
                    inv.customerName.trim().toLowerCase() === customerKey
                );

                const newItem: InvoiceItem = {
                    id: generateUniqueId(),
                    productName: entry.productName,
                    sellingPrice: entry.retailPrice,
                    quantity: entry.quantity,
                    status: entry.status,
                    shopItemId: entry.shopItemId,
                    revenueEntryId: entry.id, // Shared ID link
                };

                if (existingInvoiceIndex !== -1) {
                    invoices[existingInvoiceIndex].items.push(newItem);
                } else {
                    invoices.push({
                        id: generateUniqueId(),
                        customerName: entry.customerName || 'Khách lẻ',
                        items: [newItem],
                        deposit: 0,
                    });
                }
                changed = true;
            } else if (action === 'update' || action === 'remove') {
                // First, find and remove the item from wherever it is (based on revenueEntryId or legacy fallback)
                let itemToMove: InvoiceItem | null = null;

                invoices = invoices.map(invoice => {
                    const originalLen = invoice.items.length;
                    const remainingItems = invoice.items.filter(item => {
                        const isMatch = item.revenueEntryId === entry.id ||
                            (item.productName.trim().toLowerCase() === entry.productName.trim().toLowerCase() &&
                                invoice.customerName.trim().toLowerCase() === customerKey);

                        if (isMatch && action === 'update' && !itemToMove) {
                            itemToMove = {
                                ...item,
                                status: entry.status,
                                sellingPrice: entry.retailPrice,
                                quantity: entry.quantity,
                                productName: entry.productName,
                                revenueEntryId: entry.id // Ensure ID is linked
                            };
                        }
                        return !isMatch;
                    });

                    if (remainingItems.length !== originalLen) changed = true;
                    return { ...invoice, items: remainingItems };
                }).filter(inv => inv.items.length > 0);

                // If it was an update, add it back to the CORRECT target invoice (handles customer name changes)
                if (action === 'update') {
                    const targetInvoiceIdx = invoices.findIndex(inv =>
                        inv.customerName.trim().toLowerCase() === customerKey
                    );

                    const itemToInsert = itemToMove || {
                        id: generateUniqueId(),
                        productName: entry.productName,
                        sellingPrice: entry.retailPrice,
                        quantity: entry.quantity,
                        status: entry.status,
                        shopItemId: entry.shopItemId,
                        revenueEntryId: entry.id,
                    };

                    if (targetInvoiceIdx !== -1) {
                        invoices[targetInvoiceIdx].items.push(itemToInsert);
                    } else {
                        invoices.push({
                            id: generateUniqueId(),
                            customerName: entry.customerName || 'Khách lẻ',
                            items: [itemToInsert],
                            deposit: 0,
                        });
                    }
                    changed = true;
                }
            }

            if (changed) {
                window.localStorage.setItem('invoicesData', JSON.stringify(invoices));
                window.dispatchEvent(new Event('storage'));
            }
        } catch (error) {
            console.error("Lỗi đồng bộ hóa đơn:", error);
        }
    };

    const handleOpenModal = (entry: RevenueEntry | null = null) => {
        setEditingEntry(entry);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingEntry(null);
    };

    const handleSave = (entry: RevenueEntry) => {
        const entryWithDefaultName = {
            ...entry,
            customerName: entry.customerName?.trim() || 'Khách lẻ'
        };

        if (editingEntry) {
            setRevenueData(prev => prev.map(e => e.id === entry.id ? entry : e));
            syncWithInvoices(entryWithDefaultName, 'update');
        } else {
            setRevenueData(prev => [...prev, entry]);
            syncWithInvoices(entryWithDefaultName, 'add');
        }
        handleCloseModal();
    };

    const handleStatusChange = (id: string, newStatus: RevenueStatus) => {
        const entry = revenueData.find(e => e.id === id);
        if (!entry) return;

        const updatedEntry = { ...entry, status: newStatus };
        setRevenueData(prev => prev.map(e => e.id === id ? updatedEntry : e));

        if (updatedEntry.customerName) {
            syncWithInvoices(updatedEntry, 'update');
        }
    };

    const handleDelete = (id: string) => {
        const entry = revenueData.find(e => e.id === id);
        if (entry && window.confirm('Bạn có chắc chắn muốn xóa mục này?\nKho hàng sẽ được hoàn lại số lượng.')) {
            // Reversal Logic
            try {
                if (entry.shopItemId) {
                    const shopDataRaw = window.localStorage.getItem('shopInventoryData');
                    if (shopDataRaw) {
                        let shopData: ShopItem[] = JSON.parse(shopDataRaw);
                        const shopIdx = shopData.findIndex(s => s.id === entry.shopItemId);
                        if (shopIdx !== -1) {
                            shopData[shopIdx].quantity += entry.quantity;
                            window.localStorage.setItem('shopInventoryData', JSON.stringify(shopData));
                            window.dispatchEvent(new Event('storage'));
                        }
                    }
                }
            } catch (e) {
                console.error("Lỗi hoàn kho:", e);
            }

            if (entry.customerName) {
                syncWithInvoices(entry, 'remove');
            }
            setRevenueData(prev => prev.filter(e => e.id !== id));
            setSelectedIds(prev => prev.filter(selId => selId !== id));
        }
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === filteredData.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredData.map(e => e.id));
        }
    };

    const toggleSelectOne = (id: string) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(prev => prev.filter(e => e !== id));
        } else {
            setSelectedIds(prev => [...prev, id]);
        }
    };

    const handleBulkDelete = () => {
        const count = selectedIds.length;
        if (window.confirm(`Bạn có chắc muốn xóa ${count} mục doanh thu đã chọn?\nKho hàng sẽ được hoàn lại số lượng.`)) {
            // Process reversal for each item
            try {
                const shopDataRaw = window.localStorage.getItem('shopInventoryData');
                if (shopDataRaw) {
                    let shopData: ShopItem[] = JSON.parse(shopDataRaw);
                    let changed = false;

                    selectedIds.forEach(id => {
                        const entry = revenueData.find(e => e.id === id);
                        if (entry && entry.shopItemId) {
                            const shopIdx = shopData.findIndex(s => s.id === entry.shopItemId);
                            if (shopIdx !== -1) {
                                shopData[shopIdx].quantity += entry.quantity;
                                changed = true;
                            }
                        }
                        if (entry && entry.customerName) {
                            syncWithInvoices(entry, 'remove');
                        }
                    });

                    if (changed) {
                        window.localStorage.setItem('shopInventoryData', JSON.stringify(shopData));
                        window.dispatchEvent(new Event('storage'));
                    }
                }
            } catch (e) {
                console.error("Lỗi hoàn kho bulk:", e);
            }

            setRevenueData(prev => prev.filter(e => !selectedIds.includes(e.id)));
            setSelectedIds([]);
        }
    };

    const handleClearAll = () => {
        if (window.confirm(`BẠN CÓ CHẮC MUỐN XÓA TẤT CẢ DOANH THU THÁNG ${selectedMonth}?\nHành động này không thể khôi phục!`)) {
            setRevenueData(prev => prev.filter(e => !e.date.startsWith(selectedMonth)));
        }
    };

    const handleImport = async (file: File) => {
        try {
            const newData = await transformToRevenueData(file);
            setRevenueData(prev => [...prev, ...newData]);
            newData.forEach(item => {
                if (item.customerName) syncWithInvoices(item, 'add');
            });
            alert(`Đã nhập thành công ${newData.length} mục doanh thu.`);
        } catch (error: any) {
            alert(`Lỗi: ${error.message}`);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    // Calculate stats specifically for the selected month
    const filteredData = useMemo(() => {
        let data = revenueData.filter(e => e.date.startsWith(selectedMonth));

        if (searchTerm.trim()) {
            const lowerTerm = searchTerm.toLowerCase();
            data = data.filter(e =>
                (e.customerName || '').toLowerCase().includes(lowerTerm) ||
                (e.productName || '').toLowerCase().includes(lowerTerm)
            );
        }

        return data;
    }, [revenueData, selectedMonth, searchTerm]);

    const stats = useMemo(() => {
        // Filter out returned items
        const activeData = filteredData.filter(e => e.status !== RevenueStatus.RETURNED);

        const totalRevenue = activeData.reduce((sum, e) => sum + (e.retailPrice * e.quantity), 0);
        const totalFinalProfitAll = activeData.reduce((sum, e) => {
            const profitMargin = (e.retailPrice - e.costPrice) * e.quantity;
            const isConsignment = e.consignor && e.consignor.trim() !== '';
            const consignmentBonus = isConsignment ? (e.costPrice * 0.2 * e.quantity) : 0;
            return sum + profitMargin + consignmentBonus;
        }, 0);

        const totalDeliveredProfit = activeData.reduce((sum, e) => {
            if (e.status === RevenueStatus.DELIVERED) {
                const profitMargin = (e.retailPrice - e.costPrice) * e.quantity;
                const consignmentBonus = (e.consignor && e.consignor.trim() !== '') ? (e.costPrice * 0.2 * e.quantity) : 0;
                return sum + profitMargin + consignmentBonus;
            }
            return sum;
        }, 0);

        return { totalRevenue, totalFinalProfitAll, totalDeliveredProfit, count: activeData.length };
    }, [filteredData]);

    const availableMonths = useMemo(() => {
        const months = new Set<string>();
        revenueData.forEach(e => months.add(e.date.slice(0, 7)));
        months.add(new Date().toISOString().slice(0, 7));
        return Array.from(months).sort().reverse();
    }, [revenueData]);

    const getStatusStyles = (status: RevenueStatus) => {
        switch (status) {
            case RevenueStatus.DELIVERED: return 'bg-yellow-50 text-yellow-800';
            case RevenueStatus.SHIPPING: return 'bg-green-50 text-green-800';
            case RevenueStatus.RETURNED: return 'bg-gray-50 text-gray-400 line-through opacity-75';
            default: return 'bg-white text-gray-800';
        }
    };

    const handleReturn = (entry: RevenueEntry) => {
        if (window.confirm(`Khách trả lại sản phẩm "${entry.productName}"?\n\nNhấn OK để: \n1. Hoàn lại ${entry.quantity} sản phẩm vào kho.\n2. Đánh dấu đơn này là "Đã hoàn".\n3. Trừ doanh thu báo cáo.`)) {
            try {
                // Return to stock Logic
                if (entry.shopItemId) {
                    const shopDataRaw = window.localStorage.getItem('shopInventoryData');
                    if (shopDataRaw) {
                        let shopData: ShopItem[] = JSON.parse(shopDataRaw);
                        const shopIdx = shopData.findIndex(s => s.id === entry.shopItemId);
                        if (shopIdx !== -1) {
                            shopData[shopIdx].quantity += entry.quantity;
                            window.localStorage.setItem('shopInventoryData', JSON.stringify(shopData));
                            window.dispatchEvent(new Event('storage'));
                        }
                    }
                }

                // Update Invoice status
                if (entry.customerName) {
                    syncWithInvoices({ ...entry, status: RevenueStatus.RETURNED }, 'update');
                }

                // Update Revenue Status
                setRevenueData(prev => prev.map(e => e.id === entry.id ? { ...e, status: RevenueStatus.RETURNED } : e));

            } catch (e) {
                console.error("Lỗi hoàn hàng:", e);
                alert("Có lỗi xảy ra khi hoàn hàng.");
            }
        }
    };

    const handleExportPdf = () => {
        if (filteredData.length === 0) {
            alert("Không có dữ liệu để xuất PDF.");
            return;
        }
        generateRevenuePDF(selectedMonth, filteredData);
    };

    return (
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg">
            {/* Toolbar Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div className="flex items-center justify-between w-full md:w-auto gap-4">
                    <div>
                        <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Doanh thu</h2>
                        <p className="text-xs text-gray-400 font-medium">Lọc: <span className="text-primary font-bold">T{selectedMonth}</span></p>
                    </div>
                    {/* Mobile Only: Add Button */}
                    <button onClick={() => handleOpenModal()} className="md:hidden bg-primary text-white p-2 rounded-xl hover:bg-primary-700 transition-colors shadow-sm"><PlusIcon className="w-5 h-5" /></button>
                </div>

                {/* Search & Actions */}
                <div className="flex flex-col sm:flex-row gap-3 w-full md:flex-1 md:justify-end items-stretch sm:items-center">
                    <div className="relative flex-1 max-w-full sm:max-w-xs">
                        <input
                            type="text"
                            placeholder="Tìm khách, SP..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border-gray-200 focus:ring-primary focus:border-primary text-sm shadow-sm"
                        />
                    </div>

                    <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                        {/* Desktop Only Actions */}
                        <button onClick={handleClearAll} className="whitespace-nowrap hidden lg:flex text-red-500 hover:text-red-700 text-[10px] items-center gap-1 font-black bg-red-50 px-2 py-1 rounded-lg border border-red-100 uppercase tracking-tighter">
                            <ClearIcon className="w-3 h-3" /> Xóa tháng
                        </button>

                        <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-xl border border-gray-200 shrink-0">
                            <select
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                className="rounded-lg border-none shadow-none focus:ring-0 text-xs sm:text-sm font-black bg-white px-2 py-1.5 cursor-pointer text-gray-800"
                            >
                                {availableMonths.map(month => (
                                    <option key={month} value={month}>T{month.slice(5)}</option>
                                ))}
                            </select>
                        </div>

                        <div className="hidden md:block">
                            <ColumnToggler columns={REVENUE_COLUMNS} visibleColumns={visibleColumns} onToggle={setVisibleColumns} />
                        </div>

                        {selectedIds.length > 0 && (
                            <button onClick={handleBulkDelete} className="whitespace-nowrap bg-red-50 text-red-600 px-3 py-2 rounded-xl border border-red-200 hover:bg-red-100 transition-colors flex items-center gap-1 shadow-sm font-bold text-xs">
                                <TrashIcon className="w-4 h-4" /> ({selectedIds.length})
                            </button>
                        )}

                        <button onClick={handleExportPdf} className="whitespace-nowrap bg-green-50 text-green-600 px-3 py-2 rounded-xl hover:bg-green-100 transition-colors flex items-center gap-1 shadow-sm font-bold text-xs">
                            <PdfIcon className="w-4 h-4" /> PDF
                        </button>
                        <button onClick={() => setIsImportModalOpen(true)} className="whitespace-nowrap bg-blue-50 text-blue-600 px-3 py-2 rounded-xl hover:bg-blue-100 transition-colors flex items-center gap-1 shadow-sm font-bold text-xs"><UploadIcon className="w-4 h-4" /> Excel</button>
                        <button onClick={() => handleOpenModal()} className="hidden md:flex whitespace-nowrap bg-primary text-white px-3 py-2 rounded-xl hover:bg-primary-700 transition-colors items-center gap-1 shadow-sm font-bold text-xs"><PlusIcon className="w-4 h-4" /> Thêm</button>
                    </div>
                </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto border rounded-2xl shadow-sm max-h-[60vh] overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200 border-separate border-spacing-0">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                        <tr>
                            <th className="px-2 py-3 w-8 bg-gray-50 border-b border-gray-200 text-center">
                                <input
                                    type="checkbox"
                                    checked={filteredData.length > 0 && selectedIds.length === filteredData.length}
                                    onChange={toggleSelectAll}
                                    className="rounded border-gray-300 text-primary focus:ring-primary"
                                />
                            </th>
                            {REVENUE_COLUMNS.map(col => visibleColumns.includes(col.key) && (
                                <th key={col.key} className={`px-2 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 border-b border-gray-200 
                                    ${['costPrice', 'retailPrice', 'total', 'profit'].includes(col.key) ? 'text-right' : 'text-left'}
                                    ${['quantity', 'actions'].includes(col.key) ? 'text-center' : ''}
                                `}>
                                    {col.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                        {filteredData.length > 0 ? filteredData.map((entry, index) => {
                            const total = entry.retailPrice * entry.quantity;
                            const profit = (entry.retailPrice - entry.costPrice) * entry.quantity;
                            const isConsignment = entry.consignor && entry.consignor.trim() !== '';
                            const consignmentBonus = isConsignment ? (entry.costPrice * 0.2 * entry.quantity) : 0;
                            const rowFinalProfit = profit + consignmentBonus;
                            const isSelected = selectedIds.includes(entry.id);
                            const isReturned = entry.status === RevenueStatus.RETURNED;

                            return (
                                <tr key={entry.id} className={`${getStatusStyles(entry.status)} hover:opacity-95 transition-opacity ${isSelected ? 'ring-2 ring-inset ring-blue-400' : ''}`}>
                                    <td className="px-2 py-3 border-b border-gray-50 text-center">
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => toggleSelectOne(entry.id)}
                                            className="rounded border-gray-300 text-primary focus:ring-primary"
                                        />
                                    </td>
                                    {visibleColumns.includes('date') && <td className="px-3 py-3 whitespace-nowrap text-[10px] text-gray-400 font-bold border-b border-gray-50">{entry.date.split('-').reverse().join('/')}</td>}
                                    {visibleColumns.includes('customerName') && <td className="px-2 py-3 whitespace-nowrap text-[11px] font-black text-gray-900 border-b border-gray-50">{entry.customerName || 'Vãng lai'}</td>}
                                    {visibleColumns.includes('productName') && <td className="px-2 py-3 whitespace-nowrap text-[11px] text-gray-600 truncate max-w-[120px] border-b border-gray-50" title={entry.productName}>{entry.productName}</td>}
                                    {visibleColumns.includes('costPrice') && <td className="px-2 py-3 whitespace-nowrap text-[11px] text-gray-400 text-right italic border-b border-gray-50">{formatCurrency(entry.costPrice)}</td>}
                                    {visibleColumns.includes('retailPrice') && <td className="px-2 py-3 whitespace-nowrap text-[11px] font-bold text-right border-b border-gray-50">{formatCurrency(entry.retailPrice)}</td>}
                                    {visibleColumns.includes('quantity') && <td className="px-2 py-3 whitespace-nowrap text-[11px] text-center font-black border-b border-gray-50">{entry.quantity}</td>}
                                    {visibleColumns.includes('total') && <td className="px-2 py-3 whitespace-nowrap text-[11px] font-black text-teal-700 text-right border-b border-gray-50">{formatCurrency(total)}</td>}
                                    {visibleColumns.includes('profit') && <td className={`px-2 py-3 whitespace-nowrap text-[11px] font-black text-right border-b border-gray-50 ${entry.status === RevenueStatus.DELIVERED ? 'text-orange-600' : 'text-gray-300'}`}>{formatCurrency(rowFinalProfit)}</td>}
                                    {visibleColumns.includes('consignor') && <td className="px-2 py-3 whitespace-nowrap text-[10px] font-bold text-purple-600 truncate max-w-[80px] border-b border-gray-50">{entry.consignor || '-'}</td>}
                                    {visibleColumns.includes('status') && <td className="px-2 py-3 whitespace-nowrap border-b border-gray-50">
                                        <select
                                            value={entry.status}
                                            onChange={(e) => handleStatusChange(entry.id, e.target.value as RevenueStatus)}
                                            className="text-[9px] font-black uppercase py-0.5 px-2 rounded-full border-gray-200 focus:ring-primary focus:border-primary cursor-pointer shadow-sm bg-white"
                                            disabled={isReturned}
                                        >
                                            <option value={RevenueStatus.HOLDING}>Dồn đơn</option>
                                            <option value={RevenueStatus.SHIPPING}>Đang đi</option>
                                            <option value={RevenueStatus.DELIVERED}>Đã giao</option>
                                            <option value={RevenueStatus.RETURNED}>Đã hoàn</option>
                                        </select>
                                    </td>}
                                    {visibleColumns.includes('actions') && <td className="px-2 py-3 whitespace-nowrap text-center border-b border-gray-50">
                                        <div className="flex items-center justify-center space-x-1">
                                            {!isReturned && (
                                                <button onClick={() => handleReturn(entry)} className="p-1 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors" title="Hoàn hàng/Trả hàng">
                                                    <RefreshIcon className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                            <button onClick={() => handleOpenModal(entry)} className="p-1 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"><EditIcon className="w-3.5 h-3.5" /></button>
                                            <button onClick={() => handleDelete(entry.id)} className="p-1 text-red-600 hover:bg-red-50 rounded-lg transition-colors"><TrashIcon className="w-3.5 h-3.5" /></button>
                                        </div>
                                    </td>}
                                </tr>
                            );
                        }) : (
                            <tr><td colSpan={visibleColumns.length} className="text-center py-20 text-gray-400 italic bg-gray-50 font-medium">Tháng {selectedMonth} chưa có dữ liệu bán hàng.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
                <div className="flex items-center gap-2 mb-2">
                    <input
                        type="checkbox"
                        checked={filteredData.length > 0 && selectedIds.length === filteredData.length}
                        onChange={toggleSelectAll}
                        className="rounded border-gray-300 text-primary focus:ring-primary w-5 h-5"
                    />
                    <span className="text-sm font-bold text-gray-600">Chọn tất cả</span>
                </div>
                {filteredData.length > 0 ? filteredData.map((entry) => {
                    const total = entry.retailPrice * entry.quantity;
                    const profit = (entry.retailPrice - entry.costPrice) * entry.quantity;
                    const isConsignment = entry.consignor && entry.consignor.trim() !== '';
                    const consignmentBonus = isConsignment ? (entry.costPrice * 0.2 * entry.quantity) : 0;
                    const rowFinalProfit = profit + consignmentBonus;
                    const isSelected = selectedIds.includes(entry.id);

                    return (
                        <div key={entry.id} className={`bg-slate-50 border rounded-xl p-3 shadow-sm ${getStatusStyles(entry.status)} ${isSelected ? 'ring-2 ring-primary' : ''}`}>
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => toggleSelectOne(entry.id)}
                                        className="rounded border-gray-300 text-primary focus:ring-primary"
                                    />
                                    <div>
                                        <p className="font-black text-gray-800 text-sm">{entry.customerName || 'Vãng lai'}</p>
                                        <p className="text-[10px] text-gray-400 font-bold">{entry.date.split('-').reverse().join('/')}</p>
                                    </div>
                                </div>
                                <div className="flexgap-1">
                                    <button onClick={() => handleOpenModal(entry)} className="p-1.5 text-primary-600 bg-white rounded-lg shadow-sm border border-gray-100"><EditIcon className="w-4 h-4" /></button>
                                    <button onClick={() => handleDelete(entry.id)} className="p-1.5 text-red-600 bg-white rounded-lg shadow-sm border border-gray-100"><TrashIcon className="w-4 h-4" /></button>
                                </div>
                            </div>

                            <div className="mb-2">
                                <p className="text-sm text-gray-700 font-medium line-clamp-2" title={entry.productName}>{entry.productName}</p>
                                {isConsignment && <span className="inline-block mt-1 px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-[9px] font-bold">KG: {entry.consignor}</span>}
                            </div>

                            <div className="grid grid-cols-3 gap-2 bg-white/50 p-2 rounded-lg mb-2">
                                <div className="text-center">
                                    <p className="text-[9px] text-gray-400 uppercase">Giá bán</p>
                                    <p className="font-bold text-xs">{formatCurrency(entry.retailPrice)}</p>
                                </div>
                                <div className="text-center border-l border-gray-200">
                                    <p className="text-[9px] text-gray-400 uppercase">SL</p>
                                    <p className="font-bold text-xs">{entry.quantity}</p>
                                </div>
                                <div className="text-center border-l border-gray-200">
                                    <p className="text-[9px] text-gray-400 uppercase">Tổng</p>
                                    <p className="font-bold text-xs text-teal-700">{formatCurrency(total)}</p>
                                </div>
                            </div>

                            <div className="flex items-center justify-between gap-2">
                                <select
                                    value={entry.status}
                                    onChange={(e) => handleStatusChange(entry.id, e.target.value as RevenueStatus)}
                                    className="flex-1 text-[10px] font-black uppercase py-1 px-2 rounded-lg border-gray-200 focus:ring-primary cursor-pointer bg-white h-8"
                                >
                                    <option value={RevenueStatus.HOLDING}>Dồn đơn</option>
                                    <option value={RevenueStatus.SHIPPING}>Đang đi</option>
                                    <option value={RevenueStatus.DELIVERED}>Đã giao</option>
                                </select>
                                <div className="text-right">
                                    <p className="text-[9px] text-gray-400 uppercase">Lãi</p>
                                    <p className={`font-black text-sm ${entry.status === RevenueStatus.DELIVERED ? 'text-orange-600' : 'text-gray-300'}`}>{formatCurrency(rowFinalProfit)}</p>
                                </div>
                            </div>
                        </div>
                    )
                }) : (
                    <div className="text-center py-10 text-gray-400 italic bg-gray-50 rounded-xl">Tháng {selectedMonth} chưa có dữ liệu.</div>
                )}
            </div>

            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="bg-teal-50 border-b-4 border-teal-500 p-6 rounded-3xl shadow-sm relative overflow-hidden">
                    <div className="absolute top-[-10px] right-[-10px] opacity-10 bg-teal-500 w-24 h-24 rounded-full"></div>
                    <p className="text-[10px] font-black text-teal-600 uppercase tracking-widest mb-1">Doanh Thu Tháng {selectedMonth}</p>
                    <p className="text-3xl font-black text-teal-900">{formatCurrency(stats.totalRevenue)}</p>
                    <p className="text-[10px] text-teal-700 mt-2 font-bold">{stats.count} sản phẩm được bán</p>
                </div>
                <div className="bg-orange-50 border-b-4 border-orange-400 p-6 rounded-3xl shadow-sm relative overflow-hidden">
                    <div className="absolute top-[-10px] right-[-10px] opacity-10 bg-orange-500 w-24 h-24 rounded-full"></div>
                    <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-1">Lãi Dự Kiến (Full Giao)</p>
                    <p className="text-3xl font-black text-orange-900">{formatCurrency(stats.totalFinalProfitAll)}</p>
                    <p className="text-[10px] text-orange-700 mt-2 font-bold italic">Bao gồm cả ký gửi 20%</p>
                </div>
                <div className="bg-yellow-50 border-b-4 border-yellow-500 p-6 rounded-3xl shadow-md ring-4 ring-yellow-400/20 relative overflow-hidden">
                    <div className="absolute top-[-10px] right-[-10px] opacity-10 bg-yellow-500 w-24 h-24 rounded-full"></div>
                    <p className="text-[10px] font-black text-yellow-700 uppercase tracking-widest mb-1">Lãi Thực Thu (Đã Giao)</p>
                    <p className="text-4xl font-black text-yellow-900 tracking-tighter">{formatCurrency(stats.totalDeliveredProfit)}</p>
                    <p className="text-[10px] text-yellow-800 mt-2 font-black italic underline decoration-yellow-300 underline-offset-4">Tiền lãi thực tế trong tay</p>
                </div>
            </div>

            {isModalOpen && <RevenueModal entry={editingEntry} onSave={handleSave} onClose={handleCloseModal} />}
            {isImportModalOpen && <ImportModal onClose={() => setIsImportModalOpen(false)} onImport={handleImport} title="Nhập dữ liệu Doanh thu" instructions={<ul className="list-disc list-inside"><li>Cột: Ngày (YYYY-MM-DD), Tên SP, Giá Bán, SL</li><li>Mặc định dùng ngày hiện tại nếu thiếu cột Ngày.</li></ul>} onDownloadTemplate={generateRevenueTemplate} />}
        </div>
    );
};

export default RevenueTable;