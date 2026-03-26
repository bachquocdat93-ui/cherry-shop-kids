import React, { useState, useRef } from 'react';
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
    imageUrl: item?.imageUrl || '',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const isNumber = ['consignmentPrice', 'quantity', 'consignmentFee'].includes(name);
    setFormData(prev => ({ ...prev, [name]: isNumber ? parseFloat(value) || 0 : value }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 250;
          const MAX_HEIGHT = 250;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          const compressedBase64 = canvas.toDataURL('image/webp', 0.6);
          setFormData(prev => ({ ...prev, imageUrl: compressedBase64 }));
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setFormData(prev => ({ ...prev, imageUrl: undefined }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hình Ảnh Sản Phẩm</label>
              <div className="flex items-center space-x-4 border border-dashed border-gray-300 p-4 rounded-md bg-gray-50">
                {formData.imageUrl ? (
                  <div className="relative w-24 h-24 shrink-0 rounded-md overflow-hidden border border-gray-200">
                    <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                    <button type="button" onClick={handleRemoveImage} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-80 hover:opacity-100 transition-opacity">
                      <CloseIcon className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="w-24 h-24 shrink-0 rounded-md bg-gray-200 flex items-center justify-center border border-gray-300 text-gray-400">
                    <span className="text-xs">No Image</span>
                  </div>
                )}
                <div className="flex-1">
                  <input type="file" accept="image/*" onChange={handleImageUpload} ref={fileInputRef} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 transition duration-150 ease-in-out" />
                  <p className="mt-1 text-xs text-gray-500">Tải lên hình ảnh sản phẩm (tuỳ chọn)</p>
                </div>
              </div>
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
