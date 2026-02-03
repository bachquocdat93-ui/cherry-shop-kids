import React from 'react';
import { pushToCloud, pullFromCloud } from '../utils/supabaseService';
import { SyncIcon, UsersIcon, UploadIcon } from './Icons';
import type { Page } from '../types';

interface HeaderProps {
  currentPage: Page;
  setCurrentPage: (page: Page) => void;
  onOpenSyncModal: () => void;
}

const Header: React.FC<HeaderProps> = ({ currentPage, setCurrentPage, onOpenSyncModal }) => {
  const navItems: { id: Page; label: string, icon?: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'revenue', label: 'Doanh thu' },
    { id: 'invoices', label: 'Hóa đơn' },
    { id: 'consignment', label: 'Ký gửi' },
    { id: 'customers', label: 'Khách hàng', icon: <UsersIcon className="w-4 h-4 mr-1" /> },
    { id: 'reports', label: 'Báo cáo' },
    { id: 'inventory', label: 'Kho Hàng' },
  ];

  const handlePush = async () => {
    if (!window.confirm("Bạn có chắc muốn ĐẨY dữ liệu lên Cloud?")) return;
    try {
      const revenue = JSON.parse(localStorage.getItem('revenueData') || '[]');
      const invoices = JSON.parse(localStorage.getItem('invoicesData') || '[]');
      const consignment = JSON.parse(localStorage.getItem('consignmentData') || '[]');
      const inventory = JSON.parse(localStorage.getItem('shopInventoryData') || '[]');

      await pushToCloud({ revenue, invoices, consignment, inventory });
      alert("Đã đẩy dữ liệu lên Cloud thành công!");
    } catch (e: any) {
      alert("Lỗi: " + e.message);
    }
  };

  const handlePull = async () => {
    if (!window.confirm("Bạn có chắc muốn TẢI dữ liệu từ Cloud? (Dữ liệu máy này sẽ bị ghi đè)")) return;
    try {
      const data = await pullFromCloud();
      if (data) {
        window.localStorage.setItem('revenueData', JSON.stringify(data.revenue));
        window.localStorage.setItem('invoicesData', JSON.stringify(data.invoices));
        window.localStorage.setItem('consignmentData', JSON.stringify(data.consignment));
        if (data.inventory) {
          window.localStorage.setItem('shopInventoryData', JSON.stringify(data.inventory));
        }
        alert("Đã tải dữ liệu thành công! Trang sẽ tải lại.");
        window.location.reload();
      }
    } catch (e: any) {
      alert("Lỗi: " + e.message);
    }
  }

  return (
    <header className="bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-lg print:hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between py-4">
          <button
            onClick={() => setCurrentPage('dashboard')}
            className="text-2xl font-bold text-white mb-4 sm:mb-0 transition-opacity hover:opacity-80"
          >
            Cherry Shop Kids
          </button>
          <div className="flex items-center gap-4">
            <div className="flex bg-white/10 rounded-lg p-1 mr-2">
              <button onClick={handlePull} className="p-2 hover:bg-white/20 rounded-md transition-colors text-xs font-bold flex items-center gap-1" title="Tải về máy">
                <SyncIcon className="w-4 h-4" /> Cloud Về
              </button>
            </div>

            <nav className="flex flex-wrap justify-center items-center space-x-1 sm:space-x-2 bg-white/10 rounded-full p-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setCurrentPage(item.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-full transition-colors duration-200 ${currentPage === item.id
                    ? 'bg-white text-primary-600 shadow-md'
                    : 'hover:bg-white/20'
                    }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>
            <button
              onClick={onOpenSyncModal}
              className="p-2 rounded-full transition-colors duration-200 bg-white/10 hover:bg-white/20"
              title="Cấu hình Cloud / Excel"
            >
              <UsersIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;