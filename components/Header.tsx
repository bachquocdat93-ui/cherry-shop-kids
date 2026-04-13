import React, { useState } from 'react';
import { pushToCloud, pullFromCloud, getCloudConfig } from '../utils/supabaseService';
import { SyncIcon, UsersIcon, UploadIcon, MenuIcon, CloseIcon } from './Icons';
import type { Page, UserAccount } from '../types';

interface HeaderProps {
  currentPage: Page;
  setCurrentPage: (page: Page) => void;
  onOpenSyncModal: () => void;
  currentUser: UserAccount;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ currentPage, setCurrentPage, onOpenSyncModal, currentUser, onLogout }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const hasCloudConfig = !!getCloudConfig();
  const showConfigButton = currentUser.role === 'ADMIN' || !hasCloudConfig;

  const rawNavItems: { id: Page; label: string; icon?: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'revenue', label: 'Doanh thu' },
    { id: 'invoices', label: 'Hóa đơn' },
    { id: 'consignment', label: 'Ký gửi' },
    { id: 'customers', label: 'Khách hàng', icon: <UsersIcon className="w-4 h-4 mr-1" /> },
    { id: 'reports', label: 'Báo cáo' },
    { id: 'inventory', label: 'Kho Hàng' },
    { id: 'staff', label: 'Nhân sự' },
    { id: 'logs', label: 'Nhật ký' },
  ];

  const navItems = rawNavItems.filter(item => {
    if (currentUser.role === 'STAFF') {
      return item.id !== 'dashboard' && item.id !== 'reports' && item.id !== 'staff' && item.id !== 'logs';
    }
    return true;
  });

  const handlePush = async () => {
    if (!window.confirm("Bạn có chắc muốn ĐẨY dữ liệu lên Cloud?")) return;
    try {
      const revenue = JSON.parse(localStorage.getItem('revenueData') || '[]');
      const invoices = JSON.parse(localStorage.getItem('invoicesData') || '[]');
      const consignment = JSON.parse(localStorage.getItem('consignmentData') || '[]');
      const inventory = JSON.parse(localStorage.getItem('shopInventoryData') || '[]');
      const accounts = JSON.parse(localStorage.getItem('accountsData') || '[]');
      const auditLogs = JSON.parse(localStorage.getItem('auditLogsData') || '[]');

      await pushToCloud({ revenue, invoices, consignment, inventory, accounts, auditLogs });
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
        if (data.accounts) {
          window.localStorage.setItem('accountsData', JSON.stringify(data.accounts));
        }
        if (data.auditLogs) {
          window.localStorage.setItem('auditLogsData', JSON.stringify(data.auditLogs));
        }
        alert("Đã tải dữ liệu thành công! Trang sẽ tải lại.");
        window.location.reload();
      }
    } catch (e: any) {
      alert("Lỗi: " + e.message);
    }
  }

  const handleNavClick = (id: Page) => {
    setCurrentPage(id);
    setIsMenuOpen(false);
  };

  return (
    <header className="bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-lg print:hidden relative z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-4">
          <div className="flex items-center gap-4">
            {/* Mobile Menu Button */}
            <button
              className="lg:hidden p-2 -ml-2 rounded-md text-white hover:bg-white/20 focus:outline-none"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <CloseIcon className="w-6 h-6" /> : <MenuIcon className="w-6 h-6" />}
            </button>
            <button
              onClick={() => setCurrentPage('dashboard')}
              className="text-xl sm:text-2xl font-bold text-white transition-opacity hover:opacity-80 truncate"
            >
              Cherry Shop Kids
            </button>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden lg:flex items-center gap-4">
              {currentUser.role === 'ADMIN' && (
                <div className="flex bg-white/10 rounded-lg p-1 mr-2">
                  <button onClick={handlePull} className="p-2 hover:bg-white/20 rounded-md transition-colors text-xs font-bold flex items-center gap-1" title="Tải về máy">
                    <SyncIcon className="w-4 h-4" /> Cloud Về
                  </button>
                </div>
              )}

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
            </div>

            {/* Always visible for ADMIN. For STAFF, hide once configured */}
            {showConfigButton && (
              <button
                onClick={onOpenSyncModal}
                className="p-2 rounded-full transition-colors duration-200 bg-white/10 hover:bg-white/20"
                title="Cấu hình Cloud / Excel"
              >
                <UsersIcon className="w-5 h-5" />
              </button>
            )}

            <div className="h-6 w-px bg-white/20 mx-1"></div>

            <button 
              onClick={onLogout}
              className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-full shadow-sm text-xs font-bold transition-colors flex items-center gap-2 border border-white/10 group"
              title="Đăng xuất"
            >
              <span className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.6)]"></span>
              <span className="max-w-[100px] truncate hidden sm:inline">{currentUser.fullName}</span>
              <svg className="w-4 h-4 ml-1 opacity-70 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMenuOpen && (
        <div className="lg:hidden absolute top-full left-0 w-full bg-white text-gray-800 shadow-xl border-t border-gray-100 animate-in slide-in-from-top-2">
          <div className="p-4 flex flex-col gap-2">
            <div className="grid grid-cols-2 gap-2 mb-4">
              {showConfigButton && (
                <button onClick={onOpenSyncModal} className="p-3 bg-gray-50 text-gray-700 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-100 transition-colors">
                  <UsersIcon className="w-4 h-4" /> Cấu hình
                </button>
              )}
              {currentUser.role === 'ADMIN' && (
                <button onClick={handlePull} className="p-3 bg-blue-50 text-blue-700 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-100 transition-colors">
                  <SyncIcon className="w-4 h-4" /> Pull Cloud
                </button>
              )}
              <button onClick={onLogout} className="col-span-2 p-3 bg-red-50 text-red-600 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-100 transition-colors mt-2">
                Đăng xuất
              </button>
            </div>
            <div className="space-y-1">
              <p className="px-4 text-xs font-black text-gray-400 uppercase tracking-wider mb-2">Menu chính</p>
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-xl transition-colors ${currentPage === item.id
                    ? 'bg-primary-50 text-primary-700'
                    : 'hover:bg-gray-50 text-gray-600'
                    }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;