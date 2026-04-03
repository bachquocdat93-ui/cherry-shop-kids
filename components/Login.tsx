import React, { useState, useEffect } from 'react';
import { UserAccount } from '../types';

interface LoginProps {
    onLoginSuccess: (user: UserAccount) => void;
}

const DEFAULT_ACCOUNTS: UserAccount[] = [
    {
        id: '1',
        username: 'admin',
        passwordHash: 'admin',
        role: 'ADMIN',
        fullName: 'Chủ Shop'
    },
    {
        id: '2',
        username: 'nhanvien',
        passwordHash: '1234',
        role: 'STAFF',
        fullName: 'Nhân Viên Bán Hàng'
    }
];

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        // Initialize default accounts if none exist
        const accounts = localStorage.getItem('accountsData');
        if (!accounts) {
            localStorage.setItem('accountsData', JSON.stringify(DEFAULT_ACCOUNTS));
        }
    }, []);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const savedAccounts = localStorage.getItem('accountsData');
        const accounts: UserAccount[] = savedAccounts ? JSON.parse(savedAccounts) : DEFAULT_ACCOUNTS;

        const foundUser = accounts.find(
            u => u.username.toLowerCase() === username.toLowerCase() && u.passwordHash === password
        );

        if (foundUser) {
            // Save session
            localStorage.setItem('currentUser', JSON.stringify(foundUser));
            onLoginSuccess(foundUser);
        } else {
            setError('Sai tên đăng nhập hoặc mật khẩu!');
        }
    };

    return (
        <div className="min-h-screen relative flex items-center justify-center p-4 bg-slate-100 overflow-hidden">
            {/* Background Decorations */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-pink-300 rounded-full blur-[100px] opacity-40 mix-blend-multiply animate-pulse"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary rounded-full blur-[120px] opacity-20 mix-blend-multiply"></div>
            
            <div className="bg-white/80 backdrop-blur-xl w-full max-w-md rounded-3xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] border border-white/50 p-8 relative z-10">
                <div className="text-center mb-10">
                    <div className="w-20 h-20 bg-gradient-to-tr from-primary to-pink-400 rounded-2xl mx-auto shadow-lg shadow-primary/30 flex items-center justify-center mb-6">
                        <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                        </svg>
                    </div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight">Cherry Shop</h1>
                    <p className="text-slate-500 font-medium mt-2">Đăng nhập hệ thống quản lý</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    {error && (
                        <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm font-bold text-center border border-red-100">
                            {error}
                        </div>
                    )}
                    
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 pl-1">Tên đăng nhập</label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full bg-slate-50 border-0 text-slate-800 text-lg font-bold rounded-2xl px-5 py-4 focus:ring-4 focus:ring-primary/20 transition-all placeholder:text-slate-300 placeholder:font-medium"
                                placeholder="Nhập tên đăng nhập..."
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 pl-1">Mật khẩu</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-slate-50 border-0 text-slate-800 text-lg font-bold rounded-2xl px-5 py-4 focus:ring-4 focus:ring-primary/20 transition-all placeholder:text-slate-300 placeholder:font-medium"
                                placeholder="••••••••"
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-gradient-to-r from-primary to-pink-500 hover:from-pink-500 hover:to-primary text-white text-lg font-black py-4 rounded-2xl shadow-xl shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all outline-none"
                    >
                        ĐĂNG NHẬP
                    </button>
                    
                </form>
            </div>
        </div>
    );
};

export default Login;
