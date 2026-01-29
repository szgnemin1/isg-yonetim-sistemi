
import React, { useState, useMemo } from 'react';
import { Calisan, Firma, User } from '../types';
import { calculateNextTrainingDate, formatDateTR, isExpired, isApproaching } from '../services/logic';
import { StorageService } from '../services/storage';

interface EmployeesProps {
  employees: Calisan[]; // Tüm çalışanlar (Global liste)
  targetFirm: Firma;
  onSave: (data: Calisan[]) => void;
  isReadOnly?: boolean;
  currentUser?: User | null; // Rol kontrolü için gerekli
}

type FilterStatus = 'ALL' | 'EXPIRED' | 'APPROACHING' | 'VALID' | 'PENDING';
type ViewMode = 'ACTIVE' | 'ARCHIVE';
type SortKey = 'adSoyad' | 'sonEgitimTarihi' | 'sonrakiEgitimTarihi' | 'tcNo';
type SortDir = 'asc' | 'desc';

export const Employees: React.FC<EmployeesProps> = ({ employees, targetFirm, onSave, isReadOnly = false, currentUser }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('ACTIVE');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('ALL');
  const [sortKey, setSortKey] = useState<SortKey>('adSoyad');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // Form States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpTc, setNewEmpTc] = useState('');
  const [newEmpTrainDate, setNewEmpTrainDate] = useState('');
  
  // Re-Hire Logic State
  const [rehireModalOpen, setRehireModalOpen] = useState(false);
  const [rehireEmployee, setRehireEmployee] = useState<Calisan | null>(null);
  
  // Bulk Actions
  const [selectedEmpIds, setSelectedEmpIds] = useState<Set<string>>(new Set());
  const [isBulkUpdateOpen, setIsBulkUpdateOpen] = useState(false);
  const [bulkDate, setBulkDate] = useState('');
  const [isBulkAddOpen, setIsBulkAddOpen] = useState(false);
  const [bulkAddText, setBulkAddText] = useState('');

  // Sadece bu firmanın çalışanlarını filtrele
  const firmEmployees = useMemo(() => employees.filter(e => e.firmaId === targetFirm.id), [employees, targetFirm.id]);

  // --- ONAY YETKİSİ KONTROLÜ ---
  const canApprove = useMemo(() => {
      if (!currentUser) return false;
      if (currentUser.role === 'ADMIN') return true;
      if (currentUser.role === 'SECRETARY') return false;
      return currentUser.allowedFirmIds?.includes(targetFirm.id) || false;
  }, [currentUser, targetFirm.id]);

  const stats = useMemo(() => {
      const activeEmps = firmEmployees.filter(e => (e.calismaDurumu || 'AKTIF') === 'AKTIF');
      const total = activeEmps.length;
      let expired = 0;
      let approaching = 0;
      let pending = 0;

      activeEmps.forEach(e => {
          if (e.onayDurumu === 'BEKLIYOR') pending++;
          else if (isExpired(e.sonrakiEgitimTarihi)) expired++;
          else if (isApproaching(e.sonrakiEgitimTarihi)) approaching++;
      });
      return { total, expired, approaching, valid: total - expired - approaching - pending, pending };
  }, [firmEmployees]);

  const filteredEmployees = useMemo(() => {
    let data = firmEmployees
      .filter(e => {
        const status = e.calismaDurumu || 'AKTIF';
        if (viewMode === 'ACTIVE') return status === 'AKTIF';
        return status === 'AYRILDI';
      })
      .filter(e => {
          const term = searchTerm.toLocaleLowerCase('tr-TR');
          return e.adSoyad.toLocaleLowerCase('tr-TR').includes(term) || e.tcNo.includes(term);
      })
      .filter(e => {
          if (filterStatus === 'ALL') return true;
          if (e.onayDurumu === 'BEKLIYOR') return filterStatus === 'PENDING';

          const expired = isExpired(e.sonrakiEgitimTarihi);
          const approaching = isApproaching(e.sonrakiEgitimTarihi);
          
          if (filterStatus === 'EXPIRED') return expired;
          if (filterStatus === 'APPROACHING') return approaching && !expired;
          if (filterStatus === 'VALID') return !expired && !approaching;
          if (filterStatus === 'PENDING') return false;
          return true;
      });

    data.sort((a, b) => {
        if (a.onayDurumu === 'BEKLIYOR' && b.onayDurumu !== 'BEKLIYOR') return -1;
        if (a.onayDurumu !== 'BEKLIYOR' && b.onayDurumu === 'BEKLIYOR') return 1;

        const valA = a[sortKey] || '';
        const valB = b[sortKey] || '';
        if (valA < valB) return sortDir === 'asc' ? -1 : 1;
        if (valA > valB) return sortDir === 'asc' ? 1 : -1;
        return 0;
    });

    return data;
  }, [firmEmployees, viewMode, searchTerm, filterStatus, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
      if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
      else { setSortKey(key); setSortDir('asc'); }
  };

  // --- SAVE LOGIC (TC KONTROLÜ DAHİL) ---
  const handlePreSave = async () => {
    if (isReadOnly) return;
    if (!newEmpName || !newEmpTc) {
        alert("Lütfen İsim ve TC Kimlik No giriniz.");
        return;
    }

    // Eğer düzenleme modundaysak (TC değişmediyse direkt kaydet)
    if (editingId) {
        const currentEmp = employees.find(e => e.id === editingId);
        if (currentEmp && currentEmp.tcNo === newEmpTc) {
             performSave(employees); // Mevcut listeyi kullan
             return;
        }
    }

    // --- GLOBAL TC KONTROLÜ ---
    // Tüm firmalardaki çalışanlar içinde bu TC var mı?
    const existingEmp = employees.find(e => e.tcNo === newEmpTc && e.id !== editingId);

    if (existingEmp) {
        // 1. AYNI FİRMADA MI?
        if (existingEmp.firmaId === targetFirm.id) {
            if ((existingEmp.calismaDurumu || 'AKTIF') === 'AKTIF') {
                alert("Bu TC Kimlik numarasına sahip personel zaten bu firmada AKTİF olarak çalışıyor.");
                return;
            } else {
                // AYNI FIRMA - İŞTEN ÇIKMIŞ (RE-HIRE SENARYOSU)
                handleRehireCheck(existingEmp);
                return;
            }
        } 
        // 2. FARKLI FİRMADA MI?
        else {
            // Firmalar listesini al (Firma adını göstermek için)
            const allData = await StorageService.getAllData();
            const oldFirm = allData.firms.find(f => f.id === existingEmp.firmaId);
            const oldFirmName = oldFirm ? oldFirm.ad : "Bilinmeyen Firma";

            // Kullanıcıya sor ve onayla
            const confirmTransfer = window.confirm(
                `BİLGİ: Bu personel şu anda "${oldFirmName}" firmasında kayıtlı.\n\n` +
                `Transfer işlemini onaylıyor musunuz?\n` + 
                `Onaylarsanız: "${oldFirmName}" firmasındaki kaydı 'İşten Ayrıldı' olarak işaretlenecek ve bu firmaya yeni kayıt açılacaktır.`
            );

            if (confirmTransfer) {
                // --- TRANSFER MANTIĞI ---
                // 1. Eski firmadaki personeli 'AYRILDI' yap ve çıkış tarihi ver
                const todayStr = new Date().toISOString();
                const updatedList = employees.map(e => 
                    e.id === existingEmp.id 
                    ? { ...e, calismaDurumu: 'AYRILDI' as const, cikisTarihi: todayStr } // as const TS hatası önler
                    : e
                );

                // 2. Yeni kaydı oluşturmak için güncellenmiş listeyi gönder
                performSave(updatedList);
            }
            return;
        }
    } else {
        // Hiçbir yerde yok, temiz kayıt
        performSave(employees);
    }
  };

  // --- İŞE GERİ ALIM (RE-HIRE) KONTROLÜ ---
  const handleRehireCheck = (emp: Calisan) => {
      setIsFormOpen(false); // Normal formu kapat

      // İşten çıkış tarihi yoksa bugünü baz al (eski kayıtlar için)
      const exitDate = emp.cikisTarihi ? new Date(emp.cikisTarihi) : new Date(emp.sonEgitimTarihi); // Fallback
      const today = new Date();
      
      // Ay farkını hesapla
      const diffTime = Math.abs(today.getTime() - exitDate.getTime());
      const diffMonths = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30)); 

      if (diffMonths > 6) {
          alert(`Bu personel ${diffMonths} ay önce işten ayrılmış. \n6 ayı geçtiği için YENİDEN EĞİTİM VERİLMESİ ZORUNLUDUR.`);
          // Düzenleme modunu aç ama tarihi temizle ve zorunlu tut
          setEditingId(emp.id);
          setNewEmpName(emp.adSoyad);
          setNewEmpTc(emp.tcNo);
          setNewEmpTrainDate(''); // Tarihi temizle
          setIsFormOpen(true);
      } else {
          // 6 aydan az, kullanıcıya sor
          setRehireEmployee(emp);
          setRehireModalOpen(true);
      }
  };

  // Re-hire Modal: Eğitim verildi
  const handleRehireWithNewTraining = () => {
      if (!rehireEmployee) return;
      setRehireModalOpen(false);
      // Formu aç, yeni tarih girmesini iste
      setEditingId(rehireEmployee.id);
      setNewEmpName(rehireEmployee.adSoyad);
      setNewEmpTc(rehireEmployee.tcNo);
      setNewEmpTrainDate(''); 
      setIsFormOpen(true);
      // Not: Kullanıcı formda tarihi girip kaydet'e basınca performSave çalışacak ve status AKTIF olacak.
  };

  // Re-hire Modal: Eski eğitim geçerli
  const handleRehireWithOldTraining = () => {
      if (!rehireEmployee) return;
      // Doğrudan kaydet
      const nextDate = calculateNextTrainingDate(rehireEmployee.sonEgitimTarihi, targetFirm.tehlikeSinifi);
      const updatedEmp: Calisan = {
          ...rehireEmployee,
          calismaDurumu: 'AKTIF',
          cikisTarihi: undefined, // Çıkış tarihini temizle
          sonrakiEgitimTarihi: nextDate,
          onayDurumu: currentUser?.role === 'SECRETARY' ? 'BEKLIYOR' : 'ONAYLANDI'
      };
      
      onSave(employees.map(e => e.id === rehireEmployee.id ? updatedEmp : e));
      setRehireModalOpen(false);
      setRehireEmployee(null);
      alert("Personel eski eğitim tarihiyle tekrar işe alındı.");
  };

  // performSave artık güncel listeyi parametre olarak alıyor (currentList)
  // Bu sayede transfer işlemi sırasında önce eskiyi çıkarıp sonra yeniyi ekleyebiliyoruz.
  const performSave = (currentList: Calisan[]) => {
    if (!newEmpTrainDate) {
        alert("Eğitim tarihi girilmesi zorunludur.");
        return;
    }
    const nextDate = calculateNextTrainingDate(newEmpTrainDate, targetFirm.tehlikeSinifi);
    const isSecretary = currentUser?.role === 'SECRETARY';

    const newEmp: Calisan = editingId 
        ? { 
            ...currentList.find(e => e.id === editingId)!, 
            tcNo: newEmpTc, 
            adSoyad: newEmpName, 
            sonEgitimTarihi: newEmpTrainDate, 
            sonrakiEgitimTarihi: nextDate,
            calismaDurumu: 'AKTIF', // Düzenleme yapıldığında (veya re-hire'da) aktif olur
            cikisTarihi: undefined // Eğer re-hire ise çıkış tarihini sil
          }
        : { 
            id: crypto.randomUUID(), 
            firmaId: targetFirm.id, 
            tcNo: newEmpTc, 
            adSoyad: newEmpName, 
            sonEgitimTarihi: newEmpTrainDate, 
            sonrakiEgitimTarihi: nextDate, 
            calismaDurumu: 'AKTIF',
            onayDurumu: isSecretary ? 'BEKLIYOR' : 'ONAYLANDI'
          };
    
    // Global listeyi güncelle
    if (editingId) {
        onSave(currentList.map(e => e.id === editingId ? newEmp : e));
    } else {
        onSave([...currentList, newEmp]);
    }

    resetForm();
    if (isSecretary && !editingId) alert('Personel kaydedildi ve onay listesine gönderildi.');
  };

  const handleApprove = (empId: string) => {
      if (isReadOnly) return;
      if (!window.confirm('Bu personeli onaylıyor musunuz?')) return;
      onSave(employees.map(e => e.id === empId ? { ...e, onayDurumu: 'ONAYLANDI' } : e));
  };

  const handleEditClick = (emp: Calisan) => {
      if (isReadOnly) return;
      setEditingId(emp.id); setNewEmpTc(emp.tcNo); setNewEmpName(emp.adSoyad); setNewEmpTrainDate(emp.sonEgitimTarihi); setIsFormOpen(true);
  };

  const handleSoftDelete = (empId: string) => {
      if (isReadOnly) return;
      if (window.confirm('Bu çalışanın İŞ ÇIKIŞINI vermek istiyor musunuz?')) {
          const today = new Date().toISOString();
          onSave(employees.map(e => e.id === empId ? { ...e, calismaDurumu: 'AYRILDI', cikisTarihi: today } : e));
          const newSet = new Set(selectedEmpIds); newSet.delete(empId); setSelectedEmpIds(newSet);
      }
  };

  const handleRestore = (empId: string) => {
      // Arşivden manuel geri alma (Re-hire logic buraya da bağlanabilir ama basit tutuyoruz)
      const emp = employees.find(e => e.id === empId);
      if(emp) handleRehireCheck(emp);
  };

  const resetForm = () => { setIsFormOpen(false); setEditingId(null); setNewEmpName(''); setNewEmpTc(''); setNewEmpTrainDate(''); };

  const toggleSelectAll = () => {
      if (selectedEmpIds.size === filteredEmployees.length && filteredEmployees.length > 0) setSelectedEmpIds(new Set());
      else setSelectedEmpIds(new Set(filteredEmployees.map(e => e.id)));
  };

  const toggleSelect = (id: string) => {
      const newSet = new Set(selectedEmpIds);
      if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
      setSelectedEmpIds(newSet);
  };

  const applyBulkUpdate = () => {
      if (isReadOnly) return;
      if (!bulkDate || selectedEmpIds.size === 0) return;
      const nextDate = calculateNextTrainingDate(bulkDate, targetFirm.tehlikeSinifi);
      onSave(employees.map(emp => selectedEmpIds.has(emp.id) ? { ...emp, sonEgitimTarihi: bulkDate, sonrakiEgitimTarihi: nextDate } : emp));
      setIsBulkUpdateOpen(false); setBulkDate(''); setSelectedEmpIds(new Set());
  };

  const applyBulkAdd = () => {
      if (isReadOnly) return;
      if (!bulkAddText.trim()) return;
      
      const isSecretary = currentUser?.role === 'SECRETARY';
      const status = isSecretary ? 'BEKLIYOR' : 'ONAYLANDI';

      const lines = bulkAddText.split('\n').filter(l => l.trim().length > 0);
      const newEmps: Calisan[] = lines.map(line => {
          const parts = line.split(',').map(p => p.trim());
          if (parts.length >= 3 && parts[2].match(/^\d{4}-\d{2}-\d{2}$/)) {
              return { 
                  id: crypto.randomUUID(), 
                  firmaId: targetFirm.id, 
                  tcNo: parts[0], 
                  adSoyad: parts[1], 
                  sonEgitimTarihi: parts[2], 
                  sonrakiEgitimTarihi: calculateNextTrainingDate(parts[2], targetFirm.tehlikeSinifi), 
                  calismaDurumu: 'AKTIF',
                  onayDurumu: status
              };
          }
          return null;
      }).filter(Boolean) as Calisan[];
      if (newEmps.length > 0) { 
          onSave([...employees, ...newEmps]); 
          setIsBulkAddOpen(false); 
          setBulkAddText(''); 
          if(isSecretary) alert(`${newEmps.length} personel onaya gönderildi.`);
      }
  };

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  const getRandomColor = (name: string) => {
      const colors = ['bg-blue-600', 'bg-emerald-600', 'bg-violet-600', 'bg-amber-600', 'bg-rose-600', 'bg-cyan-600'];
      let hash = 0; for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
      return colors[Math.abs(hash) % colors.length];
  };

  const isAdmin = currentUser?.role === 'ADMIN';

  return (
    <div className="h-full flex flex-col bg-slate-900">
      
      <div className="grid grid-cols-5 gap-4 mb-4 shrink-0 px-1">
          {/* Stats */}
          <div className="bg-slate-800 rounded-lg p-3 border border-slate-700 flex items-center justify-between">
             <div><div className="text-[10px] text-slate-400 font-bold uppercase">Toplam</div><div className="text-xl font-bold text-white">{stats.total}</div></div>
             <i className="fa-solid fa-users text-slate-600 text-xl"></i>
          </div>
          <div className="bg-slate-800 rounded-lg p-3 border border-blue-500/20 flex items-center justify-between">
             <div><div className="text-[10px] text-blue-400 font-bold uppercase">Bekleyen</div><div className="text-xl font-bold text-blue-400">{stats.pending}</div></div>
             <i className="fa-solid fa-clock-rotate-left text-blue-500/50 text-xl"></i>
          </div>
          <div className="bg-slate-800 rounded-lg p-3 border border-emerald-500/20 flex items-center justify-between">
             <div><div className="text-[10px] text-emerald-400 font-bold uppercase">Geçerli</div><div className="text-xl font-bold text-emerald-400">{stats.valid}</div></div>
             <i className="fa-solid fa-check-circle text-emerald-500/50 text-xl"></i>
          </div>
          <div className="bg-slate-800 rounded-lg p-3 border border-amber-500/20 flex items-center justify-between">
             <div><div className="text-[10px] text-amber-400 font-bold uppercase">Yaklaşan</div><div className="text-xl font-bold text-amber-400">{stats.approaching}</div></div>
             <i className="fa-solid fa-hourglass-half text-amber-500/50 text-xl"></i>
          </div>
          <div className="bg-slate-800 rounded-lg p-3 border border-red-500/20 flex items-center justify-between">
             <div><div className="text-[10px] text-red-400 font-bold uppercase">Süresi Dolan</div><div className="text-xl font-bold text-red-400">{stats.expired}</div></div>
             <i className="fa-solid fa-triangle-exclamation text-red-500/50 text-xl"></i>
          </div>
      </div>

      <div className="bg-slate-800 border-b border-slate-700 p-3 flex flex-col md:flex-row gap-3 items-center justify-between sticky top-0 z-20 shadow-md">
          <div className="flex items-center gap-2 w-full md:w-auto flex-1">
             <div className="relative flex-1 max-w-md group">
                <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors"></i>
                <input type="text" placeholder="İsim veya TC No ile ara..." className="w-full bg-slate-900 border border-slate-700 rounded-md pl-9 pr-3 py-2 text-sm text-white focus:border-blue-500 outline-none transition-all" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
             </div>
             <div className="flex bg-slate-900 rounded-md p-1 border border-slate-700">
                <button onClick={() => setViewMode('ACTIVE')} className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${viewMode === 'ACTIVE' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}>Aktif</button>
                <button onClick={() => setViewMode('ARCHIVE')} className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${viewMode === 'ARCHIVE' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}>İşten Ayrılanlar</button>
             </div>
          </div>
          
          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
             <select className="bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-xs text-slate-300 outline-none cursor-pointer hover:bg-slate-800" value={filterStatus} onChange={e => setFilterStatus(e.target.value as FilterStatus)}>
                <option value="ALL">Tüm Kayıtlar</option>
                <option value="PENDING">Onay Bekleyenler</option>
                <option value="EXPIRED">Süresi Dolanlar</option>
                <option value="APPROACHING">Yaklaşanlar</option>
                <option value="VALID">Geçerli Olanlar</option>
             </select>
             
             {!isReadOnly && !isAdmin && (
                 <>
                     {selectedEmpIds.size > 0 ? (
                        <button onClick={() => setIsBulkUpdateOpen(true)} className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-md text-xs font-bold shadow-lg shadow-indigo-500/20 animate-fade-in-down flex items-center gap-2">
                            <i className="fa-solid fa-rotate"></i> <span className="hidden sm:inline">Güncelle ({selectedEmpIds.size})</span>
                        </button>
                     ) : (
                         <>
                            <button onClick={() => setIsBulkAddOpen(true)} className="bg-slate-700 hover:bg-slate-600 text-slate-300 w-9 h-9 flex items-center justify-center rounded-md border border-slate-600" title="CSV Ekle"><i className="fa-solid fa-file-csv"></i></button>
                            <button onClick={() => { resetForm(); setIsFormOpen(true); }} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-md text-xs font-bold shadow-lg shadow-blue-600/20 flex items-center gap-2"><i className="fa-solid fa-plus"></i> <span className="hidden sm:inline">Personel Ekle</span></button>
                         </>
                     )}
                 </>
             )}
          </div>
      </div>

      <div className="grid grid-cols-12 gap-4 px-4 py-2 bg-slate-900 border-b border-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-wider sticky top-[60px] z-10">
          <div className="col-span-1 text-center">Seç</div>
          <div className="col-span-4 cursor-pointer hover:text-blue-400 flex items-center gap-1" onClick={() => handleSort('adSoyad')}>Ad Soyad / TC {sortKey==='adSoyad' && <i className={`fa-solid fa-sort-${sortDir === 'asc' ? 'up' : 'down'}`}></i>}</div>
          <div className="col-span-2 hidden md:block">Son Eğitim</div>
          <div className="col-span-2 cursor-pointer hover:text-blue-400 flex items-center gap-1" onClick={() => handleSort('sonrakiEgitimTarihi')}>Sonraki Eğitim {sortKey==='sonrakiEgitimTarihi' && <i className={`fa-solid fa-sort-${sortDir === 'asc' ? 'up' : 'down'}`}></i>}</div>
          <div className="col-span-3 text-right">İşlemler</div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-900 pb-10">
          
          {filteredEmployees.length > 0 && !isReadOnly && !isAdmin && (
            <div className="px-4 py-1 bg-slate-800/50 border-b border-slate-800 flex items-center gap-2">
                 <input type="checkbox" className="w-3.5 h-3.5 rounded border-slate-600 bg-slate-800 text-blue-500 cursor-pointer" checked={filteredEmployees.length > 0 && selectedEmpIds.size === filteredEmployees.length} onChange={toggleSelectAll} id="selectAllBottom" />
                 <label htmlFor="selectAllBottom" className="text-[10px] text-slate-400 font-bold cursor-pointer select-none">Tümünü Seç ({filteredEmployees.length})</label>
            </div>
          )}

          {filteredEmployees.map((emp, index) => {
              const isPending = emp.onayDurumu === 'BEKLIYOR';
              const isExp = isExpired(emp.sonrakiEgitimTarihi);
              const isApp = isApproaching(emp.sonrakiEgitimTarihi);
              const isSelected = selectedEmpIds.has(emp.id);
              
              let rowBg = index % 2 === 0 ? 'bg-slate-900' : 'bg-slate-850';
              if (isSelected) rowBg = 'bg-blue-900/20';
              else if (isPending) rowBg = 'bg-blue-900/10 border-l-2 border-l-blue-500'; // Pending için özel stil
              else if (isExp && viewMode === 'ACTIVE') rowBg = 'bg-red-900/5';

              return (
                  <div key={emp.id} className={`group grid grid-cols-12 gap-4 px-4 py-3 border-b border-slate-800 items-center hover:bg-slate-800 transition-colors ${rowBg}`}>
                      
                      <div className="col-span-1 flex justify-center items-center">
                          <input 
                            type="checkbox" 
                            disabled={isReadOnly || isAdmin} 
                            className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-500 cursor-pointer opacity-40 group-hover:opacity-100 disabled:opacity-0" 
                            checked={isSelected} 
                            onChange={() => toggleSelect(emp.id)} 
                          />
                      </div>

                      <div className="col-span-4 flex items-center gap-3 overflow-hidden">
                          <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white shadow-sm ${getRandomColor(emp.adSoyad)}`}>
                              {getInitials(emp.adSoyad)}
                          </div>
                          <div className="min-w-0 flex-1">
                              <div className="font-bold text-sm text-slate-200 truncate group-hover:text-blue-400 transition-colors flex items-center gap-2">
                                  {emp.adSoyad}
                                  {isPending && <span className="text-[9px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">Onay Bekliyor</span>}
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                                  <span>{emp.tcNo}</span>
                                  <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                                  <span>ID:{emp.id.substring(0,4)}</span>
                              </div>
                          </div>
                      </div>

                      <div className="col-span-2 hidden md:block text-xs text-slate-500 font-mono">
                          {formatDateTR(emp.sonEgitimTarihi)}
                      </div>

                      <div className="col-span-2">
                          <div className={`text-xs font-mono font-bold ${viewMode === 'ARCHIVE' ? 'text-slate-500 line-through' : isPending ? 'text-blue-300' : isExp ? 'text-red-400' : isApp ? 'text-amber-400' : 'text-emerald-400'}`}>
                              {formatDateTR(emp.sonrakiEgitimTarihi)}
                          </div>
                          {isExp && !isPending && viewMode === 'ACTIVE' && <div className="text-[9px] text-red-500 font-bold uppercase tracking-wider">Süresi Doldu</div>}
                          {viewMode === 'ARCHIVE' && emp.cikisTarihi && <div className="text-[9px] text-slate-500">Çıkış: {formatDateTR(emp.cikisTarihi)}</div>}
                      </div>

                      <div className="col-span-3 flex justify-end items-center gap-2">
                           {/* ONAY BUTONU: Sadece Pending ise ve yetkili kişi ise görünür (Sekreter göremez) */}
                           {isPending && !isReadOnly && canApprove && (
                               <button 
                                onClick={() => handleApprove(emp.id)}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 shadow-lg shadow-emerald-600/20"
                               >
                                   <i className="fa-solid fa-check"></i> Onayla
                               </button>
                           )}

                           {viewMode === 'ACTIVE' && !isPending && (
                               <div className={`w-2 h-2 rounded-full mr-2 ${isExp ? 'bg-red-500 animate-pulse' : isApp ? 'bg-amber-500' : 'bg-emerald-500'}`} title={isExp ? 'Süresi Doldu' : isApp ? 'Yaklaşıyor' : 'Geçerli'}></div>
                           )}

                           {!isReadOnly && !isAdmin && (
                               <div className="flex gap-1">
                                   {viewMode === 'ACTIVE' ? (
                                       <>
                                           <button onClick={() => handleEditClick(emp)} className="w-7 h-7 flex items-center justify-center rounded bg-slate-700 hover:bg-blue-600 text-slate-400 hover:text-white transition-colors" title="Düzenle"><i className="fa-solid fa-pen text-xs"></i></button>
                                           <button onClick={() => handleSoftDelete(emp.id)} className="w-7 h-7 flex items-center justify-center rounded bg-slate-700 hover:bg-red-600 text-slate-400 hover:text-white transition-colors" title="İşten Çıkart (Arşivle)"><i className="fa-solid fa-user-xmark text-xs"></i></button>
                                       </>
                                   ) : (
                                       <button onClick={() => handleRestore(emp.id)} className="w-7 h-7 flex items-center justify-center rounded bg-emerald-600 hover:bg-emerald-500 text-white transition-colors" title="İşe Geri Al"><i className="fa-solid fa-rotate-left text-xs"></i></button>
                                   )}
                               </div>
                           )}
                      </div>
                  </div>
              );
          })}
      </div>

      {isFormOpen && !isReadOnly && !isAdmin && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center backdrop-blur-sm p-4 animate-fade-in-down">
            <div className="bg-slate-800 rounded-lg shadow-2xl border border-slate-700 w-full max-w-md overflow-hidden">
                <div className="bg-slate-900 p-4 border-b border-slate-700 flex justify-between items-center">
                    <h3 className="font-bold text-white text-sm">{editingId ? 'Personel Düzenle' : 'Yeni Personel'}</h3>
                    <button onClick={resetForm} className="text-slate-400 hover:text-white"><i className="fa-solid fa-xmark"></i></button>
                </div>
                <div className="p-6 space-y-4">
                    <div><label className="block text-xs font-bold text-slate-500 mb-1">Ad Soyad</label><input type="text" className="w-full bg-slate-900 border border-slate-600 rounded p-2.5 text-sm text-white focus:border-blue-500 outline-none" value={newEmpName} onChange={e => setNewEmpName(e.target.value)} autoFocus /></div>
                    <div><label className="block text-xs font-bold text-slate-500 mb-1">TC Kimlik</label><input type="text" maxLength={11} className="w-full bg-slate-900 border border-slate-600 rounded p-2.5 text-sm text-white focus:border-blue-500 outline-none font-mono" value={newEmpTc} onChange={e => setNewEmpTc(e.target.value)} /></div>
                    <div><label className="block text-xs font-bold text-slate-500 mb-1">Son Eğitim Tarihi</label><input type="date" className="w-full bg-slate-900 border border-slate-600 rounded p-2.5 text-sm text-white focus:border-blue-500 outline-none" value={newEmpTrainDate} onChange={e => setNewEmpTrainDate(e.target.value)} /></div>
                    
                    {currentUser?.role === 'SECRETARY' && (
                        <div className="p-3 bg-blue-900/20 border border-blue-800/50 rounded text-xs text-blue-300">
                            <i className="fa-solid fa-circle-info mr-1"></i>
                            Eklediğiniz personel onaya düşecektir.
                        </div>
                    )}
                </div>
                <div className="p-4 bg-slate-900 border-t border-slate-700 flex justify-end gap-3">
                    <button onClick={resetForm} className="px-3 py-1.5 text-slate-400 hover:text-white text-xs font-bold">İptal</button>
                    <button onClick={handlePreSave} className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold shadow-lg shadow-blue-600/20">Kaydet</button>
                </div>
            </div>
        </div>
      )}

      {/* RE-HIRE MODAL (İşe Geri Alım - 6 Ay Kontrolü) */}
      {rehireModalOpen && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center backdrop-blur-sm p-4 animate-fade-in-down">
              <div className="bg-slate-800 rounded-lg shadow-2xl border border-slate-700 w-full max-w-sm">
                  <div className="p-6 text-center">
                      <div className="w-16 h-16 bg-blue-600/20 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
                          <i className="fa-solid fa-rotate-left"></i>
                      </div>
                      <h3 className="text-lg font-bold text-white mb-2">İşe Geri Alım</h3>
                      <p className="text-sm text-slate-300 mb-6">
                          Bu personel 6 aydan kısa süre önce işten ayrılmış. <br/>
                          <span className="text-yellow-400 font-bold">Yeniden eğitim verildi mi?</span>
                      </p>
                      
                      <div className="flex flex-col gap-3">
                          <button onClick={handleRehireWithNewTraining} className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-600/20">
                              Evet, Yeni Eğitim Verildi
                          </button>
                          <button onClick={handleRehireWithOldTraining} className="w-full py-3 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-bold text-sm">
                              Hayır, Eski Eğitim Geçerli
                          </button>
                          <button onClick={() => setRehireModalOpen(false)} className="mt-2 text-xs text-slate-500 hover:text-white">
                              İptal
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {isBulkUpdateOpen && !isReadOnly && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
               <div className="bg-slate-800 rounded-lg p-5 w-full max-w-sm border border-slate-700">
                    <h3 className="font-bold text-white mb-4 text-sm">Toplu Eğitim Güncelleme</h3>
                    <input type="date" className="w-full bg-slate-900 border border-slate-600 rounded p-2.5 text-white mb-4 text-sm" value={bulkDate} onChange={e => setBulkDate(e.target.value)} />
                    <div className="flex justify-end gap-2"><button onClick={() => setIsBulkUpdateOpen(false)} className="px-3 py-1.5 text-slate-400 text-xs font-bold">İptal</button><button onClick={applyBulkUpdate} className="px-3 py-1.5 bg-indigo-600 text-white rounded text-xs font-bold">Güncelle</button></div>
               </div>
          </div>
      )}
      
      {isBulkAddOpen && !isReadOnly && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
               <div className="bg-slate-800 rounded-lg p-5 w-full max-w-lg border border-slate-700">
                    <h3 className="font-bold text-white mb-2 text-sm">Toplu Ekle (CSV)</h3>
                    <p className="text-xs text-slate-500 mb-4">Format: TC, Ad Soyad, YYYY-AA-GG</p>
                    <textarea className="w-full bg-slate-900 border border-slate-600 rounded p-3 text-white h-40 font-mono text-xs mb-4" value={bulkAddText} onChange={e => setBulkAddText(e.target.value)}></textarea>
                    <div className="flex justify-end gap-2"><button onClick={() => setIsBulkAddOpen(false)} className="px-3 py-1.5 text-slate-400 text-xs font-bold">İptal</button><button onClick={applyBulkAdd} className="px-3 py-1.5 bg-green-600 text-white rounded text-xs font-bold">Ekle</button></div>
               </div>
          </div>
      )}
    </div>
  );
};
