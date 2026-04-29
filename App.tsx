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
import { useAuditLog } from './hooks/useAuditLog';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const logAction = useAuditLog();

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

  useEffect(() => {
    const isMigrated = localStorage.getItem('migration_split_invoices_v1');
    if (!isMigrated) {
        try {
            const rawInvoices = localStorage.getItem('invoicesData');
            if (rawInvoices) {
                let invoices: Invoice[] = JSON.parse(rawInvoices);
                let migrated = false;
                let newInvoicesList: Invoice[] = [];

                invoices.forEach(invoice => {
                    const holdingItems = invoice.items.filter(i => i.status === 'HOLDING');
                    const nonHoldingItems = invoice.items.filter(i => i.status !== 'HOLDING');

                    if (holdingItems.length > 0 && nonHoldingItems.length > 0) {
                        migrated = true;
                        
                        const nonHoldingTotalItems = nonHoldingItems.reduce((s, i) => s + (i.sellingPrice * i.quantity), 0);
                        const nonHoldingTotal = nonHoldingTotalItems - (invoice.discount || 0) + (invoice.shippingFee || 0);
                        
                        let nonHoldingDeposit = 0;
                        let holdingDeposit = 0;

                        if (invoice.deposit >= nonHoldingTotal && nonHoldingTotal > 0) {
                            nonHoldingDeposit = nonHoldingTotal; 
                            holdingDeposit = invoice.deposit - nonHoldingTotal; 
                        } else {
                            nonHoldingDeposit = invoice.deposit;
                            holdingDeposit = 0;
                        }

                        const newHoldingInvoice: Invoice = {
                            ...invoice,
                            id: invoice.id + '_' + Date.now() + Math.random().toString(36).substring(2, 6),
                            items: holdingItems,
                            deposit: holdingDeposit,
                            discount: 0,
                            shippingFee: 0,
                        };

                        const newNonHoldingInvoice: Invoice = {
                            ...invoice,
                            items: nonHoldingItems,
                            deposit: nonHoldingDeposit
                        };

                        newInvoicesList.push(newNonHoldingInvoice);
                        newInvoicesList.push(newHoldingInvoice);
                    } else {
                        newInvoicesList.push(invoice);
                    }
                });

                if (migrated) {
                    localStorage.setItem('invoicesData', JSON.stringify(newInvoicesList));
                    window.dispatchEvent(new Event('storage'));
                }
            }
        } catch (e) {
            console.error('Migration failed', e);
        }
        localStorage.setItem('migration_split_invoices_v1', 'true');
    }
  }, []);

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
    logAction('HE_THONG', 'Nhập dữ liệu', 'Đã nhập thành công từ Sheet/Cloud');
    alert('Nhập dữ liệu thành công! Ứng dụng sẽ được tải lại để cập nhật.');
    window.location.reload();
  };

  const handleLogout = () => {
    logAction('HE_THONG', 'Đăng xuất', 'Người dùng đăng xuất');
    localStorage.removeItem('currentUser');
    setCurrentUser(null);
  };

  if (!currentUser) {
      return <Login onLoginSuccess={setCurrentUser} />;
  }

  return (
    <div className="h-screen bg-gray-100 text-gray-800 flex flex-col lg:flex-row overflow-hidden">
      <AutoSyncManager />
      <Header
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        onOpenSyncModal={() => setIsSyncModalOpen(true)}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8">
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