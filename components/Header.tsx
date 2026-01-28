import React from 'react';
import type { Page } from '../types';
import { SyncIcon, UsersIcon } from './Icons';

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
  ];

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
            <nav className="flex flex-wrap justify-center items-center space-x-1 sm:space-x-2 bg-white/10 rounded-full p-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setCurrentPage(item.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-full transition-colors duration-200 ${
                    currentPage === item.id
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
              title="Nhập và Xuất dữ liệu"
            >
              <SyncIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;