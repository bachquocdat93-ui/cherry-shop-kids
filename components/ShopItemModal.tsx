import React, { useState, useEffect } from 'react';
import { ShopItem } from '../types';
import { CloseIcon } from './Icons';
import { generateUniqueId } from '../utils/helpers';

interface ShopItemModalProps {
    item: ShopItem | null;
    onSave: (item: ShopItem) => void;
    onClose: () => void;
}

const ShopItemModal: React.FC<ShopItemModalProps> = ({ item, onSave, onClose }) => {
    const [formData, setFormData] = useState<Omit<ShopItem, 'id'>>({
        productName: '',
        importPrice: 0,
        retailPrice: 0,
        quantity: 1,
        note: '',
    });

    useEffect(() => {
        if (item) {
            setFormData({
                productName: item.productName,
                importPrice: item.importPrice,
                retailPrice: item.retailPrice,
                quantity: item.quantity,
                note: item.note || '',
            });
        }
    }, [item]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: (name === 'quantity' || name.includes('Price')) ? parseFloat(value) || 0 : value
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.productName) {
            alert('Vui lòng nhập tên sản phẩm.');
            return;
        }
        onSave({
            ...formData,
            id: item?.id || generateUniqueId(),
        });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-gray-800">{item ? 'Sửa sản phẩm' : 'Thêm sản phẩm mới'}</h3>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><CloseIcon /></button>
                    </div>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tên sản phẩm <span className="text-red-500">*</span></label>
                            <input type="text" name="productName" value={formData.productName} onChange={handleChange} required className="w-full rounded-lg border-gray-200 focus:ring-primary focus:border-primary" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Giá nhập</label>
                                <input type="number" name="importPrice" value={formData.importPrice} onChange={handleChange} className="w-full rounded-lg border-gray-200 focus:ring-primary focus:border-primary" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Giá bán lẻ</label>
                                <input type="number" name="retailPrice" value={formData.retailPrice} onChange={handleChange} className="w-full rounded-lg border-gray-200 focus:ring-primary focus:border-primary" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Số lượng tồn</label>
                            <input type="number" name="quantity" value={formData.quantity} onChange={handleChange} className="w-full rounded-lg border-gray-200 focus:ring-primary focus:border-primary" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Ghi chú</label>
                            <textarea name="note" value={formData.note} onChange={handleChange} rows={3} className="w-full rounded-lg border-gray-200 focus:ring-primary focus:border-primary" />
                        </div>
                        <div className="flex justify-end pt-4 space-x-3 border-t mt-6">
                            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg font-bold">Hủy</button>
                            <button type="submit" className="px-4 py-2 bg-primary text-white rounded-lg font-bold shadow-lg shadow-primary/30">Lưu sản phẩm</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ShopItemModal;
