import React, { useState, useMemo } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';
import { RevenueEntry, CustomerInfo } from '../types';
import { UsersIcon, PhoneIcon, MapPinIcon, EditIcon, TrashIcon as BackIcon } from './Icons';
import CustomerModal from './CustomerModal';

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

interface CustomerData {
  name: string;
  phone?: string;
  address?: string;
  totalSpent: number;
  totalItems: number;
  transactions: number;
  firstPurchaseDate: string;
  lastPurchaseDate: string;
  purchaseHistory: RevenueEntry[];
}

const CustomersPage: React.FC = () => {
  const [revenueData] = useLocalStorage<RevenueEntry[]>('revenueData', []);
  const [customersInfo, setCustomersInfo] = useLocalStorage<CustomerInfo[]>('customersInfoData', []);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerData | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerInfo | null>(null);

  const customers = useMemo<CustomerData[]>(() => {
    const infoMap = new Map(customersInfo.map(c => [c.name, { phone: c.phone, address: c.address }]));
    const customerMap: { [key: string]: Omit<CustomerData, 'transactions' | 'purchaseHistory' > & { purchaseHistory: RevenueEntry[] } } = {};

    revenueData.forEach(entry => {
      const name = entry.customerName.trim();
      if (!name) return;

      if (!customerMap[name]) {
        const info = infoMap.get(name);
        customerMap[name] = {
          name,
          phone: info?.phone,
          address: info?.address,
          totalSpent: 0,
          totalItems: 0,
          firstPurchaseDate: entry.date,
          lastPurchaseDate: entry.date,
          purchaseHistory: [],
        };
      }

      const customer = customerMap[name];
      const entryTotal = entry.retailPrice * entry.quantity;
      customer.totalSpent += entryTotal;
      customer.totalItems += entry.quantity;
      customer.purchaseHistory.push(entry);

      if (new Date(entry.date) < new Date(customer.firstPurchaseDate)) {
        customer.firstPurchaseDate = entry.date;
      }
      if (new Date(entry.date) > new Date(customer.lastPurchaseDate)) {
        customer.lastPurchaseDate = entry.date;
      }
    });

    return Object.values(customerMap).map(c => ({
      ...c,
      transactions: c.purchaseHistory.length,
      purchaseHistory: c.purchaseHistory.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    })).sort((a, b) => b.totalSpent - a.totalSpent);
  }, [revenueData, customersInfo]);

  const filteredCustomers = useMemo(() => {
    if (!searchTerm) return customers;
    const lowercasedTerm = searchTerm.toLowerCase();
    return customers.filter(c => c.name.toLowerCase().includes(lowercasedTerm));
  }, [customers, searchTerm]);

  const handleOpenModal = (customer: CustomerData) => {
    setEditingCustomer({ name: customer.name, phone: customer.phone, address: customer.address });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCustomer(null);
  };

  const handleSaveCustomerInfo = (updatedInfo: CustomerInfo) => {
    setCustomersInfo(prev => {
        const existingIndex = prev.findIndex(c => c.name === updatedInfo.name);
        if (existingIndex > -1) {
            const newInfo = [...prev];
            newInfo[existingIndex] = updatedInfo;
            return newInfo;
        } else {
            return [...prev, updatedInfo];
        }
    });
    setSelectedCustomer(prev => prev ? { ...prev, ...updatedInfo } : null);
    handleCloseModal();
  };

  if (selectedCustomer) {
    return (
      <div className="space-y-6">
        <button 
          onClick={() => setSelectedCustomer(null)}
          className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border shadow-sm hover:bg-gray-50 text-sm font-bold"
        >
          <BackIcon className="w-4 h-4 rotate-90" />
          Quay lại danh sách
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border space-y-4">
                    <div className="flex justify-between items-start">
                        <h2 className="text-2xl font-black text-gray-900">{selectedCustomer.name}</h2>
                        <button onClick={() => handleOpenModal(selectedCustomer)} className="flex items-center gap-1.5 text-xs font-bold bg-gray-100 hover:bg-primary-50 text-gray-600 hover:text-primary-700 px-3 py-1.5 rounded-lg transition-colors border">
                            <EditIcon className="w-3 h-3" /> Chỉnh sửa
                        </button>
                    </div>
                    <div className="space-y-3 pt-2 border-t">
                        <div className="flex items-center gap-3 text-sm">
                            <PhoneIcon className="w-4 h-4 text-gray-400" />
                            <span className={selectedCustomer.phone ? 'text-gray-700' : 'text-gray-400 italic'}>
                                {selectedCustomer.phone || 'Chưa có SĐT'}
                            </span>
                        </div>
                         <div className="flex items-start gap-3 text-sm">
                            <MapPinIcon className="w-4 h-4 text-gray-400 mt-0.5" />
                            <span className={`whitespace-pre-wrap ${selectedCustomer.address ? 'text-gray-700' : 'text-gray-400 italic'}`}>
                                {selectedCustomer.address || 'Chưa có địa chỉ'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-xl shadow-sm border"><p className="text-xs text-gray-400 font-bold">Tổng Chi Tiêu</p><p className="text-lg font-black">{formatCurrency(selectedCustomer.totalSpent)}</p></div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border"><p className="text-xs text-gray-400 font-bold">Tổng Sản Phẩm</p><p className="text-lg font-black">{selectedCustomer.totalItems}</p></div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border"><p className="text-xs text-gray-400 font-bold">Lần đầu mua</p><p className="text-lg font-black">{selectedCustomer.firstPurchaseDate}</p></div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border"><p className="text-xs text-gray-400 font-bold">Lần cuối mua</p><p className="text-lg font-black">{selectedCustomer.lastPurchaseDate}</p></div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border lg:col-span-2">
                <h3 className="font-bold text-gray-800 mb-4">Lịch sử mua hàng ({selectedCustomer.transactions} giao dịch)</h3>
                <div className="overflow-x-auto max-h-[60vh]">
                    <table className="min-w-full text-xs">
                        <thead className="bg-gray-50 sticky top-0">
                            <tr>
                                {['Ngày', 'Sản Phẩm', 'SL', 'Đơn Giá', 'Thành Tiền'].map(h => (
                                    <th key={h} className="px-3 py-2 text-left font-bold text-gray-500">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {selectedCustomer.purchaseHistory.map(entry => (
                                <tr key={entry.id}>
                                    <td className="px-3 py-2 whitespace-nowrap">{entry.date}</td>
                                    <td className="px-3 py-2 whitespace-nowrap font-semibold">{entry.productName}</td>
                                    <td className="px-3 py-2 text-center">{entry.quantity}</td>
                                    <td className="px-3 py-2 text-right">{formatCurrency(entry.retailPrice)}</td>
                                    <td className="px-3 py-2 text-right font-bold text-primary">{formatCurrency(entry.retailPrice * entry.quantity)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        {isModalOpen && editingCustomer && (
            <CustomerModal
                customer={editingCustomer}
                onSave={handleSaveCustomerInfo}
                onClose={handleCloseModal}
            />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <h2 className="text-3xl font-black text-gray-900">Quản lý Khách hàng ({customers.length})</h2>
            <div className="w-full md:w-1/3">
                 <input 
                    type="text" 
                    placeholder="Tìm kiếm khách hàng..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border-gray-200 shadow-sm focus:ring-primary focus:border-primary"
                />
            </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredCustomers.map(customer => (
                <div 
                    key={customer.name}
                    onClick={() => setSelectedCustomer(customer)}
                    className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:border-primary hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer"
                >
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                            <UsersIcon className="w-6 h-6 text-primary-600"/>
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 truncate">{customer.name}</h3>
                            <p className="text-xs text-gray-400 font-medium">Last order: {customer.lastPurchaseDate}</p>
                        </div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg flex justify-between items-center text-xs">
                        <span className="text-gray-500 font-medium">Total Spent:</span>
                        <span className="font-black text-primary text-sm">{formatCurrency(customer.totalSpent)}</span>
                    </div>
                     <div className="text-center text-[10px] text-gray-400 mt-3 font-bold uppercase tracking-wider">
                        {customer.totalItems} Sản Phẩm Đã Mua
                    </div>
                </div>
            ))}
        </div>
        {filteredCustomers.length === 0 && (
            <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-200">
                <p className="text-gray-400 font-medium italic">Không tìm thấy khách hàng nào.</p>
            </div>
        )}

        {isModalOpen && editingCustomer && (
            <CustomerModal
                customer={editingCustomer}
                onSave={handleSaveCustomerInfo}
                onClose={handleCloseModal}
            />
        )}
    </div>
  );
};

export default CustomersPage;