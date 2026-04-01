import React, { useState, useMemo } from 'react';
import { RevenueEntry, RevenueStatus, ConsignmentItem, ShopItem, ConsignmentStatus } from '../types';
import { CloseIcon, TrashIcon } from './Icons';
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
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-full overflow-y-auto">
        <div className="p-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight">{entry ? 'Sửa thông tin bán hàng' : 'Ghi nhận đơn hàng mới'}</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <CloseIcon />
            </button>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl shadow-inner mb-6 border border-gray-100">
                <div className="col-span-2">
                  <label htmlFor="customerName" className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Tên khách hàng</label>
                  <input type="text" id="customerName" name="customerName" value={commonData.customerName} onChange={handleCommonChange} className="block w-full rounded-xl border-gray-200 shadow-sm focus:border-primary focus:ring-primary text-sm font-medium" />
                </div>
                <div>
                  <label htmlFor="date" className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Ngày bán <span className="text-red-500">*</span></label>
                  <input type="date" id="date" name="date" value={commonData.date} onChange={handleCommonChange} required className="block w-full rounded-xl border-gray-200 shadow-sm focus:border-primary focus:ring-primary text-sm font-medium" />
                </div>
                <div>
                  <label htmlFor="status" className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Trạng Thái</label>
                  <select id="status" name="status" value={commonData.status} onChange={handleCommonChange} className="block w-full rounded-xl border-gray-200 shadow-sm focus:border-primary focus:ring-primary text-sm font-bold bg-white">
                    <option value={RevenueStatus.HOLDING}>Dồn đơn</option>
                    <option value={RevenueStatus.SHIPPING}>Đang đi đơn</option>
                    <option value={RevenueStatus.DELIVERED}>Đã giao hàng</option>
                  </select>
                </div>
            </div>

            {addedItems.length > 0 && !entry && (
               <div className="mb-4 space-y-2">
                 <label className="block text-[10px] font-black text-primary uppercase tracking-widest mb-2">Đã thêm ({addedItems.length} sản phẩm)</label>
                 {addedItems.map((item, index) => (
                    <div key={item.id} className="flex justify-between items-center bg-blue-50/50 p-3 rounded-xl border border-blue-100">
                      <div>
                        <p className="text-xs font-bold text-gray-800">{index + 1}. {item.productName}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">{item.quantity} x {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.retailPrice)}</p>
                      </div>
                      <button type="button" onClick={() => handleRemoveFromList(item.id)} className="text-red-500 p-1.5 bg-white hover:bg-red-50 rounded-lg shadow-sm border border-red-100 transition-colors"><TrashIcon className="w-3.5 h-3.5" /></button>
                    </div>
                 ))}
               </div>
            )}

            <div className="p-4 border border-gray-100 rounded-xl relative">
                {addedItems.length > 0 && !entry && (
                  <span className="absolute -top-2 left-4 bg-white px-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">Sản phẩm tiếp theo</span>
                )}
                <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Nguồn hàng</label>
                      <div className="flex space-x-2">
                        <button type="button" onClick={() => handleSourceChange('manual')} className={`flex-1 py-1.5 text-xs font-bold rounded-lg border ${productForm.source === 'manual' ? 'bg-gray-800 text-white border-gray-800 shadow-md' : 'bg-gray-50 text-gray-600 border-gray-200'}`}>Nhập tay</button>
                        <button type="button" onClick={() => handleSourceChange('shop')} className={`flex-1 py-1.5 text-xs font-bold rounded-lg border ${productForm.source === 'shop' ? 'bg-primary text-white border-primary shadow-md shadow-primary/20' : 'bg-gray-50 text-gray-600 border-gray-200'}`}>Kho Shop</button>
                        <button type="button" onClick={() => handleSourceChange('consignor')} className={`flex-1 py-1.5 text-xs font-bold rounded-lg border ${productForm.source === 'consignor' ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-600/20' : 'bg-gray-50 text-gray-600 border-gray-200'}`}>Ký Gửi</button>
                      </div>
                    </div>

                    {productForm.source === 'shop' && (
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Chọn sản phẩm trong kho</label>
                        <select value={productForm.shopItemId} onChange={(e) => handleShopItemChange(e.target.value)} className="block w-full rounded-xl border-gray-200 shadow-sm focus:border-primary focus:ring-primary text-sm font-medium">
                          <option value="">-- Chọn sản phẩm --</option>
                          {availableShopItems.map(item => (
                            <option key={item.id} value={item.id} disabled={item.remainingQuantity <= 0}>
                              {item.productName} (SL: {item.remainingQuantity}) {item.remainingQuantity <= 0 ? '- Vừa hết/Đã chọn' : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {productForm.source === 'consignor' && (
                      <div>
                        <label htmlFor="consignor" className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Khách ký gửi</label>
                        <select id="consignor" name="consignor" value={productForm.consignor} onChange={(e) => handleConsignorChange(e.target.value)} className="block w-full rounded-xl border-gray-200 shadow-sm focus:border-primary focus:ring-primary text-sm font-medium">
                          <option value="">Chọn khách...</option>
                          {consignors.map(name => <option key={name} value={name}>{name}</option>)}
                        </select>
                      </div>
                    )}

                    <div>
                      <label htmlFor="productName" className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Tên Sản Phẩm {productForm.source === 'manual' && <span className="text-red-500">*</span>}</label>
                      {productForm.source === 'consignor' && productForm.consignor ? (
                        <select 
                          id="productName" 
                          name="productName" 
                          value={productForm.consignmentItemId || ''}
                          onChange={(e) => handleConsignedProductChange(e.target.value)} 
                          className="block w-full rounded-xl border-gray-200 shadow-sm focus:border-primary focus:ring-primary text-sm font-medium"
                        >
                          <option value="">Chọn sản phẩm...</option>
                          {availableConsignedProducts.map(p => (
                            <option key={p.id} value={p.id} disabled={p.remainingQuantity <= 0}>
                                {p.productName} (SL: {p.remainingQuantity}) {p.remainingQuantity <= 0 ? '- Đã chọn hết' : ''}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input type="text" id="productName" name="productName" value={productForm.productName} onChange={handleProductChange} className="block w-full rounded-xl border-gray-200 shadow-sm focus:border-primary focus:ring-primary text-sm font-medium" readOnly={productForm.source === 'shop'} placeholder={productForm.source !== 'manual' ? 'Tự động điền...' : 'Váy thiết kế...'} />
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-1">
                        <label htmlFor="costPrice" className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Giá Nhập</label>
                        <input type="number" id="costPrice" name="costPrice" value={productForm.costPrice} onChange={handleProductChange} className="block w-full rounded-xl border-gray-200 shadow-sm focus:border-primary focus:ring-primary text-sm font-medium" />
                      </div>
                      <div className="col-span-1">
                        <label htmlFor="retailPrice" className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Giá Bán <span className="text-red-500">*</span></label>
                        <input type="number" id="retailPrice" name="retailPrice" value={productForm.retailPrice} onChange={handleProductChange} required className="block w-full rounded-xl border-gray-200 shadow-sm focus:border-primary focus:ring-primary text-sm font-medium" />
                      </div>
                      <div className="col-span-1">
                          <label htmlFor="quantity" className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">SL <span className="text-red-500">*</span></label>
                          <input type="number" id="quantity" name="quantity" value={productForm.quantity} onChange={handleProductChange} required className="block w-full rounded-xl border-gray-200 shadow-sm focus:border-primary focus:ring-primary text-sm font-medium font-bold text-center" />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="note" className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Ghi chú SP</label>
                      <input type="text" id="note" name="note" value={productForm.note} onChange={handleProductChange} className="block w-full rounded-xl border-gray-200 shadow-sm focus:border-primary focus:ring-primary text-xs font-medium" placeholder="Màu sắc, kích cỡ..." />
                    </div>
                </div>
            </div>

            {!entry && (
               <button type="button" onClick={handleAddToList} className="mt-2 w-full py-2.5 border-2 border-dashed border-primary/30 text-primary-600 bg-primary-50 font-black text-xs uppercase tracking-tight rounded-xl hover:bg-primary-100 transition-colors flex items-center justify-center gap-2">
                  <span>+</span> Thêm 1 sản phẩm nữa vào đơn
               </button>
            )}

            <div className="flex justify-end pt-6 space-x-3 border-t border-gray-100 mt-6">
              <button type="button" onClick={onClose} className="px-6 py-2.5 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 font-bold transition-all text-sm">Đóng</button>
              <button type="button" onClick={handleSubmit} className="px-8 py-2.5 bg-primary text-white rounded-xl hover:bg-primary-700 font-black shadow-lg shadow-primary/20 transition-all text-sm uppercase tracking-tight">Lưu Toàn Bộ Đơn</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RevenueModal;