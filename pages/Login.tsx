
import React, { useState } from 'react';
import { StorageService } from '../services/storage';
import { User } from '../types';

interface LoginProps {
    onLoginSuccess: (user: User) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await StorageService.login(username, password);
            if (res.success) {
                StorageService.setSession(res.token, res.user);
                onLoginSuccess(res.user);
            } else {
                setError(res.message || 'Giriş başarısız.');
            }
        } catch (err) {
            setError('Sunucu bağlantı hatası.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center h-screen bg-slate-900 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-800 to-slate-950 text-white">
            <div className="w-full max-w-md p-8 bg-slate-800/50 backdrop-blur-xl border border-slate-700 rounded-2xl shadow-2xl">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-blue-600 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-lg shadow-blue-600/30">
                        <i className="fa-solid fa-shield-halved text-3xl text-white"></i>
                    </div>
                    <h1 className="text-2xl font-bold">İSG Takip Pro</h1>
                    <p className="text-slate-400 text-sm mt-1">Ofis Yönetim Sistemi</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Kullanıcı Adı</label>
                        <div className="relative">
                            <i className="fa-solid fa-user absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"></i>
                            <input 
                                type="text" 
                                className="w-full bg-slate-900 border border-slate-600 rounded-lg py-3 pl-10 pr-4 text-white focus:border-blue-500 outline-none transition-colors"
                                placeholder="Kullanıcı adınızı girin"
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Şifre</label>
                        <div className="relative">
                            <i className="fa-solid fa-lock absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"></i>
                            <input 
                                type="password" 
                                className="w-full bg-slate-900 border border-slate-600 rounded-lg py-3 pl-10 pr-4 text-white focus:border-blue-500 outline-none transition-colors"
                                placeholder="••••••••"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm flex items-center gap-2">
                            <i className="fa-solid fa-circle-exclamation"></i> {error}
                        </div>
                    )}

                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg shadow-lg shadow-blue-600/20 transition-all flex justify-center items-center gap-2"
                    >
                        {loading ? <i className="fa-solid fa-spinner fa-spin"></i> : 'Giriş Yap'}
                    </button>
                </form>
                
                <div className="mt-6 text-center text-xs text-slate-500">
                    &copy; {new Date().getFullYear()} İSG Takip Ofis Sistemi
                </div>
            </div>
        </div>
    );
};
