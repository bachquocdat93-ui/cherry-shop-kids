import React, { useState, useMemo } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';
import { RevenueEntry, ConsignmentItem } from '../types';
import { ChartBarIcon, DollarIcon, ShoppingBagIcon, UsersIcon } from './Icons';

// Helper to format currency
const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

// Get default date range (current month)
const getDefaultDateRange = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
    return { firstDay, lastDay };
};

// KPI Card Component
interface KpiCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color?: string;
}
const KpiCard: React.FC<KpiCardProps> = ({ title, value, icon, color = 'border-gray-200' }) => (
  <div className={`bg-white p-4 rounded-xl shadow-sm border ${color}`}>
    <div className="flex items-center gap-4">
      <div className={`p-3 rounded-lg ${color.replace('border-', 'bg-').replace('-500', '-50')}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{title}</p>
        <p className="text-xl font-black text-gray-800">{value}</p>
      </div>
    </div>
  </div>
);


const ReportsPage: React.FC = () => {
    const [revenueData] = useLocalStorage<RevenueEntry[]>('revenueData', []);
    const [consignmentData] = useLocalStorage<ConsignmentItem[]>('consignmentData', []);
    
    const { firstDay, lastDay } = getDefaultDateRange();
    const [startDate, setStartDate] = useState(firstDay);
    const [endDate, setEndDate] = useState(lastDay);
    const [selectedConsignor, setSelectedConsignor] = useState('all');
    const [selectedCustomer, setSelectedCustomer] = useState('all');

    const uniqueConsignors = useMemo(() => {
        const names = new Set(consignmentData.map(item => item.customerName));
        return Array.from(names).sort();
    }, [consignmentData]);

    const uniqueCustomers = useMemo(() => {
        const names = new Set(revenueData.map(item => item.customerName).filter(name => name.trim() !== ''));
        return Array.from(names).sort();
    }, [revenueData]);
    
    const handleResetFilters = () => {
        const { firstDay, lastDay } = getDefaultDateRange();
        setStartDate(firstDay);
        setEndDate(lastDay);
        setSelectedConsignor('all');
        setSelectedCustomer('all');
    };

    const processedData = useMemo(() => {
        const filtered = revenueData.filter(entry => {
            // Ensure dates are valid before creating Date objects
            if (!entry.date || !startDate || !endDate) return false;

            const entryDate = new Date(entry.date);
            const start = new Date(startDate);
            const end = new Date(endDate);
            
            // Adjust end date to include the whole day
            end.setHours(23, 59, 59, 999);

            const inDateRange = entryDate >= start && entryDate <= end;
            const consignorMatch = selectedConsignor === 'all' || entry.consignor === selectedConsignor;
            const customerMatch = selectedCustomer === 'all' || entry.customerName === selectedCustomer;

            return inDateRange && consignorMatch && customerMatch;
        });

        // KPIs
        const totalRevenue = filtered.reduce((sum, e) => sum + (e.retailPrice * e.quantity), 0);
        const totalProfit = filtered.reduce((sum, e) => {
             const profitMargin = (e.retailPrice - e.costPrice) * e.quantity;
             return sum + profitMargin;
        }, 0);
        const totalProductsSold = filtered.reduce((sum, e) => sum + e.quantity, 0);
        const totalTransactions = filtered.length;

        // Top 5 Products
        const productSales: { [name: string]: number } = {};
        filtered.forEach(e => {
            productSales[e.productName] = (productSales[e.productName] || 0) + e.quantity;
        });
        const topProducts = Object.entries(productSales)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([name, quantity]) => ({ name, quantity }));
        
        // Top 5 Customers
        const customerSpending: { [name: string]: number } = {};
        filtered.forEach(e => {
            if (e.customerName.trim()) {
                customerSpending[e.customerName] = (customerSpending[e.customerName] || 0) + (e.retailPrice * e.quantity);
            }
        });
        const topCustomers = Object.entries(customerSpending)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([name, total]) => ({ name, total }));


        return {
            kpis: { totalRevenue, totalProfit, totalProductsSold, totalTransactions },
            topProducts,
            topCustomers,
            detailedEntries: filtered,
        };

    }, [revenueData, startDate, endDate, selectedConsignor, selectedCustomer]);

    // For rendering bar charts
    const maxTopProductQty = Math.max(...processedData.topProducts.map(p => p.quantity), 1);

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-black text-gray-900">Báo cáo & Phân tích</h2>
            
            {/* Filters */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                    <div>
                        <label className="text-xs font-bold text-gray-500">Từ ngày</label>
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full mt-1 p-2 border border-gray-200 rounded-lg text-sm" />
                    </div>
                     <div>
                        <label className="text-xs font-bold text-gray-500">Đến ngày</label>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full mt-1 p-2 border border-gray-200 rounded-lg text-sm" />
                    </div>
                     <div>
                        <label className="text-xs font-bold text-gray-500">Khách ký gửi</label>
                        <select value={selectedConsignor} onChange={e => setSelectedConsignor(e.target.value)} className="w-full mt-1 p-2 border border-gray-200 rounded-lg text-sm bg-white">
                            <option value="all">Tất cả</option>
                            {uniqueConsignors.map(name => <option key={name} value={name}>{name}</option>)}
                        </select>
                    </div>
                     <div>
                        <label className="text-xs font-bold text-gray-500">Khách mua hàng</label>
                        <select value={selectedCustomer} onChange={e => setSelectedCustomer(e.target.value)} className="w-full mt-1 p-2 border border-gray-200 rounded-lg text-sm bg-white">
                            <option value="all">Tất cả</option>
                            {uniqueCustomers.map(name => <option key={name} value={name}>{name}</option>)}
                        </select>
                    </div>
                </div>
                <div className="flex justify-end mt-4">
                     <button onClick={handleResetFilters} className="text-xs font-bold text-gray-500 hover:text-primary px-4 py-2 rounded-lg bg-gray-50 hover:bg-gray-100">
                        Reset (Về tháng này)
                    </button>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard title="Tổng Doanh Thu" value={formatCurrency(processedData.kpis.totalRevenue)} icon={<DollarIcon className="w-6 h-6 text-teal-500" />} color="border-teal-500" />
                <KpiCard title="Tổng Lợi Nhuận" value={formatCurrency(processedData.kpis.totalProfit)} icon={<ChartBarIcon className="w-6 h-6 text-purple-500" />} color="border-purple-500" />
                <KpiCard title="Sản phẩm đã bán" value={processedData.kpis.totalProductsSold} icon={<ShoppingBagIcon className="w-6 h-6 text-blue-500" />} color="border-blue-500" />
                <KpiCard title="Giao dịch" value={processedData.kpis.totalTransactions} icon={<UsersIcon className="w-6 h-6 text-yellow-500" />} color="border-yellow-500" />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 <div className="bg-white p-6 rounded-2xl shadow-sm border">
                    <h3 className="font-bold text-gray-800 mb-4">Top 5 sản phẩm bán chạy</h3>
                    <div className="space-y-3">
                        {processedData.topProducts.length > 0 ? processedData.topProducts.map(p => (
                            <div key={p.name} className="flex items-center text-xs">
                                <p className="w-2/5 truncate font-medium pr-2" title={p.name}>{p.name}</p>
                                <div className="w-3/5 bg-gray-100 rounded-full h-4">
                                    <div className="bg-primary h-4 rounded-full flex items-center justify-end px-2 text-white font-bold" style={{ width: `${(p.quantity / maxTopProductQty) * 100}%`}}>
                                        {p.quantity}
                                    </div>
                                </div>
                            </div>
                        )) : <p className="text-sm text-gray-400 italic">Không có dữ liệu.</p>}
                    </div>
                </div>
                 <div className="bg-white p-6 rounded-2xl shadow-sm border">
                    <h3 className="font-bold text-gray-800 mb-4">Top 5 khách hàng chi tiêu nhiều nhất</h3>
                     <div className="space-y-2">
                         {processedData.topCustomers.length > 0 ? processedData.topCustomers.map((c, i) => (
                             <div key={c.name} className="flex justify-between items-center text-sm p-2 rounded-lg bg-gray-50/50">
                                 <span className="font-semibold text-gray-700">{i+1}. {c.name}</span>
                                 <span className="font-bold text-primary">{formatCurrency(c.total)}</span>
                             </div>
                         )) : <p className="text-sm text-gray-400 italic">Không có dữ liệu.</p>}
                     </div>
                </div>
            </div>

            {/* Detailed Table */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border">
                 <h3 className="font-bold text-gray-800 mb-4">Chi tiết giao dịch ({processedData.detailedEntries.length})</h3>
                 <div className="overflow-x-auto max-h-96">
                     <table className="min-w-full text-xs">
                         <thead className="bg-gray-50 sticky top-0">
                             <tr>
                                 {['Ngày', 'Khách hàng', 'Sản phẩm', 'SL', 'Giá bán', 'Tổng tiền', 'Lợi nhuận'].map(h => (
                                     <th key={h} className="px-3 py-2 text-left font-bold text-gray-500">{h}</th>
                                 ))}
                             </tr>
                         </thead>
                         <tbody className="divide-y divide-gray-100">
                             {processedData.detailedEntries.map(entry => (
                                 <tr key={entry.id}>
                                     <td className="px-3 py-2 whitespace-nowrap">{entry.date}</td>
                                     <td className="px-3 py-2 whitespace-nowrap font-semibold">{entry.customerName || 'Vãng lai'}</td>
                                     <td className="px-3 py-2 whitespace-nowrap">{entry.productName}</td>
                                     <td className="px-3 py-2 text-center">{entry.quantity}</td>
                                     <td className="px-3 py-2 text-right">{formatCurrency(entry.retailPrice)}</td>
                                     <td className="px-3 py-2 text-right font-bold">{formatCurrency(entry.retailPrice * entry.quantity)}</td>
                                     <td className="px-3 py-2 text-right font-bold text-green-600">{formatCurrency((entry.retailPrice - entry.costPrice) * entry.quantity)}</td>
                                 </tr>
                             ))}
                         </tbody>
                     </table>
                 </div>
            </div>
        </div>
    )
};

export default ReportsPage;
