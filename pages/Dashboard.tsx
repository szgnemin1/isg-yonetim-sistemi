
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Firma, Calisan, Ekipman, RiskAnalizi, Page, User, KurulToplantisi } from '../types';
import { isExpired, isApproaching, formatDateTR, calculateNextTrainingDate } from '../services/logic';

interface DashboardProps {
  firms: Firma[];
  employees: Calisan[];
  equipments: Ekipman[];
  risks: RiskAnalizi[];
  meetings?: KurulToplantisi[]; // Opsiyonel
  setPage: (page: Page) => void;
  selectFirm: (firmId: string) => void;
  onSaveEmployees: (data: Calisan[]) => void;
  isReadOnly?: boolean; 
  currentUser?: User | null;
}

export const Dashboard: React.FC<DashboardProps> = ({ firms, employees, equipments, risks, meetings = [], setPage, selectFirm, onSaveEmployees, isReadOnly = false, currentUser }) => {
  
  // Quick Add State
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickFirmId, setQuickFirmId] = useState('');
  const [quickName, setQuickName] = useState('');
  const [quickTc, setQuickTc] = useState('');
  const [quickDate, setQuickDate] = useState('');

  // Live Search States
  const [firmSearchTerm, setFirmSearchTerm] = useState('');
  const [isFirmDropdownOpen, setIsFirmDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Click Outside Listener for Dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
            setIsFirmDropdownOpen(false);
        }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleQuickSave = () => {
    if (isReadOnly) return;
    if (!quickFirmId || !quickName || !quickTc || !quickDate) return;

    const selectedFirm = firms.find(f => f.id === quickFirmId);
    if (!selectedFirm) return;

    const nextDate = calculateNextTrainingDate(quickDate, selectedFirm.tehlikeSinifi);
    
    // ROL KONTROLÜ: Sekreter ise BEKLIYOR, Kullanıcı ise ONAYLANDI
    const isSecretary = currentUser?.role === 'SECRETARY';

    const newEmp: Calisan = {
        id: crypto.randomUUID(),
        firmaId: selectedFirm.id,
        tcNo: quickTc,
        adSoyad: quickName,
        sonEgitimTarihi: quickDate,
        sonrakiEgitimTarihi: nextDate,
        calismaDurumu: 'AKTIF',
        onayDurumu: isSecretary ? 'BEKLIYOR' : 'ONAYLANDI'
    };

    onSaveEmployees([...employees, newEmp]);
    
    // Reset and Close
    handleCloseModal();
    if (isSecretary) alert('Personel kaydedildi ve onay listesine eklendi.');
  };

  const handleCloseModal = () => {
      setIsQuickAddOpen(false);
      setQuickFirmId('');
      setQuickName('');
      setQuickTc('');
      setQuickDate('');
      setFirmSearchTerm('');
      setIsFirmDropdownOpen(false);
  };

  // Filter Firms for Search
  const filteredFirms = useMemo(() => {
      if (!firmSearchTerm) return firms.sort((a,b) => a.ad.localeCompare(b.ad));
      return firms
        .filter(f => f.ad.toLocaleLowerCase('tr-TR').includes(firmSearchTerm.toLocaleLowerCase('tr-TR')))
        .sort((a,b) => a.ad.localeCompare(b.ad));
  }, [firms, firmSearchTerm]);

  const handleFirmSelect = (firm: Firma) => {
      setQuickFirmId(firm.id);
      setFirmSearchTerm(firm.ad);
      setIsFirmDropdownOpen(false);
  };

  const stats = useMemo(() => {
    let expiredCount = 0;
    let approachingCount = 0;
    
    // Sadece erişilebilen firmaların verilerini say
    const allowedFirmIds = new Set(firms.map(f => f.id));

    // Sadece onaylanmış çalışanları istatistiklere kat
    employees.filter(e => allowedFirmIds.has(e.firmaId) && e.onayDurumu !== 'BEKLIYOR').forEach(e => {
      if (isExpired(e.sonrakiEgitimTarihi)) expiredCount++;
      else if (isApproaching(e.sonrakiEgitimTarihi)) approachingCount++;
    });
    equipments.filter(e => allowedFirmIds.has(e.firmaId)).forEach(e => {
        if (isExpired(e.sonrakiKontrolTarihi)) expiredCount++;
        else if (isApproaching(e.sonrakiKontrolTarihi)) approachingCount++;
    });
    risks.filter(r => allowedFirmIds.has(r.firmaId)).forEach(r => {
        if (isExpired(r.gecerlilikTarihi)) expiredCount++;
        else if (isApproaching(r.gecerlilikTarihi)) approachingCount++;
    });
    meetings.filter(m => allowedFirmIds.has(m.firmaId)).forEach(m => {
        if (isExpired(m.sonrakiToplantiTarihi)) expiredCount++;
        else if (isApproaching(m.sonrakiToplantiTarihi, 15)) approachingCount++;
    });

    return { expiredCount, approachingCount };
  }, [employees, equipments, risks, meetings, firms]);

  const alerts = useMemo(() => {
    const list: { type: 'danger' | 'warning' | 'info', msg: string, date: string, entity: string, firmId: string }[] = [];
    const allowedFirmIds = new Set(firms.map(f => f.id));

    const addAlert = (date: string, msg: string, entity: string, firmId: string, typeOverride?: 'danger' | 'warning' | 'info') => {
        if (!allowedFirmIds.has(firmId)) return;
        if (typeOverride) {
             list.push({ type: typeOverride, msg, date, entity, firmId });
             return;
        }
        if (isExpired(date)) {
            list.push({ type: 'danger', msg, date, entity, firmId });
        } else if (isApproaching(date, entity === 'Kurul' ? 15 : 30)) { // Kurul için 15 gün uyarı
            list.push({ type: 'warning', msg, date, entity, firmId });
        }
    };

    employees.forEach(e => {
        const firmName = firms.find(f => f.id === e.firmaId)?.ad || 'Bilinmeyen Firma';
        
        // Onay Bekleyen Personel Uyarısı
        if (e.onayDurumu === 'BEKLIYOR') {
            addAlert(e.sonEgitimTarihi, `${e.adSoyad} (${firmName})`, 'ONAY BEKLİYOR', e.firmaId, 'info');
        } else {
            addAlert(e.sonrakiEgitimTarihi, `${e.adSoyad} (${firmName})`, 'Eğitim', e.firmaId);
        }
    });
    
    equipments.forEach(e => {
        const firmName = firms.find(f => f.id === e.firmaId)?.ad || 'Bilinmeyen Firma';
        addAlert(e.sonrakiKontrolTarihi, `${e.ad} (${firmName})`, 'Ekipman', e.firmaId);
    });
    
    risks.forEach(r => {
        const firmName = firms.find(f => f.id === r.firmaId)?.ad || 'Bilinmeyen Firma';
        addAlert(r.gecerlilikTarihi, `${firmName}`, 'Risk Analizi', r.firmaId);
    });

    meetings.forEach(m => {
        const firmName = firms.find(f => f.id === m.firmaId)?.ad || 'Bilinmeyen Firma';
        addAlert(m.sonrakiToplantiTarihi, `${firmName}`, 'Kurul', m.firmaId);
    });

    return list.sort((a, b) => {
        // Önce onay bekleyenler
        if (a.type === 'info' && b.type !== 'info') return -1;
        if (a.type !== 'info' && b.type === 'info') return 1;
        return new Date(a.date).getTime() - new Date(b.date).getTime();
    });
  }, [firms, employees, equipments, risks, meetings]);

  const today = new Date().toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const isAdmin = currentUser?.role === 'ADMIN';

  return (
    <div className="p-8 h-full overflow-y-auto bg-slate-900 text-slate-100 flex flex-col gap-8">
      
      {/* HERO SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 pb-6 border-b border-slate-800">
          <div>
            <div className="text-blue-500 font-bold text-xs uppercase tracking-widest mb-1">{today}</div>
            <h2 className="text-3xl font-black tracking-tight text-white">Genel Bakış</h2>
            <p className="text-slate-400 mt-1 max-w-xl">
                İş sağlığı ve güvenliği süreçlerinizin anlık durum özeti. Bekleyen <strong className="text-white">{alerts.length}</strong> acil aksiyonunuz var.
            </p>
          </div>
          <div className="flex gap-3">
             <button onClick={() => setPage('CALENDAR')} className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-5 py-3 rounded-xl font-bold text-sm transition-colors border border-slate-700 hidden lg:block">
                <i className="fa-solid fa-calendar-days mr-2"></i>Takvim
             </button>
             
             {/* HIZLI PERSONEL EKLEME: Sadece USER ve SECRETARY görebilir. ADMIN göremez. */}
             {!isReadOnly && !isAdmin && (
                 <button onClick={() => setIsQuickAddOpen(true)} className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg shadow-emerald-600/20 transition-all hover:-translate-y-0.5 flex items-center gap-2">
                    <i className="fa-solid fa-user-plus"></i> <span className="hidden sm:inline">Hızlı Personel Ekle</span>
                 </button>
             )}

             <button onClick={() => setPage('FIRMALAR')} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg shadow-blue-600/20 transition-all hover:-translate-y-0.5">
                <i className="fa-solid fa-arrow-right mr-2"></i> Firmalara Git
             </button>
          </div>
      </div>

      {/* BENTO GRID LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ... (İstatistik Kartları) ... */}
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6 content-start">
             
             <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 hover:border-slate-600 transition-colors group">
                 <div className="flex justify-between items-start mb-4">
                     <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center text-lg"><i className="fa-solid fa-building"></i></div>
                     <span className="text-xs text-slate-500 font-mono group-hover:text-blue-400 transition-colors">AKTİF</span>
                 </div>
                 <div className="text-3xl font-bold text-white mb-1">{firms.length}</div>
                 <div className="text-sm text-slate-400">Yönetilen Firma</div>
             </div>

             <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 hover:border-slate-600 transition-colors group">
                 <div className="flex justify-between items-start mb-4">
                     <div className="w-10 h-10 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center text-lg"><i className="fa-solid fa-users"></i></div>
                     <span className="text-xs text-slate-500 font-mono group-hover:text-indigo-400 transition-colors">TOPLAM</span>
                 </div>
                 <div className="text-3xl font-bold text-white mb-1">
                     {employees.filter(e => firms.some(f => f.id === e.firmaId)).length}
                 </div>
                 <div className="text-sm text-slate-400">Kayıtlı Personel</div>
             </div>

             <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 hover:border-red-500/30 transition-colors group relative overflow-hidden">
                 <div className="relative z-10">
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-10 h-10 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center text-lg"><i className="fa-solid fa-bell"></i></div>
                        <span className="text-xs text-red-500 font-bold bg-red-500/10 px-2 py-1 rounded">ACİL</span>
                    </div>
                    <div className="text-3xl font-bold text-white mb-1">{stats.expiredCount}</div>
                    <div className="text-sm text-slate-400">Süresi Dolan İşlem</div>
                 </div>
                 <div className="absolute right-0 bottom-0 opacity-5 -mr-4 -mb-4"><i className="fa-solid fa-triangle-exclamation text-8xl text-red-500"></i></div>
             </div>

             <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 hover:border-amber-500/30 transition-colors group relative overflow-hidden">
                 <div className="relative z-10">
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center text-lg"><i className="fa-solid fa-clock"></i></div>
                        <span className="text-xs text-amber-500 font-bold bg-amber-500/10 px-2 py-1 rounded">YAKLAŞAN</span>
                    </div>
                    <div className="text-3xl font-bold text-white mb-1">{stats.approachingCount}</div>
                    <div className="text-sm text-slate-400">30 Gün İçinde</div>
                 </div>
                 <div className="absolute right-0 bottom-0 opacity-5 -mr-4 -mb-4"><i className="fa-solid fa-hourglass-half text-8xl text-amber-500"></i></div>
             </div>

          </div>

          {/* SAĞ KOLON: AKSİYON LİSTESİ */}
          <div className="bg-slate-800 rounded-2xl border border-slate-700 flex flex-col overflow-hidden shadow-lg h-[500px] lg:h-auto">
              <div className="p-5 border-b border-slate-700 bg-slate-850 flex justify-between items-center">
                  <h3 className="font-bold text-white flex items-center gap-2">
                      <i className="fa-solid fa-list-check text-blue-500"></i> İşlem Bekleyenler
                  </h3>
                  <span className="text-xs font-bold bg-slate-700 text-slate-300 px-2 py-1 rounded-md">{alerts.length}</span>
              </div>
              
              <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                  {alerts.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center p-6">
                          <div className="w-16 h-16 bg-slate-700/50 rounded-full flex items-center justify-center mb-4">
                              <i className="fa-solid fa-mug-hot text-2xl text-slate-400"></i>
                          </div>
                          <p className="text-sm">Her şey yolunda! <br/>Bekleyen acil bir işlem yok.</p>
                      </div>
                  ) : (
                      alerts.map((alert, idx) => {
                          let alertColor = 'bg-amber-500';
                          let alertBg = 'bg-amber-500/10 text-amber-400';
                          if (alert.type === 'danger') {
                              alertColor = 'bg-red-500';
                              alertBg = 'bg-red-500/10 text-red-400';
                          } else if (alert.type === 'info') {
                              alertColor = 'bg-blue-500';
                              alertBg = 'bg-blue-500/10 text-blue-400';
                          }

                          return (
                            <div key={idx} className="group p-3 hover:bg-slate-700/50 rounded-xl border border-transparent hover:border-slate-600 transition-all cursor-pointer flex gap-3" onClick={() => selectFirm(alert.firmId)}>
                                <div className={`w-1 self-stretch rounded-full ${alertColor}`}></div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide ${alertBg}`}>
                                            {alert.entity}
                                        </span>
                                        <span className="text-[10px] text-slate-500 font-mono">
                                            {alert.type === 'info' ? 'ONAY GEREKİYOR' : formatDateTR(alert.date)}
                                        </span>
                                    </div>
                                    <div className="text-sm font-medium text-slate-200 truncate group-hover:text-blue-400 transition-colors">{alert.msg}</div>
                                </div>
                                <div className="flex items-center text-slate-600 group-hover:text-white transition-colors">
                                    <i className="fa-solid fa-chevron-right text-xs"></i>
                                </div>
                            </div>
                          );
                      })
                  )}
              </div>
          </div>
      </div>
      
      {/* QUICK ADD MODAL CODE ... (Değişiklik yok) */}
       {isQuickAddOpen && !isReadOnly && !isAdmin && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center backdrop-blur-sm p-4 animate-fade-in-down">
            {/* ... Modal Content ... */}
            <div className="bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                <div className="bg-slate-900 p-5 border-b border-slate-700 flex justify-between items-center shrink-0">
                    <div>
                        <h3 className="font-bold text-white text-lg">Hızlı Personel Ekle</h3>
                        <p className="text-xs text-slate-500 mt-0.5">Firma detayına girmeden hızlı kayıt oluşturun.</p>
                    </div>
                    <button onClick={handleCloseModal} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"><i className="fa-solid fa-xmark"></i></button>
                </div>
                
                <div className="p-6 space-y-4 overflow-y-auto">
                    {/* Firma Seçimi */}
                    <div className="relative" ref={dropdownRef}>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Firma Seçimi</label>
                        <div className="relative">
                            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 z-10"></i>
                            <input 
                                type="text"
                                className={`w-full bg-slate-900 border ${isFirmDropdownOpen ? 'border-blue-500' : 'border-slate-600'} rounded-lg pl-9 pr-3 py-3 text-sm text-white focus:border-blue-500 outline-none transition-colors`}
                                placeholder="Firma adı ile ara..."
                                value={firmSearchTerm}
                                onChange={(e) => {
                                    setFirmSearchTerm(e.target.value);
                                    setIsFirmDropdownOpen(true);
                                    if(quickFirmId) setQuickFirmId(''); 
                                }}
                                onFocus={() => setIsFirmDropdownOpen(true)}
                            />
                            {quickFirmId && (
                                <i className="fa-solid fa-circle-check absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500 text-lg"></i>
                            )}
                        </div>

                        {isFirmDropdownOpen && (
                            <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-xl max-h-48 overflow-y-auto custom-scrollbar">
                                {filteredFirms.length === 0 ? (
                                    <div className="p-3 text-slate-500 text-sm text-center">Firma bulunamadı.</div>
                                ) : (
                                    filteredFirms.map(f => (
                                        <div 
                                            key={f.id} 
                                            className="px-4 py-2.5 hover:bg-slate-700 cursor-pointer text-sm text-slate-200 border-b border-slate-700/50 last:border-0 flex justify-between items-center group"
                                            onClick={() => handleFirmSelect(f)}
                                        >
                                            <span>{f.ad}</span>
                                            <span className="text-[10px] bg-slate-900 px-2 py-0.5 rounded text-slate-500 group-hover:text-slate-300">{f.tehlikeSinifi}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Ad Soyad</label>
                            <input type="text" className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-sm text-white focus:border-blue-500 outline-none" value={quickName} onChange={e => setQuickName(e.target.value)} placeholder="Örn: Ahmet Yılmaz"/>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">TC Kimlik No</label>
                            <input type="text" maxLength={11} className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-sm text-white focus:border-blue-500 outline-none font-mono" value={quickTc} onChange={e => setQuickTc(e.target.value)} placeholder="11122233344"/>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Son Eğitim Tarihi</label>
                        <input type="date" className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-sm text-white focus:border-blue-500 outline-none" value={quickDate} onChange={e => setQuickDate(e.target.value)} />
                    </div>
                </div>

                <div className="p-5 bg-slate-900 border-t border-slate-700 flex justify-end gap-3 shrink-0">
                    <button onClick={handleCloseModal} className="px-5 py-2.5 text-slate-400 hover:text-white text-sm font-bold transition-colors">İptal</button>
                    <button 
                        onClick={handleQuickSave} 
                        disabled={!quickFirmId || !quickName || !quickTc || !quickDate}
                        className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-bold shadow-lg shadow-emerald-600/20 transition-all transform active:scale-95"
                    >
                        Kaydet
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
