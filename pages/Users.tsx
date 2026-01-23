
import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storage';
import { User, Firma, UserRole } from '../types';

interface UsersProps {
    availableFirms: Firma[];
    onImpersonate: (user: User) => void;
}

export const Users: React.FC<UsersProps> = ({ availableFirms, onImpersonate }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Modal & Form
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editUserId, setEditUserId] = useState<string | null>(null);
    const [formName, setFormName] = useState('');
    const [formUsername, setFormUsername] = useState('');
    const [formPassword, setFormPassword] = useState('');
    const [formRole, setFormRole] = useState<UserRole>('USER');
    const [formAllowedFirms, setFormAllowedFirms] = useState<string[]>([]);

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        setLoading(true);
        try {
            const data = await StorageService.getUsers();
            setUsers(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (user: User) => {
        setEditUserId(user.id);
        setFormName(user.adSoyad);
        setFormUsername(user.username);
        setFormPassword(''); 
        setFormRole(user.role);
        setFormAllowedFirms(user.allowedFirmIds || []);
        setIsModalOpen(true);
    };

    const handleCreate = () => {
        setEditUserId(null);
        setFormName('');
        setFormUsername('');
        setFormPassword('');
        setFormRole('USER');
        setFormAllowedFirms([]);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Bu kullanıcıyı silmek istediğinize emin misiniz?')) return;
        try {
            await StorageService.deleteUser(id);
            setUsers(users.filter(u => u.id !== id));
        } catch (e) {
            alert('Silme işlemi başarısız.');
        }
    };

    const handleSave = async () => {
        if (!formUsername || !formName) {
            alert('Lütfen zorunlu alanları doldurun.');
            return;
        }
        
        const userPayload: Partial<User> = {
            id: editUserId || undefined,
            username: formUsername,
            adSoyad: formName,
            role: formRole,
            allowedFirmIds: formAllowedFirms
        };

        if (formPassword) {
            userPayload.password = formPassword;
        } else if (!editUserId) {
            alert('Yeni kullanıcı için şifre gereklidir.');
            return;
        }

        try {
            await StorageService.saveUser(userPayload);
            await loadUsers(); // Listeyi yenile
            setIsModalOpen(false);
        } catch (e) {
            alert('Kaydetme hatası.');
        }
    };

    const toggleFirmPermission = (firmId: string) => {
        setFormAllowedFirms(prev => 
            prev.includes(firmId) ? prev.filter(id => id !== firmId) : [...prev, firmId]
        );
    };

    const toggleAllFirms = () => {
        if (formAllowedFirms.length === availableFirms.length) {
            setFormAllowedFirms([]);
        } else {
            setFormAllowedFirms(availableFirms.map(f => f.id));
        }
    };

    const getRoleBadge = (role: UserRole) => {
        switch(role) {
            case 'ADMIN': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
            case 'SECRETARY': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
            default: return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
        }
    };

    const getRoleName = (role: UserRole) => {
        switch(role) {
            case 'ADMIN': return 'Yönetici';
            case 'SECRETARY': return 'Sekreter';
            default: return 'Üye';
        }
    };

    return (
        <div className="p-8 h-full overflow-y-auto bg-slate-900 text-white">
            <div className="flex justify-between items-center mb-8 border-b border-slate-800 pb-6">
                <div>
                    <h2 className="text-3xl font-bold">Kullanıcı Yönetimi</h2>
                    <p className="text-slate-400 mt-1">Personel yetkilendirme ve firma atamaları.</p>
                </div>
                <button onClick={handleCreate} className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-blue-600/20 flex items-center gap-2 transition-all hover:-translate-y-0.5">
                    <i className="fa-solid fa-user-plus"></i> Yeni Kullanıcı
                </button>
            </div>

            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-xl">
                <table className="w-full text-left">
                    <thead className="bg-slate-900/50 border-b border-slate-700">
                        <tr>
                            <th className="px-6 py-4 text-slate-400 text-xs font-bold uppercase">Ad Soyad</th>
                            <th className="px-6 py-4 text-slate-400 text-xs font-bold uppercase">Kullanıcı Adı</th>
                            <th className="px-6 py-4 text-slate-400 text-xs font-bold uppercase">Yetki</th>
                            <th className="px-6 py-4 text-slate-400 text-xs font-bold uppercase">Atanan Firma</th>
                            <th className="px-6 py-4 text-right text-slate-400 text-xs font-bold uppercase">İşlemler</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                        {loading ? (
                            <tr><td colSpan={5} className="p-8 text-center text-slate-500">Yükleniyor...</td></tr>
                        ) : users.length === 0 ? (
                            <tr><td colSpan={5} className="p-8 text-center text-slate-500">Kullanıcı bulunamadı.</td></tr>
                        ) : users.map(user => (
                            <tr key={user.id} className="hover:bg-slate-750 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="font-bold">{user.adSoyad}</div>
                                    <div className="text-[10px] text-slate-500 font-mono">{user.id.substring(0,6)}...</div>
                                </td>
                                <td className="px-6 py-4 font-mono text-sm text-slate-300">{user.username}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${getRoleBadge(user.role)}`}>
                                        {getRoleName(user.role)}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    {user.role === 'ADMIN' || user.role === 'SECRETARY' ? (
                                        <span className="text-xs text-slate-500 italic">Tüm Firmalar (Otomatik)</span>
                                    ) : (
                                        <div className="flex flex-wrap gap-1">
                                            {(user.allowedFirmIds || []).length > 0 ? (
                                                <span className="bg-slate-700 text-slate-300 px-2 py-0.5 rounded text-xs font-bold">{(user.allowedFirmIds || []).length} Firma</span>
                                            ) : (
                                                <span className="text-xs text-red-400">Yetki Yok</span>
                                            )}
                                        </div>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-right flex justify-end gap-2">
                                    {/* Sadece Üyeler ve Sekreterler için Göz At butonu */}
                                    {user.role !== 'ADMIN' && (
                                        <button 
                                            onClick={() => onImpersonate(user)} 
                                            className="bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1 border border-slate-600"
                                            title="Bu kullanıcının ekranını gör"
                                        >
                                            <i className="fa-solid fa-eye"></i> Göz At
                                        </button>
                                    )}
                                    <button onClick={() => handleEdit(user)} className="bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white w-8 h-8 rounded flex items-center justify-center transition-colors">
                                        <i className="fa-solid fa-pen"></i>
                                    </button>
                                    <button onClick={() => handleDelete(user.id)} className="bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white w-8 h-8 rounded flex items-center justify-center transition-colors">
                                        <i className="fa-solid fa-trash"></i>
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center backdrop-blur-sm p-4 animate-fade-in-down">
                    <div className="bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="bg-slate-900 p-5 border-b border-slate-700 flex justify-between items-center">
                            <h3 className="font-bold text-white text-lg">{editUserId ? 'Kullanıcı Düzenle' : 'Yeni Kullanıcı'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white"><i className="fa-solid fa-xmark text-lg"></i></button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Ad Soyad</label>
                                    <input type="text" className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-sm text-white focus:border-blue-500 outline-none" value={formName} onChange={e => setFormName(e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Kullanıcı Adı</label>
                                    <input type="text" className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-sm text-white focus:border-blue-500 outline-none" value={formUsername} onChange={e => setFormUsername(e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Şifre {editUserId && '(Boş bırakırsanız değişmez)'}</label>
                                    <input type="password" className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-sm text-white focus:border-blue-500 outline-none" value={formPassword} onChange={e => setFormPassword(e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Yetki</label>
                                    <select className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-sm text-white focus:border-blue-500 outline-none" value={formRole} onChange={e => setFormRole(e.target.value as UserRole)}>
                                        <option value="USER">Üye (Kısıtlı Yetki)</option>
                                        <option value="SECRETARY">Sekreter (Firma Görür - Veri Girer)</option>
                                        <option value="ADMIN">Yönetici (Tam Yetki)</option>
                                    </select>
                                </div>
                            </div>

                            {/* FİRMA ATAMA BÖLÜMÜ (Sadece USER rolü için) */}
                            {formRole === 'USER' && (
                                <div className="border-t border-slate-700 pt-4">
                                    <div className="flex justify-between items-center mb-3">
                                        <label className="block text-sm font-bold text-white">Firma Yetkilendirmesi</label>
                                        <button onClick={toggleAllFirms} className="text-xs text-blue-400 hover:text-blue-300 font-bold">
                                            {formAllowedFirms.length === availableFirms.length ? 'Tümünü Kaldır' : 'Tümünü Seç'}
                                        </button>
                                    </div>
                                    <div className="bg-slate-900 border border-slate-700 rounded-lg max-h-48 overflow-y-auto p-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {availableFirms.length === 0 ? (
                                            <div className="col-span-2 text-center text-slate-500 text-xs py-4">Sistemde kayıtlı firma yok.</div>
                                        ) : (
                                            availableFirms.map(firm => (
                                                <div 
                                                    key={firm.id} 
                                                    onClick={() => toggleFirmPermission(firm.id)}
                                                    className={`p-2 rounded border cursor-pointer flex items-center gap-2 select-none transition-all ${
                                                        formAllowedFirms.includes(firm.id) 
                                                        ? 'bg-blue-600/20 border-blue-500/50 text-blue-100' 
                                                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                                                    }`}
                                                >
                                                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                                                        formAllowedFirms.includes(firm.id) ? 'bg-blue-500 border-blue-500 text-white' : 'border-slate-500'
                                                    }`}>
                                                        {formAllowedFirms.includes(firm.id) && <i className="fa-solid fa-check text-[10px]"></i>}
                                                    </div>
                                                    <span className="text-xs truncate font-medium">{firm.ad}</span>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                    <p className="text-[10px] text-slate-500 mt-2">
                                        <i className="fa-solid fa-circle-info mr-1"></i>
                                        Kullanıcı sadece seçili firmaları görebilecek ve işlem yapabilecektir.
                                    </p>
                                </div>
                            )}

                             {/* SEKRETER ve ADMİN BİLGİLENDİRME */}
                             {(formRole === 'SECRETARY' || formRole === 'ADMIN') && (
                                <div className="border-t border-slate-700 pt-4 p-2">
                                    <div className="bg-blue-900/20 border border-blue-800/50 rounded-lg p-3">
                                        <div className="flex gap-2">
                                            <i className="fa-solid fa-circle-info text-blue-400 mt-0.5"></i>
                                            <div>
                                                <p className="text-sm font-bold text-blue-300">
                                                    {formRole === 'ADMIN' ? 'Tam Erişim' : 'Geniş Erişim'}
                                                </p>
                                                <p className="text-xs text-blue-200/70 mt-1">
                                                    {formRole === 'ADMIN' 
                                                        ? 'Yöneticiler tüm firmaları görebilir ve yönetebilir. Çalışan ekleme işlemi yapamazlar.' 
                                                        : 'Sekreterler tüm firmaları görebilir ve çalışan ekleyebilirler. Ekledikleri çalışanlar onay bekler.'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                             )}
                        </div>

                        <div className="p-5 bg-slate-900 border-t border-slate-700 flex justify-end gap-3 shrink-0">
                            <button onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-slate-400 hover:text-white text-sm font-bold transition-colors">İptal</button>
                            <button onClick={handleSave} className="px-6 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-green-600/20">Kaydet</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
