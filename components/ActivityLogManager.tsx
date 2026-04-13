import React, { useState, useMemo } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';
import type { AuditLog, AuditLogCategory } from '../types';

const ActivityLogManager: React.FC = () => {
    const [auditLogs] = useLocalStorage<AuditLog[]>('auditLogsData', []);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState<AuditLogCategory | 'ALL'>('ALL');

    const filteredLogs = useMemo(() => {
        return auditLogs.filter(log => {
            const matchesSearch = log.userFullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                  log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                  (log.details && log.details.toLowerCase().includes(searchTerm.toLowerCase()));
            const matchesCategory = filterCategory === 'ALL' || log.category === filterCategory;
            
            return matchesSearch && matchesCategory;
        });
    }, [auditLogs, searchTerm, filterCategory]);

    const getCategoryBadge = (cat: AuditLogCategory) => {
        switch (cat) {
            case 'DOANH_THU': return <span className="bg-green-100 text-green-700 px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider">Doanh Thu</span>;
            case 'HOA_DON': return <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider">Hóa Đơn</span>;
            case 'KY_GUI': return <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider">Ký Gửi</span>;
            case 'KHO_HANG': return <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider">Kho Hàng</span>;
            case 'NHAN_SU': return <span className="bg-pink-100 text-pink-700 px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider">Nhân Sự</span>;
            case 'HE_THONG': return <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider">Hệ Thống</span>;
            default: return null;
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                        <span className="w-10 h-10 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-600">🕵️‍♂️</span>
                        Nhật Ký Thao Tác
                    </h2>
                    <p className="text-sm font-medium text-slate-500 mt-1">Giám sát toàn bộ hoạt động của nhân viên trên hệ thống</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    <select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value as any)}
                        className="p-3 border-2 border-slate-100 rounded-2xl text-sm font-bold text-slate-600 focus:border-slate-300 focus:ring-0 w-full sm:w-auto"
                    >
                        <option value="ALL">Tất cả phân loại</option>
                        <option value="DOANH_THU">Phân loại: Doanh Thu</option>
                        <option value="HOA_DON">Phân loại: Hóa Đơn</option>
                        <option value="KY_GUI">Phân loại: Ký Gửi</option>
                        <option value="KHO_HANG">Phân loại: Kho Hàng</option>
                        <option value="NHAN_SU">Phân loại: Nhân Sự</option>
                    </select>
                    <input
                        type="text"
                        placeholder="Tìm người, thao tác..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full sm:w-64 p-3 border-2 border-slate-100 rounded-2xl text-sm font-bold text-slate-600 focus:border-slate-300 focus:ring-0 placeholder-slate-400"
                    />
                </div>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto min-h-[500px]">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b-2 border-slate-100">
                                <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest whitespace-nowrap pl-6 w-48">Thời Gian</th>
                                <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Người Thực Hiện</th>
                                <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest whitespace-nowrap w-32">Khu Vực</th>
                                <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest min-w-[300px]">Hành Động & Chi Tiết</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredLogs.length > 0 ? (
                                filteredLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="p-4 pl-6 align-top">
                                            <div className="flex flex-col gap-1 mt-1.5">
                                                <span className="text-sm font-bold text-slate-700">
                                                    {new Date(log.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                                </span>
                                                <span className="text-[10px] font-bold text-slate-400">
                                                    {new Date(log.timestamp).toLocaleDateString('vi-VN')}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-4 align-top pt-5">
                                            <div className="flex items-center gap-2">
                                                <span className={`w-2 h-2 rounded-full ${log.userRole === 'ADMIN' ? 'bg-primary' : 'bg-blue-400'}`}></span>
                                                <span className="font-bold text-slate-700">{log.userFullName}</span>
                                                <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{log.userRole}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 align-top pt-5">{getCategoryBadge(log.category)}</td>
                                        <td className="p-4">
                                            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 group-hover:border-slate-200 transition-colors">
                                                <span className="text-sm font-bold text-slate-800">{log.action}</span>
                                                {log.details && (
                                                    <p className="text-xs font-medium text-slate-500 mt-1 whitespace-pre-wrap leading-relaxed">{log.details}</p>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="p-12 text-center text-slate-400 font-medium">
                                        Không tìm thấy lịch sử thao tác nào!
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ActivityLogManager;
