import React, { useState, useMemo, useRef, useEffect } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';
import { ConsignmentItem, ConsignmentStatus, RevenueEntry, RevenueStatus } from '../types';
import { PlusIcon, EditIcon, TrashIcon, PdfIcon, UploadIcon, CheckCircleIcon, TrashIcon as ClearIcon } from './Icons';
import ConsignmentModal from './ConsignmentModal';
import ImportModal from './ImportModal';
import { transformToConsignmentData } from '../utils/importer';
import { generateConsignmentTemplate } from '../utils/templateGenerator';
import { generateConsignmentPDF } from '../utils/pdfGenerator';
import ColumnToggler from './ColumnToggler';

const initialData: ConsignmentItem[] = [];
const GROUPS_PER_PAGE = 5; // Number of customer groups per page

type GroupedItems = {
    [customerName: string]: ConsignmentItem[];
}

const CONSIGNMENT_COLUMNS = [
    { key: 'productName', label: 'Sản Phẩm' },
    { key: 'consignmentPrice', label: 'Giá Bán' },
    { key: 'quantity', label: 'SL' },
    { key: 'consignmentFee', label: 'Phí %' },
    { key: 'amountAfterFee', label: 'Tiền nhận lại' },
    { key: 'status', label: 'Trạng Thái' },
    { key: 'note', label: 'NOTE' },
    { key: 'actions', label: 'Hành động' },
];

const ConsignmentTable: React.FC = () => {
    const [items, setItems] = useLocalStorage<ConsignmentItem[]>('consignmentData', initialData);
    const [revenueData, setRevenueData] = useLocalStorage<RevenueEntry[]>('revenueData', []);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<ConsignmentItem | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [visibleColumns, setVisibleColumns] = useLocalStorage<string[]>('consignmentVisibleColumns', CONSIGNMENT_COLUMNS.map(c => c.key));
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    // Image export effects removed

    const groupedItems = useMemo(() => {
        return items.reduce((acc, item) => {
            (acc[item.customerName] = acc[item.customerName] || []).push(item);
            return acc;
        }, {} as GroupedItems);
    }, [items]);

    const groupedEntries = useMemo(() => Object.entries(groupedItems) as [string, ConsignmentItem[]][], [groupedItems]);

    const filteredEntries = useMemo(() => {
        if (!searchTerm.trim()) {
            return groupedEntries;
        }
        const lowercasedTerm = searchTerm.toLowerCase();
        return groupedEntries.filter(([customerName]) =>
            customerName.toLowerCase().includes(lowercasedTerm)
        );
    }, [groupedEntries, searchTerm]);

    const totalPages = Math.ceil(filteredEntries.length / GROUPS_PER_PAGE);

    const paginatedEntries = useMemo(() => {
        const startIndex = (currentPage - 1) * GROUPS_PER_PAGE;
        return filteredEntries.slice(startIndex, startIndex + GROUPS_PER_PAGE);
    }, [filteredEntries, currentPage]);

    // Reset to page 1 if search term changes
    useEffect(() => {
        if (currentPage !== 1) {
            setCurrentPage(1);
        }
    }, [searchTerm]);

    // Reset to page 1 if data changes make the current page invalid
    useEffect(() => {
        if (currentPage > totalPages && totalPages > 0) {
            setCurrentPage(1);
        }
    }, [currentPage, totalPages]);


    const handleOpenModal = (item: ConsignmentItem | null = null) => {
        setEditingItem(item);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingItem(null);
    };

    const handleSave = (item: ConsignmentItem) => {
        if (editingItem) {
            setItems(prev => prev.map(i => i.id === item.id ? item : i));
        } else {
            setItems(prev => [...prev, { ...item, id: Date.now().toString() }]);
        }
        handleCloseModal();
    };

    const handleDelete = (id: string) => {
        if (window.confirm('Bạn có chắc chắn muốn xóa mục ký gửi này?')) {
            setItems(prev => prev.filter(i => i.id !== id));
        }
    };

    const handleDeleteCustomer = (customerName: string) => {
        if (window.confirm(`Bạn có chắc chắn muốn xóa TẤT CẢ các mục ký gửi của khách hàng "${customerName}" không? Hành động này không thể hoàn tác.`)) {
            setItems(prevItems => prevItems.filter(item => item.customerName !== customerName));
        }
    };

    const handleClearAll = () => {
        if (window.confirm('Bạn có chắc chắn muốn xóa TẤT CẢ dữ liệu ký gửi không? Hành động này không thể hoàn tác.')) {
            setItems([]);
        }
    };

    const toggleSelectAll = () => {
        // Flatten all items currently visible (filtered)
        const allVisibleItems = filteredEntries.flatMap(([_, items]) => items);
        if (selectedIds.length === allVisibleItems.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(allVisibleItems.map(i => i.id));
        }
    };

    const toggleSelectOne = (id: string) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(prev => prev.filter(i => i !== id));
        } else {
            setSelectedIds(prev => [...prev, id]);
        }
    };

    const handleBulkDelete = () => {
        if (window.confirm(`Bạn có chắc muốn xóa ${selectedIds.length} mục ký gửi đã chọn?`)) {
            setItems(prev => prev.filter(i => !selectedIds.includes(i.id)));
            setSelectedIds([]);
        }
    };

    const handleImport = async (file: File) => {
        try {
            const newData = await transformToConsignmentData(file);
            setItems(prev => [...prev, ...newData]);
            alert(`Đã nhập thành công ${newData.length} mục ký gửi mới!`);
        } catch (error: any) {
            alert(`Lỗi: ${error.message}`);
        }
    };

    const importInstructions = (
        <ul className="list-disc list-inside space-y-1 text-xs">
            <li>File phải là định dạng Excel (.xlsx, .csv).</li>
            <li>Các cột bắt buộc: <strong>Tên Khách Hàng, Tên Sản Phẩm, Giá Gửi Bán</strong>.</li>
            <li>Trạng thái: "Còn hàng", "Mới cọc", "Đã bán".</li>
        </ul>
    );

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    const handleExportConsignmentPdf = (customerName: string, customerItems: ConsignmentItem[]) => {
        generateConsignmentPDF(customerName, customerItems);
    };

    const getStatusRowClass = (status: ConsignmentStatus) => {
        switch (status) {
            case ConsignmentStatus.SOLD:
                return 'bg-yellow-100 text-yellow-900';
            case ConsignmentStatus.DEPOSITED:
                return 'bg-green-100 text-green-900';
            case ConsignmentStatus.IN_STOCK:
                return 'bg-white text-gray-800';
            case ConsignmentStatus.RETURNED:
                return 'bg-red-100 text-red-900';
            default:
                return 'bg-white';
        }
    };

    const getStatusBadge = (status: ConsignmentStatus) => {
        switch (status) {
            case ConsignmentStatus.SOLD:
                return <span className="px-2 inline-flex text-[10px] leading-5 font-black uppercase rounded-full bg-yellow-300 text-yellow-900 border border-yellow-400">Đã bán</span>;
            case ConsignmentStatus.DEPOSITED:
                return <span className="px-2 inline-flex text-[10px] leading-5 font-black uppercase rounded-full bg-green-300 text-green-900 border border-green-400">Mới cọc</span>;
            case ConsignmentStatus.IN_STOCK:
                return <span className="px-2 inline-flex text-[10px] leading-5 font-black uppercase rounded-full bg-gray-100 text-gray-500 border border-gray-200">Còn hàng</span>;
            case ConsignmentStatus.RETURNED:
                return <span className="px-2 inline-flex text-[10px] leading-5 font-black uppercase rounded-full bg-red-300 text-red-900 border border-red-400">Trả hàng</span>;
            default:
                return <span className="px-2 inline-flex text-[10px] leading-5 font-black uppercase rounded-full bg-gray-100 text-gray-800">{status}</span>;
        }
    };

    const calculateSummary = (customerItems: ConsignmentItem[]) => {
        const totalItems = customerItems.reduce((sum, item) => sum + item.quantity, 0);
        const soldItems = customerItems.filter(i => i.status === ConsignmentStatus.SOLD).reduce((sum, item) => sum + item.quantity, 0);
        const depositedItems = customerItems.filter(i => i.status === ConsignmentStatus.DEPOSITED).reduce((sum, item) => sum + item.quantity, 0);
        const returnedItems = customerItems.filter(i => i.status === ConsignmentStatus.RETURNED).reduce((sum, item) => sum + item.quantity, 0);
        const inStockItems = customerItems.filter(i => i.status === ConsignmentStatus.IN_STOCK).reduce((sum, item) => sum + item.quantity, 0);
        const totalTransferAmount = customerItems.filter(i => i.status === ConsignmentStatus.SOLD)
            .reduce((sum, item) => sum + (item.consignmentPrice * (1 - item.consignmentFee / 100)) * item.quantity, 0);

        return { totalItems, soldItems, depositedItems, returnedItems, inStockItems, totalValueSold: totalTransferAmount, totalTransferAmount };
    };

    const handleSettle = (customerName: string, customerItems: ConsignmentItem[]) => {
        const summary = calculateSummary(customerItems);
        if (summary.soldItems === 0) {
            alert(`Khách hàng ${customerName} không có sản phẩm nào "Đã bán" để thanh toán.`);
            return;
        }

        const confirmationMessage = `
            Bạn có chắc chắn muốn thanh toán cho khách hàng "${customerName}"?

            - Số sản phẩm đã bán: ${summary.soldItems}
            - Tổng số tiền chuyển lại: ${formatCurrency(summary.totalTransferAmount)}
            - Lợi nhuận cửa hàng (Phí): ${formatCurrency(summary.totalValueSold - summary.totalTransferAmount)}

            Hành động này sẽ:
            1. Tạo doanh thu lợi nhuận cho cửa hàng.
            2. XÓA các sản phẩm "Đã bán" khỏi danh sách.
        `;

        if (window.confirm(confirmationMessage)) {
            // 1. Generate Revenue Entries for the Shop's Profit
            const soldItems = customerItems.filter(i => i.status === ConsignmentStatus.SOLD);
            const newRevenueEntries: RevenueEntry[] = soldItems.map(item => {
                const profitPerItem = item.consignmentPrice * (item.consignmentFee / 100);
                return {
                    id: crypto.randomUUID(),
                    date: new Date().toISOString(), // Settle Date
                    customerName: `[Ký Gửi] ${item.customerName}`,
                    productName: `Phí ký gửi: ${item.productName}`,
                    costPrice: 0, // Pure profit
                    retailPrice: profitPerItem, // The fee is the revenue
                    quantity: item.quantity,
                    note: `Thanh toán hàng ký gửi. Giá bán gốc: ${item.consignmentPrice}`,
                    status: RevenueStatus.DELIVERED,
                    consignor: item.customerName
                };
            });

            setRevenueData(prev => [...prev, ...newRevenueEntries]);

            // 2. Remove settled items
            setItems(prevItems => prevItems.filter(item => {
                return item.customerName !== customerName || item.status !== ConsignmentStatus.SOLD;
            }));

            alert(`Đã thanh toán thành công!\nĐã thêm ${formatCurrency(summary.totalValueSold - summary.totalTransferAmount)} vào doanh thu.`);
        }
    };

    return (
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg">
            {/* Mobile-optimized Header/Toolbar */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 sm:mb-6 gap-3 sm:gap-4">
                <div className="flex items-center justify-between w-full md:w-auto">
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Khách ký gửi</h2>
                    {/* Mobile Add Button */}
                    <button onClick={() => handleOpenModal()} className="md:hidden bg-primary text-white p-2 rounded-xl hover:bg-primary-700 transition-colors shadow-sm"><PlusIcon className="w-5 h-5" /></button>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full md:flex-1 md:justify-end items-stretch sm:items-center">
                    <div className="w-full sm:w-auto sm:max-w-xs flex-1">
                        <input
                            type="text"
                            placeholder="Tìm tên khách..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border-gray-200 focus:ring-primary focus:border-primary text-sm shadow-sm"
                        />
                    </div>

                    <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 justify-between sm:justify-start">
                        <button onClick={handleClearAll} className="hidden lg:flex text-red-500 hover:text-red-700 text-[10px] items-center gap-1 font-black bg-red-50 px-2 py-1 rounded border border-red-100 uppercase whitespace-nowrap">
                            <ClearIcon className="w-3 h-3" /> Xóa sạch
                        </button>

                        {selectedIds.length > 0 && (
                            <button onClick={handleBulkDelete} className="bg-red-50 text-red-600 px-3 py-2 rounded-xl border border-red-200 hover:bg-red-100 transition-colors shadow-sm font-bold text-xs flex items-center gap-1 whitespace-nowrap">
                                <TrashIcon className="w-4 h-4" /> ({selectedIds.length})
                            </button>
                        )}

                        <div className="hidden md:block">
                            <ColumnToggler columns={CONSIGNMENT_COLUMNS} visibleColumns={visibleColumns} onToggle={setVisibleColumns} />
                        </div>

                        <button onClick={() => setIsImportModalOpen(true)} className="flex items-center gap-1 bg-blue-50 text-blue-600 px-3 py-2 rounded-xl hover:bg-blue-100 transition-colors shadow-sm font-bold text-xs whitespace-nowrap">
                            <UploadIcon className="w-4 h-4" />
                            <span>Excel</span>
                        </button>
                        <button onClick={() => handleOpenModal()} className="hidden md:flex items-center gap-1 bg-primary text-white px-3 py-2 rounded-xl hover:bg-primary-700 transition-colors shadow-sm font-bold text-xs whitespace-nowrap">
                            <PlusIcon className="w-4 h-4" />
                            <span>Thêm Mới</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="space-y-6 sm:space-y-10">
                {paginatedEntries.length > 0 ? paginatedEntries.map(([customerName, customerItems]) => {
                    const summary = calculateSummary(customerItems);
                    const isAllSelected = customerItems.every(i => selectedIds.includes(i.id)) && customerItems.length > 0;

                    return (
                        <div key={customerName} className="border border-gray-200 rounded-2xl p-4 sm:p-5 shadow-sm bg-white overflow-hidden">
                            {/* Customer Header */}
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3 bg-gray-50/50 -mx-4 -mt-4 p-4 sm:mx-0 sm:mt-0 sm:bg-transparent sm:p-0">
                                <h3 className="text-lg sm:text-xl font-black text-primary flex items-center gap-2">
                                    <span className="bg-primary/10 p-1.5 rounded-lg"><PdfIcon className="w-4 h-4 sm:w-5 sm:h-5" /></span>
                                    <span className="truncate max-w-[200px] sm:max-w-none">{customerName}</span>
                                </h3>
                                <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                                    <button
                                        onClick={() => handleExportConsignmentPdf(customerName, customerItems)}
                                        className="flex-1 sm:flex-none justify-center flex items-center gap-1 text-[10px] sm:text-[11px] font-black uppercase bg-green-50 text-green-700 border border-green-200 px-2 sm:px-3 py-2 rounded-xl hover:bg-green-100 transition-colors shadow-sm"
                                    >
                                        <PdfIcon className="w-3.5 h-3.5" />
                                        <span>PDF</span>
                                    </button>
                                    {summary.soldItems > 0 && (
                                        <button
                                            onClick={() => handleSettle(customerName, customerItems)}
                                            className="flex-1 sm:flex-none justify-center flex items-center gap-1 text-[10px] sm:text-[11px] font-black uppercase bg-purple-600 text-white px-2 sm:px-3 py-2 rounded-xl hover:bg-purple-700 transition-colors shadow-sm"
                                        >
                                            <CheckCircleIcon className="w-3.5 h-3.5" />
                                            <span>Thanh toán</span>
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleDeleteCustomer(customerName)}
                                        className="flex-none flex items-center gap-2 text-[10px] sm:text-[11px] font-black uppercase bg-red-50 text-red-600 px-3 py-2 rounded-xl hover:bg-red-600 hover:text-white transition-colors border border-red-100"
                                        title="Xóa khách này"
                                    >
                                        <TrashIcon className="w-3.5 h-3.5" />
                                        <span className="hidden sm:inline">Xóa Khách</span>
                                    </button>
                                </div>
                            </div>

                            {/* Desktop Table View */}
                            <div className="hidden md:block overflow-x-auto border rounded-xl mb-4 shadow-inner">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-100">
                                        <tr>
                                            <th className="px-4 py-3 w-8 text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={isAllSelected}
                                                    onChange={() => {
                                                        if (isAllSelected) {
                                                            setSelectedIds(prev => prev.filter(id => !customerItems.map(i => i.id).includes(id)));
                                                        } else {
                                                            const newIds = customerItems.map(i => i.id).filter(id => !selectedIds.includes(id));
                                                            setSelectedIds(prev => [...prev, ...newIds]);
                                                        }
                                                    }}
                                                    className="rounded border-gray-300 text-primary focus:ring-primary"
                                                />
                                            </th>
                                            {CONSIGNMENT_COLUMNS.map(col => visibleColumns.includes(col.key) && (
                                                <th key={col.key} className="px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">{col.label}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-100">
                                        {customerItems.map(item => {
                                            const amountAfterFee = item.consignmentPrice * (1 - item.consignmentFee / 100);
                                            const isSelected = selectedIds.includes(item.id);
                                            return (
                                                <tr key={item.id} className={`${getStatusRowClass(item.status)} hover:opacity-95 transition-opacity ${isSelected ? 'ring-2 ring-inset ring-blue-400 bg-blue-50' : ''}`}>
                                                    <td className="px-4 py-3 text-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={() => toggleSelectOne(item.id)}
                                                            className="rounded border-gray-300 text-primary focus:ring-primary"
                                                        />
                                                    </td>
                                                    {visibleColumns.includes('productName') && <td className="px-4 py-3 whitespace-nowrap text-xs font-bold">{item.productName}</td>}
                                                    {visibleColumns.includes('consignmentPrice') && <td className="px-4 py-3 whitespace-nowrap text-xs font-medium">{formatCurrency(item.consignmentPrice)}</td>}
                                                    {visibleColumns.includes('quantity') && <td className="px-4 py-3 whitespace-nowrap text-xs text-center font-black">{item.quantity}</td>}
                                                    {visibleColumns.includes('consignmentFee') && <td className="px-4 py-3 whitespace-nowrap text-xs italic opacity-60">{item.consignmentFee}%</td>}
                                                    {visibleColumns.includes('amountAfterFee') && <td className="px-4 py-3 whitespace-nowrap text-xs font-black text-blue-700">{formatCurrency(amountAfterFee)}</td>}
                                                    {visibleColumns.includes('status') && <td className="px-4 py-3 whitespace-nowrap text-xs">{getStatusBadge(item.status)}</td>}
                                                    {visibleColumns.includes('note') && <td className="px-4 py-3 text-xs text-gray-500 italic max-w-[150px] whitespace-pre-wrap break-words" title={item.note}>{item.note || '-'}</td>}
                                                    {visibleColumns.includes('actions') && <td className="px-4 py-3 whitespace-nowrap text-xs">
                                                        <div className="flex gap-1">
                                                            <button onClick={() => handleOpenModal(item)} className="p-1.5 hover:bg-white rounded-lg text-primary-600 transition-colors border border-transparent hover:border-primary-100"><EditIcon className="w-4 h-4" /></button>
                                                            <button onClick={() => handleDelete(item.id)} className="p-1.5 hover:bg-white rounded-lg text-red-600 transition-colors border border-transparent hover:border-red-100"><TrashIcon className="w-4 h-4" /></button>
                                                        </div>
                                                    </td>}
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Card View */}
                            <div className="md:hidden space-y-3 mb-4">
                                <div className="flex items-center gap-2 mb-2 px-1">
                                    <input
                                        type="checkbox"
                                        checked={isAllSelected}
                                        onChange={() => {
                                            if (isAllSelected) {
                                                setSelectedIds(prev => prev.filter(id => !customerItems.map(i => i.id).includes(id)));
                                            } else {
                                                const newIds = customerItems.map(i => i.id).filter(id => !selectedIds.includes(id));
                                                setSelectedIds(prev => [...prev, ...newIds]);
                                            }
                                        }}
                                        className="rounded border-gray-300 text-primary focus:ring-primary w-5 h-5"
                                    />
                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Chọn tất cả ({customerItems.length})</span>
                                </div>
                                {customerItems.map(item => {
                                    const amountAfterFee = item.consignmentPrice * (1 - item.consignmentFee / 100);
                                    const isSelected = selectedIds.includes(item.id);
                                    return (
                                        <div key={item.id} className={`border rounded-xl p-3 shadow-sm ${getStatusRowClass(item.status)} ${isSelected ? 'ring-2 ring-primary' : ''}`}>
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex items-center gap-2 flex-1">
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => toggleSelectOne(item.id)}
                                                        className="rounded border-gray-300 text-primary focus:ring-primary"
                                                    />
                                                    <div className="min-w-0">
                                                        <p className="font-bold text-gray-800 text-sm truncate pr-2">{item.productName}</p>
                                                        <div className="flex items-center gap-2">{getStatusBadge(item.status)} <span className="text-[10px] text-gray-400">SL: {item.quantity}</span></div>
                                                    </div>
                                                </div>
                                                <div className="flex gap-1 shrink-0">
                                                    <button onClick={() => handleOpenModal(item)} className="p-1.5 bg-white rounded-lg text-primary-600 shadow-sm border border-gray-100"><EditIcon className="w-4 h-4" /></button>
                                                    <button onClick={() => handleDelete(item.id)} className="p-1.5 bg-white rounded-lg text-red-600 shadow-sm border border-gray-100"><TrashIcon className="w-4 h-4" /></button>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2 bg-white/60 p-2 rounded-lg text-xs">
                                                <div>
                                                    <p className="text-[10px] text-gray-400 uppercase">Giá bán</p>
                                                    <p className="font-bold text-gray-900">{formatCurrency(item.consignmentPrice)}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[10px] text-gray-400 uppercase">Nhận về ({100 - item.consignmentFee}%)</p>
                                                    <p className="font-black text-blue-700">{formatCurrency(amountAfterFee)}</p>
                                                </div>
                                            </div>
                                            {item.note && <p className="mt-2 text-xs text-gray-500 italic bg-gray-50 p-1.5 rounded border border-gray-100">"{item.note}"</p>}
                                        </div>
                                    )
                                })}
                            </div>

                            {/* Footer Stats */}
                            <div className="bg-gray-50 p-3 sm:p-4 rounded-xl flex flex-col sm:flex-row flex-wrap justify-end gap-2 sm:gap-x-8 sm:gap-y-3 text-xs border border-gray-100">
                                <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-4">
                                    <div className="flex items-center gap-2"><span className="text-gray-400 font-bold uppercase text-[9px]">Tổng SP:</span> <span className="font-black text-gray-900">{summary.totalItems}</span></div>
                                    <div className="flex items-center gap-2"><span className="text-gray-400 font-bold uppercase text-[9px]">Đã bán:</span> <span className="text-yellow-600 font-black">{summary.soldItems}</span></div>
                                    <div className="flex items-center gap-2"><span className="text-gray-400 font-bold uppercase text-[9px]">Mới cọc:</span> <span className="text-green-600 font-black">{summary.depositedItems}</span></div>
                                    <div className="flex items-center gap-2"><span className="text-gray-400 font-bold uppercase text-[9px]">Đã trả:</span> <span className="text-red-600 font-black">{summary.returnedItems}</span></div>
                                </div>
                                <div className="w-full h-px bg-gray-200 sm:hidden"></div>
                                <div className="flex items-center justify-between sm:justify-start gap-2">
                                    <div className="flex items-center gap-2"><span className="text-gray-400 font-bold uppercase text-[9px]">Kho:</span> <span className="text-blue-600 font-black">{summary.inStockItems}</span></div>
                                    <div className="flex items-center gap-2 px-3 py-1 bg-purple-100 rounded-lg text-purple-700 font-black"><span className="uppercase text-[9px] mr-1">Thanh toán:</span> {formatCurrency(summary.totalTransferAmount)}</div>
                                </div>
                            </div>
                        </div>)
                }) : (
                    <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                        <p className="text-gray-400 font-medium italic">
                            {searchTerm ? `Không tìm thấy khách hàng nào có tên "${searchTerm}".` : 'Chưa có dữ liệu hàng ký gửi.'}
                        </p>
                    </div>
                )}
            </div>

            {totalPages > 1 && (
                <div className="mt-8 pt-6 border-t border-gray-200 flex justify-between items-center">
                    <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="px-4 py-2 text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        Trước
                    </button>
                    <span className="text-sm font-bold text-gray-500">
                        Page {currentPage} / {totalPages}
                    </span>
                    <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="px-4 py-2 text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        Sau
                    </button>
                </div>
            )}

            {isModalOpen && <ConsignmentModal item={editingItem} onSave={handleSave} onClose={handleCloseModal} />}
            {isImportModalOpen && <ImportModal onClose={() => setIsImportModalOpen(false)} onImport={handleImport} title="Nhập dữ liệu Ký gửi" instructions={importInstructions} onDownloadTemplate={generateConsignmentTemplate} />}
        </div>
    );
};

export default ConsignmentTable;