import React, { useState } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';
import { UserAccount, UserRole } from '../types';
import { PlusIcon, EditIcon, TrashIcon } from './Icons';
import { useAuditLog } from '../hooks/useAuditLog';

const DEFAULT_ACCOUNTS: UserAccount[] = [
    { id: '1', username: 'admin', passwordHash: 'admin', role: 'ADMIN', fullName: 'Chủ Shop' },
    { id: '2', username: 'nhanvien', passwordHash: '1234', role: 'STAFF', fullName: 'Nhân Viên Bán Hàng' }
];

const StaffManager: React.FC = () => {
    const [accounts, setAccounts] = useLocalStorage<UserAccount[]>('accountsData', DEFAULT_ACCOUNTS);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<UserAccount | null>(null);

    const [form, setForm] = useState<Partial<UserAccount>>({});
    
    const logAction = useAuditLog();

    const handleOpenModal = (account?: UserAccount) => {
        if (account) {
            setEditingAccount(account);
            setForm({ ...account, passwordHash: '' }); // Don't show password by default when editing
        } else {
            setEditingAccount(null);
            setForm({ role: 'STAFF' });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setForm({});
        setEditingAccount(null);
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!form.username || !form.fullName || !form.role) {
            alert('Vui lòng điền đầy đủ thông tin!');
            return;
        }

        if (!editingAccount && !form.passwordHash) {
            alert('Vui lòng nhập mật khẩu cho tài khoản mới!');
            return;
        }

        if (editingAccount) {
            logAction('NHAN_SU', 'Cập nhật tài khoản', `Cập nhật: @${form.username}`);
            setAccounts(prev => prev.map(a => {
                if (a.id === editingAccount.id) {
                    return {
                        ...a,
                        username: form.username!,
                        fullName: form.fullName!,
                        role: form.role as UserRole,
                        passwordHash: form.passwordHash ? form.passwordHash : a.passwordHash // Only update password if provided
                    };
                }
                return a;
            }));
            
            // Check if current user is the one being edited to reflect changes, theoretically handled by Logout
        } else {
            const newAccount: UserAccount = {
                id: crypto.randomUUID(),
                username: form.username!,
                fullName: form.fullName!,
                role: form.role as UserRole,
                passwordHash: form.passwordHash!
            };
            
            // Check for duplicate username
            if (accounts.some(a => a.username.toLowerCase() === newAccount.username.toLowerCase())) {
                alert('Tên đăng nhập này đã tồn tại!');
                return;
            }

            logAction('NHAN_SU', 'Thêm mới tài khoản', `Tạo tài khoản: @${newAccount.username}`);
            setAccounts(prev => [...prev, newAccount]);
        }
        handleCloseModal();
    };

    const handleDelete = (id: string, username: string) => {
        if (window.confirm(`Bạn có chắc chắn muốn xóa tài khoản "${username}" không?`)) {
            logAction('NHAN_SU', 'Xóa tài khoản', `Xóa: @${username}`);
            setAccounts(prev => prev.filter(a => a.id !== id));
        }
    };

    return (
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 min-h-[70vh]">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4 border-b border-gray-100 pb-4">
                <div>
                    <h2 className="text-2xl font-black text-gray-800 tracking-tight">Quản Lý Nhân Sự</h2>
                    <p className="text-sm text-gray-500 font-medium mt-1">Thêm/Sửa/Xóa tài khoản nhân viên và phân quyền.</p>
                </div>
                <button onClick={() => handleOpenModal()} className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl hover:bg-primary-700 transition-colors shadow-lg shadow-primary/30 font-bold active:scale-95">
                    <PlusIcon className="w-5 h-5" /> Thêm Tài Khoản Mới
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {accounts.map(acc => (
                    <div key={acc.id} className="bg-slate-50 rounded-2xl p-5 border border-slate-200 relative group shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-lg ${acc.role === 'ADMIN' ? 'bg-primary/20 text-primary-700' : 'bg-blue-100 text-blue-700'}`}>
                                    {acc.fullName.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 text-lg">{acc.fullName}</h3>
                                    <p className="text-xs font-medium text-gray-500">@{acc.username}</p>
                                </div>
                            </div>
                            <span className={`px-2.5 py-1 text-[10px] font-black uppercase rounded-lg ${acc.role === 'ADMIN' ? 'bg-primary text-white shadow-sm shadow-primary/30' : 'bg-blue-100 text-blue-700 border border-blue-200'}`}>
                                {acc.role}
                            </span>
                        </div>

                        <div className="flex gap-2 justify-end mt-6">
                            <button onClick={() => handleOpenModal(acc)} className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors border border-transparent">
                                <EditIcon className="w-5 h-5" />
                            </button>
                            <button onClick={() => handleDelete(acc.id, acc.username)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-transparent">
                                <TrashIcon className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100">
                        <div className="px-6 py-5 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                            <h3 className="text-xl font-black text-gray-800">{editingAccount ? 'Sửa Tài Khoản' : 'Thêm Tài Khoản'}</h3>
                            <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600 bg-white p-1 rounded-full shadow-sm">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        
                        <form onSubmit={handleSave} className="p-6 space-y-5">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1.5">Họ và tên</label>
                                    <input autoFocus type="text" value={form.fullName || ''} onChange={e => setForm({...form, fullName: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium text-gray-800" placeholder="Nguyễn Văn A" required />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1.5">Tên đăng nhập</label>
                                    <input type="text" value={form.username || ''} onChange={e => setForm({...form, username: e.target.value.replace(/\s+/g, '')})} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-bold text-gray-800" placeholder="nguyenvana" required />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1.5">Mật khẩu {editingAccount && <span className="text-gray-400 font-normal lowercase">(Bỏ trống nếu không muốn đổi)</span>}</label>
                                    <input type="text" value={form.passwordHash || ''} onChange={e => setForm({...form, passwordHash: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium text-gray-800" placeholder="••••••••" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1.5">Phân quyền</label>
                                    <div className="flex gap-4">
                                        <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all ${form.role === 'STAFF' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                                            <input type="radio" name="role" value="STAFF" checked={form.role === 'STAFF'} onChange={() => setForm({...form, role: 'STAFF'})} className="hidden" />
                                            <span className="font-bold text-sm">Nhân Viên</span>
                                        </label>
                                        <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all ${form.role === 'ADMIN' ? 'border-primary bg-primary/10 text-primary-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                                            <input type="radio" name="role" value="ADMIN" checked={form.role === 'ADMIN'} onChange={() => setForm({...form, role: 'ADMIN'})} className="hidden" />
                                            <span className="font-bold text-sm">Quản Trị Viên</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={handleCloseModal} className="flex-1 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold transition-colors">Hủy</button>
                                <button type="submit" className="flex-1 py-3.5 bg-primary hover:bg-primary-700 text-white rounded-xl font-bold shadow-lg shadow-primary/30 transition-all active:scale-95">Lưu lại</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StaffManager;
