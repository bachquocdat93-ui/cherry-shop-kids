import React, { useState, useRef } from 'react';
import { ConsignmentItem, ConsignmentStatus } from '../types';
import { CloseIcon, TrashIcon } from './Icons';
import { generateUniqueId } from '../utils/helpers';

interface ConsignmentModalProps {
  item: ConsignmentItem | null;
  onSave: (items: ConsignmentItem[]) => void;
  onClose: () => void;
}

type ProductFormData = {
  id: string;
  productName: string;
  consignmentPrice: number;
  quantity: number;
  consignmentFee: number;
  status: ConsignmentStatus;
  note: string;
  imageUrl?: string;
};

const ConsignmentModal: React.FC<ConsignmentModalProps> = ({ item, onSave, onClose }) => {
  const [commonData, setCommonData] = useState({
    customerName: item?.customerName || '',
  });

  const [productForm, setProductForm] = useState<ProductFormData>({
    id: item?.id || generateUniqueId(),
    productName: item?.productName || '',
    consignmentPrice: item?.consignmentPrice || 0,
    quantity: item?.quantity || 1,
    consignmentFee: item?.consignmentFee || 20,
    status: item?.status || ConsignmentStatus.IN_STOCK,
    note: item?.note || '',
    imageUrl: item?.imageUrl || '',
  });

  const [addedItems, setAddedItems] = useState<ProductFormData[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCommonChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCommonData({ customerName: e.target.value });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const isNumber = ['consignmentPrice', 'quantity', 'consignmentFee'].includes(name);
    setProductForm(prev => ({ ...prev, [name]: isNumber ? parseFloat(value) || 0 : value }));
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
          setProductForm(prev => ({ ...prev, imageUrl: compressedBase64 }));
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setProductForm(prev => ({ ...prev, imageUrl: undefined }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAddToList = () => {
    if (!productForm.productName || productForm.consignmentPrice <= 0) {
      alert('Vui lòng điền đủ Tên sản phẩm và Giá gửi bán.');
      return;
    }
    setAddedItems(prev => [...prev, { ...productForm, id: generateUniqueId() }]);
    setProductForm({
      id: generateUniqueId(),
      productName: '',
      consignmentPrice: 0,
      quantity: 1,
      consignmentFee: productForm.consignmentFee, // Keep the same fee by default
      status: ConsignmentStatus.IN_STOCK,
      note: '',
      imageUrl: '',
    });
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  const handleRemoveFromList = (id: string) => {
    setAddedItems(prev => prev.filter(i => i.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commonData.customerName) {
      alert('Vui lòng điền tên khách hàng.');
      return;
    }

    const itemsToProcess = [...addedItems];
    if (productForm.productName && productForm.consignmentPrice > 0) {
      itemsToProcess.push({ ...productForm });
    }

    if (itemsToProcess.length === 0) {
      alert('Vui lòng thêm ít nhất một sản phẩm hợp lệ.');
      return;
    }

    const finalItems: ConsignmentItem[] = itemsToProcess.map(p => ({
      id: p.id,
      customerName: commonData.customerName,
      productName: p.productName,
      consignmentPrice: p.consignmentPrice,
      quantity: p.quantity,
      consignmentFee: p.consignmentFee,
      status: p.status,
      note: p.note,
      imageUrl: p.imageUrl,
    }));

    onSave(finalItems);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-full overflow-y-auto">
        <div className="p-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight">{item ? 'Chỉnh Sửa Hàng Ký Gửi' : 'Thêm Hàng Ký Gửi'}</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><CloseIcon /></button>
          </div>
          <div className="space-y-4">
             <div className="bg-gray-50 p-4 rounded-xl shadow-inner mb-6 border border-gray-100">
                <div>
                  <label htmlFor="customerName" className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Tên khách hàng <span className="text-red-500">*</span></label>
                  <input type="text" id="customerName" name="customerName" value={commonData.customerName} onChange={handleCommonChange} disabled={!!item} className="block w-full rounded-xl border-gray-200 shadow-sm focus:border-primary focus:ring-primary text-sm font-medium disabled:opacity-50" />
                </div>
            </div>

            {addedItems.length > 0 && !item && (
               <div className="mb-4 space-y-2">
                 <label className="block text-[10px] font-black text-primary uppercase tracking-widest mb-2">Đã thêm ({addedItems.length} sản phẩm)</label>
                 {addedItems.map((added, index) => (
                    <div key={added.id} className="flex justify-between items-center bg-blue-50/50 p-3 rounded-xl border border-blue-100">
                      <div>
                        <p className="text-xs font-bold text-gray-800">{index + 1}. {added.productName}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">{added.quantity} x {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(added.consignmentPrice)}</p>
                      </div>
                      <button type="button" onClick={() => handleRemoveFromList(added.id)} className="text-red-500 p-1.5 bg-white hover:bg-red-50 rounded-lg shadow-sm border border-red-100 transition-colors"><TrashIcon className="w-3.5 h-3.5" /></button>
                    </div>
                 ))}
               </div>
            )}

            <div className="p-4 border border-gray-100 rounded-xl relative">
                {addedItems.length > 0 && !item && (
                  <span className="absolute -top-2 left-4 bg-white px-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">Sản phẩm tiếp theo</span>
                )}
                <div className="space-y-4">
                    <div>
                      <label htmlFor="productName" className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Tên Sản Phẩm <span className="text-red-500">*</span></label>
                      <input type="text" id="productName" name="productName" value={productForm.productName} onChange={handleChange} className="block w-full rounded-xl border-gray-200 shadow-sm focus:border-primary focus:ring-primary text-sm font-medium" />
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      <div className="col-span-1">
                        <label htmlFor="consignmentPrice" className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Giá Gửi Bán <span className="text-red-500">*</span></label>
                        <input type="number" id="consignmentPrice" name="consignmentPrice" value={productForm.consignmentPrice} onChange={handleChange} required min="0" className="block w-full rounded-xl border-gray-200 shadow-sm focus:border-primary focus:ring-primary text-sm font-medium" />
                      </div>
                      <div className="col-span-1">
                          <label htmlFor="quantity" className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">SL <span className="text-red-500">*</span></label>
                          <input type="number" id="quantity" name="quantity" value={productForm.quantity} onChange={handleChange} required min="0" className="block w-full rounded-xl border-gray-200 shadow-sm focus:border-primary focus:ring-primary text-sm font-medium font-bold text-center" />
                      </div>
                      <div className="col-span-1">
                        <label htmlFor="consignmentFee" className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Phí C.Hàng (%) <span className="text-red-500">*</span></label>
                        <input type="number" id="consignmentFee" name="consignmentFee" value={productForm.consignmentFee} onChange={handleChange} required min="0" className="block w-full rounded-xl border-gray-200 shadow-sm focus:border-primary focus:ring-primary text-sm font-medium" />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="status" className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Trạng Thái</label>
                      <select id="status" name="status" value={productForm.status} onChange={handleChange} className="block w-full rounded-xl border-gray-200 shadow-sm focus:border-primary focus:ring-primary text-sm font-bold bg-white">
                        <option value={ConsignmentStatus.IN_STOCK}>Còn hàng</option>
                        <option value={ConsignmentStatus.DEPOSITED}>Mới cọc</option>
                        <option value={ConsignmentStatus.SOLD}>Đã bán</option>
                        <option value={ConsignmentStatus.RETURNED}>Trả hàng</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="note" className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">GHI CHÚ</label>
                      <textarea id="note" name="note" value={productForm.note} onChange={handleChange} rows={2} className="block w-full rounded-xl border-gray-200 shadow-sm focus:border-primary focus:ring-primary text-xs font-medium" />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Hình Ảnh Sản Phẩm</label>
                      <div className="flex items-center space-x-4 border border-dashed border-gray-300 p-4 rounded-xl bg-gray-50">
                        {productForm.imageUrl ? (
                          <div className="relative w-20 h-20 shrink-0 rounded-lg overflow-hidden border border-gray-200">
                            <img src={productForm.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                            <button type="button" onClick={handleRemoveImage} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-80 hover:opacity-100 transition-opacity">
                              <CloseIcon className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="w-20 h-20 shrink-0 rounded-lg bg-gray-200 flex items-center justify-center border border-gray-300 text-gray-400">
                            <span className="text-[10px] uppercase font-bold text-center px-2">Chưa Có Ảnh</span>
                          </div>
                        )}
                        <div className="flex-1">
                          <input type="file" accept="image/*" onChange={handleImageUpload} ref={fileInputRef} className="block w-full text-[11px] text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-bold file:uppercase file:tracking-wider file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 transition duration-150 ease-in-out cursor-pointer" />
                        </div>
                      </div>
                    </div>
                </div>
            </div>

            {!item && (
               <button type="button" onClick={handleAddToList} className="mt-2 w-full py-2.5 border-2 border-dashed border-primary/30 text-primary-600 bg-primary-50 font-black text-xs uppercase tracking-tight rounded-xl hover:bg-primary-100 transition-colors flex items-center justify-center gap-2">
                  <span>+</span> Thêm 1 sản phẩm nữa
               </button>
            )}

            <div className="flex justify-end pt-6 space-x-3 border-t border-gray-100 mt-6">
              <button type="button" onClick={onClose} className="px-6 py-2.5 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 font-bold transition-all text-sm">Hủy</button>
              <button type="button" onClick={handleSubmit} className="px-8 py-2.5 bg-primary text-white rounded-xl hover:bg-primary-700 font-black shadow-lg shadow-primary/20 transition-all text-sm uppercase tracking-tight">Lưu Hàng Ký Gửi</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConsignmentModal;

