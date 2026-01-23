
import React, { useState } from 'react';
import { RiskAnalizi, Firma } from '../types';
import { calculateNextRiskDate, formatDateTR, isExpired, isApproaching } from '../services/logic';

interface Props {
  data: RiskAnalizi[];
  targetFirm: Firma;
  onSave: (data: RiskAnalizi[]) => void;
  isReadOnly?: boolean;
}

export const RiskAnalysis: React.FC<Props> = ({ data, targetFirm, onSave, isReadOnly = false }) => {
  const [isEditing, setIsEditing] = useState(false);
  const risk = data.find(r => r.firmaId === targetFirm.id);
  const [editDate, setEditDate] = useState(risk?.sonTarih || '');

  const handleUpdate = () => {
    if (isReadOnly) return;
    if (!editDate) return;

    const nextDate = calculateNextRiskDate(editDate, targetFirm.tehlikeSinifi);
    
    let newData;
    if (risk) {
        // Update existing
        newData = data.map(r => r.id === risk.id ? { ...r, sonTarih: editDate, gecerlilikTarihi: nextDate } : r);
    } else {
        // Create new
        const newRisk: RiskAnalizi = {
            id: crypto.randomUUID(),
            firmaId: targetFirm.id,
            sonTarih: editDate,
            gecerlilikTarihi: nextDate
        };
        newData = [...data, newRisk];
    }
    
    onSave(newData);
    setIsEditing(false);
  };

  let statusColor = 'bg-slate-700 border-slate-600 text-gray-300';
  let statusText = 'Analiz Kaydı Yok';
  
  if (risk) {
      if (isExpired(risk.gecerlilikTarihi)) {
          statusColor = 'bg-red-900/20 border-red-900/30 text-red-400';
          statusText = 'Süresi Dolmuş';
      } else if (isApproaching(risk.gecerlilikTarihi)) {
          statusColor = 'bg-amber-900/20 border-amber-900/30 text-amber-400';
          statusText = 'Yenileme Yaklaşıyor';
      } else {
          statusColor = 'bg-green-900/20 border-green-900/30 text-green-400';
          statusText = 'Geçerli';
      }
  }

  return (
    <div className="h-full">
      <div className="bg-slate-800 p-8 rounded-xl shadow-sm border border-slate-700 transition-colors">
            <h3 className="font-bold text-slate-200 text-lg mb-4">Risk Analizi Durumu</h3>
            
            <div className="mb-6">
                <div className="text-sm text-slate-400 mb-1">Tehlike Sınıfı</div>
                <div className="font-semibold text-white">{targetFirm.tehlikeSinifi}</div>
            </div>

            <div className="mb-8">
                <div className="text-sm text-slate-400 mb-2">Mevcut Durum</div>
                {isEditing && !isReadOnly ? (
                    <div className="flex items-center gap-2 animate-fade-in bg-slate-750 p-4 rounded-lg border border-slate-600">
                        <label className="text-sm font-bold text-slate-300">Yeni Analiz Tarihi:</label>
                        <input 
                            type="date" 
                            className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                            value={editDate} 
                            onChange={e => setEditDate(e.target.value)}
                        />
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
                ) : (
                    <div className="flex flex-col gap-4">
                         <div className={`p-4 rounded-lg border text-sm font-bold flex items-center gap-3 w-full md:w-auto self-start ${statusColor}`}>
                            <i className={`fa-solid text-xl ${risk ? (isExpired(risk.gecerlilikTarihi) ? 'fa-triangle-exclamation' : 'fa-check-circle') : 'fa-circle-question'}`}></i>
                            <div>
                                <div className="uppercase tracking-wider text-xs opacity-80">Durum</div>
                                <div className="text-lg">{statusText}</div>
                            </div>
                        </div>

                        {risk && (
                             <div className="grid grid-cols-2 gap-4 max-w-md">
                                <div className="bg-slate-750 p-3 rounded-lg border border-slate-700">
                                    <div className="text-xs text-slate-400">Son Yapılan</div>
                                    <div className="font-mono font-bold text-slate-200">{formatDateTR(risk.sonTarih)}</div>
                                </div>
                                <div className="bg-slate-750 p-3 rounded-lg border border-slate-700">
                                    <div className="text-xs text-slate-400">Geçerlilik</div>
                                    <div className="font-mono font-bold text-slate-200">{formatDateTR(risk.gecerlilikTarihi)}</div>
                                </div>
                            </div>
                        )}
                       
                        {!isReadOnly && (
                            <button 
                                onClick={() => { setIsEditing(true); setEditDate(risk?.sonTarih || ''); }}
                                className="text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg shadow-sm font-medium text-sm flex items-center gap-2 self-start transition-colors">
                                <i className="fa-solid fa-pen-to-square"></i> {risk ? 'Tarihi Güncelle' : 'Analiz Ekle'}
                            </button>
                        )}
                    </div>
                )}
            </div>
            
            <div className="bg-blue-900/20 p-4 rounded-lg text-sm text-blue-300 border border-blue-900/30">
                <i className="fa-solid fa-info-circle mr-2"></i>
                Risk analizi geçerlilik süresi tehlike sınıfına göre otomatik hesaplanır.
            </div>
      </div>
    </div>
  );
};
        