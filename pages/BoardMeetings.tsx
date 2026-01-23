
import React, { useState, useEffect } from 'react';
import { KurulToplantisi, Firma, TehlikeSinifi } from '../types';
import { calculateNextDateByMonth, formatDateTR, isExpired, isApproaching } from '../services/logic';

interface Props {
  data: KurulToplantisi[];
  targetFirm: Firma;
  onSave: (data: KurulToplantisi[]) => void;
  isReadOnly?: boolean;
}

export const BoardMeetings: React.FC<Props> = ({ data, targetFirm, onSave, isReadOnly = false }) => {
  const [isEditing, setIsEditing] = useState(false);
  
  const meeting = data.find(m => m.firmaId === targetFirm.id);
  
  // Tehlike sınıfına göre varsayılan periyot belirleme
  const getDefaultPeriod = () => {
      if (meeting) return meeting.periyotAy;
      switch(targetFirm.tehlikeSinifi) {
          case TehlikeSinifi.AZ_TEHLIKELI: return 3;
          case TehlikeSinifi.TEHLIKELI: return 2;
          case TehlikeSinifi.COK_TEHLIKELI: return 1;
          default: return 3;
      }
  };

  const [editDate, setEditDate] = useState(meeting?.sonToplantiTarihi || '');
  const [period, setPeriod] = useState<number>(getDefaultPeriod());

  // Tehlike Sınıfına Göre İzin Verilen Periyotlar
  const getAllowedPeriods = () => {
      switch(targetFirm.tehlikeSinifi) {
          case TehlikeSinifi.COK_TEHLIKELI:
              return [1]; // Sadece her ay
          case TehlikeSinifi.TEHLIKELI:
              return [1, 2]; // Her ay veya 2 ayda bir
          case TehlikeSinifi.AZ_TEHLIKELI:
              return [1, 2, 3]; // Her ay, 2 ayda bir veya 3 ayda bir
          default:
              return [1, 2, 3];
      }
  };

  const allowedPeriods = getAllowedPeriods();

  const handleUpdate = () => {
    if (isReadOnly) return;
    if (!editDate) return;

    const nextDate = calculateNextDateByMonth(editDate, period);
    
    let newData;
    if (meeting) {
        // Update existing
        newData = data.map(m => m.id === meeting.id ? { ...m, sonToplantiTarihi: editDate, periyotAy: period, sonrakiToplantiTarihi: nextDate } : m);
    } else {
        // Create new
        const newMeeting: KurulToplantisi = {
            id: crypto.randomUUID(),
            firmaId: targetFirm.id,
            sonToplantiTarihi: editDate,
            periyotAy: period,
            sonrakiToplantiTarihi: nextDate
        };
        newData = [...data, newMeeting];
    }
    
    onSave(newData);
    setIsEditing(false);
  };

  let statusColor = 'bg-slate-700 border-slate-600 text-gray-300';
  let statusText = 'Toplantı Kaydı Yok';
  
  if (meeting) {
      if (isExpired(meeting.sonrakiToplantiTarihi)) {
          statusColor = 'bg-red-900/20 border-red-900/30 text-red-400';
          statusText = 'Toplantı Gecikti';
      } else if (isApproaching(meeting.sonrakiToplantiTarihi, 15)) {
          statusColor = 'bg-amber-900/20 border-amber-900/30 text-amber-400';
          statusText = 'Toplantı Yaklaşıyor';
      } else {
          statusColor = 'bg-green-900/20 border-green-900/30 text-green-400';
          statusText = 'Planlı';
      }
  }

  return (
    <div className="h-full">
      <div className="bg-slate-800 p-8 rounded-xl shadow-sm border border-slate-700 transition-colors">
            <h3 className="font-bold text-slate-200 text-lg mb-4 flex items-center gap-2">
                <i className="fa-solid fa-users-rectangle text-indigo-500"></i> İSG Kurul Toplantısı
            </h3>
            
            <div className="mb-6 grid grid-cols-2 gap-4">
                <div>
                    <div className="text-sm text-slate-400 mb-1">Tehlike Sınıfı</div>
                    <div className="font-semibold text-white">{targetFirm.tehlikeSinifi}</div>
                </div>
                {meeting && (
                    <div>
                         <div className="text-sm text-slate-400 mb-1">Seçilen Periyot</div>
                         <div className="font-semibold text-white">{meeting.periyotAy} Ayda Bir</div>
                    </div>
                )}
            </div>

            <div className="mb-8">
                <div className="text-sm text-slate-400 mb-2">Durum</div>
                {isEditing && !isReadOnly ? (
                    <div className="bg-slate-750 p-4 rounded-lg border border-slate-600 animate-fade-in">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="text-xs font-bold text-slate-400 mb-1 block">Son Toplantı Tarihi</label>
                                <input 
                                    type="date" 
                                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                                    value={editDate} 
                                    onChange={e => setEditDate(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 mb-1 block">Toplantı Sıklığı (Periyot)</label>
                                <select 
                                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={period}
                                    onChange={e => setPeriod(parseInt(e.target.value))}
                                >
                                    {allowedPeriods.map(p => (
                                        <option key={p} value={p}>
                                            {p === 1 ? 'Her Ay (1 Ay)' : `${p} Ayda Bir`}
                                        </option>
                                    ))}
                                </select>
                                <div className="text-[10px] text-slate-500 mt-1">
                                    * Tehlike sınıfına göre izin verilen seçenekler.
                                </div>
                            </div>
                         </div>
                        
                        <div className="flex gap-2">
                            <button 
                                onClick={handleUpdate}
                                className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 font-medium">
                                Kaydet
                            </button>
                            <button 
                                onClick={() => setIsEditing(false)}
                                className="bg-slate-600 text-slate-300 px-3 py-2 rounded-lg text-sm hover:bg-slate-500 font-medium">
                                İptal
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col gap-4">
                         <div className={`p-4 rounded-lg border text-sm font-bold flex items-center gap-3 w-full md:w-auto self-start ${statusColor}`}>
                            <i className={`fa-solid text-xl ${meeting ? (isExpired(meeting.sonrakiToplantiTarihi) ? 'fa-triangle-exclamation' : 'fa-check-circle') : 'fa-circle-question'}`}></i>
                            <div>
                                <div className="uppercase tracking-wider text-xs opacity-80">Sonraki Toplantı</div>
                                <div className="text-lg">{meeting ? formatDateTR(meeting.sonrakiToplantiTarihi) : 'Planlanmadı'}</div>
                            </div>
                        </div>
                        
                        <div className="text-sm font-medium text-slate-300">
                             {statusText}
                        </div>

                        {meeting && (
                             <div className="bg-slate-750 p-3 rounded-lg border border-slate-700 max-w-md">
                                <div className="text-xs text-slate-400">Son Yapılan Toplantı</div>
                                <div className="font-mono font-bold text-slate-200">{formatDateTR(meeting.sonToplantiTarihi)}</div>
                            </div>
                        )}
                       
                        {!isReadOnly && (
                            <button 
                                onClick={() => { setIsEditing(true); setEditDate(meeting?.sonToplantiTarihi || ''); }}
                                className="text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg shadow-sm font-medium text-sm flex items-center gap-2 self-start transition-colors">
                                <i className="fa-solid fa-pen-to-square"></i> {meeting ? 'Toplantı Yapıldı / Düzenle' : 'Toplantı Planla'}
                            </button>
                        )}
                    </div>
                )}
            </div>
            
            <div className="bg-indigo-900/20 p-4 rounded-lg text-sm text-indigo-300 border border-indigo-900/30">
                <i className="fa-solid fa-circle-info mr-2"></i>
                <strong>Yönetmelik:</strong> Çok tehlikeli sınıfta <u>her ay</u>, tehlikeli sınıfta <u>2 ayda bir</u>, az tehlikeli sınıfta <u>3 ayda bir</u> kurul toplanmalıdır. İşveren isterse bu süreleri kısaltabilir (Örn: Her ay).
            </div>
      </div>
    </div>
  );
};
