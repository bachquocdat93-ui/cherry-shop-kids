import React, { useState, useMemo } from 'react';
import { RevenueEntry, RevenueStatus, ConsignmentItem } from '../types';
import { CloseIcon } from './Icons';
import { generateUniqueId } from '../utils/helpers';
import useLocalStorage from '../hooks/useLocalStorage';

interface RevenueModalProps {
  entry: RevenueEntry | null;
  onSave: (entry: RevenueEntry) => void;
  onClose: () => void;
}

const RevenueModal: React.FC<RevenueModalProps> = ({ entry, onSave, onClose }) => {
  const [formData, setFormData] = useState<Omit<RevenueEntry, 'id'>>({
    date: entry?.date || new Date().toISOString().slice(0, 10),
    customerName: entry?.customerName || '',
    productName: entry?.productName || '',
    costPrice: entry?.costPrice || 0,
    retailPrice: entry?.retailPrice || 0,
    quantity: entry?.quantity || 1,
    note: entry?.note || '',
    consignor: entry?.consignor || '',
    status: entry?.status || RevenueStatus.HOLDING,
  });

  const [consignmentData] = useLocalStorage<ConsignmentItem[]>('consignmentData', []);

  const consignors = useMemo(() => {
    const names = new Set(consignmentData.map(item => item.customerName));
    return Array.from(names);
  }, [consignmentData]);

  const consignedProducts = useMemo(() => {
    if (!formData.consignor) return [];
    return consignmentData.filter(item => item.customerName === formData.consignor);
  }, [formData.consignor, consignmentData]);

  const handleConsignorChange = (consignorName: string) => {
    setFormData(prev => ({
        ...prev,
        consignor: consignorName,
        // Reset product-related fields when consignor changes
        productName: '',
        costPrice: 0,
        retailPrice: 0,
    }));
  };

  const handleConsignedProductChange = (productId: string) => {
    const product = consignmentData.find(p => p.id === productId);
    if (product) {
        const costPrice = product.consignmentPrice * (1 - product.consignmentFee / 100);
        setFormData(prev => ({
            ...prev,
            productName: product.productName,
            retailPrice: product.consignmentPrice,
            costPrice: costPrice,
        }));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ 
        ...prev, 
        [name]: (name.includes('Price') || name === 'quantity') ? parseFloat(value) || 0 : value 
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.productName || formData.retailPrice <= 0 || formData.quantity <= 0) {
      alert('Vui lòng điền các trường bắt buộc: Tên sản phẩm, Giá bán, Số lượng.');
      return;
    }
    onSave({ ...formData, id: entry?.id || generateUniqueId() });
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-full overflow-y-auto">
        <div className="p-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight">{entry ? 'Sửa thông tin bán hàng' : 'Ghi nhận đơn hàng mới'}</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <CloseIcon />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="date" className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Ngày bán <span className="text-red-500">*</span></label>
              <input type="date" id="date" name="date" value={formData.date} onChange={handleChange} required className="block w-full rounded-xl border-gray-200 shadow-sm focus:border-primary focus:ring-primary text-sm font-medium" />
            </div>
             <div>
              <label htmlFor="customerName" className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Tên khách hàng</label>
              <input type="text" id="customerName" name="customerName" value={formData.customerName} onChange={handleChange} className="block w-full rounded-xl border-gray-200 shadow-sm focus:border-primary focus:ring-primary text-sm font-medium" />
            </div>
             <div>
                <label htmlFor="consignor" className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Khách ký gửi (nếu có)</label>
                <select id="consignor" name="consignor" value={formData.consignor} onChange={(e) => handleConsignorChange(e.target.value)} className="block w-full rounded-xl border-gray-200 shadow-sm focus:border-primary focus:ring-primary text-sm font-medium">
                    <option value="">Không (Hàng của shop)</option>
                    {consignors.map(name => <option key={name} value={name}>{name}</option>)}
                </select>
            </div>

            <div>
              <label htmlFor="productName" className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Tên Sản Phẩm <span className="text-red-500">*</span></label>
              {formData.consignor ? (
                <select id="productName" name="productName" onChange={(e) => handleConsignedProductChange(e.target.value)} required className="block w-full rounded-xl border-gray-200 shadow-sm focus:border-primary focus:ring-primary text-sm font-medium">
                    <option value="">Chọn sản phẩm ký gửi...</option>
                    {consignedProducts.map(p => <option key={p.id} value={p.id}>{p.productName}</option>)}
                </select>
              ) : (
                <input type="text" id="productName" name="productName" value={formData.productName} onChange={handleChange} required className="block w-full rounded-xl border-gray-200 shadow-sm focus:border-primary focus:ring-primary text-sm font-medium" />
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="costPrice" className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Giá Nhập</label>
                  <input type="number" id="costPrice" name="costPrice" value={formData.costPrice} onChange={handleChange} className="block w-full rounded-xl border-gray-200 shadow-sm focus:border-primary focus:ring-primary text-sm font-medium" />
                </div>
                <div>
                  <label htmlFor="retailPrice" className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Giá Bán Lẻ <span className="text-red-500">*</span></label>
                  <input type="number" id="retailPrice" name="retailPrice" value={formData.retailPrice} onChange={handleChange} required className="block w-full rounded-xl border-gray-200 shadow-sm focus:border-primary focus:ring-primary text-sm font-medium" />
                </div>
            </div>

            <div>
              <label htmlFor="quantity" className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Số Lượng <span className="text-red-500">*</span></label>
              <input type="number" id="quantity" name="quantity" value={formData.quantity} onChange={handleChange} required className="block w-full rounded-xl border-gray-200 shadow-sm focus:border-primary focus:ring-primary text-sm font-medium" />
            </div>

            <div>
              <label htmlFor="note" className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Ghi chú</label>
              <textarea id="note" name="note" value={formData.note} onChange={handleChange} rows={2} className="block w-full rounded-xl border-gray-200 shadow-sm focus:border-primary focus:ring-primary text-sm font-medium" />
            </div>

            <div>
                <label htmlFor="status" className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Trạng Thái Đơn Hàng</label>
                <select 
                    id="status" 
                    name="status" 
                    value={formData.status} 
                    onChange={handleChange}
                    className="block w-full rounded-xl border-gray-200 shadow-sm focus:border-primary focus:ring-primary text-sm font-bold bg-gray-50"
                >
                    <option value={RevenueStatus.HOLDING}>Dồn đơn</option>
                    <option value={RevenueStatus.SHIPPING}>Đang đi đơn</option>
                    <option value={RevenueStatus.DELIVERED}>Đã giao hàng</option>
                </select>
            </div>
            <div className="flex justify-end pt-6 space-x-3">
              <button type="button" onClick={onClose} className="px-6 py-2.5 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 font-bold transition-all">Đóng</button>
              <button type="submit" className="px-8 py-2.5 bg-primary text-white rounded-xl hover:bg-primary-700 font-black shadow-lg shadow-primary/20 transition-all">Lưu giao dịch</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RevenueModal;