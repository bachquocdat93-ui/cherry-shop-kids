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
  gradientClass: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}

const KpiCard: React.FC<KpiCardProps> = ({ title, value, icon, gradientClass, trend, trendValue }) => (
  <div className={`relative overflow-hidden bg-white p-6 rounded-2xl shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group ring-1 ring-slate-100`}>
    <div className={`absolute top-0 right-0 w-32 h-32 ${gradientClass} opacity-10 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-500`}></div>
    <div className="flex items-center justify-between relative z-10">
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{title}</p>
        <div className="flex items-end gap-2">
           <p className="text-2xl font-black text-slate-800">{value}</p>
           {trend && trendValue && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full mb-1 ${trend === 'up' ? 'bg-green-100 text-green-700' : trend === 'down' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                 {trend === 'up' ? '▲' : trend === 'down' ? '▼' : '▬'} {trendValue}%
              </span>
           )}
        </div>
      </div>
      <div className={`p-4 rounded-xl ${gradientClass} text-white shadow-md group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300`}>{icon}</div>
    </div>
  </div>
);

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
    <div className="w-full h-[460px] bg-white rounded-[2.5rem] p-8 relative overflow-hidden shadow-[0_10px_40px_-10px_rgba(0,0,0,0.05)] border border-slate-100">
      {/* Soft elegant background meshes */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-100/50 rounded-full mix-blend-multiply filter blur-[80px] -z-0 translate-x-1/3 -translate-y-1/3"></div>
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-pink-100/40 rounded-full mix-blend-multiply filter blur-[80px] -z-0 -translate-x-1/3 translate-y-1/3"></div>

      <div className="flex items-center justify-between mb-10 z-10 relative px-2">
        <div>
          <h3 className="text-xl font-black text-slate-800 tracking-tight mb-1">Hiệu quả kinh doanh</h3>
          <p className="text-xs font-bold text-slate-400">Tương quan Doanh Thu & Lợi Nhuận Gộp</p>
        </div>
        <div className="flex items-center gap-5 bg-white/80 px-4 py-3 rounded-2xl border border-slate-100 shadow-sm backdrop-blur-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-3.5 h-3.5 rounded-full bg-gradient-to-b from-blue-400 to-blue-200"></div>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Doanh thu</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-3 h-3 rounded-full bg-pink-500 shadow-[0_0_10px_rgba(236,72,153,0.5)]"></div>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Lợi nhuận gộp</span>
          </div>
        </div>
      </div>

      <div className="flex-1 w-full h-[320px] z-10 relative">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 20, right: 10, bottom: 0, left: -10 }}>
            <defs>
              <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.85}/>
                <stop offset="100%" stopColor="#60a5fa" stopOpacity={0.15}/>
              </linearGradient>
              <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>
            <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 800 }} dy={15} />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#cbd5e1', fontSize: 11, fontWeight: 700 }} 
              tickFormatter={(value) => formatShortCurrency(value)}
              dx={-15}
            />
            <Tooltip 
              cursor={{ fill: '#f8fafc' }}
              formatter={(value: number) => [formatCurrency(value), undefined]}
              contentStyle={{ backgroundColor: '#ffffff', borderRadius: '24px', border: '1px solid #f1f5f9', boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.08)', padding: '16px 20px' }}
              itemStyle={{ fontWeight: 900, fontSize: '14px' }}
              labelStyle={{ color: '#94a3b8', fontWeight: 900, marginBottom: '8px', textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.1em' }}
            />
            <Bar dataKey="revenue" name="Doanh thu" fill="url(#barGrad)" radius={[16, 16, 16, 16]} maxBarSize={48} />
            <Line type="monotone" dataKey="profit" name="Lợi nhuận gộp" stroke="#ec4899" strokeWidth={5} filter="url(#softGlow)" dot={{ r: 0 }} activeDot={{ r: 8, fill: '#fff', stroke: '#ec4899', strokeWidth: 4 }} />
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
      // Formula: Profit + CostPrice * 20%
      return baseProfit + (isConsignment ? (item.costPrice * 0.20 * item.quantity) : 0);
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
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-4">
        <div>
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-black tracking-widest uppercase mb-3 border border-blue-100 shadow-sm">
             <span className="w-2 h-2 rounded-full bg-blue-500 mr-2 animate-pulse"></span>
             Hệ thống CRM
          </div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight leading-none mb-2">{getCurrentGreeting()}, Quản trị viên!</h2>
          <p className="text-slate-500 font-medium">Hôm nay là {new Intl.DateTimeFormat('vi-VN', { dateStyle: 'full' }).format(new Date())}. Chúc bạn buôn may bán đắt.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {isCloudConfigured && (
            <div className="bg-purple-50 px-4 py-2 rounded-xl border border-purple-100 flex items-center gap-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
              <span className="text-[10px] font-black text-purple-700 uppercase">Cloud: Sẵn sàng</span>
            </div>
          )}
          <div className="bg-green-50 px-4 py-2 rounded-xl border border-green-100 flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-[10px] font-black text-green-700 uppercase">Local Storage: An toàn</span>
          </div>
          <button
            onClick={handleClearAll}
            className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-xl border border-red-100 hover:bg-red-600 hover:text-white transition-all font-bold text-xs uppercase"
          >
            <TrashIcon className="w-3 h-3" />
            Xóa sạch
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Tổng Doanh Thu" value={formatCurrency(dashboardData.totalRevenue)} icon={<DollarIcon />} gradientClass="bg-gradient-to-br from-blue-400 to-blue-600" trend={dashboardData.revenueGrowth >= 0 ? 'up' : 'down'} trendValue={Math.abs(dashboardData.revenueGrowth).toFixed(1)} />
        <KpiCard title="Lợi Nhuận Gộp" value={formatCurrency(dashboardData.totalProfit)} icon={<ChartBarIcon />} gradientClass="bg-gradient-to-br from-pink-400 to-pink-600" trend={dashboardData.profitGrowth >= 0 ? 'up' : 'down'} trendValue={Math.abs(dashboardData.profitGrowth).toFixed(1)} />
        <KpiCard title="Đơn Chờ Xử Lý" value={invoicesData.length} icon={<ShoppingBagIcon />} gradientClass="bg-gradient-to-br from-amber-400 to-amber-600" />
        <KpiCard title="Hàng Ký Gửi" value={dashboardData.activeConsignments} icon={<UsersIcon />} gradientClass="bg-gradient-to-br from-indigo-400 to-indigo-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <RevenueProfitChart data={dashboardData.chartData} />

          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-black text-slate-800 mb-5 tracking-tight border-l-4 border-primary pl-3">Hoạt động gần đây</h3>
            <div className="space-y-3">
              {dashboardData.recentActivity.length > 0 ? dashboardData.recentActivity.map(entry => (
                <div key={entry.id} className="flex items-center justify-between p-4 bg-white rounded-2xl hover:shadow-lg transition-all border border-slate-100 hover:border-blue-200 group">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-50 to-blue-100 text-blue-600 rounded-xl flex items-center justify-center font-black text-lg shadow-inner">
                      {new Date(entry.date).getDate()}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800 mb-0.5">
                        {entry.customerName || 'Khách vãng lai'}
                      </p>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Mua <span className="text-blue-600 font-bold">{entry.productName}</span> ({entry.quantity})
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                     <p className="text-sm font-black text-slate-800">{formatCurrency(entry.retailPrice * entry.quantity)}</p>
                     <p className="text-[10px] font-bold text-green-500 uppercase tracking-widest mt-0.5">Lãi: {formatCurrency((entry as any).calculatedProfit)}</p>
                  </div>
                </div>
              )) : <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-3xl"><p className="text-sm font-bold text-slate-400">Chưa có giao dịch nào.</p></div>}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Top Products */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <h3 className="text-sm font-black text-slate-800 mb-4 uppercase tracking-widest flex items-center gap-2"><span className="text-xl">🏆</span> Sản phẩm bán chạy</h3>
            <div className="space-y-4">
              {dashboardData.bestSellers.length > 0 ? dashboardData.bestSellers.map((item, idx) => (
                <div key={item.name} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${idx === 0 ? 'bg-yellow-100 text-yellow-600' : idx === 1 ? 'bg-slate-100 text-slate-500' : idx === 2 ? 'bg-orange-100 text-orange-600' : 'bg-blue-50 text-blue-500'}`}>
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">{item.name}</p>
                    <p className="text-[10px] text-slate-400">{formatShortCurrency(item.revenue)}</p>
                  </div>
                  <div className="text-xs font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg border border-blue-100">
                    {item.quantity} sp
                  </div>
                </div>
              )) : <p className="text-xs text-slate-400 italic">Chưa có dữ liệu.</p>}
            </div>
          </div>

          {/* Top Consignors */}
          <div className="bg-purple-50 p-6 rounded-3xl shadow-sm border border-purple-100">
            <h3 className="text-sm font-black text-purple-800 mb-4 uppercase tracking-widest flex items-center gap-2"><span className="text-xl">🌟</span> Top Chủ Ký Gửi</h3>
            <div className="space-y-3">
              {dashboardData.topConsignors.length > 0 ? dashboardData.topConsignors.map((person, idx) => (
                <div key={person.name} className="flex items-center justify-between bg-white/50 p-2.5 rounded-xl border border-purple-200">
                   <div className="flex items-center gap-2">
                     <span className="text-[10px] font-black text-purple-400">#{idx + 1}</span>
                     <p className="text-xs font-bold text-purple-900">{person.name}</p>
                   </div>
                   <span className="text-[10px] font-bold text-purple-600 bg-white px-2 py-1 rounded-md shadow-sm">{person.items} món</span>
                </div>
              )) : <p className="text-xs text-slate-400 italic">Chưa có khách ký gửi.</p>}
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-8 rounded-3xl text-white shadow-xl relative overflow-hidden flex flex-col justify-between">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/5 rounded-full"></div>
            <div>
              <div className="flex items-center gap-2 mb-4">
                <SyncIcon className="text-primary-400" />
                <h3 className="text-lg font-bold">Trạng thái Đồng bộ</h3>
              </div>

              <div className="space-y-3">
                <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">File Excel gần nhất</p>
                  <p className="text-xs font-bold text-green-400">
                    {lastBackup ? new Date(lastBackup).toLocaleString('vi-VN') : 'Chưa từng xuất file'}
                  </p>
                </div>
                <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Cloud Sync gần nhất</p>
                  <p className="text-xs font-bold text-purple-400">
                    {lastCloudSync ? new Date(lastCloudSync).toLocaleString('vi-VN') : 'Chưa đồng bộ online'}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6">
              {!isCloudConfigured ? (
                <div className="bg-orange-500/20 p-3 rounded-xl border border-orange-500/30 text-[10px] text-orange-200">
                  ⚠️ Bạn chưa cài đặt Cloud. Dữ liệu chỉ đang lưu trên trình duyệt máy này.
                </div>
              ) : (
                <div className="flex items-center gap-2 text-[10px] text-green-400 font-bold uppercase tracking-tighter">
                  <CheckCircleIcon className="w-3 h-3" />
                  Đã kết nối dữ liệu đám mây
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;