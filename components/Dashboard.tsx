import React, { useMemo, useEffect, useState } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';
import { RevenueEntry, ConsignmentItem, ConsignmentStatus, Invoice } from '../types';
import { DollarIcon, ChartBarIcon, ShoppingBagIcon, UsersIcon, TrashIcon, SyncIcon, CheckCircleIcon } from './Icons';
import { getCloudConfig } from '../utils/supabaseService';
import { ComposedChart, Area, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

const formatShortCurrency = (amount: number) => {
  if (amount >= 1000000000) return (amount / 1000000000).toFixed(1) + 'B';
  if (amount >= 1000000) return (amount / 1000000).toFixed(1) + 'M';
  if (amount >= 1000) return (amount / 1000).toFixed(0) + 'k';
  return String(amount);
};

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  colorTheme: 'blue' | 'pink' | 'amber' | 'indigo';
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}

const KpiCard: React.FC<KpiCardProps> = ({ title, value, icon, colorTheme, trend, trendValue }) => {
  const themes = {
    blue: 'text-blue-600 bg-blue-50 border-blue-100',
    pink: 'text-pink-600 bg-pink-50 border-pink-100',
    amber: 'text-amber-600 bg-amber-50 border-amber-100',
    indigo: 'text-indigo-600 bg-indigo-50 border-indigo-100',
  };

  return (
    <div className="bg-white p-6 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 hover:shadow-[0_8px_40px_rgb(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between h-44 relative overflow-hidden group">
      {/* Subtle background glow */}
      <div className={`absolute top-0 right-0 w-32 h-32 blur-3xl opacity-20 rounded-full transition-transform duration-700 group-hover:scale-150 ${themes[colorTheme].split(' ')[0]}`}></div>
      
      <div className="flex justify-between items-start relative z-10">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border ${themes[colorTheme]} backdrop-blur-xl [&>svg]:w-7 [&>svg]:h-7`}>
          {icon}
        </div>
        {trend && trendValue && (
          <div className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full shadow-sm ${trend === 'up' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : trend === 'down' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-slate-50 text-slate-600 border border-slate-100'}`}>
            {trend === 'up' ? '↗' : trend === 'down' ? '↘' : '—'} {trendValue}%
          </div>
        )}
      </div>
      <div className="relative z-10 mt-4">
        <p className="text-3xl font-black text-slate-800 tracking-tight">{value}</p>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1.5">{title}</p>
      </div>
    </div>
  );
};

const getCurrentGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 11) return 'Chào buổi sáng';
  if (hour < 15) return 'Chào buổi trưa';
  if (hour < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
};

interface ChartData {
  month: string;
  revenue: number;
  profit: number;
}

const RevenueProfitChart: React.FC<{ data: ChartData[] }> = ({ data }) => {
  return (
    <div className="w-full h-[500px] bg-white rounded-[2rem] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 flex flex-col relative overflow-hidden">
      {/* Decorative background accent */}
      <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-gradient-to-bl from-blue-50/50 to-transparent blur-3xl -z-0 pointer-events-none"></div>

      <div className="flex justify-between items-start mb-8 relative z-10">
        <div>
          <h3 className="text-xl font-black text-slate-800 tracking-tight mb-1.5">Phân tích kinh doanh kết hợp</h3>
          <p className="text-sm font-semibold text-slate-400">Xu hướng doanh thu & lợi nhuận 6 tháng qua</p>
        </div>
        <div className="flex gap-6 items-center">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-blue-500 shadow-sm shadow-blue-500/20"></div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Doanh thu</span>
          </div>
          <div className="flex items-center gap-2">
             <div className="w-3 h-3 rounded-full bg-pink-500 shadow-[0_0_12px_rgba(236,72,153,0.4)]"></div>
             <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Lợi nhuận gộp</span>
          </div>
        </div>
      </div>

      <div className="flex-1 w-full min-h-0 relative z-10">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 20, right: 0, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="barGradBlue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.9}/>
                <stop offset="100%" stopColor="#60a5fa" stopOpacity={0.4}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis 
              dataKey="month" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 700 }} 
              dy={15} 
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#cbd5e1', fontSize: 11, fontWeight: 700 }} 
              tickFormatter={(value) => formatShortCurrency(value)}
              dx={-10}
            />
            <Tooltip 
              cursor={{ fill: '#f8fafc', opacity: 0.5 }}
              formatter={(value: number) => [formatCurrency(value), undefined]}
              contentStyle={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #f1f5f9', boxShadow: '0 10px 40px -10px rgba(0, 0, 0, 0.1)', padding: '12px 16px' }}
              itemStyle={{ fontWeight: 800, fontSize: '13px' }}
              labelStyle={{ color: '#94a3b8', fontWeight: 700, marginBottom: '6px', fontSize: '11px' }}
            />
            <Bar dataKey="revenue" name="Doanh thu" fill="url(#barGradBlue)" radius={[8, 8, 0, 0]} maxBarSize={40} />
            <Line 
              type="monotone" 
              dataKey="profit" 
              name="Lợi nhuận gộp" 
              stroke="#ec4899" 
              strokeWidth={4} 
              dot={{ r: 4, strokeWidth: 2, fill: '#fff', stroke: '#ec4899' }} 
              activeDot={{ r: 6, fill: '#ec4899', stroke: '#fff', strokeWidth: 3 }} 
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};


const Dashboard: React.FC = () => {
  const [revenueData] = useLocalStorage<RevenueEntry[]>('revenueData', []);
  const [consignmentData] = useLocalStorage<ConsignmentItem[]>('consignmentData', []);
  const [invoicesData] = useLocalStorage<Invoice[]>('invoicesData', []);
  const [lastBackup, setLastBackup] = useState<string | null>(localStorage.getItem('lastBackupAt'));
  const [lastCloudSync, setLastCloudSync] = useState<string | null>(localStorage.getItem('lastCloudSyncAt'));
  const [isCloudConfigured, setIsCloudConfigured] = useState(false);

  useEffect(() => {
    const handleStorage = () => {
      setLastBackup(localStorage.getItem('lastBackupAt'));
      setLastCloudSync(localStorage.getItem('lastCloudSyncAt'));
      setIsCloudConfigured(!!getCloudConfig());
    };
    handleStorage();
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const dashboardData = useMemo(() => {
    // Filter out generated "Fee" entries to avoid double counting
    const validEntries = revenueData.filter(e => !e.productName.startsWith('Phí ký gửi:'));

    const calculateProfit = (item: RevenueEntry) => {
      const baseProfit = (item.retailPrice - item.costPrice) * item.quantity;
      const isConsignment = item.consignor && item.consignor.trim() !== '';
      // Formula: Profit + CostPrice * dynamic%
      const cItem = consignmentData.find(c => c.id === item.consignmentItemId || (c.customerName === item.consignor && c.productName === item.productName && c.consignmentPrice === item.costPrice));
      const commissionRate = cItem?.consignmentFee !== undefined ? (cItem.consignmentFee / 100) : 0.2;
      return baseProfit + (isConsignment ? (item.costPrice * commissionRate * item.quantity) : 0);
    };

    const totalRevenue = validEntries.reduce((sum, item) => sum + item.retailPrice * item.quantity, 0);
    const totalProfit = validEntries.reduce((sum, item) => sum + calculateProfit(item), 0);
    const activeConsignments = consignmentData.filter(item => item.status === ConsignmentStatus.IN_STOCK).length;

    // Chart data: Last 6 Months
    const monthlyStats: { [key: string]: { revenue: number, profit: number } } = {};
    const today = new Date();

    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const key = `${d.getMonth() + 1}/${d.getFullYear()}`; // M/YYYY
      monthlyStats[key] = { revenue: 0, profit: 0 };
    }

    validEntries.forEach(entry => {
      const d = new Date(entry.date);
      const key = `${d.getMonth() + 1}/${d.getFullYear()}`;
      if (monthlyStats[key]) {
        monthlyStats[key].revenue += entry.retailPrice * entry.quantity;
        monthlyStats[key].profit += calculateProfit(entry);
      }
    });

    const chartData = Object.entries(monthlyStats).map(([month, stats]) => ({
      month,
      revenue: stats.revenue,
      profit: stats.profit
    }));

    // Calculate Growth
    let revenueGrowth = 0;
    let profitGrowth = 0;
    if (chartData.length >= 2) {
       const curr = chartData[chartData.length - 1];
       const prev = chartData[chartData.length - 2];
       if (prev.revenue > 0) revenueGrowth = ((curr.revenue - prev.revenue) / prev.revenue) * 100;
       if (prev.profit > 0) profitGrowth = ((curr.profit - prev.profit) / prev.profit) * 100;
    }

    // Recent activity with calculated profit
    const recentActivity = [...validEntries]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5)
      .map(entry => ({
        ...entry,
        calculatedProfit: calculateProfit(entry)
      }));

    // Top Selling Products
    const productStats: Record<string, { quantity: number, revenue: number }> = {};
    validEntries.forEach(entry => {
        if (!productStats[entry.productName]) {
            productStats[entry.productName] = { quantity: 0, revenue: 0 };
        }
        productStats[entry.productName].quantity += entry.quantity;
        productStats[entry.productName].revenue += entry.retailPrice * entry.quantity;
    });
    const bestSellers = Object.entries(productStats)
        .map(([name, stats]) => ({ name, ...stats }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 4);

    // Top Consignors
    const consignorStats: Record<string, { items: number }> = {};
    consignmentData.forEach(item => {
        if (!consignorStats[item.customerName]) {
            consignorStats[item.customerName] = { items: 0 };
        }
        consignorStats[item.customerName].items += item.quantity + (item.soldQuantity || 0);
    });
    const topConsignors = Object.entries(consignorStats)
        .map(([name, stats]) => ({ name, items: stats.items }))
        .sort((a, b) => b.items - a.items)
        .slice(0, 3);

    return { totalRevenue, totalProfit, activeConsignments, chartData, recentActivity, bestSellers, topConsignors, revenueGrowth, profitGrowth };
  }, [revenueData, consignmentData]);


  const handleClearAll = () => {
    const confirmationMessage = `
      BẠN CÓ CHẮC MUỐN XÓA TẤT CẢ DỮ LIỆU GIAO DỊCH?
      (Bao gồm: Doanh thu, Hóa đơn, Ký gửi, Thông tin khách hàng)

      Lưu ý: Cài đặt Cloud và tùy chỉnh cột sẽ được giữ lại.
      Hành động này KHÔNG THỂ KHÔI PHỤC!
    `.trim();

    if (window.confirm(confirmationMessage)) {
      if (window.confirm("Xác nhận xóa lần cuối? Dữ liệu sẽ mất vĩnh viễn.")) {
        localStorage.removeItem('revenueData');
        localStorage.removeItem('invoicesData');
        localStorage.removeItem('consignmentData');
        localStorage.removeItem('customersInfoData');
        localStorage.removeItem('lastBackupAt');
        localStorage.removeItem('lastCloudSyncAt');
        window.location.reload();
      }
    }
  };

  return (
    <div className="space-y-8 pb-10">
      {/* HEADER SECTION */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight leading-none mb-2">{getCurrentGreeting()}, Quản trị viên!</h2>
          <p className="text-slate-500 font-medium">Hôm nay là {new Intl.DateTimeFormat('vi-VN', { dateStyle: 'full' }).format(new Date())}. Chúc bạn buôn may bán đắt.</p>
        </div>
        <div className="flex gap-3 flex-wrap items-center bg-white px-5 py-3 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.03)] border border-gray-100">
          {isCloudConfigured && (
            <div className="flex items-center gap-2 border-r border-gray-100 pr-5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="text-[11px] font-black text-slate-600 uppercase tracking-widest">Cloud Sync</span>
            </div>
          )}
          <div className="flex items-center gap-2 border-r border-gray-100 pr-5 pl-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]"></span>
            <span className="text-[11px] font-black text-slate-600 uppercase tracking-widest">Local DB</span>
          </div>
          <button
            onClick={handleClearAll}
            className="flex items-center gap-2 text-rose-500 hover:text-rose-700 transition-colors font-bold text-[11px] uppercase tracking-widest pl-2 group"
          >
            <TrashIcon className="w-4 h-4 group-hover:rotate-12 transition-transform" />
            <span className="hidden sm:inline">Xóa dữ liệu</span>
          </button>
        </div>
      </div>

      {/* KPI SCROLL/GRID VIEW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard title="Tổng Doanh Thu" value={formatCurrency(dashboardData.totalRevenue)} icon={<DollarIcon />} colorTheme="blue" trend={dashboardData.revenueGrowth >= 0 ? 'up' : 'down'} trendValue={Math.abs(dashboardData.revenueGrowth).toFixed(1)} />
        <KpiCard title="Lợi Nhuận Gộp" value={formatCurrency(dashboardData.totalProfit)} icon={<ChartBarIcon />} colorTheme="pink" trend={dashboardData.profitGrowth >= 0 ? 'up' : 'down'} trendValue={Math.abs(dashboardData.profitGrowth).toFixed(1)} />
        <KpiCard title="Đơn Chờ Xử Lý" value={invoicesData.length} icon={<ShoppingBagIcon />} colorTheme="amber" />
        <KpiCard title="Hàng Ký Gửi" value={dashboardData.activeConsignments} icon={<UsersIcon />} colorTheme="indigo" />
      </div>


      {/* MAIN CONTENT DIVISIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN */}
        <div className="lg:col-span-8 flex flex-col gap-8">
          <RevenueProfitChart data={dashboardData.chartData} />

          {/* RECENT ACTIVITY */}
          <div className="bg-white p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
            <div className="flex justify-between items-end mb-6">
               <h3 className="text-xl font-black text-slate-800 tracking-tight">Giao dịch gần đây</h3>
               <span className="text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-xl">Mới nhất</span>
            </div>
            <div className="space-y-4">
              {dashboardData.recentActivity.length > 0 ? dashboardData.recentActivity.map(entry => (
                <div key={entry.id} className="flex items-center justify-between p-4 bg-slate-50 border border-transparent hover:border-blue-100 rounded-2xl transition-all group">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center border border-slate-100 font-bold text-slate-600 shadow-sm group-hover:scale-105 transition-transform">
                      <span className="text-xl">💳</span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800 mb-0.5">
                        {entry.customerName || 'Khách vãng lai'}
                      </p>
                      <p className="text-xs text-slate-500 font-medium whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px] sm:max-w-xs">
                         <span className="font-bold text-slate-600">{entry.productName}</span> — SL: {entry.quantity}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                     <p className="text-[15px] font-black text-slate-800">{formatCurrency(entry.retailPrice * entry.quantity)}</p>
                     <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mt-0.5">Lãi: {formatCurrency((entry as any).calculatedProfit)}</p>
                  </div>
                </div>
              )) : <div className="py-12 text-center border-2 border-dashed border-slate-100 rounded-[2rem]"><p className="text-sm font-bold text-slate-400">Chưa có giao dịch nào.</p></div>}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="lg:col-span-4 flex flex-col gap-8">
          
          {/* Top Products */}
          <div className="bg-white p-7 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
            <h3 className="text-sm font-black text-slate-800 mb-6 uppercase tracking-widest flex items-center gap-2">
              <span className="p-1.5 bg-yellow-100 text-yellow-600 rounded-lg">🏆</span> Sản phẩm bán chạy
            </h3>
            <div className="space-y-4 cursor-default">
              {dashboardData.bestSellers.length > 0 ? dashboardData.bestSellers.map((item, idx) => (
                <div key={item.name} className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-[10px] flex items-center justify-center font-black text-[13px] ${idx === 0 ? 'bg-yellow-50 text-yellow-600 border border-yellow-100/50' : idx === 1 ? 'bg-slate-50 text-slate-500 border border-slate-100/50' : idx === 2 ? 'bg-orange-50 text-orange-600 border border-orange-100/50' : 'bg-blue-50 text-blue-500 border border-blue-100/50'}`}>
                    #{idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">{item.name}</p>
                    <p className="text-[10px] font-semibold text-slate-400 mt-0.5">{formatShortCurrency(item.revenue)}</p>
                  </div>
                  <div className="text-[11px] font-black text-slate-800 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100">
                    {item.quantity} sp
                  </div>
                </div>
              )) : <p className="text-sm text-slate-400 font-medium">Chưa đủ dữ liệu.</p>}
            </div>
          </div>

          {/* Top Consignors */}
          <div className="bg-white p-7 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-100/50 blur-3xl rounded-full -mr-16 -mt-16 pointer-events-none"></div>
            <h3 className="text-sm font-black text-slate-800 mb-6 uppercase tracking-widest flex items-center gap-2 relative z-10">
              <span className="p-1.5 bg-purple-100 text-purple-600 rounded-lg">🌟</span> Top Chủ Ký Gửi
            </h3>
            <div className="space-y-3 relative z-10">
              {dashboardData.topConsignors.length > 0 ? dashboardData.topConsignors.map((person, idx) => (
                <div key={person.name} className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-transparent hover:border-purple-100 transition-colors">
                   <div className="flex items-center gap-3">
                     <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${idx === 0 ? 'bg-purple-100 text-purple-700' : 'text-slate-400'}`}>#{idx + 1}</span>
                     <p className="text-[13px] font-bold text-slate-800">{person.name}</p>
                   </div>
                   <span className="text-[10px] font-bold text-purple-600 bg-purple-100/50 border border-purple-100 px-2 py-1 rounded-md">{person.items} món</span>
                </div>
              )) : <p className="text-sm text-slate-400 font-medium">Chưa đủ dữ liệu.</p>}
            </div>
          </div>

          {/* System Status / Support widget */}
          <div className="bg-slate-900 p-8 rounded-[2rem] text-white shadow-xl relative overflow-hidden">
            <div className="absolute -right-8 -top-8 w-40 h-40 bg-blue-500/20 blur-3xl rounded-full pointer-events-none"></div>
            <div className="relative z-10">
              <h3 className="text-base font-bold mb-6 flex items-center gap-2">
                <SyncIcon className="w-5 h-5 text-blue-400" /> Đồng bộ hệ thống
              </h3>
              
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Sao lưu thiết bị nội bộ</p>
                  <p className="text-xs font-bold text-slate-100">{lastBackup ? new Date(lastBackup).toLocaleString('vi-VN') : '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Đồng bộ Cloud</p>
                  <p className="text-xs font-bold text-slate-100">{lastCloudSync ? new Date(lastCloudSync).toLocaleString('vi-VN') : '—'}</p>
                </div>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
};

export default Dashboard;