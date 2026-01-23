
import React, { useState } from 'react';
import { Ekipman, Firma } from '../types';
import { calculateNextEquipmentDate, formatDateTR, isExpired, isApproaching } from '../services/logic';

interface Props {
  data: Ekipman[];
  targetFirm: Firma;
  onSave: (data: Ekipman[]) => void;
  isReadOnly?: boolean;
}

export const Equipments: React.FC<Props> = ({ data, targetFirm, onSave, isReadOnly = false }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [lastDate, setLastDate] = useState('');
  const [period, setPeriod] = useState<number>(12);

  const filteredData = data.filter(e => e.firmaId === targetFirm.id);

  const handleAdd = () => {
    if (isReadOnly) return;
    if (!name || !lastDate) return;
    
    const nextDate = calculateNextEquipmentDate(lastDate, period);
    
    const newEq: Ekipman = {
        id: crypto.randomUUID(),
        firmaId: targetFirm.id,
        ad: name,
        sonKontrolTarihi: lastDate,
        periyotAy: period,
        sonrakiKontrolTarihi: nextDate
    };

    onSave([...data, newEq]);
    setIsAdding(false);
    setName('');
    setLastDate('');
    setPeriod(12);
  };

  return (
    <div className="h-full">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-bold text-slate-200">Ekipman Periyodik Kontrolleri</h3>
        {!isReadOnly && (
            <button 
                onClick={() => setIsAdding(!isAdding)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-sm transition-colors flex items-center gap-2 text-sm">
                <i className="fa-solid fa-plus"></i> Ekipman Ekle
            </button>
        )}
      </div>

      {!isReadOnly && isAdding && (
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm mb-6 animate-fade-in-down">
              <h3 className="font-bold text-slate-200 mb-4 text-sm">Yeni Ekipman</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div className="md:col-span-1">
                      <label className="text-xs font-bold text-slate-400 mb-1 block">Ekipman Adı</label>
                      <input 
                        type="text" 
                        className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                        value={name} 
                        onChange={e => setName(e.target.value)} 
                        placeholder="Örn: Forklift" 
                      />
                  </div>
                  <div>
                      <label className="text-xs font-bold text-slate-400 mb-1 block">Son Kontrol</label>
                      <input 
                        type="date" 
                        className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                        value={lastDate} 
                        onChange={e => setLastDate(e.target.value)} 
                      />
                  </div>
                  <div>
                      <label className="text-xs font-bold text-slate-400 mb-1 block">Periyot (Ay)</label>
                      <input 
                        type="number" 
                        className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                        value={period} 
                        onChange={e => setPeriod(Number(e.target.value))} 
                      />
                  </div>
                  <div className="flex gap-2">
                      <button onClick={handleAdd} className="bg-green-600 text-white p-2 rounded-lg flex-1 hover:bg-green-700 text-sm font-medium">Kaydet</button>
                      <button onClick={() => setIsAdding(false)} className="bg-slate-700 text-slate-300 p-2 rounded-lg hover:bg-slate-600 text-sm font-medium">İptal</button>
                  </div>
              </div>
          </div>
      )}

      <div className="bg-slate-800 rounded-xl shadow-sm border border-slate-700 overflow-hidden transition-colors">
        <table className="w-full text-left">
            <thead className="bg-slate-850 border-b border-slate-700">
                <tr>
                    <th className="px-6 py-4 font-semibold text-slate-400 text-sm">Ekipman</th>
                    <th className="px-6 py-4 font-semibold text-slate-400 text-sm">Son Kontrol</th>
                    <th className="px-6 py-4 font-semibold text-slate-400 text-sm">Periyot</th>
                    <th className="px-6 py-4 font-semibold text-slate-400 text-sm">Sonraki Kontrol</th>
                    <th className="px-6 py-4 text-right"></th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
                {filteredData.map(eq => {
                    const isExp = isExpired(eq.sonrakiKontrolTarihi);
                    const isApp = isApproaching(eq.sonrakiKontrolTarihi);

                    return (
                        <tr key={eq.id} className="hover:bg-slate-750 transition-colors">
                            <td className="px-6 py-4 font-medium text-slate-200">{eq.ad}</td>
                            <td className="px-6 py-4 text-slate-400 text-sm">{formatDateTR(eq.sonKontrolTarihi)}</td>
                            <td className="px-6 py-4 text-slate-400 text-sm">{eq.periyotAy} Ay</td>
                            <td className="px-6 py-4">
                                <span className={`px-2 py-1 rounded text-xs font-bold border ${
                                    isExp ? 'bg-red-900/20 text-red-400 border-red-900/30' :
                                    isApp ? 'bg-amber-900/20 text-amber-400 border-amber-900/30' :
                                    'bg-green-900/20 text-green-400 border-green-900/30'
                                }`}>
                                    {formatDateTR(eq.sonrakiKontrolTarihi)}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                                {!isReadOnly && (
                                    <button 
                                        onClick={() => {
                                            if (window.confirm('Bu ekipman kaydını silmek istediğinize emin misiniz?')) {
                                                onSave(data.filter(item => item.id !== eq.id));
                                            }
                                        }}
                                        className="w-8 h-8 inline-flex items-center justify-center rounded-full text-slate-400 hover:text-white hover:bg-red-500 transition-all">
                                        <i className="fa-solid fa-trash-can text-sm"></i>
                                    </button>
                                )}
                            </td>
                        </tr>
                    );
                })}
                 {filteredData.length === 0 && (
                    <tr>
                        <td colSpan={5} className="p-6 text-center text-slate-500 text-sm">Bu firmaya ait ekipman bulunamadı.</td>
                    </tr>
                )}
            </tbody>
        </table>
      </div>
    </div>
  );
};
        