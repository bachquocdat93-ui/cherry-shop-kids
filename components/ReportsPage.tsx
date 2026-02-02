import React, { useState, useMemo } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';
import { RevenueEntry, ConsignmentItem, ConsignmentStatus } from '../types';
import { ChartBarIcon, DollarIcon, ShoppingBagIcon, UsersIcon, CheckCircleIcon } from './Icons';

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
    subtext?: string;
}
const KpiCard: React.FC<KpiCardProps> = ({ title, value, icon, color = 'border-gray-200', subtext }) => (
    <div className={`bg-white p-4 rounded-xl shadow-sm border ${color}`}>
        <div className="flex items-center gap-4">
            <div className={`p-3 rounded-lg ${color.replace('border-', 'bg-').replace('-500', '-50')}`}>
                {icon}
            </div>
            <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{title}</p>
                <p className="text-xl font-black text-gray-800">{value}</p>
                {subtext && <p className="text-[10px] text-gray-400 mt-1">{subtext}</p>}
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
    const [activeTab, setActiveTab] = useState<'revenue' | 'consignment'>('revenue');

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

    // Revenue & Profit Analysis Logic
    const revenueStats = useMemo(() => {
        const filtered = revenueData.filter(entry => {
            if (!entry.date || !startDate || !endDate) return false;
            const entryDate = new Date(entry.date);
            const start = new Date(startDate);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);

            const inDateRange = entryDate >= start && entryDate <= end;
            const consignorMatch = selectedConsignor === 'all' || entry.consignor === selectedConsignor;
            const customerMatch = selectedCustomer === 'all' || entry.customerName === selectedCustomer;

            return inDateRange && consignorMatch && customerMatch;
        });

        const totalRevenue = filtered.reduce((sum, e) => sum + (e.retailPrice * e.quantity), 0);

        // FIXED PROFIT CALCULATION: Include 20% consignment fee bonus
        const totalProfit = filtered.reduce((sum, e) => {
            const profitMargin = (e.retailPrice - e.costPrice) * e.quantity;
            const isConsignment = e.consignor && e.consignor.trim() !== '';
            const consignmentBonus = isConsignment ? (e.costPrice * 0.2 * e.quantity) : 0;
            return sum + profitMargin + consignmentBonus;
        }, 0);

        const totalProductsSold = filtered.reduce((sum, e) => sum + e.quantity, 0);
        const totalTransactions = filtered.length;

        // Top Products
        const productSales: { [name: string]: number } = {};
        filtered.forEach(e => {
            productSales[e.productName] = (productSales[e.productName] || 0) + e.quantity;
        });
        const topProducts = Object.entries(productSales)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([name, quantity]) => ({ name, quantity }));

        // Top Customers
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

    // Consignment Analysis Logic
    const consignmentStats = useMemo(() => {
        // Filter by date (if items have created date - assuming we mostly care about current status logic)
        // Since consignment doesn't have a specific "date" field in valid range, we might just show ALL current state 
        // OR filtering by items that are actively in the system. 
        // For this dashboard, showing the CURRENT SNAPSHOT of the consignment db is usually more useful.

        const totalItems = consignmentData.length;
        const totalQuantity = consignmentData.reduce((sum, i) => sum + i.quantity, 0);

        const statusCounts = {
            [ConsignmentStatus.IN_STOCK]: 0,
            [ConsignmentStatus.SOLD]: 0,
            [ConsignmentStatus.RETURNED]: 0,
            [ConsignmentStatus.DEPOSITED]: 0,
        };

        consignmentData.forEach(item => {
            if (statusCounts[item.status] !== undefined) {
                statusCounts[item.status] += item.quantity;
            }
        });

        // Financials
        // Shop Revenue = Sold Items * Price * Fee%
        const shopConsignmentRevenue = consignmentData
            .filter(i => i.status === ConsignmentStatus.SOLD)
            .reduce((sum, i) => sum + (i.consignmentPrice * (i.consignmentFee / 100) * i.quantity), 0);

        // Pending Payout = Sold Items * Price * (1 - Fee%)
        const pendingPayout = consignmentData
            .filter(i => i.status === ConsignmentStatus.SOLD)
            .reduce((sum, i) => sum + (i.consignmentPrice * (1 - i.consignmentFee / 100) * i.quantity), 0);

        // Top Consignors
        const consignorPerformance: { [name: string]: { sent: number, sold: number, revenue: number } } = {};
        consignmentData.forEach(item => {
            if (!consignorPerformance[item.customerName]) {
                consignorPerformance[item.customerName] = { sent: 0, sold: 0, revenue: 0 };
            }
            consignorPerformance[item.customerName].sent += item.quantity;
            if (item.status === ConsignmentStatus.SOLD) {
                consignorPerformance[item.customerName].sold += item.quantity;
                consignorPerformance[item.customerName].revenue += (item.consignmentPrice * (item.consignmentFee / 100) * item.quantity);
            }
        });

        const topConsignors = Object.entries(consignorPerformance)
            .sort(([, a], [, b]) => b.revenue - a.revenue)
            .map(([name, stats]) => ({ name, ...stats }));

        return {
            totalItems,
            totalQuantity,
            statusCounts,
            shopConsignmentRevenue,
            pendingPayout,
            topConsignors
        };
    }, [consignmentData]);

    const maxTopProductQty = Math.max(...revenueStats.topProducts.map(p => p.quantity), 1);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-3xl font-black text-gray-900">Báo cáo & Phân tích</h2>
                <div className="bg-gray-100 p-1 rounded-xl flex gap-1">
                    <button
                        onClick={() => setActiveTab('revenue')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'revenue' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Quản lý Doanh Thu
                    </button>
                    <button
                        onClick={() => setActiveTab('consignment')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'consignment' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Báo cáo Ký Gửi
                    </button>
                </div>
            </div>

            {activeTab === 'revenue' ? (
                <div className="space-y-6 animate-fade-in">
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
                        <KpiCard title="Tổng Doanh Thu" value={formatCurrency(revenueStats.kpis.totalRevenue)} icon={<DollarIcon className="w-6 h-6 text-teal-500" />} color="border-teal-500" />
                        <KpiCard title="Tổng Lợi Nhuận" value={formatCurrency(revenueStats.kpis.totalProfit)} icon={<ChartBarIcon className="w-6 h-6 text-purple-500" />} color="border-purple-500" subtext="Bao gồm bonus ký gửi" />
                        <KpiCard title="Sản phẩm đã bán" value={revenueStats.kpis.totalProductsSold} icon={<ShoppingBagIcon className="w-6 h-6 text-blue-500" />} color="border-blue-500" />
                        <KpiCard title="Giao dịch" value={revenueStats.kpis.totalTransactions} icon={<UsersIcon className="w-6 h-6 text-yellow-500" />} color="border-yellow-500" />
                    </div>

                    {/* Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border">
                            <h3 className="font-bold text-gray-800 mb-4">Top 5 sản phẩm bán chạy</h3>
                            <div className="space-y-3">
                                {revenueStats.topProducts.length > 0 ? revenueStats.topProducts.map(p => (
                                    <div key={p.name} className="flex items-center text-xs">
                                        <p className="w-2/5 truncate font-medium pr-2" title={p.name}>{p.name}</p>
                                        <div className="w-3/5 bg-gray-100 rounded-full h-4">
                                            <div className="bg-primary h-4 rounded-full flex items-center justify-end px-2 text-white font-bold" style={{ width: `${(p.quantity / maxTopProductQty) * 100}%` }}>
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
                                {revenueStats.topCustomers.length > 0 ? revenueStats.topCustomers.map((c, i) => (
                                    <div key={c.name} className="flex justify-between items-center text-sm p-2 rounded-lg bg-gray-50/50">
                                        <span className="font-semibold text-gray-700">{i + 1}. {c.name}</span>
                                        <span className="font-bold text-primary">{formatCurrency(c.total)}</span>
                                    </div>
                                )) : <p className="text-sm text-gray-400 italic">Không có dữ liệu.</p>}
                            </div>
                        </div>
                    </div>

                    {/* Detailed Table */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border">
                        <h3 className="font-bold text-gray-800 mb-4">Chi tiết giao dịch ({revenueStats.detailedEntries.length})</h3>
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
                                    {revenueStats.detailedEntries.map(entry => {
                                        const profitMargin = (entry.retailPrice - entry.costPrice) * entry.quantity;
                                        const isConsignment = entry.consignor && entry.consignor.trim() !== '';
                                        const consignmentBonus = isConsignment ? (entry.costPrice * 0.2 * entry.quantity) : 0;
                                        const totalProfit = profitMargin + consignmentBonus;

                                        return (
                                            <tr key={entry.id}>
                                                <td className="px-3 py-2 whitespace-nowrap">{entry.date}</td>
                                                <td className="px-3 py-2 whitespace-nowrap font-semibold">{entry.customerName || 'Vãng lai'}</td>
                                                <td className="px-3 py-2 whitespace-nowrap">{entry.productName}</td>
                                                <td className="px-3 py-2 text-center">{entry.quantity}</td>
                                                <td className="px-3 py-2 text-right">{formatCurrency(entry.retailPrice)}</td>
                                                <td className="px-3 py-2 text-right font-bold">{formatCurrency(entry.retailPrice * entry.quantity)}</td>
                                                <td className="px-3 py-2 text-right font-bold text-green-600">
                                                    {formatCurrency(totalProfit)}
                                                    {isConsignment && <span className="text-[9px] text-gray-400 block font-normal">(Có 20% phụ phí)</span>}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-6 animate-fade-in">
                    {/* Consignment Dashboard */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <KpiCard title="Tổng Sản Phẩm Ký Gửi" value={consignmentStats.totalQuantity} icon={<ShoppingBagIcon className="w-6 h-6 text-pink-500" />} color="border-pink-500" />
                        <KpiCard title="Doanh Thu Shop (Phí)" value={formatCurrency(consignmentStats.shopConsignmentRevenue)} icon={<DollarIcon className="w-6 h-6 text-teal-500" />} color="border-teal-500" subtext="Lợi nhuận từ phí dịch vụ" />
                        <KpiCard title="Tiền Chờ Thanh Toán" value={formatCurrency(consignmentStats.pendingPayout)} icon={<DollarIcon className="w-6 h-6 text-orange-500" />} color="border-orange-500" subtext="Tiền phải trả khách" />
                        <KpiCard title="Tổng Khách Ký Gửi" value={uniqueConsignors.length} icon={<UsersIcon className="w-6 h-6 text-blue-500" />} color="border-blue-500" />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Status Breakdown */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border">
                            <h3 className="font-bold text-gray-800 mb-6">Trạng thái Hàng Ký Gửi</h3>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs font-bold text-gray-600">
                                        <span>Còn hàng (Trong kho)</span>
                                        <span className="text-blue-600">{consignmentStats.statusCounts[ConsignmentStatus.IN_STOCK]}</span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-2">
                                        <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${(consignmentStats.statusCounts[ConsignmentStatus.IN_STOCK] / consignmentStats.totalQuantity) * 100}%` }}></div>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs font-bold text-gray-600">
                                        <span>Đã bán</span>
                                        <span className="text-yellow-600">{consignmentStats.statusCounts[ConsignmentStatus.SOLD]}</span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-2">
                                        <div className="bg-yellow-500 h-2 rounded-full" style={{ width: `${(consignmentStats.statusCounts[ConsignmentStatus.SOLD] / consignmentStats.totalQuantity) * 100}%` }}></div>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs font-bold text-gray-600">
                                        <span>Mới cọc</span>
                                        <span className="text-green-600">{consignmentStats.statusCounts[ConsignmentStatus.DEPOSITED]}</span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-2">
                                        <div className="bg-green-600 h-2 rounded-full" style={{ width: `${(consignmentStats.statusCounts[ConsignmentStatus.DEPOSITED] / consignmentStats.totalQuantity) * 100}%` }}></div>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs font-bold text-gray-600">
                                        <span>Đã trả lại</span>
                                        <span className="text-red-600">{consignmentStats.statusCounts[ConsignmentStatus.RETURNED]}</span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-2">
                                        <div className="bg-red-500 h-2 rounded-full" style={{ width: `${(consignmentStats.statusCounts[ConsignmentStatus.RETURNED] / consignmentStats.totalQuantity) * 100}%` }}></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Top Consignors Table */}
                        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border">
                            <h3 className="font-bold text-gray-800 mb-4">Top Khách Ký Gửi Hiệu Quả (Doanh thu shop)</h3>
                            <div className="overflow-x-auto max-h-72">
                                <table className="min-w-full text-xs">
                                    <thead className="bg-gray-50 sticky top-0">
                                        <tr>
                                            <th className="px-3 py-2 text-left text-gray-500">Khách hàng</th>
                                            <th className="px-3 py-2 text-center text-gray-500">Gửi</th>
                                            <th className="px-3 py-2 text-center text-gray-500">Đã bán</th>
                                            <th className="px-3 py-2 text-right text-gray-500">Doanh thu Shop</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {consignmentStats.topConsignors.length > 0 ? consignmentStats.topConsignors.map(c => (
                                            <tr key={c.name}>
                                                <td className="px-3 py-2 font-bold text-gray-800">{c.name}</td>
                                                <td className="px-3 py-2 text-center">{c.sent}</td>
                                                <td className="px-3 py-2 text-center">{c.sold}</td>
                                                <td className="px-3 py-2 text-right font-black text-teal-600">{formatCurrency(c.revenue)}</td>
                                            </tr>
                                        )) : <tr><td colSpan={4} className="text-center py-4 text-gray-400">Không có dữ liệu</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
};

export default ReportsPage;
