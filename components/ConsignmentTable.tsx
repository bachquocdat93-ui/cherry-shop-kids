import React, { useState, useMemo, useRef, useEffect } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';
import { ConsignmentItem, ConsignmentStatus } from '../types';
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
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<ConsignmentItem | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [visibleColumns, setVisibleColumns] = useLocalStorage<string[]>('consignmentVisibleColumns', CONSIGNMENT_COLUMNS.map(c => c.key));

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

            Hành động này sẽ XÓA tất cả các sản phẩm có trạng thái "Đã bán" của khách hàng này khỏi danh sách ký gửi.
        `;

        if (window.confirm(confirmationMessage)) {
            setItems(prevItems => prevItems.filter(item => {
                return item.customerName !== customerName || item.status !== ConsignmentStatus.SOLD;
            }));
            alert(`Đã thanh toán thành công cho ${customerName} và xóa các mục đã bán.`);
        }
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-lg">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-bold text-gray-800">Quản lý Khách ký gửi</h2>
                    <button onClick={handleClearAll} className="text-red-500 hover:text-red-700 text-sm flex items-center gap-1 font-medium bg-red-50 px-2 py-1 rounded">
                        <ClearIcon className="w-3 h-3" /> Xóa sạch
                    </button>
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                    <ColumnToggler columns={CONSIGNMENT_COLUMNS} visibleColumns={visibleColumns} onToggle={setVisibleColumns} />
                    <button onClick={() => setIsImportModalOpen(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors shadow-sm">
                        <UploadIcon />
                        <span className="font-medium">Nhập Excel</span>
                    </button>
                    <button onClick={() => handleOpenModal()} className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-700 transition-colors shadow-sm">
                        <PlusIcon />
                        <span className="font-medium">Thêm Ký Gửi</span>
                    </button>
                </div>
            </div>

            <div className="mb-6">
                <input
                    type="text"
                    placeholder="Tìm theo tên khách ký gửi..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border-gray-200 focus:ring-primary focus:border-primary text-sm shadow-sm"
                />
            </div>

            <div className="space-y-10">
                {paginatedEntries.length > 0 ? paginatedEntries.map(([customerName, customerItems]) => {
                    const summary = calculateSummary(customerItems);
                    return (
                        <div key={customerName} className="border border-gray-200 rounded-2xl p-5 shadow-sm bg-white overflow-hidden">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-5 gap-3">
                                <h3 className="text-xl font-black text-primary flex items-center gap-2">
                                    <span className="bg-primary/10 p-2 rounded-lg"><PdfIcon className="w-5 h-5" /></span>
                                    {customerName}
                                </h3>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <button
                                        onClick={() => handleExportConsignmentPdf(customerName, customerItems)}
                                        className="flex items-center gap-2 text-[11px] font-black uppercase bg-green-600 text-white px-3 py-2 rounded-xl hover:bg-green-700 transition-colors shadow-sm"
                                    >
                                        <PdfIcon className="w-4 h-4" />
                                        <span>Xuất file</span>
                                    </button>
                                    {summary.soldItems > 0 && (
                                        <button
                                            onClick={() => handleSettle(customerName, customerItems)}
                                            className="flex items-center gap-2 text-[11px] font-black uppercase bg-purple-600 text-white px-3 py-2 rounded-xl hover:bg-purple-700 transition-colors shadow-sm"
                                        >
                                            <CheckCircleIcon className="w-4 h-4" />
                                            <span>Thanh toán</span>
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleDeleteCustomer(customerName)}
                                        className="flex items-center gap-2 text-[11px] font-black uppercase bg-red-50 text-red-600 px-3 py-2 rounded-xl hover:bg-red-600 hover:text-white transition-colors border border-red-100"
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                        <span>Xóa Khách</span>
                                    </button>
                                </div>
                            </div>
                            <div className="overflow-x-auto border rounded-xl mb-4 shadow-inner">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-100">
                                        <tr>
                                            {CONSIGNMENT_COLUMNS.map(col => visibleColumns.includes(col.key) && (
                                                <th key={col.key} className="px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">{col.label}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-100">
                                        {customerItems.map(item => {
                                            const amountAfterFee = item.consignmentPrice * (1 - item.consignmentFee / 100);
                                            return (
                                                <tr key={item.id} className={`${getStatusRowClass(item.status)} hover:opacity-95 transition-opacity`}>
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
                            <div className="bg-gray-50 p-4 rounded-xl flex flex-wrap justify-end gap-x-8 gap-y-3 text-xs border border-gray-100">
                                <div className="flex items-center gap-2"><span className="text-gray-400 font-bold uppercase text-[9px]">Tổng sản phẩm:</span> <span className="font-black text-gray-900">{summary.totalItems}</span></div>
                                <div className="flex items-center gap-2"><span className="text-gray-400 font-bold uppercase text-[9px]">Đã bán:</span> <span className="text-yellow-600 font-black">{summary.soldItems}</span></div>
                                <div className="flex items-center gap-2"><span className="text-gray-400 font-bold uppercase text-[9px]">Mới cọc:</span> <span className="text-green-600 font-black">{summary.depositedItems}</span></div>
                                <div className="flex items-center gap-2"><span className="text-gray-400 font-bold uppercase text-[9px]">Đã trả:</span> <span className="text-red-600 font-black">{summary.returnedItems}</span></div>
                                <div className="flex items-center gap-2"><span className="text-gray-400 font-bold uppercase text-[9px]">Còn lại:</span> <span className="text-blue-600 font-black">{summary.inStockItems}</span></div>
                                <div className="flex items-center gap-2 px-3 py-1 bg-purple-100 rounded-lg text-purple-700 font-black"><span className="uppercase text-[9px] mr-1">Tiền cần thanh toán:</span> {formatCurrency(summary.totalTransferAmount)}</div>
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
                        Trang Trước
                    </button>
                    <span className="text-sm font-bold text-gray-500">
                        Trang {currentPage} / {totalPages}
                    </span>
                    <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="px-4 py-2 text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        Trang Sau
                    </button>
                </div>
            )}

            {isModalOpen && <ConsignmentModal item={editingItem} onSave={handleSave} onClose={handleCloseModal} />}
            {isImportModalOpen && <ImportModal onClose={() => setIsImportModalOpen(false)} onImport={handleImport} title="Nhập dữ liệu Ký gửi" instructions={importInstructions} onDownloadTemplate={generateConsignmentTemplate} />}
        </div>
    );
};

export default ConsignmentTable;