import React, { useState, useMemo } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';
import { ShopItem, RevenueEntry } from '../types';
import { EditIcon, TrashIcon, PlusIcon, SearchIcon, UploadIcon } from './Icons';
import ShopItemModal from './ShopItemModal';
import ImportModal from './ImportModal';
import { read, utils, writeFile } from 'xlsx';

const ShopInventoryTable = () => {
    const [shopItems, setShopItems] = useLocalStorage<ShopItem[]>('shopInventoryData', []);
    const [revenueData] = useLocalStorage<RevenueEntry[]>('revenueData', []);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<ShopItem | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    const handleOpenModal = (item: ShopItem | null = null) => {
        setEditingItem(item);
        setIsModalOpen(true);
    };

    const handleSave = (item: ShopItem) => {
        if (editingItem) {
            setShopItems(prev => prev.map(i => i.id === item.id ? item : i));
        } else {
            setShopItems(prev => [...prev, item]);
        }
        setIsModalOpen(false);
        setEditingItem(null);
    };

    const handleDelete = (id: string) => {
        if (window.confirm('Bạn có chắc chắn muốn xóa sản phẩm này khỏi kho?')) {
            setShopItems(prev => prev.filter(i => i.id !== id));
            setSelectedIds(prev => prev.filter(selId => selId !== id));
        }
    };

    const handleDownloadTemplate = () => {
        const templateData = [
            {
                "Tên sản phẩm": "Ví dụ: Áo thun trắng",
                "Giá nhập (VNĐ)": 50000,
                "Giá bán (VNĐ)": 150000,
                "Số lượng": 100,
                "Ghi chú": "Cotton 100%"
            }
        ];
        const ws = utils.json_to_sheet(templateData);
        // Set column widths
        ws['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 30 }];
        const wb = utils.book_new();
        utils.book_append_sheet(wb, ws, "MauNhapKho");
        writeFile(wb, "mau_nhap_kho.xlsx");
    };

    const handleImport = async (file: File) => {
        return new Promise<void>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = e.target?.result;
                    const workbook = read(data, { type: 'binary' });
                    const sheetName = workbook.SheetNames[0];
                    const sheet = workbook.Sheets[sheetName];
                    const jsonData = utils.sheet_to_json(sheet);

                    if (!jsonData || jsonData.length === 0) {
                        reject(new Error("File không có dữ liệu"));
                        return;
                    }

                    const newItems = jsonData.map((row: any): ShopItem | null => {
                        // Mapping columns. Try to be flexible with column names
                        const productName = row['Tên sản phẩm'] || row['Ten san pham'] || row['Product Name'];
                        if (!productName) return null; // Skip invalid rows

                        return {
                            id: crypto.randomUUID(),
                            productName: String(productName),
                            importPrice: Number(row['Giá nhập (VNĐ)'] || row['Gia nhap'] || row['Import Price'] || 0),
                            retailPrice: Number(row['Giá bán (VNĐ)'] || row['Gia ban'] || row['Retail Price'] || 0),
                            quantity: Number(row['Số lượng'] || row['So luong'] || row['Quantity'] || 0),
                            note: row['Ghi chú'] || row['Ghi chu'] || row['Note'] || ''
                        };
                    }).filter((item): item is ShopItem => item !== null);

                    if (newItems.length === 0) {
                        reject(new Error("Không tìm thấy dữ liệu hợp lệ trong file. Vui lòng kiểm tra lại file mẫu."));
                        return;
                    }

                    setShopItems(prev => [...prev, ...newItems]);
                    alert(`Đã nhập thành công ${newItems.length} sản phẩm vào kho.`);
                    resolve();

                } catch (error) {
                    console.error("Import error:", error);
                    reject(error);
                }
            };
            reader.onerror = (error) => reject(error);
            reader.readAsBinaryString(file);
        });
    };

    const filteredItems = useMemo(() => {
        return shopItems.filter(item =>
            item.productName.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [shopItems, searchTerm]);

    const toggleSelectAll = () => {
        if (selectedIds.length === filteredItems.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredItems.map(i => i.id));
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
        if (window.confirm(`Bạn có chắc muốn xóa ${selectedIds.length} sản phẩm đang chọn?`)) {
            setShopItems(prev => prev.filter(i => !selectedIds.includes(i.id)));
            setSelectedIds([]);
        }
    };

    const totalInventoryValue = filteredItems.reduce((sum, item) => sum + (item.importPrice * item.quantity), 0);
    const totalPotentialRevenue = filteredItems.reduce((sum, item) => sum + (item.retailPrice * item.quantity), 0);

    return (
        <div className="bg-white p-6 rounded-lg shadow-lg">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                <h2 className="text-2xl font-bold text-gray-800">Kho Hàng Shop</h2>
                <div className="flex gap-2">
                    {selectedIds.length > 0 && (
                        <button onClick={handleBulkDelete} className="flex items-center gap-2 bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-lg hover:bg-red-100 transition-colors shadow-sm font-bold">
                            <TrashIcon className="w-5 h-5" /> Xóa {selectedIds.length} mục
                        </button>
                    )}
                    <button onClick={() => setIsImportModalOpen(true)} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors shadow-lg shadow-green-600/30 font-bold">
                        <UploadIcon className="w-5 h-5" /> Nhập Excel
                    </button>
                    <button onClick={() => handleOpenModal()} className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors shadow-lg shadow-primary/30 font-bold">
                        <PlusIcon className="w-5 h-5" /> Thêm sản phẩm
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                    <p className="text-xs font-bold text-blue-400 uppercase">Tổng Vốn Tồn Kho</p>
                    <p className="text-2xl font-black text-blue-700">{formatCurrency(totalInventoryValue)}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                    <p className="text-xs font-bold text-green-400 uppercase">Tổng Giá Trị Bán Lẻ</p>
                    <p className="text-2xl font-black text-green-700">{formatCurrency(totalPotentialRevenue)}</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                    <p className="text-xs font-bold text-purple-400 uppercase">Tổng Sản Phẩm</p>
                    <p className="text-2xl font-black text-purple-700">{filteredItems.reduce((acc, i) => acc + i.quantity, 0)}</p>
                </div>
            </div>

            <div className="mb-6 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <SearchIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                    type="text"
                    placeholder="Tìm kiếm sản phẩm..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-full sm:w-96 px-4 py-2 rounded-lg border-gray-200 focus:ring-primary focus:border-primary"
                />
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 w-10">
                                <input
                                    type="checkbox"
                                    checked={filteredItems.length > 0 && selectedIds.length === filteredItems.length}
                                    onChange={toggleSelectAll}
                                    className="rounded border-gray-300 text-primary focus:ring-primary"
                                />
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Tên Sản Phẩm</th>
                            <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Tổng Nhập</th>
                            <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Đã Bán</th>
                            <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Tồn Kho</th>
                            <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Giá Nhập</th>
                            <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Giá Bán</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Ghi Chú</th>
                            <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Hành Động</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredItems.map((item) => {
                            const soldQty = revenueData.reduce((sum, entry) => {
                                return (entry.shopItemId === item.id) ? sum + entry.quantity : sum;
                            }, 0);
                            const initialQty = item.quantity + soldQty;
                            const isSelected = selectedIds.includes(item.id);

                            return (
                                <tr key={item.id} className={`hover:bg-gray-50 transition-colors ${isSelected ? 'bg-blue-50/50' : ''}`}>
                                    <td className="px-6 py-4">
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => toggleSelectOne(item.id)}
                                            className="rounded border-gray-300 text-primary focus:ring-primary"
                                        />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{item.productName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-500">{initialQty}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center font-bold text-orange-600">{soldQty}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${item.quantity > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {item.quantity}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">{formatCurrency(item.importPrice)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-primary">{formatCurrency(item.retailPrice)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 max-w-xs truncate">{item.note}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button onClick={() => handleOpenModal(item)} className="text-primary hover:text-primary-900 mr-3"><EditIcon className="w-5 h-5" /></button>
                                        <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-900"><TrashIcon className="w-5 h-5" /></button>
                                    </td>
                                </tr>
                            );
                        })}
                        {filteredItems.length === 0 && (
                            <tr>
                                <td colSpan={9} className="px-6 py-10 text-center text-gray-400 italic">
                                    Chưa có sản phẩm nào trong kho
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {isModalOpen && <ShopItemModal item={editingItem} onSave={handleSave} onClose={() => { setIsModalOpen(false); setEditingItem(null); }} />}

            {isImportModalOpen && (
                <ImportModal
                    title="Nhập Kho Từ File Excel"
                    onClose={() => setIsImportModalOpen(false)}
                    onImport={handleImport}
                    onDownloadTemplate={handleDownloadTemplate}
                    instructions={
                        <ul className="list-disc list-inside space-y-1">
                            <li>Tải file mẫu để xem định dạng đúng.</li>
                            <li>Các cột bắt buộc: <strong>Tên sản phẩm</strong>.</li>
                            <li>Các cột khác như Giá nhập, Giá bán, Số lượng sẽ mặc định là 0 nếu để trống.</li>
                        </ul>
                    }
                />
            )}
        </div>
    );
};

export default ShopInventoryTable;
