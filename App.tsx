import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import RevenueTable from './components/RevenueTable';
import InvoicesTable from './components/InvoicesTable';
import ConsignmentTable from './components/ConsignmentTable';
import ShopInventoryTable from './components/ShopInventoryTable';
import Dashboard from './components/Dashboard';
import ReportsPage from './components/ReportsPage';
import CustomersPage from './components/CustomersPage';
import SheetSyncModal from './components/SheetSyncModal';
import AutoSyncManager from './components/AutoSyncManager';
import Login from './components/Login';
import StaffManager from './components/StaffManager';
import ActivityLogManager from './components/ActivityLogManager';
import type { RevenueEntry, Invoice, ConsignmentItem, ShopItem, CustomerInfo, UserAccount } from './types';
import type { Page } from './types';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);

  useEffect(() => {
    // Check if user is already logged in
    const savedSession = localStorage.getItem('currentUser');
    if (savedSession) {
        try {
            setCurrentUser(JSON.parse(savedSession));
        } catch (e) {
            localStorage.removeItem('currentUser');
        }
    }
  }, []);

  useEffect(() => {
    if (currentUser?.role === 'STAFF') {
        if (currentPage === 'dashboard' || currentPage === 'reports') {
            setCurrentPage('revenue');
        }
    }
  }, [currentUser, currentPage]);

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'revenue':
        return <RevenueTable />;
      case 'invoices':
        return <InvoicesTable />;
      case 'consignment':
        return <ConsignmentTable />;
      case 'inventory':
        return <ShopInventoryTable />;
      case 'reports':
        return <ReportsPage />;
      case 'customers':
        return <CustomersPage />;
      case 'staff':
        return <StaffManager />;
      case 'logs':
        return <ActivityLogManager />;
      default:
        return <Dashboard />;
    }
  };

  const handleImportSuccess = (data: {
    revenueData: RevenueEntry[];
    invoicesData: Invoice[];
    consignmentData: ConsignmentItem[];
    shopInventoryData?: ShopItem[];
    customersInfoData?: CustomerInfo[];
    accountsData?: any[];
    auditLogsData?: any[];
  }) => {
    // Overwrite all data in local storage
    window.localStorage.setItem('revenueData', JSON.stringify(data.revenueData));
    window.localStorage.setItem('invoicesData', JSON.stringify(data.invoicesData));
    window.localStorage.setItem('consignmentData', JSON.stringify(data.consignmentData));
    if (data.shopInventoryData) {
      window.localStorage.setItem('shopInventoryData', JSON.stringify(data.shopInventoryData));
    }
    if (data.customersInfoData) {
      window.localStorage.setItem('customersInfoData', JSON.stringify(data.customersInfoData));
    }
    if (data.accountsData) {
      window.localStorage.setItem('accountsData', JSON.stringify(data.accountsData));
    }
    if (data.auditLogsData) {
      window.localStorage.setItem('auditLogsData', JSON.stringify(data.auditLogsData));
    }

    // Close modal and reload to reflect changes everywhere
    setIsSyncModalOpen(false);
    alert('Nhập dữ liệu thành công! Ứng dụng sẽ được tải lại để cập nhật.');
    window.location.reload();
  };

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    setCurrentUser(null);
  };

  if (!currentUser) {
      return <Login onLoginSuccess={setCurrentUser} />;
  }

  return (
    <div className="h-screen bg-gray-100 text-gray-800 flex flex-col">
      <AutoSyncManager />
      <Header
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        onOpenSyncModal={() => setIsSyncModalOpen(true)}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        {renderPage()}
      </main>
      {isSyncModalOpen && (
        <SheetSyncModal
          onClose={() => setIsSyncModalOpen(false)}
          onImportSuccess={handleImportSuccess}
        />
      )}
    </div>
  );
};

export default App;