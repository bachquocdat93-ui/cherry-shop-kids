import React, { useState, useMemo } from 'react';
import { RevenueEntry, RevenueStatus, ConsignmentItem, ShopItem, ConsignmentStatus } from '../types';
import { CloseIcon, TrashIcon, PlusIcon } from './Icons';
import { generateUniqueId } from '../utils/helpers';
import useLocalStorage from '../hooks/useLocalStorage';

interface RevenueModalProps {
  entry: RevenueEntry | null;
  onSave: (entries: RevenueEntry[]) => void;
  onClose: () => void;
}

type ItemSource = 'manual' | 'shop' | 'consignor';

type ProductFormData = {
  id: string; // Used for added list
  source: ItemSource;
  shopItemId: string;
  consignor: string;
  consignmentItemId: string;
  productName: string;
  costPrice: number;
  retailPrice: number;
  quantity: number;
  note: string;
};

const RevenueModal: React.FC<RevenueModalProps> = ({ entry, onSave, onClose }) => {
  const [consignmentData, setConsignmentData] = useLocalStorage<ConsignmentItem[]>('consignmentData', []);
  const [shopInventoryData, setShopInventoryData] = useLocalStorage<ShopItem[]>('shopInventoryData', []);

  const [commonData, setCommonData] = useState({
    date: entry?.date || new Date().toISOString().slice(0, 10),
    customerName: entry?.customerName || '',
    status: entry?.status || RevenueStatus.HOLDING,
  });

  const getInitialConsignmentItemId = () => {
    let initialConsignmentItemId = entry?.consignmentItemId || '';
    if (entry?.consignor && !initialConsignmentItemId) {
      let found = consignmentData.find(c => c.customerName === entry.consignor && c.productName === entry.productName && c.consignmentPrice === entry.retailPrice);
      if (!found) {
        found = consignmentData.find(c => c.customerName === entry.consignor && c.productName === entry.productName);
      }
      if (found) {
        initialConsignmentItemId = found.id;
      }
    }
    return initialConsignmentItemId;
  };

  const [productForm, setProductForm] = useState<ProductFormData>({
    id: entry?.id || generateUniqueId(),
    source: entry ? (entry.consignor ? 'consignor' : (entry.shopItemId ? 'shop' : 'manual')) : 'manual',
    shopItemId: entry?.shopItemId || '',
    consignor: entry?.consignor || '',
    consignmentItemId: getInitialConsignmentItemId(),
    productName: entry?.productName || '',
    costPrice: entry?.costPrice || 0,
    retailPrice: entry?.retailPrice || 0,
    quantity: entry?.quantity || 1,
    note: entry?.note || '',
  });

  const [addedItems, setAddedItems] = useState<ProductFormData[]>([]);

  const consignors = useMemo(() => {
    const names = new Set(consignmentData.map(item => item.customerName));
    return Array.from(names);
  }, [consignmentData]);

  const availableShopItems = useMemo(() => {
    return shopInventoryData.map(item => {
      const addedQty = addedItems.filter(added => added.source === 'shop' && added.shopItemId === item.id)
                                 .reduce((sum, added) => sum + added.quantity, 0);
      return { ...item, remainingQuantity: item.quantity - addedQty };
    });
  }, [shopInventoryData, addedItems]);

  const availableConsignedProducts = useMemo(() => {
    if (productForm.source !== 'consignor' || !productForm.consignor) return [];
    
    return consignmentData
      .filter(item => 
        item.customerName === productForm.consignor && 
        (item.status !== ConsignmentStatus.DEPOSITED || item.id === productForm.consignmentItemId)
      )
      .map(item => {
        const addedQty = addedItems.filter(added => added.source === 'consignor' && added.consignmentItemId === item.id)
                                   .reduce((sum, added) => sum + added.quantity, 0);
        return { ...item, remainingQuantity: item.quantity - addedQty };
      });
  }, [productForm.source, productForm.consignor, consignmentData, productForm.consignmentItemId, addedItems]);

  const handleCommonChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setCommonData(prev => ({ ...prev, [name]: value }));
  };

  const handleProductChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setProductForm(prev => ({
      ...prev,
      [name]: (name.includes('Price') || name === 'quantity') ? parseFloat(value) || 0 : value
    }));
  };

  const handleSourceChange = (newSource: ItemSource) => {
    setProductForm(prev => ({
      ...prev,
      source: newSource,
      consignor: '',
      productName: '',
      costPrice: 0,
      retailPrice: 0,
      shopItemId: '',
      consignmentItemId: ''
    }));
  };

  const handleShopItemChange = (itemId: string) => {
    const item = shopInventoryData.find(i => i.id === itemId);
    if (item) {
      setProductForm(prev => ({
        ...prev,
        productName: item.productName,
        costPrice: item.importPrice,
        retailPrice: item.retailPrice,
        shopItemId: itemId,
        consignmentItemId: ''
      }));
    } else {
        setProductForm(prev => ({ ...prev, shopItemId: itemId }));
    }
  };

  const handleConsignorChange = (consignorName: string) => {
    setProductForm(prev => ({
      ...prev,
      consignor: consignorName,
      productName: '',
      costPrice: 0,
      retailPrice: 0,
      shopItemId: '',
      consignmentItemId: ''
    }));
  };

  const handleConsignedProductChange = (productId: string) => {
    const product = consignmentData.find(p => p.id === productId);
    if (product) {
      const costPrice = product.consignmentPrice;
      setProductForm(prev => ({
        ...prev,
        productName: product.productName,
        retailPrice: product.consignmentPrice,
        costPrice: costPrice,
        consignmentItemId: product.id
      }));
    } else {
        setProductForm(prev => ({ ...prev, consignmentItemId: productId }));
    }
  };

  const handleAddToList = () => {
    if (!productForm.productName || productForm.retailPrice < 0 || productForm.quantity <= 0) {
      alert('Vui lòng điền đủ Tên sản phẩm, Giá bán và Số lượng.');
      return;
    }
    setAddedItems(prev => [...prev, { ...productForm, id: generateUniqueId() }]);
    setProductForm({
      id: generateUniqueId(),
      source: 'manual',
      shopItemId: '',
      consignor: '',
      consignmentItemId: '',
      productName: '',
      costPrice: 0,
      retailPrice: 0,
      quantity: 1,
      note: ''
    });
  };

  const handleRemoveFromList = (id: string) => {
    setAddedItems(prev => prev.filter(i => i.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const itemsToProcess = [...addedItems];
    if (productForm.productName && productForm.retailPrice >= 0 && productForm.quantity > 0) {
      itemsToProcess.push({ ...productForm });
    }

    if (itemsToProcess.length === 0) {
      alert('Vui lòng thêm ít nhất một sản phẩm hợp lệ.');
      return;
    }

    try {
      const currentShopDataRaw = window.localStorage.getItem('shopInventoryData') || '[]';
      let currentShopData: ShopItem[] = JSON.parse(currentShopDataRaw);
      let inventoryChanged = false;

      const currentConsignmentRaw = window.localStorage.getItem('consignmentData') || '[]';
      let currentConsignmentData: ConsignmentItem[] = JSON.parse(currentConsignmentRaw);
      let consignmentChanged = false;

      if (!entry) {
        // NEW ENTRIES
        for (const item of itemsToProcess) {
           if (item.source === 'shop' && item.shopItemId) {
              const shopIdx = currentShopData.findIndex(i => i.id === item.shopItemId);
              if (shopIdx !== -1) {
                currentShopData[shopIdx] = {
                  ...currentShopData[shopIdx],
                  quantity: currentShopData[shopIdx].quantity - item.quantity,
                  retailPrice: item.retailPrice,
                  importPrice: item.costPrice
                };
                inventoryChanged = true;
              }
           } else if (item.source === 'consignor' && item.consignor && item.consignmentItemId) {
              const conItemIdx = currentConsignmentData.findIndex(c => c.id === item.consignmentItemId);
              if (conItemIdx !== -1) {
                currentConsignmentData[conItemIdx].quantity -= item.quantity;
                currentConsignmentData[conItemIdx].soldQuantity = (currentConsignmentData[conItemIdx].soldQuantity || 0) + item.quantity;
                currentConsignmentData[conItemIdx].status = commonData.status === RevenueStatus.DELIVERED ? ConsignmentStatus.SOLD : ConsignmentStatus.DEPOSITED;
                consignmentChanged = true;
              }
           }
        }
      } else {
        // EDIT ENTRY (only 1 item)
        const newForm = itemsToProcess[0];
        
        // 1. Revert Old
        if (entry.shopItemId) {
          const oldShopIdx = currentShopData.findIndex(i => i.id === entry.shopItemId);
          if (oldShopIdx !== -1) {
            currentShopData[oldShopIdx].quantity += entry.quantity;
            inventoryChanged = true;
          }
        }
        if (entry.consignor) {
           let oldConIdx = -1;
           if (entry.consignmentItemId) {
             oldConIdx = currentConsignmentData.findIndex(c => c.id === entry.consignmentItemId);
           } else {
             oldConIdx = currentConsignmentData.findIndex(c => c.customerName === entry.consignor && c.productName === entry.productName && c.consignmentPrice === entry.retailPrice);
             if (oldConIdx === -1) {
               oldConIdx = currentConsignmentData.findIndex(c => c.customerName === entry.consignor && c.productName === entry.productName);
             }
           }
           if (oldConIdx !== -1) {
               currentConsignmentData[oldConIdx].quantity += entry.quantity;
               currentConsignmentData[oldConIdx].soldQuantity = Math.max(0, (currentConsignmentData[oldConIdx].soldQuantity || 0) - entry.quantity);
               if ((currentConsignmentData[oldConIdx].status === ConsignmentStatus.DEPOSITED || currentConsignmentData[oldConIdx].status === ConsignmentStatus.SOLD) && currentConsignmentData[oldConIdx].quantity > 0) {
                   currentConsignmentData[oldConIdx].status = ConsignmentStatus.IN_STOCK;
               }
               consignmentChanged = true;
           }
        }
        // 2. Apply New
        if (newForm.source === 'shop' && newForm.shopItemId) {
          const newShopIdx = currentShopData.findIndex(i => i.id === newForm.shopItemId);
          if (newShopIdx !== -1) {
            currentShopData[newShopIdx] = {
              ...currentShopData[newShopIdx],
              quantity: currentShopData[newShopIdx].quantity - newForm.quantity,
              retailPrice: newForm.retailPrice,
              importPrice: newForm.costPrice
            };
            inventoryChanged = true;
          }
        } else if (newForm.source === 'consignor' && newForm.consignor && newForm.consignmentItemId) {
          const newConIdx = currentConsignmentData.findIndex(c => c.id === newForm.consignmentItemId);
          if (newConIdx !== -1) {
            currentConsignmentData[newConIdx].quantity -= newForm.quantity;
            currentConsignmentData[newConIdx].soldQuantity = (currentConsignmentData[newConIdx].soldQuantity || 0) + newForm.quantity;
            currentConsignmentData[newConIdx].status = commonData.status === RevenueStatus.DELIVERED ? ConsignmentStatus.SOLD : ConsignmentStatus.DEPOSITED;
            consignmentChanged = true;
          }
        }
      }

      if (inventoryChanged) {
        window.localStorage.setItem('shopInventoryData', JSON.stringify(currentShopData));
        window.dispatchEvent(new Event('storage'));
        setShopInventoryData(currentShopData);
      }
      if (consignmentChanged) {
        window.localStorage.setItem('consignmentData', JSON.stringify(currentConsignmentData));
        window.dispatchEvent(new Event('storage'));
        setConsignmentData(currentConsignmentData);
      }

    } catch (error) {
      console.error("Critical Error updating inventory:", error);
      alert("Có lỗi xảy ra khi cập nhật kho hàng. Vui lòng thử lại.");
      return;
    }

    const finalEntries: RevenueEntry[] = itemsToProcess.map(item => ({
      id: item.id,
      date: commonData.date,
      customerName: commonData.customerName,
      status: commonData.status,
      productName: item.productName,
      costPrice: item.costPrice,
      retailPrice: item.retailPrice,
      quantity: item.quantity,
      note: item.note,
      consignor: item.consignor,
      shopItemId: item.shopItemId,
      consignmentItemId: item.consignmentItemId
    }));

    onSave(finalEntries);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-50 flex justify-center items-center p-4 sm:p-6 transition-all duration-300">
      <div className="bg-white rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] w-full max-w-lg max-h-full overflow-y-auto ring-1 ring-slate-100 animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 sm:p-8">
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight bg-gradient-to-br from-primary to-blue-600 bg-clip-text text-transparent">{entry ? 'Sửa Đơn Cũ' : 'Ghi Mới Đơn Hàng'}</h3>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-red-500 bg-slate-50 hover:bg-red-50 rounded-full transition-all">
              <CloseIcon className="w-4 h-4"/>
            </button>
          </div>
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 bg-slate-50/50 p-5 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-primary to-blue-500"></div>
                <div className="col-span-2">
                  <label htmlFor="customerName" className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Tên khách hàng</label>
                  <input type="text" id="customerName" name="customerName" value={commonData.customerName} onChange={handleCommonChange} className="block w-full rounded-xl border-slate-200 shadow-sm focus:border-primary focus:ring-4 focus:ring-primary/10 text-sm font-bold bg-white py-2.5 px-3 transition-all placeholder:text-slate-300" placeholder="Nguyễn Văn B..." />
                </div>
                <div>
                  <label htmlFor="date" className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Ngày bán <span className="text-red-500">*</span></label>
                  <input type="date" id="date" name="date" value={commonData.date} onChange={handleCommonChange} required className="block w-full rounded-xl border-slate-200 shadow-sm focus:border-primary focus:ring-4 focus:ring-primary/10 text-sm font-bold bg-white py-2.5 px-3 transition-all text-slate-700" />
                </div>
                <div>
                  <label htmlFor="status" className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Trạng Thái</label>
                  <select id="status" name="status" value={commonData.status} onChange={handleCommonChange} className="block w-full rounded-xl border-slate-200 shadow-sm focus:border-primary focus:ring-4 focus:ring-primary/10 text-sm font-bold bg-white py-2.5 px-3 transition-all text-blue-700 cursor-pointer">
                    <option value={RevenueStatus.HOLDING}>Dồn đơn</option>
                    <option value={RevenueStatus.SHIPPING}>Đang đi đơn</option>
                    <option value={RevenueStatus.DELIVERED}>Đã giao hàng</option>
                  </select>
                </div>
            </div>

            {addedItems.length > 0 && !entry && (
               <div className="space-y-3 relative before:absolute before:inset-y-0 before:-left-3 before:w-px before:bg-slate-200 mx-3">
                 <label className="block text-[10px] font-black text-primary uppercase tracking-widest bg-white inline-block px-2 -ml-2 text-primary-600 relative z-10 rounded-full border border-primary/20 shadow-sm">Đã thêm ({addedItems.length})</label>
                 {addedItems.map((item, index) => (
                    <div key={item.id} className="flex justify-between items-center group bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all relative overflow-hidden ml-3">
                      <div className="absolute top-0 left-0 w-1 h-full bg-slate-200 group-hover:bg-blue-500 transition-colors"></div>
                      <div className="pl-2">
                        <p className="text-xs font-black text-slate-800">{index + 1}. {item.productName}</p>
                        <p className="text-[11px] font-bold text-slate-500 mt-1">{item.quantity} x <span className="text-blue-600">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.retailPrice)}</span></p>
                      </div>
                      <button type="button" onClick={() => handleRemoveFromList(item.id)} className="text-red-400 p-2 bg-slate-50 hover:bg-red-500 hover:text-white rounded-xl transition-all shadow-sm"><TrashIcon className="w-4 h-4" /></button>
                    </div>
                 ))}
               </div>
            )}

            <div className="p-5 border border-slate-200 bg-white rounded-2xl relative shadow-sm hover:shadow-md transition-all">
                {addedItems.length > 0 && !entry && (
                  <span className="absolute -top-3 left-5 bg-gradient-to-r from-primary to-blue-500 text-white px-3 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm">SP Tiếp Theo</span>
                )}
                <div className="space-y-5">
                    <div className="pb-2 border-b border-slate-100">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">Nguồn Hàng</label>
                      <div className="flex space-x-2 bg-slate-100/50 p-1 rounded-xl">
                        <button type="button" onClick={() => handleSourceChange('manual')} className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${productForm.source === 'manual' ? 'bg-white text-slate-800 shadow-sm border-0' : 'bg-transparent text-slate-500 border-0 hover:text-slate-700'}`}>Nhập tay</button>
                        <button type="button" onClick={() => handleSourceChange('shop')} className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${productForm.source === 'shop' ? 'bg-primary text-white shadow-md shadow-primary/30 border-0' : 'bg-transparent text-slate-500 border-0 hover:text-slate-700'}`}>Kho Shop</button>
                        <button type="button" onClick={() => handleSourceChange('consignor')} className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${productForm.source === 'consignor' ? 'bg-purple-500 text-white shadow-md shadow-purple-500/30 border-0' : 'bg-transparent text-slate-500 border-0 hover:text-slate-700'}`}>Hàng Ký Gửi</button>
                      </div>
                    </div>

                    {productForm.source === 'shop' && (
                      <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 text-primary">Chọn sản phẩm trong kho <span className="text-red-500">*</span></label>
                        <select value={productForm.shopItemId} onChange={(e) => handleShopItemChange(e.target.value)} className="block w-full rounded-xl border-primary/20 shadow-sm focus:border-primary focus:ring-4 focus:ring-primary/10 text-sm font-bold bg-primary/5 py-2.5 px-3 transition-all cursor-pointer">
                          <option value="">-- Click để chọn --</option>
                          {availableShopItems.map(item => (
                            <option key={item.id} value={item.id} disabled={item.remainingQuantity <= 0}>
                              {item.productName} (Còn: {item.remainingQuantity}) ({new Intl.NumberFormat('vi-VN').format(item.retailPrice)}) {item.remainingQuantity <= 0 ? '- Hết hàng' : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {productForm.source === 'consignor' && (
                      <div className="animate-in fade-in slide-in-from-top-2 duration-200 grid grid-cols-1 sm:grid-cols-2 gap-4 bg-purple-50/50 p-3 rounded-xl border border-purple-100">
                        <div>
                          <label htmlFor="consignor" className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 text-purple-600">Khách gửi <span className="text-red-500">*</span></label>
                          <select id="consignor" name="consignor" value={productForm.consignor} onChange={(e) => handleConsignorChange(e.target.value)} className="block w-full rounded-xl border-purple-200 shadow-sm focus:border-purple-400 focus:ring-4 focus:ring-purple-400/10 text-sm font-bold bg-white py-2 px-3 cursor-pointer">
                            <option value="">-- Chọn khách --</option>
                            {consignors.map(name => <option key={name} value={name}>{name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label htmlFor="productName" className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 text-purple-600">Sản phẩm gửi <span className="text-red-500">*</span></label>
                          <select 
                            id="productName" 
                            name="productName" 
                            value={productForm.consignmentItemId || ''}
                            onChange={(e) => handleConsignedProductChange(e.target.value)} 
                            className="block w-full rounded-xl border-purple-200 shadow-sm focus:border-purple-400 focus:ring-4 focus:ring-purple-400/10 text-sm font-bold bg-white py-2 px-3 cursor-pointer disabled:opacity-50"
                            disabled={!productForm.consignor}
                          >
                            <option value="">-- Chọn sản phẩm --</option>
                            {availableConsignedProducts.map(p => (
                              <option key={p.id} value={p.id} disabled={p.remainingQuantity <= 0}>
                                  {p.productName} (Còn: {p.remainingQuantity}) ({new Intl.NumberFormat('vi-VN').format(p.consignmentPrice)})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}

                    {productForm.source === 'manual' && (
                       <div>
                         <label htmlFor="productName" className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Tên Sản Phẩm <span className="text-red-500">*</span></label>
                         <input type="text" id="productName" name="productName" value={productForm.productName} onChange={handleProductChange} className="block w-full rounded-xl border-slate-200 shadow-sm focus:border-primary focus:ring-4 focus:ring-primary/10 text-sm font-bold bg-slate-50/30 focus:bg-white py-2.5 px-3 transition-colors" placeholder="Váy thu đông..." />
                       </div>
                    )}
                    
                    {/* Keep inputs disabled/readonly if not manual */}
                    {productForm.source !== 'manual' && productForm.source !== 'consignor' && (
                       <div>
                         <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Tên Sản Phẩm</label>
                         <input type="text" value={productForm.productName} readOnly className="block w-full rounded-xl border-slate-100 bg-slate-50 text-sm font-bold text-slate-600 py-2.5 px-3 cursor-not-allowed" placeholder="Tự động điền..." />
                       </div>
                    )}

                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                      <div className="col-span-1 hidden sm:block">
                        <label htmlFor="costPrice" className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Giá Nhập</label>
                        <input type="number" id="costPrice" name="costPrice" value={productForm.costPrice} onChange={handleProductChange} className={`block w-full rounded-xl border-slate-200 shadow-sm focus:border-primary focus:ring-4 focus:ring-primary/10 text-sm font-bold py-2.5 px-3 transition-colors ${productForm.source !== 'manual' ? 'bg-slate-50 text-slate-500 cursor-not-allowed border-slate-100' : 'bg-slate-50/30 focus:bg-white'}`} readOnly={productForm.source !== 'manual'} />
                      </div>
                      <div className="col-span-1">
                        <label htmlFor="retailPrice" className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Giá Bán <span className="text-red-500">*</span></label>
                        <input type="number" id="retailPrice" name="retailPrice" value={productForm.retailPrice} onChange={handleProductChange} required className={`block w-full rounded-xl border-slate-200 shadow-sm focus:border-primary focus:ring-4 focus:ring-primary/10 text-sm font-bold py-2.5 px-3 transition-colors text-blue-700 ${productForm.source !== 'manual' ? 'bg-slate-50 cursor-not-allowed border-slate-100' : 'bg-slate-50/30 focus:bg-white'}`} readOnly={productForm.source !== 'manual'} />
                      </div>
                      <div className="col-span-1">
                          <label htmlFor="quantity" className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">SL <span className="text-red-500">*</span></label>
                          <input type="number" id="quantity" name="quantity" value={productForm.quantity} onChange={handleProductChange} required min="1" className="block w-full rounded-xl border-slate-200 shadow-sm focus:border-primary focus:ring-4 focus:ring-primary/10 text-sm font-black text-center bg-slate-50/30 focus:bg-white py-2.5 px-3 transition-colors text-primary" />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="note" className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Ghi chú thêm</label>
                      <input type="text" id="note" name="note" value={productForm.note} onChange={handleProductChange} className="block w-full rounded-xl border-slate-200 shadow-sm focus:border-primary focus:ring-4 focus:ring-primary/10 text-sm font-medium bg-slate-50/30 focus:bg-white py-2.5 px-3 transition-colors" placeholder="Size, màu sắc..." />
                    </div>
                </div>
            </div>

            {!entry && (
               <button type="button" onClick={handleAddToList} className="mt-4 w-full py-3 border-2 border-dashed border-primary/40 text-primary-600 bg-primary-50/50 hover:bg-primary-50 transition-all font-black text-xs uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 hover:border-primary hover:shadow-inner group">
                  <span className="bg-primary/10 p-1 rounded-md group-hover:bg-primary group-hover:text-white transition-colors"><PlusIcon className="w-4 h-4" /></span> 
                  Lưu & Nhập SP Tiếp Theo
               </button>
            )}

            <div className="flex justify-end pt-6 space-x-3 border-t border-slate-100 mt-6">
              <button type="button" onClick={onClose} className="px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 hover:text-slate-900 font-bold transition-all text-sm shadow-sm">Thoát</button>
              <button type="button" onClick={handleSubmit} className="px-8 py-3 bg-gradient-to-r from-primary to-blue-600 hover:from-primary-600 hover:to-blue-700 text-white rounded-xl font-black shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all text-sm uppercase tracking-tight transform hover:-translate-y-0.5">Lưu Toàn Bộ Đơn</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RevenueModal;