
import React, { useState, useMemo } from 'react';
import { Firma, TehlikeSinifi } from '../types';

interface FirmsProps {
  data: Firma[];
  onSave: (firms: Firma[]) => void;
  onDelete: (id: string) => void;
  onSelect: (firmId: string) => void;
  isReadOnly?: boolean;
  canManage?: boolean; // Firma Ekleme/Silme Yetkisi
}

type SortKey = 'ad' | 'tehlikeSinifi' | 'id';
type SortDir = 'asc' | 'desc';

export const Firms: React.FC<FirmsProps> = ({ data, onSave, onDelete, onSelect, isReadOnly = false, canManage = false }) => {
  // UI States
  const [isAdding, setIsAdding] = useState(false);
  const [isBulkAdding, setIsBulkAdding] = useState(false);
  
  // Data States
  const [newFirmName, setNewFirmName] = useState('');
  const [newFirmClass, setNewFirmClass] = useState<TehlikeSinifi>(TehlikeSinifi.AZ_TEHLIKELI);
  const [bulkText, setBulkText] = useState('');
  
  // Filter & Sort States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState<TehlikeSinifi | 'ALL'>('ALL');
  const [sortKey, setSortKey] = useState<SortKey>('ad');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // --- ACTIONS ---
  const handleAdd = () => {
    if (isReadOnly || !canManage) return;
    if (!newFirmName.trim()) return;
    const newFirm: Firma = {
      id: crypto.randomUUID(),
      ad: newFirmName,
      tehlikeSinifi: newFirmClass,
      notlar: ''
    };
    onSave([...data, newFirm]);
    setNewFirmName('');
    setIsAdding(false);
  };

  const handleBulkSave = () => {
    if (isReadOnly || !canManage) return;
    if (!bulkText.trim()) return;
    const lines = bulkText.split('\n').filter(line => line.trim().length > 0);
    const addedFirms: Firma[] = [];
    lines.forEach(line => {
        const parts = line.split(',');
        const name = parts[0].trim();
        let hazardClass = TehlikeSinifi.AZ_TEHLIKELI; 
        if (parts.length > 1) {
            const classStr = parts[1].trim().toLocaleLowerCase('tr-TR');
            if (classStr.includes('çok') || classStr.includes('cok')) hazardClass = TehlikeSinifi.COK_TEHLIKELI;
            else if (classStr.includes('tehlikeli') && !classStr.includes('az')) hazardClass = TehlikeSinifi.TEHLIKELI;
        }
        if (name) addedFirms.push({ id: crypto.randomUUID(), ad: name, tehlikeSinifi: hazardClass, notlar: '' });
    });
    onSave([...data, ...addedFirms]);
    setIsBulkAdding(false);
    setBulkText('');
  };

  const handleSort = (key: SortKey) => {
      if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
      else { setSortKey(key); setSortDir('asc'); }
  };

  // --- LOGIC ---
  const filteredFirms = useMemo(() => {
      let result = data.filter(firm => {
          const term = searchTerm.toLocaleLowerCase('tr-TR');
          const matchesSearch = firm.ad.toLocaleLowerCase('tr-TR').includes(term);
          const matchesFilter = filterClass === 'ALL' || firm.tehlikeSinifi === filterClass;
          return matchesSearch && matchesFilter;
      });

      result.sort((a, b) => {
          const valA = a[sortKey] || '';
          const valB = b[sortKey] || '';
          if (valA < valB) return sortDir === 'asc' ? -1 : 1;
          if (valA > valB) return sortDir === 'asc' ? 1 : -1;
          return 0;
      });

      return result;
  }, [data, searchTerm, filterClass, sortKey, sortDir]);

  const getHazardBadgeColor = (cls: TehlikeSinifi) => {
      switch (cls) {
          case TehlikeSinifi.COK_TEHLIKELI: return 'bg-red-500/10 text-red-400 border-red-500/20';
          case TehlikeSinifi.TEHLIKELI: return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
          case TehlikeSinifi.AZ_TEHLIKELI: return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
          default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
      }
  };

  const getFirmIcon = (cls: TehlikeSinifi) => {
      switch (cls) {
          case TehlikeSinifi.COK_TEHLIKELI: return 'fa-radiation text-red-500';
          case TehlikeSinifi.TEHLIKELI: return 'fa-biohazard text-amber-500';
          default: return 'fa-building text-blue-500';
      }
  };

  return (
    <div className="h-full flex flex-col bg-slate-900">
      
      {/* CONTROL BAR */}
      <div className="bg-slate-800 border-b border-slate-700 p-3 flex flex-col md:flex-row gap-3 items-center justify-between sticky top-0 z-20 shadow-md">
          <div className="flex items-center gap-2 w-full md:w-auto flex-1">
             <div className="relative flex-1 max-w-md group">
                <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors"></i>
                <input type="text" placeholder="Firma adı ile ara..." className="w-full bg-slate-900 border border-slate-700 rounded-md pl-9 pr-3 py-2 text-sm text-white focus:border-blue-500 outline-none transition-all" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
             </div>
             <div className="h-8 w-px bg-slate-700 mx-1 hidden md:block"></div>
             <div className="text-xs text-slate-400 font-mono hidden md:block pt-1">
                TOPLAM: <strong className="text-white">{filteredFirms.length}</strong>
             </div>
          </div>
          
          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
             <select className="bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-xs text-slate-300 outline-none cursor-pointer hover:bg-slate-800 focus:border-blue-500" value={filterClass} onChange={e => setFilterClass(e.target.value as TehlikeSinifi | 'ALL')}>
                  <option value="ALL">Tüm Sınıflar</option>
                  {Object.values(TehlikeSinifi).map(tc => <option key={tc} value={tc}>{tc}</option>)}
             </select>
             
             {/* Sadece Yönetici Firma Ekleyebilir */}
             {!isReadOnly && canManage && (
                 <>
                    <button onClick={() => setIsBulkAdding(true)} className="bg-slate-700 hover:bg-slate-600 text-slate-300 w-9 h-9 flex items-center justify-center rounded-md border border-slate-600" title="Toplu Ekle (CSV)"><i className="fa-solid fa-file-csv"></i></button>
                    <button onClick={() => setIsAdding(true)} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-md text-xs font-bold shadow-lg shadow-blue-600/20 flex items-center gap-2"><i className="fa-solid fa-plus"></i> <span className="hidden sm:inline">Yeni Firma</span></button>
                 </>
             )}
          </div>
      </div>

      {/* LIST HEADER */}
      <div className="grid grid-cols-12 gap-4 px-4 py-2 bg-slate-900 border-b border-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-wider sticky top-[60px] z-10">
          <div className="col-span-6 cursor-pointer hover:text-blue-400 flex items-center gap-1" onClick={() => handleSort('ad')}>Firma Ünvanı {sortKey==='ad' && <i className={`fa-solid fa-sort-${sortDir === 'asc' ? 'up' : 'down'}`}></i>}</div>
          <div className="col-span-3 cursor-pointer hover:text-blue-400 flex items-center gap-1" onClick={() => handleSort('tehlikeSinifi')}>Tehlike Sınıfı {sortKey==='tehlikeSinifi' && <i className={`fa-solid fa-sort-${sortDir === 'asc' ? 'up' : 'down'}`}></i>}</div>
          <div className="col-span-2 hidden md:block">Sistem ID</div>
          <div className="col-span-3 md:col-span-1 text-right">İşlem</div>
      </div>

      {/* SCROLLABLE LIST */}
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-900 pb-10">
          {filteredFirms.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                  <i className="fa-regular fa-building text-4xl mb-3 opacity-50"></i>
                  <p className="text-sm">Kayıtlı firma bulunamadı.</p>
              </div>
          ) : (
              filteredFirms.map((firm, index) => {
                  const badgeColor = getHazardBadgeColor(firm.tehlikeSinifi);
                  const iconClass = getFirmIcon(firm.tehlikeSinifi);
                  const rowBg = index % 2 === 0 ? 'bg-slate-900' : 'bg-slate-850';

                  return (
                      <div key={firm.id} onClick={() => onSelect(firm.id)} className={`group grid grid-cols-12 gap-4 px-4 py-3 border-b border-slate-800 items-center hover:bg-slate-800 transition-colors cursor-pointer ${rowBg}`}>
                          
                          <div className="col-span-6 flex items-center gap-3 overflow-hidden">
                              <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center bg-slate-800 border border-slate-700 group-hover:border-blue-500/50 transition-colors`}>
                                  <i className={`fa-solid ${iconClass} text-xs`}></i>
                              </div>
                              <div className="min-w-0">
                                  <div className="font-bold text-sm text-slate-200 truncate group-hover:text-blue-400 transition-colors">{firm.ad}</div>
                              </div>
                          </div>

                          <div className="col-span-3">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wide whitespace-nowrap ${badgeColor}`}>
                                  {firm.tehlikeSinifi}
                              </span>
                          </div>

                          <div className="col-span-2 hidden md:block text-[10px] text-slate-600 font-mono">
                              {firm.id.substring(0, 8)}...
                          </div>

                          <div className="col-span-3 md:col-span-1 flex justify-end">
                              {/* Sadece Yönetici Silebilir */}
                              {!isReadOnly && canManage && (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onDelete(firm.id); }} 
                                    className="w-7 h-7 flex items-center justify-center rounded bg-slate-700 hover:bg-red-600 text-slate-400 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                                    title="Firmayı Sil"
                                >
                                    <i className="fa-solid fa-trash-can text-xs"></i>
                                </button>
                              )}
                              <i className="fa-solid fa-chevron-right text-slate-600 text-xs ml-2 self-center"></i>
                          </div>
                      </div>
                  );
              })
          )}
      </div>

      {/* MODALS (Only render if not ReadOnly AND canManage) */}
      {!isReadOnly && canManage && isAdding && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center backdrop-blur-sm p-4 animate-fade-in-down">
            <div className="bg-slate-800 rounded-lg shadow-2xl border border-slate-700 w-full max-w-md overflow-hidden">
                <div className="bg-slate-900 p-4 border-b border-slate-700 flex justify-between items-center">
                    <h3 className="font-bold text-white text-sm">Yeni Firma Ekle</h3>
                    <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-white"><i className="fa-solid fa-xmark"></i></button>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Firma Ünvanı</label>
                        <input type="text" className="w-full bg-slate-900 border border-slate-600 rounded p-2.5 text-sm text-white focus:border-blue-500 outline-none" value={newFirmName} onChange={e => setNewFirmName(e.target.value)} autoFocus placeholder="Örn: ABC Lojistik A.Ş." />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Tehlike Sınıfı</label>
                        <select className="w-full bg-slate-900 border border-slate-600 rounded p-2.5 text-sm text-white focus:border-blue-500 outline-none" value={newFirmClass} onChange={e => setNewFirmClass(e.target.value as TehlikeSinifi)}>
                            {Object.values(TehlikeSinifi).map(tc => <option key={tc} value={tc}>{tc}</option>)}
                        </select>
                    </div>
                </div>
                <div className="p-4 bg-slate-900 border-t border-slate-700 flex justify-end gap-3">
                    <button onClick={() => setIsAdding(false)} className="px-3 py-1.5 text-slate-400 hover:text-white text-xs font-bold">İptal</button>
                    <button onClick={handleAdd} className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold shadow-lg shadow-blue-600/20">Kaydet</button>
                </div>
            </div>
        </div>
      )}

      {!isReadOnly && canManage && isBulkAdding && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
              <div className="bg-slate-800 rounded-lg p-5 w-full max-w-lg border border-slate-700 shadow-2xl">
                  <h3 className="font-bold text-white mb-2 text-sm">Toplu Firma Ekle (CSV)</h3>
                  <p className="text-xs text-slate-500 mb-4">Format: Firma Adı, Tehlike Sınıfı (Opsiyonel)</p>
                  <textarea className="w-full bg-slate-900 border border-slate-600 rounded p-3 text-white h-48 font-mono text-xs mb-4 outline-none" placeholder="ABC Lojistik, Tehlikeli&#10;XYZ İnşaat, Çok Tehlikeli" value={bulkText} onChange={e => setBulkText(e.target.value)}></textarea>
                  <div className="flex justify-end gap-2">
                      <button onClick={() => setIsBulkAdding(false)} className="px-3 py-1.5 text-slate-400 text-xs font-bold">İptal</button>
                      <button onClick={handleBulkSave} className="px-4 py-1.5 bg-blue-600 text-white rounded text-xs font-bold">Toplu Ekle</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
