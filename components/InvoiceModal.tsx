import React, { useState, useMemo } from 'react';
import type { Invoice, InvoiceItem, ConsignmentItem } from '../types';
import { RevenueStatus } from '../types';
import { CloseIcon, PlusIcon, TrashIcon } from './Icons';
import { generateUniqueId } from '../utils/helpers';
import useLocalStorage from '../hooks/useLocalStorage';

interface InvoiceModalProps {
  invoice: Invoice | null;
  onSave: (invoice: Invoice) => void;
  onClose: () => void;
}

const InvoiceModal = ({ invoice, onSave, onClose }: InvoiceModalProps) => {
  const [customerName, setCustomerName] = useState(invoice?.customerName || '');
  const [items, setItems] = useState<InvoiceItem[]>(invoice?.items || [{ id: generateUniqueId(), productName: '', sellingPrice: 0, quantity: 1, status: RevenueStatus.HOLDING }]);
  const [deposit, setDeposit] = useState(invoice?.deposit || 0);

  const [consignmentData] = useLocalStorage<ConsignmentItem[]>('consignmentData', []);
  const [itemConsignorSelections, setItemConsignorSelections] = useState<Record<string, string>>({});

  const consignors = useMemo(() => {
    const names = new Set(consignmentData.map(item => item.customerName));
    return Array.from(names);
  }, [consignmentData]);

  const handleItemChange = (index: number, field: keyof Omit<InvoiceItem, 'id'>, value: any) => {
    const newItems = [...items];
    (newItems[index] as any)[field] = value;
    setItems(newItems);
  };
  
  const handleConsignorChange = (itemId: string, consignorName: string) => {
      setItemConsignorSelections(prev => ({ ...prev, [itemId]: consignorName }));
      // Reset product name when consignor changes
      const itemIndex = items.findIndex(i => i.id === itemId);
      if (itemIndex !== -1) {
          handleItemChange(itemIndex, 'productName', '');
          handleItemChange(itemIndex, 'sellingPrice', 0);
      }
  };

  const handleConsignedProductChange = (itemIndex: number, productId: string) => {
      const selectedProduct = consignmentData.find(p => p.id === productId);
      if (selectedProduct) {
          handleItemChange(itemIndex, 'productName', selectedProduct.productName);
          handleItemChange(itemIndex, 'sellingPrice', selectedProduct.consignmentPrice);
      }
  };

  const addItem = () => {
    setItems([...items, { id: generateUniqueId(), productName: '', sellingPrice: 0, quantity: 1, status: RevenueStatus.HOLDING }]);
  };

  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    const removedItemId = items[index].id;
    const newSelections = { ...itemConsignorSelections };
    delete newSelections[removedItemId];
    setItemConsignorSelections(newSelections);
    setItems(newItems);
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || items.some(item => !item.productName || item.sellingPrice <= 0)) {
        alert('Vui lòng điền tên khách hàng và thông tin sản phẩm hợp lệ.');
        return;
    }
    onSave({ id: invoice?.id || generateUniqueId(), customerName, items, deposit });
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-gray-800">{invoice ? 'Chỉnh Sửa Hóa Đơn' : 'Tạo Hóa Đơn Mới'}</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><CloseIcon /></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label htmlFor="customerName" className="block text-sm font-medium text-gray-700">Tên Khách Hàng <span className="text-red-500">*</span></label>
                    <input type="text" id="customerName" value={customerName} onChange={(e) => setCustomerName(e.target.value)} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" />
                </div>
                <div>
                    <label htmlFor="deposit" className="block text-sm font-medium text-gray-700">Đã cọc</label>
                    <input 
                        type="number" 
                        id="deposit" 
                        value={deposit} 
                        onChange={(e) => setDeposit(parseFloat(e.target.value) || 0)} 
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" 
                        min="0"
                    />
                </div>
            </div>

            <div className="space-y-4">
                <h4 className="text-md font-medium text-gray-800">Danh sách sản phẩm</h4>
                {items.map((item, index) => {
                    const selectedConsignor = itemConsignorSelections[item.id];
                    const consignedProducts = selectedConsignor ? consignmentData.filter(p => p.customerName === selectedConsignor) : [];

                    return (
                    <div key={item.id} className="grid grid-cols-12 gap-3 items-end p-4 bg-gray-50 border rounded-xl">
                        <div className="col-span-12 md:col-span-2">
                            <label className="text-[10px] uppercase font-bold text-gray-400">Khách Ký Gửi</label>
                            <select value={selectedConsignor || ''} onChange={(e) => handleConsignorChange(item.id, e.target.value)} className="block w-full text-sm rounded-md border-gray-300 shadow-sm">
                                <option value="">Hàng của shop</option>
                                {consignors.map(name => <option key={name} value={name}>{name}</option>)}
                            </select>
                        </div>
                        <div className="col-span-12 md:col-span-3">
                            <label className="text-[10px] uppercase font-bold text-gray-400">Tên sản phẩm</label>
                             {selectedConsignor ? (
                                <select onChange={(e) => handleConsignedProductChange(index, e.target.value)} required className="block w-full text-sm rounded-md border-gray-300 shadow-sm">
                                    <option value="">Chọn sản phẩm ký gửi...</option>
                                    {consignedProducts.map(p => <option key={p.id} value={p.id}>{p.productName}</option>)}
                                </select>
                             ) : (
                                <input type="text" value={item.productName} onChange={(e) => handleItemChange(index, 'productName', e.target.value)} placeholder="Tên sản phẩm" required className="block w-full text-sm rounded-md border-gray-300 shadow-sm"/>
                             )}
                        </div>
                        <div className="col-span-6 md:col-span-2">
                             <label className="text-[10px] uppercase font-bold text-gray-400">Giá bán</label>
                            <input type="number" value={item.sellingPrice} onChange={(e) => handleItemChange(index, 'sellingPrice', parseFloat(e.target.value) || 0)} placeholder="Giá" required className="block w-full text-sm rounded-md border-gray-300 shadow-sm" readOnly={!!selectedConsignor} />
                        </div>
                         <div className="col-span-6 md:col-span-1">
                             <label className="text-[10px] uppercase font-bold text-gray-400">SL</label>
                            <input type="number" value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)} placeholder="SL" required className="block w-full text-sm rounded-md border-gray-300 shadow-sm"/>
                        </div>
                        <div className="col-span-10 md:col-span-3">
                            <label className="text-[10px] uppercase font-bold text-gray-400">Trạng thái</label>
                            <select 
                                value={item.status} 
                                onChange={(e) => handleItemChange(index, 'status', e.target.value as RevenueStatus)}
                                className="block w-full text-xs rounded-md border-gray-300 shadow-sm"
                            >
                                <option value={RevenueStatus.HOLDING}>Dồn đơn</option>
                                <option value={RevenueStatus.SHIPPING}>Đang đi đơn</option>
                                <option value={RevenueStatus.DELIVERED}>Đã giao hàng</option>
                            </select>
                        </div>
                        <div className="col-span-2 md:col-span-1 flex justify-end">
                            <button type="button" onClick={() => removeItem(index)} className="text-red-500 hover:text-red-700 p-2"><TrashIcon className="w-4 h-4" /></button>
                        </div>
                    </div>
                )})}
                <button type="button" onClick={addItem} className="flex items-center gap-2 text-sm text-primary hover:text-primary-700 font-bold bg-primary-50 px-4 py-2 rounded-lg border border-primary-100 transition-all">
                    <PlusIcon className="w-4 h-4" /> Thêm sản phẩm
                </button>
            </div>
            
            <div className="flex justify-end pt-4 space-x-2 border-t">
              <button type="button" onClick={onClose} className="px-6 py-2 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 font-bold">Hủy</button>
              <button type="submit" className="px-6 py-2 bg-primary text-white rounded-xl hover:bg-primary-700 font-bold shadow-md">Lưu Hóa Đơn</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default InvoiceModal;