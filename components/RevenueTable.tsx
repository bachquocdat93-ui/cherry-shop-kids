import React, { useState, useMemo } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';
import { RevenueEntry, RevenueStatus, Invoice, InvoiceItem } from '../types';
import { PlusIcon, EditIcon, TrashIcon, UploadIcon, TrashIcon as ClearIcon } from './Icons';
import RevenueModal from './RevenueModal';
import ImportModal from './ImportModal';
import { transformToRevenueData } from '../utils/importer';
import { generateRevenueTemplate } from '../utils/templateGenerator';
import { generateUniqueId } from '../utils/helpers';

const initialData: RevenueEntry[] = [];

const RevenueTable: React.FC = () => {
    const [revenueData, setRevenueData] = useLocalStorage<RevenueEntry[]>('revenueData', initialData);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [editingEntry, setEditingEntry] = useState<RevenueEntry | null>(null);
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

    // Logic to sync with invoices
    const syncWithInvoices = (entry: RevenueEntry, action: 'add' | 'update' | 'remove') => {
        try {
            const rawInvoices = window.localStorage.getItem('invoicesData');
            let invoices: Invoice[] = rawInvoices ? JSON.parse(rawInvoices) : [];
            let changed = false;

            const customerKey = entry.customerName.trim().toLowerCase();
            const productKey = entry.productName.trim().toLowerCase();

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
                };

                if (existingInvoiceIndex !== -1) {
                    invoices[existingInvoiceIndex].items.push(newItem);
                } else {
                    invoices.push({
                        id: generateUniqueId(),
                        customerName: entry.customerName,
                        items: [newItem],
                        deposit: 0,
                    });
                }
                changed = true;
            } else if (action === 'update') {
                invoices = invoices.map(invoice => {
                    if (invoice.customerName.trim().toLowerCase() === customerKey) {
                        invoice.items = invoice.items.map(item => {
                            if (item.productName.trim().toLowerCase() === productKey) {
                                changed = true;
                                return { ...item, status: entry.status, sellingPrice: entry.retailPrice, quantity: entry.quantity };
                            }
                            return item;
                        });
                    }
                    return invoice;
                });
            } else if (action === 'remove') {
                invoices = invoices.map(invoice => {
                    if (invoice.customerName.trim().toLowerCase() === customerKey) {
                        const originalLen = invoice.items.length;
                        invoice.items = invoice.items.filter(item => 
                            item.productName.trim().toLowerCase() !== productKey
                        );
                        if (invoice.items.length !== originalLen) changed = true;
                    }
                    return invoice;
                }).filter(inv => inv.items.length > 0);
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
        if (editingEntry) {
            setRevenueData(prev => prev.map(e => e.id === entry.id ? entry : e));
            if (entry.customerName) {
                syncWithInvoices(entry, 'update');
            }
        } else {
            setRevenueData(prev => [...prev, entry]);
            if (entry.customerName && entry.customerName.trim() !== '') {
                syncWithInvoices(entry, 'add');
            }
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
        if (entry && window.confirm('Bạn có chắc chắn muốn xóa mục này?')) {
            if (entry.customerName) {
                syncWithInvoices(entry, 'remove');
            }
            setRevenueData(prev => prev.filter(e => e.id !== id));
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
        return revenueData.filter(e => e.date.startsWith(selectedMonth));
    }, [revenueData, selectedMonth]);

    const stats = useMemo(() => {
        const totalRevenue = filteredData.reduce((sum, e) => sum + (e.retailPrice * e.quantity), 0);
        const totalFinalProfitAll = filteredData.reduce((sum, e) => {
            const profitMargin = (e.retailPrice - e.costPrice) * e.quantity;
            const isConsignment = e.consignor && e.consignor.trim() !== '';
            const consignmentBonus = isConsignment ? (e.costPrice * 0.2 * e.quantity) : 0;
            return sum + profitMargin + consignmentBonus;
        }, 0);

        const totalDeliveredProfit = filteredData.reduce((sum, e) => {
            if (e.status === RevenueStatus.DELIVERED) {
                const profitMargin = (e.retailPrice - e.costPrice) * e.quantity;
                const consignmentBonus = (e.consignor && e.consignor.trim() !== '') ? (e.costPrice * 0.2 * e.quantity) : 0;
                return sum + profitMargin + consignmentBonus;
            }
            return sum;
        }, 0);

        return { totalRevenue, totalFinalProfitAll, totalDeliveredProfit, count: filteredData.length };
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
            default: return 'bg-white text-gray-800';
        }
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-lg">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                <div className="flex items-center gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">Quản lý Doanh thu</h2>
                        <p className="text-xs text-gray-400 font-medium">Lọc theo: <span className="text-primary font-bold">Tháng {selectedMonth}</span></p>
                    </div>
                    <button onClick={handleClearAll} className="text-red-500 hover:text-red-700 text-[10px] flex items-center gap-1 font-black bg-red-50 px-2 py-1 rounded-lg transition-colors border border-red-100 uppercase tracking-tighter shadow-sm">
                        <ClearIcon className="w-3 h-3" /> Xóa dữ liệu tháng
                    </button>
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                     <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-xl border border-gray-200">
                        <span className="text-[10px] font-black uppercase text-gray-400 pl-2">Chọn tháng:</span>
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="rounded-lg border-none shadow-none focus:ring-0 sm:text-sm font-black bg-white px-3 py-1.5 cursor-pointer text-gray-800"
                        >
                            {availableMonths.map(month => (
                                <option key={month} value={month}>Tháng {month}</option>
                            ))}
                        </select>
                    </div>
                    <button onClick={() => setIsImportModalOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm font-bold text-sm"><UploadIcon /> Nhập Excel</button>
                    <button onClick={() => handleOpenModal()} className="bg-primary text-white px-4 py-2 rounded-xl hover:bg-primary-700 transition-colors flex items-center gap-2 shadow-sm font-bold text-sm"><PlusIcon /> Thêm Mới</button>
                </div>
            </div>

            <div className="overflow-x-auto border rounded-2xl shadow-sm max-h-[60vh] overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200 border-separate border-spacing-0">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                        <tr>
                            <th className="px-3 py-3 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 border-b border-gray-200">Ngày</th>
                            <th className="px-2 py-3 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 border-b border-gray-200">Khách hàng</th>
                            <th className="px-2 py-3 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 border-b border-gray-200">Sản Phẩm</th>
                            <th className="px-2 py-3 text-right text-[9px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 border-b border-gray-200">Giá Nhập</th>
                            <th className="px-2 py-3 text-right text-[9px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 border-b border-gray-200">Giá Bán</th>
                            <th className="px-2 py-3 text-center text-[9px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 border-b border-gray-200">SL</th>
                            <th className="px-2 py-3 text-right text-[9px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 border-b border-gray-200">Tổng</th>
                            <th className="px-2 py-3 text-right text-[9px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 border-b border-gray-200">Lãi Cuối</th>
                            <th className="px-2 py-3 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 border-b border-gray-200">Ký Gửi</th>
                            <th className="px-2 py-3 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 border-b border-gray-200">Trạng thái</th>
                            <th className="px-2 py-3 text-center text-[9px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 border-b border-gray-200">Sửa/Xóa</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                        {filteredData.length > 0 ? filteredData.map((entry, index) => {
                            const total = entry.retailPrice * entry.quantity;
                            const profit = (entry.retailPrice - entry.costPrice) * entry.quantity;
                            const isConsignment = entry.consignor && entry.consignor.trim() !== '';
                            const consignmentBonus = isConsignment ? (entry.costPrice * 0.2 * entry.quantity) : 0;
                            const rowFinalProfit = profit + consignmentBonus;
                            
                            return (
                                <tr key={entry.id} className={`${getStatusStyles(entry.status)} hover:opacity-95 transition-opacity`}>
                                    <td className="px-3 py-3 whitespace-nowrap text-[10px] text-gray-400 font-bold border-b border-gray-50">{entry.date.split('-').reverse().join('/')}</td>
                                    <td className="px-2 py-3 whitespace-nowrap text-[11px] font-black text-gray-900 border-b border-gray-50">{entry.customerName || 'Vãng lai'}</td>
                                    <td className="px-2 py-3 whitespace-nowrap text-[11px] text-gray-600 truncate max-w-[120px] border-b border-gray-50" title={entry.productName}>{entry.productName}</td>
                                    <td className="px-2 py-3 whitespace-nowrap text-[11px] text-gray-400 text-right italic border-b border-gray-50">{formatCurrency(entry.costPrice)}</td>
                                    <td className="px-2 py-3 whitespace-nowrap text-[11px] font-bold text-right border-b border-gray-50">{formatCurrency(entry.retailPrice)}</td>
                                    <td className="px-2 py-3 whitespace-nowrap text-[11px] text-center font-black border-b border-gray-50">{entry.quantity}</td>
                                    <td className="px-2 py-3 whitespace-nowrap text-[11px] font-black text-teal-700 text-right border-b border-gray-50">{formatCurrency(total)}</td>
                                    <td className={`px-2 py-3 whitespace-nowrap text-[11px] font-black text-right border-b border-gray-50 ${entry.status === RevenueStatus.DELIVERED ? 'text-orange-600' : 'text-gray-300'}`}>{formatCurrency(rowFinalProfit)}</td>
                                    <td className="px-2 py-3 whitespace-nowrap text-[10px] font-bold text-purple-600 truncate max-w-[80px] border-b border-gray-50">{entry.consignor || '-'}</td>
                                    <td className="px-2 py-3 whitespace-nowrap border-b border-gray-50">
                                        <select 
                                            value={entry.status} 
                                            onChange={(e) => handleStatusChange(entry.id, e.target.value as RevenueStatus)}
                                            className="text-[9px] font-black uppercase py-0.5 px-2 rounded-full border-gray-200 focus:ring-primary focus:border-primary cursor-pointer shadow-sm bg-white"
                                        >
                                            <option value={RevenueStatus.HOLDING}>Dồn đơn</option>
                                            <option value={RevenueStatus.SHIPPING}>Đang đi</option>
                                            <option value={RevenueStatus.DELIVERED}>Đã giao</option>
                                        </select>
                                    </td>
                                    <td className="px-2 py-3 whitespace-nowrap text-center border-b border-gray-50">
                                        <div className="flex items-center justify-center space-x-1">
                                            <button onClick={() => handleOpenModal(entry)} className="p-1 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"><EditIcon className="w-3.5 h-3.5" /></button>
                                            <button onClick={() => handleDelete(entry.id)} className="p-1 text-red-600 hover:bg-red-50 rounded-lg transition-colors"><TrashIcon className="w-3.5 h-3.5" /></button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        }) : (
                            <tr><td colSpan={11} className="text-center py-20 text-gray-400 italic bg-gray-50 font-medium">Tháng {selectedMonth} chưa có dữ liệu bán hàng.</td></tr>
                        )}
                    </tbody>
                </table>
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
