import { useCallback } from 'react';
import type { AuditLog, AuditLogCategory, UserAccount } from '../types';

export const useAuditLog = () => {
    const logAction = useCallback((category: AuditLogCategory, action: string, details?: string) => {
        try {
            const currentUserStr = localStorage.getItem('currentUser');
            if (!currentUserStr) return; // Không lưu nếu không có user đăng nhập

            const currentUser: UserAccount = JSON.parse(currentUserStr);

            const newLog: AuditLog = {
                id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                timestamp: new Date().toISOString(),
                userFullName: currentUser.fullName,
                userRole: currentUser.role,
                category,
                action,
                details
            };

            const existingLogsStr = localStorage.getItem('auditLogsData');
            const existingLogs: AuditLog[] = existingLogsStr ? JSON.parse(existingLogsStr) : [];
            
            // Limit to 1000 logs to prevent LocalStorage bloat
            const updatedLogs = [newLog, ...existingLogs].slice(0, 1000);

            localStorage.setItem('auditLogsData', JSON.stringify(updatedLogs));
            
            // Dispatch event for AutoSyncManager
            setTimeout(() => {
                window.dispatchEvent(new CustomEvent('local-data-change', { detail: { key: 'auditLogsData' } }));
            }, 0);

        } catch (error) {
            console.error("Failed to append audit log:", error);
        }
    }, []);

    return logAction;
};
