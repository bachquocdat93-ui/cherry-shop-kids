import React, { useState } from 'react';
import type { Invoice, InvoiceItem } from '../types';
import { CloseIcon } from './Icons';
import { generateUniqueId } from '../utils/helpers';

interface SplitInvoiceModalProps {
    invoice: Invoice;
    onSave: (updatedOriginal: Invoice, newInvoice: Invoice) => void;
    onClose: () => void;
}

const SplitInvoiceModal = ({ invoice, onSave, onClose }: SplitInvoiceModalProps) => {
    // Stores how many of each item's quantity to MOVE to the NEW invoice
    const [splitQuantities, setSplitQuantities] = useState<Record<string, number>>({});
    const [origDeposit, setOrigDeposit] = useState(invoice.deposit);
    const [newDeposit, setNewDeposit] = useState(0);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    const handleQuantityChange = (itemId: string, value: number, maxQty: number) => {
        const validValue = Math.max(0, Math.min(maxQty, value || 0));
        setSplitQuantities(prev => ({
            ...prev,
            [itemId]: validValue
        }));
    };

    const handleConfirm = () => {
        const originalItems: InvoiceItem[] = [];
        const newItems: InvoiceItem[] = [];

        invoice.items.forEach(item => {
            const moveQty = splitQuantities[item.id] || 0;
            const keepQty = item.quantity - moveQty;

            if (keepQty > 0) {
                originalItems.push({ ...item, quantity: keepQty });
            }
            if (moveQty > 0) {
                // We keep the original structure for the new item, just assigning a new unique ID for the line item itself
                // so React keys and tracking don't collide if we edit them later.
                newItems.push({ ...item, id: generateUniqueId(), quantity: moveQty });
            }
        });

        if (newItems.length === 0) {
            alert("Bạn chưa chọn sản phẩm nào để tách sang bill mới!");
            return;
        }

        if (originalItems.length === 0) {
            alert("Không thể tách tất cả sản phẩm đi. Nếu vậy hãy dùng tính năng sửa hoá đơn!");
            return;
        }

        const updatedOriginal: Invoice = {
            ...invoice,
            items: originalItems,
            deposit: origDeposit
        };

        const newInvoice: Invoice = {
            id: generateUniqueId(),
            customerName: invoice.customerName + " (Tách)",
            items: newItems,
            deposit: newDeposit
        };

        onSave(updatedOriginal, newInvoice);
    };

    // Calculate totals dynamically for UI feedback
    const origTotal = invoice.items.reduce((s, i) => {
        const moveQty = splitQuantities[i.id] || 0;
        const keepQty = i.quantity - moveQty;
        return s + keepQty * i.sellingPrice;
    }, 0);

    const newTotal = invoice.items.reduce((s, i) => {
        const moveQty = splitQuantities[i.id] || 0;
        return s + moveQty * i.sellingPrice;
    }, 0);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <div>
                        <h3 className="text-xl font-bold text-gray-800">Tách Hóa Đơn</h3>
                        <p className="text-xs text-gray-500 mt-1">Khách hàng: <span className="font-bold">{invoice.customerName}</span></p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 bg-white p-2 rounded-lg shadow-sm border border-gray-200"><CloseIcon /></button>
                </div>
                
                <div className="p-6 overflow-y-auto flex-1 space-y-6 bg-white">
                    <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-xl text-sm text-yellow-800 font-medium">
                        Chọn số lượng sản phẩm bạn muốn <strong className="text-yellow-900">TÁCH SANG BILL MỚI</strong>.
                    </div>

                    <div className="border rounded-xl overflow-hidden shadow-sm">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="px-4 py-3 font-semibold text-gray-600">Sản phẩm</th>
                                    <th className="px-4 py-3 font-semibold text-gray-600 text-center">SL Ban đầu</th>
                                    <th className="px-4 py-3 font-semibold  text-blue-700 bg-blue-50 text-center border-l border-r border-blue-100">Chuyển sang Bill Mới</th>
                                    <th className="px-4 py-3 font-semibold text-gray-600 text-center">Còn lại (Bill cũ)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {invoice.items.map(item => {
                                    const moveQty = splitQuantities[item.id] || 0;
                                    const keepQty = item.quantity - moveQty;
                                    return (
                                        <tr key={item.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 font-medium text-gray-800">
                                                {item.productName}
                                                <div className="text-xs text-gray-400 font-normal">{formatCurrency(item.sellingPrice)}/sp</div>
                                            </td>
                                            <td className="px-4 py-3 text-center font-bold text-gray-600">{item.quantity}</td>
                                            <td className="px-4 py-3 text-center bg-blue-50/30 border-l border-r border-blue-100/50">
                                                <div className="flex items-center justify-center gap-2">
                                                    <input 
                                                        type="number" 
                                                        min="0" 
                                                        max={item.quantity} 
                                                        value={moveQty}
                                                        onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value), item.quantity)}
                                                        className="w-16 border-blue-300 rounded font-bold text-blue-700 text-center focus:ring-blue-500 focus:border-blue-500"
                                                    />
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-center text-gray-500 font-medium">
                                                {keepQty}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="border border-gray-200 rounded-xl p-5 bg-gray-50/50">
                            <h4 className="font-black text-gray-700 mb-4 pb-2 border-b uppercase text-sm tracking-wider">Hóa đơn gốc (Còn lại)</h4>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between items-center"><span className="text-gray-500">Tổng tiền hàng:</span><span className="font-bold">{formatCurrency(origTotal)}</span></div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-500 font-bold">Tiền cọc giữ lại:</span>
                                    <input 
                                        type="number" 
                                        value={origDeposit} 
                                        onChange={e => setOrigDeposit(parseFloat(e.target.value) || 0)}
                                        className="w-32 rounded border-gray-300 text-right font-bold text-green-600 focus:ring-green-500 focus:border-green-500" 
                                    />
                                </div>
                                <div className="flex justify-between items-center pt-2 border-t mt-2">
                                    <span className="text-xs uppercase font-bold text-gray-500">Còn Cần Trả:</span>
                                    <span className="text-lg font-black text-red-600">{formatCurrency(Math.max(0, origTotal - origDeposit))}</span>
                                </div>
                            </div>
                        </div>

                        <div className="border border-blue-200 rounded-xl p-5 bg-blue-50/30">
                            <h4 className="font-black text-blue-700 mb-4 pb-2 border-b border-blue-100 uppercase text-sm tracking-wider">Hóa đơn MỚI</h4>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between items-center"><span className="text-blue-900/60">Tổng tiền hàng:</span><span className="font-bold text-blue-900">{formatCurrency(newTotal)}</span></div>
                                <div className="flex justify-between items-center">
                                    <span className="text-blue-900/60 font-bold">Tiền cọc chuyển sang:</span>
                                    <input 
                                        type="number" 
                                        value={newDeposit} 
                                        onChange={e => setNewDeposit(parseFloat(e.target.value) || 0)}
                                        className="w-32 rounded border-blue-300 text-right font-bold text-blue-600 focus:ring-blue-500 focus:border-blue-500" 
                                    />
                                </div>
                                <div className="flex justify-between items-center pt-2 border-t border-blue-100 mt-2">
                                    <span className="text-xs uppercase font-bold text-blue-900/50">Còn Cần Trả:</span>
                                    <span className="text-lg font-black text-red-600">{formatCurrency(Math.max(0, newTotal - newDeposit))}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
                
                <div className="p-4 border-t bg-gray-50 flex justify-end gap-3 rounded-b-2xl">
                    <button onClick={onClose} className="px-6 py-2.5 rounded-xl font-bold text-gray-500 hover:bg-gray-200 transition-colors">Hủy</button>
                    <button onClick={handleConfirm} className="px-6 py-2.5 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-md transition-colors border border-blue-700">Tách Hóa Đơn</button>
                </div>
            </div>
        </div>
    );
};

export default SplitInvoiceModal;
