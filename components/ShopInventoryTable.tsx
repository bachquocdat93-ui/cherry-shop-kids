import React, { useState, useMemo } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';
import { ShopItem, RevenueEntry } from '../types';
import { EditIcon, TrashIcon, PlusIcon, SearchIcon } from './Icons';
import ShopItemModal from './ShopItemModal';

const ShopInventoryTable = () => {
    const [shopItems, setShopItems] = useLocalStorage<ShopItem[]>('shopInventoryData', []);
    const [revenueData] = useLocalStorage<RevenueEntry[]>('revenueData', []);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<ShopItem | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

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
        }
    };

    const filteredItems = useMemo(() => {
        return shopItems.filter(item =>
            item.productName.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [shopItems, searchTerm]);

    const totalInventoryValue = filteredItems.reduce((sum, item) => sum + (item.importPrice * item.quantity), 0);
    const totalPotentialRevenue = filteredItems.reduce((sum, item) => sum + (item.retailPrice * item.quantity), 0);

    return (
        <div className="bg-white p-6 rounded-lg shadow-lg">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                <h2 className="text-2xl font-bold text-gray-800">Kho Hàng Shop</h2>
                <button onClick={() => handleOpenModal()} className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors shadow-lg shadow-primary/30 font-bold">
                    <PlusIcon className="w-5 h-5" /> Thêm sản phẩm
                </button>
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

                            return (
                                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
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
                                <td colSpan={6} className="px-6 py-10 text-center text-gray-400 italic">
                                    Chưa có sản phẩm nào trong kho
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {isModalOpen && <ShopItemModal item={editingItem} onSave={handleSave} onClose={() => { setIsModalOpen(false); setEditingItem(null); }} />}
        </div>
    );
};

export default ShopInventoryTable;
