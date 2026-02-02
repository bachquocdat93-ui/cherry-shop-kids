import React, { useState, useEffect, useMemo, useRef } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';
import type { Invoice, InvoiceItem, RevenueEntry } from '../types';
import { RevenueStatus } from '../types';
import { EditIcon, TrashIcon, PdfIcon, TrashIcon as ClearIcon } from './Icons';
import InvoiceModal from './InvoiceModal';
import ImportModal from './ImportModal';
import { transformToInvoiceData } from '../utils/importer';
import { generateInvoicesTemplate } from '../utils/templateGenerator';
import { generateInvoicePDF } from '../utils/pdfGenerator';

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

    // State and ref for image export - REMOVED

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
            setInvoices(prev => prev.map(i => i.id === invoice.id ? invoice : i));
        } else {
            setInvoices(prev => [...prev, invoice]);
        }
        handleCloseModal();
    };

    const handleDelete = (id: string) => {
        if (window.confirm('Bạn có chắc chắn muốn xóa hóa đơn này?')) {
            setInvoices(prev => prev.filter(i => i.id !== id));
        }
    };

    const handleClearAll = () => {
        setInvoices([]);
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

    const getTabColor = (status: RevenueStatus) => {
        switch (status) {
            case RevenueStatus.HOLDING: return 'border-primary text-primary';
            case RevenueStatus.SHIPPING: return 'border-green-600 text-green-700';
            case RevenueStatus.DELIVERED: return 'border-yellow-500 text-yellow-600';
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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredInvoices.length > 0 ? filteredInvoices.map((invoice) => {
                    const totalPrice = invoice.items.reduce((sum, item) => sum + item.sellingPrice * item.quantity, 0);
                    return (
                        <div key={invoice.id} className={`border rounded-2xl p-5 shadow-sm transition-all hover:shadow-md ${activeTab === RevenueStatus.HOLDING ? 'bg-white border-gray-100' : activeTab === RevenueStatus.SHIPPING ? 'bg-green-50/30 border-green-100' : 'bg-yellow-50/30 border-yellow-100'}`}>
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="font-black text-gray-400 uppercase text-[10px] tracking-widest mb-1">Khách hàng</h3>
                                    <p className="font-bold text-lg text-gray-900 leading-tight">{invoice.customerName}</p>
                                </div>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => handleExportInvoicePdf(invoice)}
                                        className="p-1.5 text-green-600 hover:bg-white rounded-lg shadow-sm border border-transparent hover:border-green-100"
                                        title="Xuất File PDF"
                                    >
                                        <PdfIcon />
                                    </button>

                                    {canModify && (
                                        <>
                                            <button
                                                onClick={() => handleOpenModal(invoice)}
                                                className="p-1.5 text-primary-600 hover:bg-white rounded-lg shadow-sm border border-transparent hover:border-primary-100"
                                                title="Sửa hóa đơn"
                                            >
                                                <EditIcon />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(invoice.id)}
                                                className="p-1.5 text-red-600 hover:bg-white rounded-lg shadow-sm border border-transparent hover:border-red-100"
                                                title="Xóa hóa đơn"
                                            >
                                                <TrashIcon />
                                            </button>
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
                                    <span className="text-gray-500">Tổng tiền ({activeTab}):</span>
                                    <span className="font-bold text-gray-800">{formatCurrency(totalPrice)}</span>
                                </div>
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
            {isImportModalOpen && <ImportModal onClose={() => setIsImportModalOpen(false)} onImport={async (f) => { const d = await transformToInvoiceData(f); setInvoices(prev => [...prev, ...d]); }} title="Nhập hóa đơn" instructions={<p>Tên khách hàng trùng nhau sẽ được gộp.</p>} onDownloadTemplate={generateInvoicesTemplate} />}
        </div>
    );
};

export default InvoicesTable;