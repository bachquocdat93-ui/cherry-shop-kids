import React, { useState } from 'react';
import { ConsignmentItem, ConsignmentStatus } from '../types';
import { CloseIcon } from './Icons';
import { generateUniqueId } from '../utils/helpers';

interface ConsignmentModalProps {
  item: ConsignmentItem | null;
  onSave: (item: ConsignmentItem) => void;
  onClose: () => void;
}

const ConsignmentModal: React.FC<ConsignmentModalProps> = ({ item, onSave, onClose }) => {
  const [formData, setFormData] = useState<Omit<ConsignmentItem, 'id'>>({
    customerName: item?.customerName || '',
    productName: item?.productName || '',
    consignmentPrice: item?.consignmentPrice || 0,
    quantity: item?.quantity || 1,
    consignmentFee: item?.consignmentFee || 20,
    status: item?.status || ConsignmentStatus.IN_STOCK,
    note: item?.note || '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const isNumber = ['consignmentPrice', 'quantity', 'consignmentFee'].includes(name);
    setFormData(prev => ({ ...prev, [name]: isNumber ? parseFloat(value) || 0 : value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerName || !formData.productName || formData.consignmentPrice <= 0) {
      alert('Vui lòng điền các trường bắt buộc: Tên khách hàng, Tên sản phẩm, Giá gửi bán.');
      return;
    }
    onSave({ ...formData, id: item?.id || generateUniqueId() });
  };

  const formFields = [
    { name: 'customerName', label: 'Tên Khách Hàng', type: 'text', required: true },
    { name: 'productName', label: 'Tên Sản Phẩm', type: 'text', required: true },
    { name: 'consignmentPrice', label: 'Giá Gửi Bán', type: 'number', required: true },
    { name: 'quantity', label: 'Số Lượng', type: 'number', required: true },
    { name: 'consignmentFee', label: 'Phí ký gửi (%)', type: 'number', required: true },
    { name: 'note', label: 'NOTE', type: 'textarea' },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg max-h-full overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-gray-800">{item ? 'Chỉnh Sửa Hàng Ký Gửi' : 'Thêm Hàng Ký Gửi'}</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><CloseIcon /></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            {formFields.map(field => (
              <div key={field.name}>
                <label htmlFor={field.name} className="block text-sm font-medium text-gray-700">
                  {field.label} {field.required && <span className="text-red-500">*</span>}
                </label>
                {field.type === 'textarea' ? (
                  <textarea id={field.name} name={field.name} value={(formData as any)[field.name]} onChange={handleChange} rows={3} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" />
                ) : (
                  <input type={field.type} id={field.name} name={field.name} value={(formData as any)[field.name]} onChange={handleChange} required={field.required} min="0" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" />
                )}
              </div>
            ))}
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700">Trạng Thái</label>
              <select id="status" name="status" value={formData.status} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm">
                <option value={ConsignmentStatus.IN_STOCK}>Còn hàng</option>
                <option value={ConsignmentStatus.DEPOSITED}>Mới cọc</option>
                <option value={ConsignmentStatus.SOLD}>Đã bán</option>
                <option value={ConsignmentStatus.RETURNED}>Trả hàng</option>
              </select>
            </div>
            <div className="flex justify-end pt-4 space-x-2">
              <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Hủy</button>
              <button type="submit" className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-700">Lưu</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ConsignmentModal;
