import React, { useEffect, useState } from 'react';
import { pushToCloud } from '../utils/supabaseService';
import { SyncIcon, CheckCircleIcon } from './Icons';

const AutoSyncManager: React.FC = () => {
    const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [lastSaved, setLastSaved] = useState<Date | null>(null);

    useEffect(() => {
        let timeout: NodeJS.Timeout;

        const handleStorageChange = (e: StorageEvent | Event) => {
            // If triggered by our own 'storage' dispatch, e might not be a StorageEvent
            // Check if it's a relevant key if possible (StorageEvent only)
            if (e instanceof StorageEvent) {
                if (e.key === 'supabase_config' || e.key === 'lastCloudSyncAt') return;
            }

            setStatus('saving');
            clearTimeout(timeout);

            timeout = setTimeout(async () => {
                try {
                    const revenue = JSON.parse(localStorage.getItem('revenueData') || '[]');
                    const invoices = JSON.parse(localStorage.getItem('invoicesData') || '[]');
                    const consignment = JSON.parse(localStorage.getItem('consignmentData') || '[]');
                    const inventory = JSON.parse(localStorage.getItem('shopInventoryData') || '[]');

                    await pushToCloud({ revenue, invoices, consignment, inventory });

                    setStatus('saved');
                    setLastSaved(new Date());

                    // Reset to idle after a while
                    setTimeout(() => setStatus('idle'), 3000);
                } catch (error) {
                    console.error("Auto sync failed:", error);
                    setStatus('error');
                }
            }, 3000); // Wait 3 seconds of inactivity before saving
        };

        window.addEventListener('storage', handleStorageChange);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            clearTimeout(timeout);
        };
    }, []);

    if (status === 'idle' && !lastSaved) return null;

    return (
        <div className="fixed bottom-4 right-4 z-50 pointer-events-none">
            <div className={`
                flex items-center gap-2 px-4 py-2 rounded-full shadow-lg transition-all duration-300 transform
                ${status === 'saving' ? 'bg-blue-600 text-white translate-y-0 opacity-100' : ''}
                ${status === 'saved' ? 'bg-green-600 text-white translate-y-0 opacity-100' : ''}
                ${status === 'error' ? 'bg-red-600 text-white translate-y-0 opacity-100' : ''}
                ${status === 'idle' ? 'translate-y-10 opacity-0' : ''}
            `}>
                {status === 'saving' && (
                    <>
                        <SyncIcon className="animate-spin w-4 h-4" />
                        <span className="text-xs font-bold">Đang lưu...</span>
                    </>
                )}
                {status === 'saved' && (
                    <>
                        <CheckCircleIcon className="w-4 h-4" />
                        <span className="text-xs font-bold">Đã lưu tự động</span>
                    </>
                )}
                {status === 'error' && (
                    <>
                        <SyncIcon className="w-4 h-4" />
                        <span className="text-xs font-bold">Lỗi lưu Cloud</span>
                    </>
                )}
            </div>
        </div>
    );
};

export default AutoSyncManager;
