import React, { useState, useMemo, useRef, useEffect } from 'react';
import { RevenueEntry, RevenueStatus, ConsignmentItem, ShopItem, ConsignmentStatus } from '../types';
import { CloseIcon, TrashIcon, PlusIcon, ShoppingBagIcon } from './Icons';
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
  const [revenueData] = useLocalStorage<RevenueEntry[]>('revenueData', []);

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

  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const productDropdownRef = useRef<HTMLDivElement>(null);

  const [isConsignorDropdownOpen, setIsConsignorDropdownOpen] = useState(false);
  const [consignorSearchTerm, setConsignorSearchTerm] = useState('');
  const consignorDropdownRef = useRef<HTMLDivElement>(null);

  const [isShopItemDropdownOpen, setIsShopItemDropdownOpen] = useState(false);
  const [shopItemSearchTerm, setShopItemSearchTerm] = useState('');
  const shopItemDropdownRef = useRef<HTMLDivElement>(null);

  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const customerDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (productDropdownRef.current && !productDropdownRef.current.contains(event.target as Node)) {
        setIsProductDropdownOpen(false);
      }
      if (consignorDropdownRef.current && !consignorDropdownRef.current.contains(event.target as Node)) {
        setIsConsignorDropdownOpen(false);
      }
      if (shopItemDropdownRef.current && !shopItemDropdownRef.current.contains(event.target as Node)) {
        setIsShopItemDropdownOpen(false);
      }
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(event.target as Node)) {
        setIsCustomerDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const pastCustomers = useMemo(() => {
     const names = new Set(revenueData.map(item => item.customerName.trim()).filter(Boolean));
     return Array.from(names);
  }, [revenueData]);

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
      .filter(item => item.customerName === productForm.consignor)
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

  const draftTotal = useMemo(() => {
    let t = addedItems.reduce((acc, i) => acc + i.retailPrice * i.quantity, 0);
    if (!entry && productForm.productName && productForm.retailPrice >= 0 && productForm.quantity > 0) {
      t += productForm.retailPrice * productForm.quantity;
    }
    if (entry) {
      t = productForm.retailPrice * productForm.quantity;
    }
    return t;
  }, [addedItems, productForm, entry]);

  return (
    <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[100] flex justify-center items-center p-3 sm:p-6 transition-all">
      <div className={`bg-white rounded-xl shadow-2xl w-full ${entry ? 'max-w-2xl' : 'max-w-6xl'} max-h-[92vh] flex flex-col ring-1 ring-black/5 overflow-hidden`}>
        
        {/* HEADER */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-white shrink-0">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
             <ShoppingBagIcon className="w-5 h-5 text-gray-500" />
             {entry ? 'Chỉnh sửa đơn hàng' : 'Ghi nhận đơn hàng mới'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-md hover:bg-gray-100">
             <CloseIcon className="w-5 h-5"/>
          </button>
        </div>

        {/* BODY */}
        <div className={`flex flex-1 overflow-hidden ${entry ? 'flex-col' : 'flex-col md:flex-row bg-gray-50/50'}`}>
          
          {/* LEFT COLUMN: Product Selection */}
          <div className={`${entry ? 'w-full' : 'w-full md:w-1/2 md:border-r border-gray-200'} bg-white overflow-y-auto flex flex-col p-6`}>
             {!entry && (
               <div className="flex bg-gray-100 p-1 rounded-lg mb-6">
                 <button type="button" onClick={() => handleSourceChange('manual')} className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-1.5 ${productForm.source === 'manual' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                     ✍️ Nhập Tự Do
                 </button>
                 <button type="button" onClick={() => handleSourceChange('shop')} className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-1.5 ${productForm.source === 'shop' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                     📦 Kho Shop
                 </button>
                 <button type="button" onClick={() => handleSourceChange('consignor')} className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-1.5 ${productForm.source === 'consignor' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                     🤝 Ký Gửi
                 </button>
               </div>
             )}

             {/* PRODUCT SELECTION FORM */}
             <div className="flex flex-col gap-5 flex-1">
                {productForm.source === 'shop' && (
                  <div ref={shopItemDropdownRef} className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tuỳ chọn sản phẩm trong kho <span className="text-red-500">*</span></label>
                    <div 
                        className="block w-full border border-gray-300 rounded-md shadow-sm sm:text-sm px-3 py-2 text-gray-900 cursor-pointer bg-white hover:border-gray-400"
                        onClick={() => setIsShopItemDropdownOpen(!isShopItemDropdownOpen)}
                    >
                        {(() => {
                           if (!productForm.shopItemId) return <span className="text-gray-400">Lựa chọn sản phẩm...</span>;
                           const selected = availableShopItems.find(p => p.id === productForm.shopItemId);
                           if (!selected) return <span className="text-gray-400">Lựa chọn sản phẩm...</span>;
                           return <span className="truncate font-medium">{selected.productName} 👉 {new Intl.NumberFormat('vi-VN').format(selected.retailPrice)}đ (Tồn: {selected.remainingQuantity})</span>;
                        })()}
                        <svg className="absolute right-3 top-[34px] w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </div>

                    {isShopItemDropdownOpen && (
                        <div className="absolute z-50 mt-1 left-0 right-0 max-h-[50vh] bg-white shadow-2xl rounded-xl ring-1 ring-black ring-opacity-10 flex flex-col">
                            <div className="p-3 border-b border-gray-100 shrink-0 sticky top-0 bg-white z-10 rounded-t-xl shadow-sm">
                               <input 
                                  type="text" 
                                  className="block w-full border border-gray-300 rounded-lg shadow-sm sm:text-sm px-4 py-2.5 focus:ring-primary focus:border-primary bg-gray-50 placeholder-gray-400 transition-colors focus:bg-white" 
                                  placeholder="🔍 Gõ tên sản phẩm để tìm..." 
                                  value={shopItemSearchTerm}
                                  onChange={(e) => setShopItemSearchTerm(e.target.value)}
                                  autoFocus
                                  onClick={(e) => e.stopPropagation()}
                               />
                            </div>
                            <ul className="overflow-auto py-2 text-base focus:outline-none sm:text-sm flex-1">
                                <li className="text-gray-500 font-medium cursor-pointer select-none py-3 pl-4 pr-9 hover:bg-gray-100 transition-colors"
                                    onClick={() => { handleShopItemChange(''); setIsShopItemDropdownOpen(false); }}>
                                    Bỏ chọn...
                                </li>
                                {availableShopItems
                                    .filter(item => !shopItemSearchTerm || item.productName.toLowerCase().includes(shopItemSearchTerm.toLowerCase()))
                                    .map(item => {
                                        const isDisabled = item.remainingQuantity <= 0;
                                        return (
                                            <li 
                                                key={item.id} 
                                                className={`${isDisabled ? 'cursor-not-allowed bg-gray-50/50 text-gray-400' : 'cursor-pointer hover:bg-primary-50 text-gray-900'} select-none relative py-3 pl-4 pr-4 border-b border-gray-50 last:border-0`}
                                                onClick={() => { if (!isDisabled) { handleShopItemChange(item.id); setIsShopItemDropdownOpen(false); } }}
                                            >
                                                <div className="font-medium truncate">{item.productName}</div>
                                                <div className="text-sm mt-1 text-gray-600">
                                                    Giá: <span className="font-semibold">{new Intl.NumberFormat('vi-VN').format(item.retailPrice)}đ</span> <span className="ml-2 text-primary-600">(Tồn: {item.remainingQuantity})</span>
                                                </div>
                                            </li>
                                        );
                                })}
                            </ul>
                        </div>
                    )}
                  </div>
                )}

                {productForm.source === 'consignor' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div ref={consignorDropdownRef} className="relative">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Khách gửi <span className="text-red-500">*</span></label>
                        
                        <div 
                            className="block w-full border border-gray-300 rounded-md shadow-sm sm:text-sm px-3 py-2 text-gray-900 cursor-pointer bg-white hover:border-gray-400"
                            onClick={() => setIsConsignorDropdownOpen(!isConsignorDropdownOpen)}
                        >
                            <div className="flex items-center gap-2 truncate pr-6 h-5">
                                {productForm.consignor ? <span className="truncate font-medium">{productForm.consignor}</span> : <span className="text-gray-400">Chọn người ký gửi...</span>}
                            </div>
                            <svg className="absolute right-3 top-[34px] w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </div>

                        {isConsignorDropdownOpen && (
                            <div className="absolute z-50 mt-1 left-0 right-0 max-h-[40vh] bg-white shadow-2xl rounded-xl ring-1 ring-black ring-opacity-10 flex flex-col">
                                <div className="p-3 border-b border-gray-100 shrink-0 sticky top-0 bg-white z-10 rounded-t-xl shadow-sm">
                                   <input 
                                      type="text" 
                                      className="block w-full border border-gray-300 rounded-lg shadow-sm sm:text-sm px-4 py-2.5 focus:ring-primary focus:border-primary bg-gray-50 placeholder-gray-400 transition-colors focus:bg-white" 
                                      placeholder="🔍 Gõ để tìm khách..." 
                                      value={consignorSearchTerm}
                                      onChange={(e) => setConsignorSearchTerm(e.target.value)}
                                      autoFocus
                                      onClick={(e) => e.stopPropagation()}
                                   />
                                </div>
                                <ul className="overflow-auto py-2 text-base focus:outline-none sm:text-sm flex-1">
                                    <li className="text-gray-500 font-medium cursor-pointer select-none py-3 pl-4 pr-9 hover:bg-gray-100 transition-colors"
                                        onClick={() => { handleConsignorChange(''); setIsConsignorDropdownOpen(false); }}>
                                        Bỏ chọn...
                                    </li>
                                    {consignors
                                        .filter(name => !consignorSearchTerm || name.toLowerCase().includes(consignorSearchTerm.toLowerCase()))
                                        .map(name => (
                                            <li 
                                                key={name} 
                                                className="cursor-pointer hover:bg-primary-50 text-gray-900 select-none relative py-3 pl-4 pr-4 border-b border-gray-50 last:border-0 font-medium"
                                                onClick={() => { handleConsignorChange(name); setIsConsignorDropdownOpen(false); }}
                                            >
                                                {name}
                                            </li>
                                        ))}
                                    {consignors.filter(name => !consignorSearchTerm || name.toLowerCase().includes(consignorSearchTerm.toLowerCase())).length === 0 && (
                                        <li className="py-4 text-center text-gray-500 text-sm">Không tìm thấy khách</li>
                                    )}
                                </ul>
                            </div>
                        )}
                    </div>
                    <div ref={productDropdownRef} className="relative">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Món hàng <span className="text-red-500">*</span></label>
                        <div 
                           className={`block w-full border border-gray-300 rounded-md shadow-sm sm:text-sm px-3 py-2 text-gray-900 cursor-pointer ${!productForm.consignor ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : 'bg-white hover:border-gray-400'}`}
                           onClick={() => {
                              if (productForm.consignor) setIsProductDropdownOpen(!isProductDropdownOpen);
                           }}
                        >
                           {(() => {
                              if (!productForm.consignmentItemId) return <span className="text-gray-400">Chọn món...</span>;
                              const selected = availableConsignedProducts.find(p => p.id === productForm.consignmentItemId);
                              if (!selected) return <span className="text-gray-400">Chọn món...</span>;
                              return (
                                 <div className="flex items-center gap-2 truncate pr-6">
                                    {selected.imageUrl ? (
                                        <img src={selected.imageUrl} alt="" className="w-5 h-5 object-cover rounded shrink-0 border border-gray-200" />
                                    ) : (
                                        <div className="w-5 h-5 bg-gray-100 rounded flex items-center justify-center text-[10px] text-gray-400 shrink-0 border border-gray-200">Trống</div>
                                    )}
                                    <span className="truncate">{selected.productName} 👉 {new Intl.NumberFormat('vi-VN').format(selected.consignmentPrice)}đ</span>
                                 </div>
                              );
                           })()}
                           
                           <svg className="absolute right-3 top-[34px] w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </div>
                        
                        {isProductDropdownOpen && productForm.consignor && (
                            <div className="absolute z-50 mt-1 -left-4 sm:left-auto right-0 sm:w-[450px] w-[calc(100vw-3rem)] max-w-[450px] bg-white shadow-2xl max-h-[50vh] rounded-xl ring-1 ring-black ring-opacity-10 flex flex-col origin-top-right">
                                <div className="p-3 border-b border-gray-100 shrink-0 sticky top-0 bg-white z-10 rounded-t-xl shadow-sm">
                                   <input 
                                      type="text" 
                                      className="block w-full border border-gray-300 rounded-lg shadow-sm sm:text-sm px-4 py-2.5 focus:ring-primary focus:border-primary bg-gray-50 placeholder-gray-400 transition-colors focus:bg-white" 
                                      placeholder="🔍 Gõ tên món hàng để tìm nhanh..." 
                                      value={productSearchTerm}
                                      onChange={(e) => setProductSearchTerm(e.target.value)}
                                      autoFocus
                                      onClick={(e) => e.stopPropagation()}
                                   />
                                </div>
                                <ul className="overflow-auto py-2 text-base focus:outline-none sm:text-sm flex-1">
                                    <li 
                                        className="text-gray-500 font-medium cursor-pointer select-none relative py-3 pl-4 pr-9 hover:bg-gray-100 transition-colors"
                                        onClick={() => {
                                            handleConsignedProductChange('');
                                            setIsProductDropdownOpen(false);
                                        }}
                                    >
                                        Bỏ chọn / Xóa lựa chọn...
                                    </li>
                                    {availableConsignedProducts
                                        .filter(p => !productSearchTerm || p.productName.toLowerCase().includes(productSearchTerm.toLowerCase()))
                                        .map(p => {
                                            const isUnavailable = p.status === ConsignmentStatus.SOLD || p.status === ConsignmentStatus.DEPOSITED;
                                            const statusText = p.status === ConsignmentStatus.SOLD ? '[Đã bán]' : p.status === ConsignmentStatus.DEPOSITED ? '[Đã cọc]' : '';
                                            const isDisabled = p.remainingQuantity <= 0 || isUnavailable;
                                            
                                            return (
                                                <li 
                                                    key={p.id} 
                                                    className={`${isDisabled ? 'cursor-not-allowed bg-gray-50/50' : 'cursor-pointer hover:bg-primary-50'} flex items-center gap-4 select-none relative py-3 pl-4 pr-4 transition-colors border-b border-gray-50 last:border-0`}
                                                    onClick={() => {
                                                        if (!isDisabled) {
                                                            handleConsignedProductChange(p.id);
                                                            setIsProductDropdownOpen(false);
                                                        }
                                                    }}
                                                >
                                                    <div className="shrink-0 w-14 h-14 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center border border-gray-200">
                                                        {p.imageUrl ? (
                                                            <img src={p.imageUrl} alt={p.productName} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <span className="text-gray-400 text-xs text-center leading-tight">Chưa có<br/>ảnh</span>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-col min-w-0 flex-1">
                                                       <span className={`block text-[15px] font-medium truncate ${isDisabled ? 'text-gray-400' : 'text-gray-900'} ${isUnavailable ? 'line-through text-red-400' : ''}`}>
                                                           {p.productName}
                                                       </span>
                                                       <span className={`block text-sm mt-1 ${isUnavailable ? 'text-red-500 font-semibold' : 'text-gray-600 font-semibold'}`}>
                                                           {statusText} {new Intl.NumberFormat('vi-VN').format(p.consignmentPrice)}đ
                                                       </span>
                                                    </div>
                                                </li>
                                            );
                                        })}
                                    {availableConsignedProducts.filter(p => !productSearchTerm || p.productName.toLowerCase().includes(productSearchTerm.toLowerCase())).length === 0 && (
                                        <div className="py-8 text-center text-gray-500 text-sm">
                                            Không tìm thấy môn hàng nào phù hợp.
                                        </div>
                                    )}
                                </ul>
                            </div>
                        )}
                    </div>
                  </div>
                )}

                {productForm.source === 'manual' && (
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">Tên sản phẩm <span className="text-red-500">*</span></label>
                     <input type="text" name="productName" value={productForm.productName} onChange={handleProductChange} className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm px-3 py-2 text-gray-900 placeholder-gray-400" placeholder="Nhập tên sản phẩm thủ công..." />
                   </div>
                )}

                {productForm.source !== 'manual' && productForm.source !== 'consignor' && (
                   <div className="hidden">
                     <input type="text" value={productForm.productName} readOnly className="block w-full" />
                   </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 border-t border-gray-100 pt-4 mt-2">
                  <div className="col-span-1 hidden sm:block">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Giá vốn</label>
                    <input type="number" name="costPrice" value={productForm.costPrice} onChange={handleProductChange} className={`block w-full rounded-md shadow-sm sm:text-sm px-3 py-2 border-gray-300 focus:ring-primary focus:border-primary ${productForm.source !== 'manual' ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : 'bg-white text-gray-900'}`} readOnly={productForm.source !== 'manual'} />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Giá bán <span className="text-red-500">*</span></label>
                    <input type="number" name="retailPrice" value={productForm.retailPrice} onChange={handleProductChange} required className={`block w-full rounded-md shadow-sm sm:text-sm px-3 py-2 font-semibold text-gray-900 border-gray-300 focus:ring-primary focus:border-primary ${productForm.source === 'shop' ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'}`} readOnly={productForm.source === 'shop'} />
                  </div>
                  <div className="col-span-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Số lượng <span className="text-red-500">*</span></label>
                      <input type="number" name="quantity" value={productForm.quantity} onChange={handleProductChange} required min="1" className="block w-full rounded-md border-gray-300 shadow-sm focus:ring-primary focus:border-primary sm:text-sm px-3 py-2 text-center text-gray-900 font-semibold" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú (Tùy chọn)</label>
                  <input type="text" name="note" value={productForm.note} onChange={handleProductChange} className="block w-full rounded-md border-gray-300 shadow-sm focus:ring-primary focus:border-primary sm:text-sm px-3 py-2 text-gray-900 placeholder-gray-400" placeholder="Size, màu sắc..." />
                </div>
             </div>

             {!entry && (
               <div className="mt-8 pt-4">
                 <button type="button" onClick={handleAddToList} className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all">
                    <PlusIcon className="w-4 h-4 mr-2" /> Thêm vào danh sách
                 </button>
               </div>
             )}
          </div>

          {/* RIGHT COLUMN: The POS Cart / Receipt details */}
          <div className={`${entry ? 'w-full' : 'w-full md:w-1/2 flex flex-col'} relative`}>
            
            {/* Customer Details Head */}
            <div className={`p-6 pb-2 ${entry ? '' : 'bg-transparent'}`}>
                <h4 className="text-base font-medium text-gray-900 mb-4">Thông tin thanh toán</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2 relative" ref={customerDropdownRef}>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Họ tên khách hàng</label>
                    <input 
                        type="text" 
                        name="customerName" 
                        value={commonData.customerName} 
                        onChange={(e) => {
                            handleCommonChange(e);
                            setIsCustomerDropdownOpen(true);
                        }} 
                        onFocus={() => setIsCustomerDropdownOpen(true)}
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm py-2 px-3 text-gray-900 placeholder-gray-400" 
                        placeholder="vd: Chị Nguyễn Trà My" 
                        autoComplete="off"
                    />
                    {isCustomerDropdownOpen && pastCustomers.filter(c => !commonData.customerName || c.toLowerCase().includes(commonData.customerName.toLowerCase())).length > 0 && (
                        <ul className="absolute z-50 mt-1 w-full bg-white shadow-xl max-h-48 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto sm:text-sm">
                            {pastCustomers
                                .filter(c => !commonData.customerName || c.toLowerCase().includes(commonData.customerName.toLowerCase()))
                                .map(c => (
                                    <li 
                                        key={c} 
                                        className="cursor-pointer hover:bg-primary-50 text-gray-900 select-none relative py-2 pl-3 pr-4"
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
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Ngày lập đơn</label>
                    <input type="date" name="date" value={commonData.date} onChange={handleCommonChange} required className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm py-2 px-3 text-gray-900" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Tình trạng giao</label>
                    <select name="status" value={commonData.status} onChange={handleCommonChange} className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm py-2 px-3 text-gray-900 font-medium">
                      <option value={RevenueStatus.HOLDING}>Dồn đơn</option>
                      <option value={RevenueStatus.SHIPPING}>Đang giao</option>
                      <option value={RevenueStatus.DELIVERED} className="text-green-600">Hoàn thành</option>
                    </select>
                  </div>
                </div>
            </div>

            {/* Added Items List (Cart) */}
            {!entry && (
               <div className="flex-1 overflow-y-auto p-6 pt-2">
                 <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Sản phẩm đã chọn</h4>
                 
                 {addedItems.length === 0 && (!productForm.productName || productForm.retailPrice === 0) ? (
                    <div className="text-center py-10 bg-white border border-gray-200 border-dashed rounded-lg">
                        <ShoppingBagIcon className="mx-auto h-10 w-10 text-gray-400" />
                        <p className="mt-2 text-sm text-gray-500">Chưa có sản phẩm nào</p>
                    </div>
                 ) : (
                    <ul className="divide-y divide-gray-100 bg-white border border-gray-200 rounded-lg shadow-sm">
                      {addedItems.map((item, index) => (
                        <li key={item.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                           <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-gray-900 truncate">{item.productName}</p>
                              <p className="text-xs text-gray-500 mt-0.5">SL: {item.quantity} × {new Intl.NumberFormat('vi-VN').format(item.retailPrice)}đ</p>
                           </div>
                           <div className="ml-4 flex items-center gap-4">
                              <span className="text-sm font-semibold text-gray-900">{new Intl.NumberFormat('vi-VN').format(item.retailPrice * item.quantity)}đ</span>
                              <button type="button" onClick={() => handleRemoveFromList(item.id)} className="text-gray-400 hover:text-red-500"><TrashIcon className="w-4 h-4" /></button>
                           </div>
                        </li>
                      ))}
                      
                      {/* Realtime Draft preview if form has data */}
                      {productForm.productName && productForm.retailPrice >= 0 && productForm.quantity > 0 && (
                          <li className="p-4 flex items-center justify-between bg-gray-50 opacity-60">
                             <div className="min-w-0 flex-1">
                                <p className="text-xs font-medium text-gray-400 mb-0.5">Đang soạn thảo</p>
                                <p className="text-sm font-semibold text-gray-700 truncate">{productForm.productName}</p>
                             </div>
                             <span className="text-sm font-medium text-gray-500">+{new Intl.NumberFormat('vi-VN').format(productForm.retailPrice * productForm.quantity)}đ</span>
                          </li>
                      )}
                    </ul>
                 )}
               </div>
            )}

            {/* Bottom Finalize Area */}
            <div className="p-6 bg-gray-50/50 border-t border-gray-200 shrink-0">
               <div className="flex justify-between items-center mb-4">
                   <p className="text-sm font-medium text-gray-500">Tổng thanh toán</p>
                   <p className="text-2xl font-bold text-gray-900">
                      {new Intl.NumberFormat('vi-VN').format(draftTotal)}đ
                   </p>
               </div>
               <button type="button" onClick={handleSubmit} className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-bold text-white bg-gray-900 hover:bg-black focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 transition-all">
                  {entry ? 'LƯU THAY ĐỔI' : 'HOÀN TẤT ĐƠN HÀNG'}
               </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RevenueModal;