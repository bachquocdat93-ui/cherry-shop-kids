import React, { useState, useMemo } from 'react';
import type { Invoice, InvoiceItem, ConsignmentItem, ShopItem } from '../types';
import { RevenueStatus } from '../types';
import { CloseIcon, PlusIcon, TrashIcon } from './Icons';
import { generateUniqueId } from '../utils/helpers';
import useLocalStorage from '../hooks/useLocalStorage';

interface InvoiceModalProps {
  invoice: Invoice | null;
  onSave: (invoice: Invoice) => void;
  onClose: () => void;
}

type ItemSource = 'manual' | 'shop' | 'consignor';

const InvoiceModal = ({ invoice, onSave, onClose }: InvoiceModalProps) => {
  const [customerName, setCustomerName] = useState(invoice?.customerName || '');
  const [items, setItems] = useState<InvoiceItem[]>(invoice?.items || [{ id: generateUniqueId(), productName: '', sellingPrice: 0, quantity: 1, status: RevenueStatus.HOLDING }]);
  const [deposit, setDeposit] = useState(invoice?.deposit || 0);

  const [consignmentData, setConsignmentData] = useLocalStorage<ConsignmentItem[]>('consignmentData', []);
  const [shopInventoryData, setShopInventoryData] = useLocalStorage<ShopItem[]>('shopInventoryData', []);

  /* Logic update: Initialize with persisted source if available */
  // We need to initialize itemSources and itemSourceDetails based on the presence of shopItemId or consignor info in the items.
  // Since items is state, we should do this initialization once or use useMemo if it was purely derived, but here it's state that can change.
  // We'll use a useEffect to populate it initially if it's empty and we have items, OR just rely on the component mounting state.
  // Better: Initialize state directly from props.

  const [itemSources, setItemSources] = useState<Record<string, ItemSource>>(() => {
    const initialSources: Record<string, ItemSource> = {};
    (invoice?.items || []).forEach(item => {
      if (item.shopItemId) initialSources[item.id] = 'shop';
      // Consignor detection is trickier without explicit field, but we can assume manual if not shop.
      // Unless we add consignorId to InvoiceItem too? For now, let's focus on Shop Item Sync.
      else initialSources[item.id] = 'manual';
    });
    return initialSources;
  });

  const [itemSourceDetails, setItemSourceDetails] = useState<Record<string, string>>(() => {
    const initialDetails: Record<string, string> = {};
    (invoice?.items || []).forEach(item => {
      if (item.shopItemId) initialDetails[item.id] = item.shopItemId;
    });
    return initialDetails;
  });

  const consignors = useMemo(() => {
    const names = new Set(consignmentData.map(item => item.customerName));
    return Array.from(names);
  }, [consignmentData]);

  const shopItems = useMemo(() => shopInventoryData, [shopInventoryData]);

  const handleItemChange = (index: number, field: keyof Omit<InvoiceItem, 'id'>, value: any) => {
    const newItems = [...items];
    (newItems[index] as any)[field] = value;
    setItems(newItems);
  };

  const handleSourceTypeChange = (itemId: string, source: ItemSource) => {
    setItemSources(prev => ({ ...prev, [itemId]: source }));
    setItemSourceDetails(prev => {
      const next = { ...prev };
      delete next[itemId]; // Reset detail selection
      return next;
    });

    const itemIndex = items.findIndex(i => i.id === itemId);
    if (itemIndex !== -1) {
      // Clear shopItemId when changing source type
      const newItems = [...items];
      delete newItems[itemIndex].shopItemId;
      setItems(newItems);

      handleItemChange(itemIndex, 'productName', '');
      handleItemChange(itemIndex, 'sellingPrice', 0);
    }
  };

  const handleSourceDetailChange = (itemId: string, detailValue: string) => {
    setItemSourceDetails(prev => ({ ...prev, [itemId]: detailValue }));
    const source = itemSources[itemId];
    const itemIndex = items.findIndex(i => i.id === itemId);
    if (itemIndex === -1) return;

    if (source === 'shop') {
      const shopItem = shopInventoryData.find(i => i.id === detailValue);
      if (shopItem) {
        const newItems = [...items];
        newItems[itemIndex].shopItemId = detailValue; // Store the ID!
        setItems(newItems);

        handleItemChange(itemIndex, 'productName', shopItem.productName);
        handleItemChange(itemIndex, 'sellingPrice', shopItem.retailPrice);
      }
    } else if (source === 'consignor') {
      // detailValue is consignorName here
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
    const newId = generateUniqueId();
    setItems([...items, { id: newId, productName: '', sellingPrice: 0, quantity: 1, status: RevenueStatus.HOLDING }]);
    setItemSources(prev => ({ ...prev, [newId]: 'manual' }));
  };

  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    const removedItemId = items[index].id;

    setItems(newItems);
    setItemSources(prev => { const n = { ...prev }; delete n[removedItemId]; return n; });
    setItemSourceDetails(prev => { const n = { ...prev }; delete n[removedItemId]; return n; });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || items.some(item => !item.productName || item.sellingPrice < 0)) {
      alert('Vui lòng điền tên khách hàng và thông tin sản phẩm hợp lệ.');
      return;
    }

    // Deduction & Sync Logic - DIRECT LOCALSTORAGE ACCESS
    try {
      const currentShopDataRaw = window.localStorage.getItem('shopInventoryData') || '[]';
      let currentShopData: ShopItem[] = JSON.parse(currentShopDataRaw);
      let inventoryChanged = false;

      const currentConsignmentRaw = window.localStorage.getItem('consignmentData') || '[]';
      let currentConsignmentData: ConsignmentItem[] = JSON.parse(currentConsignmentRaw);
      let consignmentChanged = false;

      if (!invoice) {
        // NEW INVOICE - DEDUCT
        items.forEach(item => {
          const source = itemSources[item.id];
          const detail = itemSourceDetails[item.id];

          if (source === 'shop' && detail) {
            const shopIdx = currentShopData.findIndex(i => i.id === detail);
            if (shopIdx !== -1) {
              currentShopData[shopIdx] = {
                ...currentShopData[shopIdx],
                quantity: currentShopData[shopIdx].quantity - item.quantity,
                retailPrice: item.sellingPrice
              };
              inventoryChanged = true;
            }
          } else if (source === 'consignor' && detail) {
            // Detail is CustomerName
            const conItemIdx = currentConsignmentData.findIndex(c => c.customerName === detail && c.productName === item.productName && c.consignmentPrice === item.sellingPrice);
            if (conItemIdx !== -1) {
              currentConsignmentData[conItemIdx].quantity -= item.quantity;
              consignmentChanged = true;
            }
          }
        });
      } else {
        // EDIT INVOICE - REVERT & APPLY
        // 1. Revert Old Items
        invoice.items.forEach(oldItem => {
          if (oldItem.shopItemId) {
            const shopIdx = currentShopData.findIndex(i => i.id === oldItem.shopItemId);
            if (shopIdx !== -1) {
              currentShopData[shopIdx].quantity += oldItem.quantity;
              inventoryChanged = true;
            }
          }
        });

        // 2. Apply New Items
        items.forEach(newItem => {
          const shopItemId = newItem.shopItemId;
          if (shopItemId) {
            const shopIdx = currentShopData.findIndex(i => i.id === shopItemId);
            if (shopIdx !== -1) {
              currentShopData[shopIdx] = {
                ...currentShopData[shopIdx],
                quantity: currentShopData[shopIdx].quantity - newItem.quantity,
                retailPrice: newItem.sellingPrice
              };
              inventoryChanged = true;
            }
          }
        });
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

    } catch (e) {
      console.error("Critical Error updating inventory:", e);
    }

    onSave({ id: invoice?.id || generateUniqueId(), customerName, items, deposit });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
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
                const source = itemSources[item.id] || 'manual';
                const sourceDetail = itemSourceDetails[item.id] || '';

                const consignorProducts = source === 'consignor' && sourceDetail
                  ? consignmentData.filter(p => p.customerName === sourceDetail)
                  : [];

                return (
                  <div key={item.id} className="grid grid-cols-12 gap-3 items-end p-4 bg-gray-50 border rounded-xl">
                    <div className="col-span-12 md:col-span-2">
                      <label className="text-[10px] uppercase font-bold text-gray-400">Nguồn hàng</label>
                      <select
                        value={source}
                        onChange={(e) => handleSourceTypeChange(item.id, e.target.value as ItemSource)}
                        className="block w-full text-sm rounded-md border-gray-300 shadow-sm"
                      >
                        <option value="manual">Nhập tay</option>
                        <option value="shop">Kho Shop</option>
                        <option value="consignor">Hàng Ký Gửi</option>
                      </select>
                    </div>

                    <div className="col-span-12 md:col-span-3">
                      <label className="text-[10px] uppercase font-bold text-gray-400">Chi tiết nguồn</label>
                      {source === 'manual' && (
                        <input disabled value="-" className="block w-full text-sm rounded-md border-gray-200 bg-gray-100 text-gray-400 shadow-sm" />
                      )}
                      {source === 'shop' && (
                        <select
                          value={sourceDetail}
                          onChange={(e) => handleSourceDetailChange(item.id, e.target.value)}
                          className="block w-full text-sm rounded-md border-gray-300 shadow-sm"
                        >
                          <option value="">Chọn hàng trong kho...</option>
                          {shopItems.map(si => (
                            <option key={si.id} value={si.id} disabled={si.quantity <= 0}>
                              {si.productName} (SL: {si.quantity}) {si.quantity <= 0 ? '- Hết hàng' : ''}
                            </option>
                          ))}
                        </select>
                      )}
                      {source === 'consignor' && (
                        <select
                          value={sourceDetail}
                          onChange={(e) => handleSourceDetailChange(item.id, e.target.value)}
                          className="block w-full text-sm rounded-md border-gray-300 shadow-sm"
                        >
                          <option value="">Chọn chủ hàng...</option>
                          {consignors.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      )}
                    </div>

                    <div className="col-span-12 md:col-span-3">
                      <label className="text-[10px] uppercase font-bold text-gray-400">Tên sản phẩm</label>
                      {source === 'consignor' && sourceDetail ? (
                        <select onChange={(e) => handleConsignedProductChange(index, e.target.value)} required className="block w-full text-sm rounded-md border-gray-300 shadow-sm">
                          <option value="">Chọn sản phẩm...</option>
                          {consignorProducts.map(p => <option key={p.id} value={p.id}>{p.productName}</option>)}
                        </select>
                      ) : (
                        <input type="text" value={item.productName} onChange={(e) => handleItemChange(index, 'productName', e.target.value)} placeholder="Tên sản phẩm" required className="block w-full text-sm rounded-md border-gray-300 shadow-sm" readOnly={source === 'shop'} />
                      )}
                    </div>
                    <div className="col-span-6 md:col-span-1">
                      <label className="text-[10px] uppercase font-bold text-gray-400">Giá bán</label>
                      <input type="number" value={item.sellingPrice} onChange={(e) => handleItemChange(index, 'sellingPrice', parseFloat(e.target.value) || 0)} placeholder="Giá" required className="block w-full text-sm rounded-md border-gray-300 shadow-sm" readOnly={source !== 'manual'} />
                    </div>
                    <div className="col-span-6 md:col-span-1">
                      <label className="text-[10px] uppercase font-bold text-gray-400">SL</label>
                      <input type="number" value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)} placeholder="SL" required className="block w-full text-sm rounded-md border-gray-300 shadow-sm" />
                    </div>
                    <div className="col-span-10 md:col-span-2">
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
                )
              })}
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