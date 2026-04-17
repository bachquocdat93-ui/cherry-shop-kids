import React, { useState, useRef, useEffect } from 'react';
import { pushToCloud, pullFromCloud, getCloudConfig } from '../utils/supabaseService';
import { SyncIcon, UsersIcon, UploadIcon, MenuIcon, CloseIcon, HomeIcon, DollarIcon, ReceiptIcon, ArchiveIcon, ChartBarIcon, ClipboardIcon, ShoppingBagIcon, PlusIcon, BellIcon, ChevronLeftIcon, ChevronRightIcon } from './Icons';
import type { Page, UserAccount, Invoice, ConsignmentItem, RevenueEntry } from '../types';
import { RevenueStatus, ConsignmentStatus } from '../types';
import { useAuditLog } from '../hooks/useAuditLog';
import useLocalStorage from '../hooks/useLocalStorage';

interface HeaderProps {
  currentPage: Page;
  setCurrentPage: (page: Page) => void;
  onOpenSyncModal: () => void;
  currentUser: UserAccount;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ currentPage, setCurrentPage, onOpenSyncModal, currentUser, onLogout }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useLocalStorage<boolean>('sidebarCollapsed', false);
  const logAction = useAuditLog();
  
  const hasCloudConfig = !!getCloudConfig();
  const showConfigButton = currentUser.role === 'ADMIN' || !hasCloudConfig;

  const rawNavItems: { id: Page; label: string; icon?: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <HomeIcon className="w-4 h-4 mr-1" /> },
    { id: 'revenue', label: 'Doanh thu', icon: <DollarIcon className="w-4 h-4 mr-1" /> },
    { id: 'invoices', label: 'Hóa đơn', icon: <ReceiptIcon className="w-4 h-4 mr-1" /> },
    { id: 'consignment', label: 'Ký gửi', icon: <ShoppingBagIcon className="w-4 h-4 mr-1" /> },
    { id: 'customers', label: 'Khách hàng', icon: <UsersIcon className="w-4 h-4 mr-1" /> },
    { id: 'reports', label: 'Báo cáo', icon: <ChartBarIcon className="w-4 h-4 mr-1" /> },
    { id: 'inventory', label: 'Kho Hàng', icon: <ArchiveIcon className="w-4 h-4 mr-1" /> },
    { id: 'staff', label: 'Nhân sự', icon: <UsersIcon className="w-4 h-4 mr-1" /> },
    { id: 'logs', label: 'Nhật ký', icon: <ClipboardIcon className="w-4 h-4 mr-1" /> },
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
      logAction('HE_THONG', 'Đẩy dữ liệu lên Cloud', 'Thành công');
      alert("Đã đẩy dữ liệu lên Cloud thành công!");
    } catch (e: any) {
      logAction('HE_THONG', 'Lỗi đẩy Cloud', e.message);
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
        logAction('HE_THONG', 'Tải dữ liệu từ Cloud', 'Thành công');
        alert("Đã tải dữ liệu thành công! Trang sẽ tải lại.");
        window.location.reload();
      }
    } catch (e: any) {
      logAction('HE_THONG', 'Lỗi tải Cloud', e.message);
      alert("Lỗi: " + e.message);
    }
  }

  const handleNavClick = (id: Page) => {
    setCurrentPage(id);
    setIsMenuOpen(false);
  };

  // State for popups
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [isNotifMenuOpen, setIsNotifMenuOpen] = useState(false);
  const addMenuRef = useRef<HTMLDivElement>(null);
  const notifMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.add-menu-wrapper')) {
        setIsAddMenuOpen(false);
      }
      if (!target.closest('.notif-menu-wrapper')) {
        setIsNotifMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Notifications Data
  const [revenueData] = useLocalStorage<RevenueEntry[]>('revenueData', []);
  const [invoicesData] = useLocalStorage<Invoice[]>('invoicesData', []);
  const [consignmentData] = useLocalStorage<ConsignmentItem[]>('consignmentData', []);

  const holdingRevenueCount = revenueData.filter(r => r.status === RevenueStatus.HOLDING).length;
  const missingDepositInvoices = invoicesData.filter(i => {
    const total = i.items?.reduce((sum, item) => sum + (item.sellingPrice * item.quantity), 0) || 0;
    return i.deposit < total && i.items?.[0]?.status !== 'Đã giao hàng';
  }).length;
  const inStockConsignments = consignmentData.filter(c => c.status === ConsignmentStatus.IN_STOCK).length;

  const totalAlerts = (holdingRevenueCount > 0 ? 1 : 0) + (missingDepositInvoices > 0 ? 1 : 0) + (inStockConsignments > 0 ? 1 : 0);

  const renderAddPopup = (extraClasses: string) => (
    <div className={`absolute ${extraClasses} w-48 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 animate-in fade-in slide-in-from-top-4 z-50`}>
      <div className="px-4 py-2 text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 mb-1">Tạo Nhanh Tới</div>
      <button onClick={() => { setCurrentPage('revenue'); setIsAddMenuOpen(false); setTimeout(() => window.dispatchEvent(new Event('openAddRevenue')), 100); }} className="w-full text-left px-4 py-2 text-sm font-bold text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition-colors flex items-center gap-2">
        <DollarIcon className="w-4 h-4 text-primary-400" /> Tạo Doanh Thu
      </button>
      <button onClick={() => { setCurrentPage('consignment'); setIsAddMenuOpen(false); setTimeout(() => window.dispatchEvent(new Event('openAddConsignment')), 100); }} className="w-full text-left px-4 py-2 text-sm font-bold text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition-colors flex items-center gap-2">
        <ShoppingBagIcon className="w-4 h-4 text-purple-400" /> Nhập Ký Gửi
      </button>
      <button onClick={() => { setCurrentPage('invoices'); setIsAddMenuOpen(false); setTimeout(() => window.dispatchEvent(new Event('openAddInvoice')), 100); }} className="w-full text-left px-4 py-2 text-sm font-bold text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition-colors flex items-center gap-2">
        <ReceiptIcon className="w-4 h-4 text-blue-400" /> Quản lý Hóa Đơn
      </button>
      <button onClick={() => { setCurrentPage('inventory'); setIsAddMenuOpen(false); setTimeout(() => window.dispatchEvent(new Event('openAddInventory')), 100); }} className="w-full text-left px-4 py-2 text-sm font-bold text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition-colors flex items-center gap-2">
        <ArchiveIcon className="w-4 h-4 text-orange-400" /> Nhập Kho
      </button>
    </div>
  );

  const renderNotifPopup = (extraClasses: string) => (
    <div className={`absolute ${extraClasses} w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 animate-in fade-in slide-in-from-top-4 z-50`}>
      <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-2xl">
        <span className="text-xs font-black text-gray-800 uppercase tracking-widest">Trung tâm thông báo</span>
        {totalAlerts > 0 && <span className="bg-red-100 text-red-600 text-[10px] px-2 py-0.5 rounded-full font-bold">{totalAlerts} báo cáo</span>}
      </div>
      <div className="max-h-64 overflow-y-auto p-2">
        {totalAlerts === 0 ? (
          <div className="p-6 text-center text-gray-400 text-sm font-medium">Bạn đã hoàn tất mọi công việc! 🎉</div>
        ) : (
          <div className="space-y-1">
            {holdingRevenueCount > 0 && (
              <div onClick={() => { setCurrentPage('revenue'); setIsNotifMenuOpen(false); }} className="p-3 bg-yellow-50 hover:bg-yellow-100 border border-yellow-100 rounded-xl cursor-pointer transition-colors">
                <p className="text-sm font-bold text-yellow-800">📦 Đơn hàng đang dồn</p>
                <p className="text-xs text-yellow-600 mt-1">Đang có <strong>{holdingRevenueCount}</strong> sản phẩm trạng thái Dồn đơn cần xử lý.</p>
              </div>
            )}
            {missingDepositInvoices > 0 && (
              <div onClick={() => { setCurrentPage('invoices'); setIsNotifMenuOpen(false); }} className="p-3 bg-red-50 hover:bg-red-100 border border-red-100 rounded-xl cursor-pointer transition-colors">
                <p className="text-sm font-bold text-red-800">💰 Công nợ hóa đơn</p>
                <p className="text-xs text-red-600 mt-1">Có <strong>{missingDepositInvoices}</strong> hóa đơn chưa thanh toán đủ tiền.</p>
              </div>
            )}
            {inStockConsignments > 0 && (
              <div onClick={() => { setCurrentPage('consignment'); setIsNotifMenuOpen(false); }} className="p-3 bg-blue-50 hover:bg-blue-100 border border-blue-100 rounded-xl cursor-pointer transition-colors">
                <p className="text-sm font-bold text-blue-800">👕 Hàng ký gửi tồn kho</p>
                <p className="text-xs text-blue-600 mt-1">Có <strong>{inStockConsignments}</strong> món đồ ký gửi chưa bán được.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      <header className={`bg-primary-50/70 border-r border-primary-100/50 text-gray-800 shadow-sm print:hidden relative z-50 flex-none h-screen flex-col transition-all duration-300 hidden lg:flex ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}>
        
        {/* DESKTOP SIDEBAR CONTAINER (Removed overflow-auto to prevent absolute popup clipping) */}
        <div className="w-full lg:h-full flex flex-col">
        {/* DESKTOP SIDEBAR HEADER */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-primary-100/50 shrink-0">
          {!isSidebarCollapsed && (
            <button onClick={() => setCurrentPage('dashboard')} className="font-black text-xl text-primary-700 truncate tracking-tight hover:opacity-80 transition-opacity">
              CHERRY KIDS
            </button>
          )}
          <button 
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} 
            className={`p-1.5 text-primary-400 hover:text-primary-600 hover:bg-white/50 rounded-md transition-colors ${isSidebarCollapsed ? 'mx-auto' : ''}`}
          >
            {isSidebarCollapsed ? <ChevronRightIcon className="w-5 h-5" /> : <ChevronLeftIcon className="w-5 h-5" />}
          </button>
        </div>

        {/* DESKTOP USER PROFILE */}
        <div className={`py-4 border-b border-primary-100/50 shrink-0 flex items-center ${isSidebarCollapsed ? 'justify-center px-2' : 'px-4'}`}>
            {isSidebarCollapsed ? (
                <div className="w-10 h-10 bg-white text-primary-700 rounded-full flex items-center justify-center font-bold text-sm shadow-sm" title={currentUser.fullName}>
                   {currentUser.fullName.charAt(0)}
                </div>
            ) : (
                <div className="w-full flex items-center gap-3">
                   <div className="w-10 h-10 bg-white text-primary-700 rounded-full flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
                      {currentUser.fullName.charAt(0)}
                   </div>
                   <div className="overflow-hidden">
                     <p className="font-bold text-gray-800 text-sm truncate">{currentUser.fullName}</p>
                     <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{currentUser.role === 'ADMIN' ? 'SUPER_ADMIN' : 'STAFF'}</p>
                   </div>
                </div>
            )}
        </div>

        {/* DESKTOP SIDEBAR MENU */}
        <div className="flex-1 overflow-y-auto px-2 py-4 space-y-1 custom-scrollbar">
           {!isSidebarCollapsed && <p className="px-2 text-[10px] font-black text-primary-400/80 mb-2 uppercase tracking-widest">Menu Chính</p>}
           {navItems.map((item) => (
             <button
               key={item.id}
               onClick={() => setCurrentPage(item.id)}
               title={isSidebarCollapsed ? item.label : undefined}
               className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-0' : 'justify-start px-3'} py-3 text-sm font-bold rounded-lg transition-all duration-200 ${currentPage === item.id
                 ? 'bg-white text-primary-600 shadow-sm'
                 : 'text-gray-600 hover:bg-white/60 hover:text-gray-900'
                 }`}
             >
               <span className={`[&>svg]:w-5 [&>svg]:h-5 [&>svg]:mr-0 ${isSidebarCollapsed ? '' : 'mr-3'}`}>{item.icon}</span>
               {!isSidebarCollapsed && <span>{item.label}</span>}
             </button>
           ))}
        </div>

        {/* DESKTOP SIDEBAR FOOTER */}
        <div className="p-3 border-t border-primary-100/50 shrink-0">
          <div className={`grid gap-2 ${isSidebarCollapsed ? 'grid-cols-1' : (showConfigButton ? 'grid-cols-3' : 'grid-cols-2')}`}>
             {showConfigButton && (
                <button onClick={onOpenSyncModal} className="p-2.5 bg-white/60 text-gray-600 rounded-lg hover:bg-white hover:text-gray-900 transition-colors flex justify-center items-center" title="Cấu hình Cloud">
                   <UsersIcon className="w-5 h-5" />
                </button>
             )}
             <div className={`relative add-menu-wrapper ${(!showConfigButton && !isSidebarCollapsed) ? 'col-span-1' : ''}`}>
                <button onClick={() => { setIsAddMenuOpen(!isAddMenuOpen); setIsNotifMenuOpen(false); }} className={`w-full p-2.5 rounded-lg transition-all duration-200 flex justify-center items-center ${isAddMenuOpen ? 'bg-primary-100 text-primary-600' : 'bg-primary-500 hover:bg-primary-600 text-white shadow-sm'}`} title="Tạo nhanh">
                   <PlusIcon className="w-5 h-5" />
                </button>
                {isAddMenuOpen && renderAddPopup(`bottom-0 left-full ml-3`)}
             </div>
             <div className={`relative notif-menu-wrapper ${(!showConfigButton && !isSidebarCollapsed) ? 'col-span-1' : ''}`}>
                <button onClick={() => { setIsNotifMenuOpen(!isNotifMenuOpen); setIsAddMenuOpen(false); }} className={`w-full p-2.5 rounded-lg transition-all duration-200 flex justify-center items-center relative ${isNotifMenuOpen ? 'bg-white text-primary-600 shadow-sm' : 'bg-white/60 text-gray-600 hover:bg-white hover:text-gray-900'}`} title="Thông báo">
                   <BellIcon className={`w-5 h-5 ${totalAlerts > 0 ? 'animate-bounce text-red-500' : ''}`} />
                   {totalAlerts > 0 && <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white shadow-sm"></span>}
                </button>
                {isNotifMenuOpen && renderNotifPopup(`bottom-0 left-full ml-3`)}
             </div>
          </div>

          <button 
            onClick={onLogout}
            className={`w-full bg-white/60 hover:bg-red-50 hover:text-red-600 text-gray-600 px-3 py-2.5 mt-2 rounded-lg text-sm font-bold transition-colors flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-center gap-2'}`}
            title="Đăng xuất"
          >
            {isSidebarCollapsed ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            ) : (
              <>Đăng xuất</>
            )}
          </button>
        </div>
      </div>
      </header>

      {/* MOBILE TOP BAR (Hidden on Desktop) */}
      <header className="lg:hidden bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-lg print:hidden relative z-50 flex-none w-full">
        <div className="flex items-center justify-between px-4 py-3 shrink-0">
          <div className="flex items-center gap-3 w-full">
            <button
              className="p-2 -ml-2 rounded-md text-white hover:bg-white/20 focus:outline-none"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <CloseIcon className="w-6 h-6" /> : <MenuIcon className="w-6 h-6" />}
            </button>
            <button
              onClick={() => setCurrentPage('dashboard')}
              className="text-xl font-black text-white transition-opacity hover:opacity-80 truncate"
            >
              Cherry Shop
            </button>
          </div>

          {/* RIGHT UTILITIES FOR MOBILE ONLY */}
          <div className="flex items-center gap-1.5 shrink-0">
             {showConfigButton && (
                <button onClick={onOpenSyncModal} className="p-2 rounded-full transition-colors duration-200 bg-white/10 hover:bg-white/20">
                  <UsersIcon className="w-4 h-4" />
                </button>
             )}
             <div className="relative add-menu-wrapper">
               <button onClick={() => { setIsAddMenuOpen(!isAddMenuOpen); setIsNotifMenuOpen(false); }} className={`p-2 rounded-full transition-all duration-200 ${isAddMenuOpen ? 'bg-white text-primary-600' : 'bg-primary-600 border border-white/20 hover:bg-white/20'}`}>
                  <PlusIcon className="w-4 h-4" />
               </button>
               {isAddMenuOpen && renderAddPopup("top-12 right-0")}
             </div>
             <div className="relative notif-menu-wrapper mt-1">
               <button onClick={() => { setIsNotifMenuOpen(!isNotifMenuOpen); setIsAddMenuOpen(false); }} className={`p-2 rounded-full transition-all duration-200 relative ${isNotifMenuOpen ? 'bg-white text-primary-600' : 'bg-white/10 hover:bg-white/20'}`}>
                  <BellIcon className="w-4 h-4" />
                  {totalAlerts > 0 && <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-primary-600 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse"></span>}
               </button>
               {isNotifMenuOpen && renderNotifPopup("top-12 right-0")}
             </div>
          </div>
        </div>

        {/* MOBILE MENU DROPDOWN (Hamburger) */}
        {isMenuOpen && (
          <div className="absolute top-full left-0 w-full bg-white text-gray-800 shadow-xl border-t border-gray-100 animate-in slide-in-from-top-2">
            <div className="p-4 flex flex-col gap-2">
              <div className="mb-2">
                <button 
                  onClick={onLogout} 
                  className="w-full p-3 bg-red-50 text-red-600 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-100 transition-colors shadow-sm"
                >
                  Đăng xuất
                </button>
              </div>
              <div className="space-y-1 max-h-[60vh] overflow-y-auto">
                <p className="px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Menu chính</p>
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-xl transition-colors ${currentPage === item.id
                      ? 'bg-primary-50 text-primary-700'
                      : 'hover:bg-gray-50 text-gray-600'
                      }`}
                  >
                    <span className="[&>svg]:w-5 [&>svg]:h-5 [&>svg]:mr-0">{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </header>
    </>
  );
};

export default Header;