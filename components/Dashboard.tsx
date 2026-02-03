import React, { useMemo, useEffect, useState } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';
import { RevenueEntry, ConsignmentItem, ConsignmentStatus, Invoice } from '../types';
import { DollarIcon, ChartBarIcon, ShoppingBagIcon, UsersIcon, TrashIcon, SyncIcon, CheckCircleIcon } from './Icons';
import { getCloudConfig } from '../utils/supabaseService';

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
  color: string;
}

const KpiCard: React.FC<KpiCardProps> = ({ title, value, icon, color }) => (
  <div className={`bg-white p-6 rounded-2xl shadow-sm border-t-4 ${color}`}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">{title}</p>
        <p className="text-2xl font-black text-gray-800">{value}</p>
      </div>
      <div className="text-gray-200">{icon}</div>
    </div>
  </div>
);

interface ChartData {
  month: string;
  revenue: number;
  profit: number;
}

const RevenueProfitChart: React.FC<{ data: ChartData[] }> = ({ data }) => {
  const maxVal = Math.max(...data.map(d => Math.max(d.revenue, d.profit)), 1);
  const height = 250;
  const width = 100; // percent

  return (
    <div className="w-full h-80 bg-white p-6 rounded-2xl border flex flex-col justify-end relative select-none">
      <div className="absolute top-4 left-6 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-primary rounded-full"></div>
          <span className="text-xs font-bold text-gray-500">Doanh thu</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
          <span className="text-xs font-bold text-gray-500">Lợi nhuận</span>
        </div>
      </div>

      <div className="flex items-end justify-between h-64 gap-2 mt-8">
        {data.map((item, idx) => {
          const revenueH = (item.revenue / maxVal) * 100;
          const profitH = (item.profit / maxVal) * 100;

          return (
            <div key={idx} className="flex-1 flex flex-col justify-end items-center group relative h-full gap-1">
              {/* Bars Container */}
              <div className="w-full max-w-[40px] flex items-end justify-center gap-1 h-full relative">
                {/* Revenue Bar */}
                <div
                  className="w-1/2 bg-primary/20 hover:bg-primary transition-all rounded-t-lg relative group-hover:shadow-lg"
                  style={{ height: `${revenueH}%` }}
                ></div>
                {/* Profit Bar */}
                <div
                  className="w-1/2 bg-purple-200 hover:bg-purple-500 transition-all rounded-t-lg relative group-hover:shadow-lg"
                  style={{ height: `${profitH}%` }}
                ></div>
              </div>

              {/* X Axis Label */}
              <span className="text-[10px] font-bold text-gray-400 mt-2">{item.month}</span>

              {/* Tooltip */}
              <div className="absolute bottom-full mb-2 bg-gray-900 text-white text-xs p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none shadow-xl transform translate-y-2 group-hover:translate-y-0">
                <div className="font-bold mb-1 opacity-50 uppercase tracking-widest text-[10px]">Tháng {item.month}</div>
                <div className="flex justify-between gap-4"><span>Doanh thu:</span> <span className="font-bold text-primary-200">{formatShortCurrency(item.revenue)}</span></div>
                <div className="flex justify-between gap-4"><span>Lợi nhuận:</span> <span className="font-bold text-purple-200">{formatShortCurrency(item.profit)}</span></div>
              </div>
            </div>
          );
        })}
      </div>
      {/* Horizontal Grid lines (optional for aesthetics) */}
      <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6 pt-14 pb-8 opacity-10">
        <div className="border-t border-gray-900 w-full dashed"></div>
        <div className="border-t border-gray-900 w-full dashed"></div>
        <div className="border-t border-gray-900 w-full dashed"></div>
        <div className="border-t border-gray-900 w-full dashed"></div>
        <div className="border-t border-gray-900 w-full dashed"></div>
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
    const totalRevenue = revenueData.reduce((sum, item) => sum + item.retailPrice * item.quantity, 0);
    const totalProfit = revenueData.reduce((sum, item) => sum + (item.retailPrice * item.quantity) - (item.costPrice * item.quantity), 0);
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

    revenueData.forEach(entry => {
      const d = new Date(entry.date);
      const key = `${d.getMonth() + 1}/${d.getFullYear()}`;
      if (monthlyStats[key]) {
        monthlyStats[key].revenue += entry.retailPrice * entry.quantity;
        monthlyStats[key].profit += (entry.retailPrice * entry.quantity) - (entry.costPrice * entry.quantity);
      }
    });

    const chartData = Object.entries(monthlyStats).map(([month, stats]) => ({
      month,
      revenue: stats.revenue,
      profit: stats.profit
    }));

    // Recent activity
    const recentActivity = [...revenueData]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);

    return { totalRevenue, totalProfit, activeConsignments, chartData, recentActivity };
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900">Tổng quan cửa hàng</h2>
          <p className="text-gray-500">Chào mừng bạn quay trở lại Cherry Shop Kids.</p>
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
        <KpiCard title="Tổng Doanh Thu" value={formatCurrency(dashboardData.totalRevenue)} icon={<DollarIcon />} color="border-teal-500" />
        <KpiCard title="Lợi Nhuận Gộp" value={formatCurrency(dashboardData.totalProfit)} icon={<ChartBarIcon />} color="border-purple-500" />
        <KpiCard title="Đơn Chờ Xử Lý" value={invoicesData.length} icon={<ShoppingBagIcon />} color="border-blue-500" />
        <KpiCard title="Hàng Ký Gửi" value={dashboardData.activeConsignments} icon={<UsersIcon />} color="border-yellow-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-8 rounded-2xl shadow-sm border space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold text-gray-800">Hiệu quả kinh doanh (6 tháng)</h3>
          </div>
          <RevenueProfitChart data={dashboardData.chartData} />

          <div className="pt-6 border-t border-gray-100">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Hoạt động gần đây</h3>
            <div className="space-y-3">
              {dashboardData.recentActivity.length > 0 ? dashboardData.recentActivity.map(entry => (
                <div key={entry.id} className="flex items-center gap-4 p-3 bg-gray-50/50 rounded-xl hover:bg-white hover:shadow-md transition-all border border-transparent hover:border-gray-100">
                  <div className="w-10 h-10 bg-primary-100 text-primary-600 rounded-lg flex items-center justify-center font-bold text-sm">
                    {new Date(entry.date).getDate()}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-800">
                      {entry.customerName || 'Khách vãng lai'} đã mua <span className="text-primary-600">{entry.productName}</span>
                    </p>
                    <p className="text-[10px] text-gray-500">
                      Giá trị: {formatCurrency(entry.retailPrice * entry.quantity)} • <span className="text-green-600">Lãi: {formatCurrency((entry.retailPrice - entry.costPrice) * entry.quantity)}</span>
                    </p>
                  </div>
                </div>
              )) : <p className="text-sm text-gray-400 italic">Chưa có hoạt động nào.</p>}
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-8 rounded-3xl text-white shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/5 rounded-full"></div>
          <div>
            <div className="flex items-center gap-2 mb-4">
              <SyncIcon className="text-primary-400" />
              <h3 className="text-lg font-bold">Trạng thái Đồng bộ</h3>
            </div>

            <div className="space-y-3">
              <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">File Excel gần nhất</p>
                <p className="text-xs font-bold text-green-400">
                  {lastBackup ? new Date(lastBackup).toLocaleString('vi-VN') : 'Chưa từng xuất file'}
                </p>
              </div>
              <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Cloud Sync gần nhất</p>
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
                Đã kết nối cơ sở dữ liệu online
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;