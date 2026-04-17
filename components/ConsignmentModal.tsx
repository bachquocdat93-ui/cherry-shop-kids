import React, { useState, useRef, useMemo, useEffect } from 'react';
import { ConsignmentItem, ConsignmentStatus } from '../types';
import useLocalStorage from '../hooks/useLocalStorage';
import { CloseIcon, TrashIcon, PlusIcon } from './Icons';
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
  note: string;
  imageUrl?: string;
  isFee: boolean;
};

const ConsignmentModal: React.FC<ConsignmentModalProps> = ({ item, onSave, onClose }) => {
  const [consignmentData] = useLocalStorage<ConsignmentItem[]>('consignmentData', []);

  const [commonData, setCommonData] = useState({
    customerName: item?.customerName || '',
  });

  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const customerDropdownRef = useRef<HTMLDivElement>(null);
  
  const pastCustomers = useMemo(() => {
     const names = new Set(
         consignmentData.map(item => item.customerName.trim()).filter(Boolean)
     );
     return Array.from(names);
  }, [consignmentData]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(event.target as Node)) {
        setIsCustomerDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const [productForm, setProductForm] = useState<ProductFormData>({
    id: item?.id || generateUniqueId(),
    productName: item?.productName || '',
    consignmentPrice: item?.consignmentPrice || 0,
    quantity: item?.quantity || 1,
    consignmentFee: item?.consignmentFee || 20,
    status: item?.status || ConsignmentStatus.IN_STOCK,
    note: item?.note || '',
    imageUrl: item?.imageUrl || '',
    isFee: item?.isFee || false,
  });

  const [addedItems, setAddedItems] = useState<ProductFormData[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCommonChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCommonData({ customerName: e.target.value });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    if (type === 'checkbox') {
        const checked = (e.target as HTMLInputElement).checked;
        setProductForm(prev => ({ ...prev, [name]: checked }));
        return;
    }
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
      status: productForm.isFee ? ConsignmentStatus.SOLD : ConsignmentStatus.IN_STOCK,
      note: '',
      imageUrl: '',
      isFee: false,
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
      status: p.isFee ? ConsignmentStatus.SOLD : p.status, // Fees are always SOLD to deduct immediately
      note: p.note,
      imageUrl: p.imageUrl,
      isFee: p.isFee,
    }));

    onSave(finalItems);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-50 flex justify-center items-center p-4 sm:p-6 transition-all duration-300">
      <div className="bg-white rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] w-full max-w-lg max-h-full overflow-y-auto ring-1 ring-slate-100 animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 sm:p-8">
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight bg-gradient-to-br from-slate-900 to-slate-600 bg-clip-text text-transparent">{item ? 'Sửa Hàng Ký Gửi' : 'Thêm Hàng Ký Gửi'}</h3>
            <button onClick={onClose} className="text-slate-400 hover:text-red-500 p-2 bg-slate-50 hover:bg-red-50 rounded-full transition-all"><CloseIcon className="w-4 h-4" /></button>
          </div>
          <div className="space-y-6">
             <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100 shadow-sm relative group">
                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-primary to-purple-500 rounded-l-2xl"></div>
                <div className="relative" ref={customerDropdownRef}>
                  <label htmlFor="customerName" className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Tên khách hàng <span className="text-red-500">*</span></label>
                  <input 
                      type="text" 
                      id="customerName" 
                      name="customerName" 
                      value={commonData.customerName} 
                      onChange={(e) => {
                          handleCommonChange(e);
                          if (!item) setIsCustomerDropdownOpen(true);
                      }} 
                      onFocus={() => { if (!item) setIsCustomerDropdownOpen(true); }}
                      disabled={!!item} 
                      className="block w-full rounded-xl border-slate-200 shadow-sm focus:border-primary focus:ring-4 focus:ring-primary/10 text-sm font-bold disabled:opacity-50 transition-all bg-white py-2.5 px-3 relative z-10" 
                      placeholder="Nguyễn Văn A..." 
                      autoComplete="off"
                  />
                  {isCustomerDropdownOpen && !item && pastCustomers.filter(c => !commonData.customerName || c.toLowerCase().includes(commonData.customerName.toLowerCase())).length > 0 && (
                      <ul className="absolute z-50 mt-1 w-full bg-white shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] max-h-48 rounded-xl py-2 text-base ring-1 ring-black ring-opacity-5 overflow-auto sm:text-sm border border-slate-100">
                          {pastCustomers
                              .filter(c => !commonData.customerName || c.toLowerCase().includes(commonData.customerName.toLowerCase()))
                              .map(c => (
                                  <li 
                                      key={c} 
                                      className="cursor-pointer hover:bg-primary-50 text-slate-800 font-bold select-none relative py-2.5 pl-4 pr-4 transition-colors"
                                      onClick={() => {
                                          setCommonData(prev => ({ ...prev, customerName: c }));
                                          setIsCustomerDropdownOpen(false);
                                      }}
                                  >
                                      {c}
                                  </li>
                          ))}
                      </ul>
                  )}
                </div>
            </div>

            {addedItems.length > 0 && !item && (
               <div className="space-y-3 relative before:absolute before:inset-y-0 before:-left-3 before:w-px before:bg-slate-200 ml-3">
                 <label className="block text-[10px] font-black text-primary uppercase tracking-widest bg-white inline-block px-2 -ml-2 text-primary-600 relative z-10 rounded-full border border-primary/20">Đã thêm ({addedItems.length})</label>
                 {addedItems.map((added, index) => (
                    <div key={added.id} className="flex justify-between items-center group bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all relative overflow-hidden ml-3">
                      <div className="absolute top-0 left-0 w-1 h-full bg-slate-200 group-hover:bg-primary transition-colors"></div>
                      <div className="pl-2 flex-1">
                        <p className="text-xs font-black text-slate-800 flex items-center gap-2">
                           {index + 1}. {added.productName}
                           {added.isFee && <span className="px-2 py-0.5 bg-red-100 text-red-600 text-[9px] rounded uppercase tracking-wider">Phụ phí</span>}
                        </p>
                        {added.isFee ? (
                           <p className="text-[11px] font-bold text-slate-500 mt-1">Trừ: <span className="text-red-500 font-black">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(added.consignmentPrice)}</span></p>
                        ) : (
                           <p className="text-[11px] font-bold text-slate-500 mt-1">{added.quantity} x <span className="text-blue-600 font-black">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(added.consignmentPrice)}</span></p>
                        )}
                      </div>
                      <button type="button" onClick={() => handleRemoveFromList(added.id)} className="text-red-400 p-2 bg-slate-50 hover:bg-red-500 hover:text-white rounded-xl transition-all shadow-sm"><TrashIcon className="w-4 h-4" /></button>
                    </div>
                 ))}
               </div>
            )}

            <div className="p-5 border border-slate-200 bg-white rounded-2xl relative shadow-sm hover:shadow-md transition-shadow">
                {addedItems.length > 0 && !item && (
                  <span className="absolute -top-3 left-5 bg-gradient-to-r from-primary to-purple-500 text-white px-3 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm">SP Tiếp Theo</span>
                )}
                <div className="space-y-5">
                    <div className="flex items-center gap-3 bg-red-50 p-3 rounded-xl border border-red-100">
                        <input type="checkbox" id="isFee" name="isFee" checked={productForm.isFee} onChange={handleChange} className="w-4 h-4 text-red-600 rounded border-red-300 focus:ring-red-500" />
                        <label htmlFor="isFee" className="text-xs font-bold text-red-800 cursor-pointer select-none">Đây là Phụ Phí (VD: Phí đóng gói, Tiền công...)</label>
                    </div>

                    <div>
                      <label htmlFor="productName" className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{productForm.isFee ? 'Tên Khoản Phí' : 'Tên Sản Phẩm'} <span className="text-red-500">*</span></label>
                      <input type="text" id="productName" name="productName" value={productForm.productName} onChange={handleChange} className="block w-full rounded-xl border-slate-200 shadow-sm focus:border-primary focus:ring-4 focus:ring-primary/10 text-sm font-bold bg-slate-50/30 focus:bg-white py-2.5 px-3 transition-colors" placeholder={productForm.isFee ? "Phí gói hàng..." : "Váy hoa cúc..."} />
                    </div>

                    <div className={`grid ${productForm.isFee ? 'grid-cols-1' : 'grid-cols-2 sm:grid-cols-3'} gap-4`}>
                      <div className="col-span-1">
                        <label htmlFor="consignmentPrice" className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{productForm.isFee ? 'Số Tiền Trừ (VNĐ)' : 'Giá Bán'} <span className="text-red-500">*</span></label>
                        <input type="number" id="consignmentPrice" name="consignmentPrice" value={productForm.consignmentPrice} onChange={handleChange} required min="0" className={`block w-full rounded-xl border-slate-200 shadow-sm focus:border-primary focus:ring-4 focus:ring-primary/10 text-sm font-bold bg-slate-50/30 focus:bg-white py-2.5 px-3 transition-colors ${productForm.isFee ? 'text-red-600' : ''}`} />
                      </div>
                      {!productForm.isFee && (
                          <>
                              <div className="col-span-1">
                                  <label htmlFor="quantity" className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">SL <span className="text-red-500">*</span></label>
                                  <input type="number" id="quantity" name="quantity" value={productForm.quantity} onChange={handleChange} required min="0" className="block w-full rounded-xl border-slate-200 shadow-sm focus:border-primary focus:ring-4 focus:ring-primary/10 text-sm font-black text-center bg-slate-50/30 focus:bg-white py-2.5 px-3 transition-colors text-blue-700" />
                              </div>
                              <div className="col-span-1">
                                <label htmlFor="consignmentFee" className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Phí C.Hàng (%) <span className="text-red-500">*</span></label>
                                <input type="number" id="consignmentFee" name="consignmentFee" value={productForm.consignmentFee} onChange={handleChange} required min="0" className="block w-full rounded-xl border-slate-200 shadow-sm focus:border-primary focus:ring-4 focus:ring-primary/10 text-sm font-bold bg-slate-50/30 focus:bg-white py-2.5 px-3 transition-colors" />
                              </div>
                          </>
                      )}
                    </div>

                    {!productForm.isFee && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label htmlFor="status" className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Trạng Thái</label>
                              <select id="status" name="status" value={productForm.status} onChange={handleChange} className="block w-full rounded-xl border-slate-200 shadow-sm focus:border-primary focus:ring-4 focus:ring-primary/10 text-sm font-bold bg-slate-50/30 focus:bg-white py-2.5 px-3 cursor-pointer transition-colors">
                                <option value={ConsignmentStatus.IN_STOCK}>Còn hàng</option>
                                <option value={ConsignmentStatus.DEPOSITED}>Mới cọc</option>
                                <option value={ConsignmentStatus.SOLD}>Đã bán</option>
                                <option value={ConsignmentStatus.RETURNED}>Trả hàng</option>
                              </select>
                            </div>

                            <div>
                              <label htmlFor="note" className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Ghi Chú</label>
                              <input type="text" id="note" name="note" value={productForm.note} onChange={handleChange} className="block w-full rounded-xl border-slate-200 shadow-sm focus:border-primary focus:ring-4 focus:ring-primary/10 text-sm font-medium bg-slate-50/30 focus:bg-white py-2.5 px-3 transition-colors" placeholder="Kích cỡ, tình trạng..." />
                            </div>
                        </div>
                    )}
                    {productForm.isFee && (
                        <div>
                          <label htmlFor="note" className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Ghi Chú</label>
                          <input type="text" id="note" name="note" value={productForm.note} onChange={handleChange} className="block w-full rounded-xl border-slate-200 shadow-sm focus:border-primary focus:ring-4 focus:ring-primary/10 text-sm font-medium bg-slate-50/30 focus:bg-white py-2.5 px-3 transition-colors" placeholder="Lý do thu..." />
                        </div>
                    )}

                    {!productForm.isFee && (
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Hình Ảnh Minh Họa</label>
                          <div className="flex items-center space-x-4 border-2 border-dashed border-slate-200 p-4 rounded-xl bg-slate-50/50 hover:bg-slate-50 transition-colors group">
                            {productForm.imageUrl ? (
                              <div className="relative w-20 h-20 shrink-0 rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                                <img src={productForm.imageUrl} alt="Preview" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                                <button type="button" onClick={handleRemoveImage} className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 hover:bg-red-500 transition-all backdrop-blur-sm">
                                  <CloseIcon className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <div className="w-20 h-20 shrink-0 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col items-center justify-center text-slate-400 gap-1 group-hover:border-primary/50 group-hover:text-primary transition-colors">
                                <span className="text-xl">+</span>
                                <span className="text-[8px] uppercase font-black px-2">Click upload</span>
                              </div>
                            )}
                            <div className="flex-1 relative">
                              <input type="file" accept="image/*" onChange={handleImageUpload} ref={fileInputRef} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                              <div className="flex flex-col">
                                 <span className="text-sm font-bold text-slate-700 bg-white border border-slate-200 px-4 py-2 rounded-xl inline-block w-fit shadow-sm group-hover:border-primary/50 group-hover:text-primary transition-colors">Chọn file ảnh</span>
                                 <span className="text-[10px] text-slate-400 mt-2 font-medium">JPEG, PNG, WebP (Maks 5MB)</span>
                              </div>
                            </div>
                          </div>
                        </div>
                    )}
                </div>
            </div>

            {!item && (
               <button type="button" onClick={handleAddToList} className="mt-4 w-full py-3 border-2 border-dashed border-primary/40 text-primary-600 bg-primary-50/50 hover:bg-primary-50 transition-all font-black text-xs uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 hover:border-primary hover:shadow-inner group">
                  <span className="bg-primary/10 p-1 rounded-md group-hover:bg-primary group-hover:text-white transition-colors"><PlusIcon className="w-4 h-4" /></span> 
                  Thêm vào danh sách
               </button>
            )}

            <div className="flex justify-end pt-6 space-x-3 border-t border-slate-100 mt-6">
              <button type="button" onClick={onClose} className="px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 hover:text-slate-900 font-bold transition-all text-sm shadow-sm">Thoát</button>
              <button type="button" onClick={handleSubmit} className="px-8 py-3 bg-gradient-to-r from-primary to-purple-600 hover:from-primary-600 hover:to-purple-700 text-white rounded-xl font-black shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all text-sm uppercase tracking-tight transform hover:-translate-y-0.5">Xác Nhận Lưu</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConsignmentModal;

