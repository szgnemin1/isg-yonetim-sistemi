
import React, { useState, useEffect, useMemo } from 'react';
import { Firma, Calisan, Ekipman, RiskAnalizi, FirmaNotu, NotOncelik, TehlikeSinifi, KurulToplantisi } from '../types';
import { Employees } from './Employees';
import { Equipments } from './Equipments';
import { RiskAnalysis } from './RiskAnalysis';
import { BoardMeetings } from './BoardMeetings';
import { formatDateTR, isExpired } from '../services/logic';

interface FirmDetailProps {
  firm: Firma;
  employees: Calisan[];
  equipments: Ekipman[];
  risks: RiskAnalizi[];
  meetings?: KurulToplantisi[];
  onBack: () => void;
  onSaveEmployees: (data: Calisan[]) => void;
  onSaveEquipments: (data: Ekipman[]) => void;
  onSaveRisks: (data: RiskAnalizi[]) => void;
  onSaveMeetings?: (data: KurulToplantisi[]) => void;
  onUpdateFirm: (firm: Firma) => void;
  isReadOnly?: boolean;
  canEditFirmInfo?: boolean; // Firma Adı/Sınıfı Değiştirme Yetkisi (Sadece Admin)
}

type TabType = 'EMPLOYEES' | 'RISKS' | 'EQUIPMENTS' | 'MEETINGS' | 'NOTES';

export const FirmDetail: React.FC<FirmDetailProps> = ({ 
    firm, employees, equipments, risks, meetings = [],
    onBack, onSaveEmployees, onSaveEquipments, onSaveRisks, onSaveMeetings, onUpdateFirm, 
    isReadOnly = false, canEditFirmInfo = false
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('EMPLOYEES');
  
  // Not Sistemi State'leri
  const [notes, setNotes] = useState<FirmaNotu[]>([]);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNotePriority, setNewNotePriority] = useState<NotOncelik>('ORTA');

  // Firma Düzenleme State'leri
  const [isEditingFirm, setIsEditingFirm] = useState(false);
  const [editFirmName, setEditFirmName] = useState(firm.ad);
  const [editFirmClass, setEditFirmClass] = useState(firm.tehlikeSinifi);

  const riskStatus = useMemo(() => {
      const firmRisks = risks.filter(r => r.firmaId === firm.id);
      const riskRecord = firmRisks[0];
      return !riskRecord ? 'MISSING' : isExpired(riskRecord.gecerlilikTarihi) ? 'EXPIRED' : 'VALID';
  }, [firm.id, risks]);

  useEffect(() => {
    let currentNotes = firm.gelismisNotlar || [];
    if (firm.notlar && (!firm.gelismisNotlar || firm.gelismisNotlar.length === 0)) {
        const legacyNote: FirmaNotu = { id: crypto.randomUUID(), baslik: 'Genel Not', icerik: firm.notlar, tarih: new Date().toISOString(), oncelik: 'DUSUK' };
        currentNotes = [legacyNote];
        onUpdateFirm({ ...firm, notlar: '', gelismisNotlar: currentNotes });
    }
    setNotes(currentNotes.sort((a, b) => new Date(b.tarih).getTime() - new Date(a.tarih).getTime()));
    setEditFirmName(firm.ad);
    setEditFirmClass(firm.tehlikeSinifi);
  }, [firm.id, firm.ad, firm.tehlikeSinifi]);

  const handleSaveFirmEdit = () => {
      if(isReadOnly || !canEditFirmInfo) return;
      if(!editFirmName.trim()) return;
      onUpdateFirm({ ...firm, ad: editFirmName, tehlikeSinifi: editFirmClass });
      setIsEditingFirm(false);
  };

  const handleAddNote = () => {
      if (isReadOnly) return; // Kullanıcı not ekleyebilir (isReadOnly false ise)
      if (!newNoteTitle.trim() || !newNoteContent.trim()) return;
      const newNote: FirmaNotu = { id: crypto.randomUUID(), baslik: newNoteTitle, icerik: newNoteContent, tarih: new Date().toISOString(), oncelik: newNotePriority };
      const updatedNotes = [newNote, ...notes];
      setNotes(updatedNotes);
      onUpdateFirm({ ...firm, gelismisNotlar: updatedNotes });
      setNewNoteTitle(''); setNewNoteContent(''); setNewNotePriority('ORTA'); setIsAddingNote(false);
  };

  const handleDeleteNote = (noteId: string) => {
      if (isReadOnly) return;
      if (!window.confirm('Notu silmek istediğinize emin misiniz?')) return;
      const updatedNotes = notes.filter(n => n.id !== noteId);
      setNotes(updatedNotes);
      onUpdateFirm({ ...firm, gelismisNotlar: updatedNotes });
  };

  const getPriorityColor = (p: NotOncelik) => {
      switch(p) {
          case 'YUKSEK': return 'bg-red-500';
          case 'ORTA': return 'bg-amber-500';
          case 'DUSUK': return 'bg-blue-500';
      }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100 overflow-hidden">
      
      {/* HEADER */}
      <div className="bg-slate-800 border-b border-slate-700 px-4 py-2 shrink-0 flex items-center justify-between shadow-md z-20">
          <div className="flex items-center gap-3 overflow-hidden">
              <button onClick={onBack} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white transition-colors flex-shrink-0" title="Geri Dön">
                  <i className="fa-solid fa-arrow-left"></i>
              </button>

              {isEditingFirm ? (
                  <div className="flex items-center gap-2 animate-fade-in-down">
                        <input type="text" className="bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm text-white focus:border-blue-500 outline-none w-64" value={editFirmName} onChange={e => setEditFirmName(e.target.value)} />
                        <select className="bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm text-white" value={editFirmClass} onChange={e => setEditFirmClass(e.target.value as TehlikeSinifi)}>
                            {Object.values(TehlikeSinifi).map(tc => <option key={tc} value={tc}>{tc}</option>)}
                        </select>
                        <button onClick={handleSaveFirmEdit} className="w-7 h-7 bg-green-600 hover:bg-green-500 text-white rounded flex items-center justify-center"><i className="fa-solid fa-check"></i></button>
                        <button onClick={() => setIsEditingFirm(false)} className="w-7 h-7 bg-slate-600 hover:bg-slate-500 text-white rounded flex items-center justify-center"><i className="fa-solid fa-xmark"></i></button>
                  </div>
              ) : (
                  <div className="flex items-center gap-3 min-w-0">
                      <h1 className="text-lg font-bold text-white truncate max-w-md" title={firm.ad}>{firm.ad}</h1>
                      
                      <div className="flex items-center gap-2 flex-shrink-0">
                           <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wide ${
                                firm.tehlikeSinifi === TehlikeSinifi.COK_TEHLIKELI ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                firm.tehlikeSinifi === TehlikeSinifi.TEHLIKELI ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            }`}>
                                {firm.tehlikeSinifi}
                            </span>
                           
                           <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wide ${
                                riskStatus === 'VALID' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                riskStatus === 'MISSING' ? 'bg-slate-700 text-slate-400 border-slate-600' :
                                'bg-red-500/10 text-red-400 border-red-500/20'
                           }`}>
                                <i className={`fa-solid ${riskStatus === 'VALID' ? 'fa-shield-halved' : 'fa-triangle-exclamation'}`}></i>
                                {riskStatus === 'VALID' ? 'Risk: Güncel' : riskStatus === 'MISSING' ? 'Risk: Yok' : 'Risk: Süresi Doldu'}
                           </span>
                      </div>

                      {/* Sadece Admin ve Impersonation yapmayan kişi düzenleyebilir (veya canEditFirmInfo true ise) */}
                      {!isReadOnly && canEditFirmInfo && (
                          <button onClick={() => setIsEditingFirm(true)} className="text-slate-500 hover:text-blue-400 text-xs transition-colors p-1" title="Düzenle"><i className="fa-solid fa-pen"></i></button>
                      )}
                  </div>
              )}
          </div>

          <div className="flex items-center gap-1 bg-slate-900/50 p-1 rounded-lg border border-slate-700/50">
              <button onClick={() => setActiveTab('EMPLOYEES')} className={`px-3 py-1 text-xs font-bold rounded transition-all ${activeTab === 'EMPLOYEES' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'}`}>
                  Çalışanlar ({employees.filter(e => e.firmaId === firm.id).length})
              </button>
              <button onClick={() => setActiveTab('RISKS')} className={`px-3 py-1 text-xs font-bold rounded transition-all ${activeTab === 'RISKS' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'}`}>
                  Risk Analizi
              </button>
              <button onClick={() => setActiveTab('MEETINGS')} className={`px-3 py-1 text-xs font-bold rounded transition-all ${activeTab === 'MEETINGS' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'}`}>
                  Kurul
              </button>
              <button onClick={() => setActiveTab('EQUIPMENTS')} className={`px-3 py-1 text-xs font-bold rounded transition-all ${activeTab === 'EQUIPMENTS' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'}`}>
                  Ekipman ({equipments.filter(e => e.firmaId === firm.id).length})
              </button>
              <button onClick={() => setActiveTab('NOTES')} className={`px-3 py-1 text-xs font-bold rounded transition-all ${activeTab === 'NOTES' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'}`}>
                  Notlar ({notes.length})
              </button>
          </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-900 p-0">
          {activeTab === 'EMPLOYEES' && <Employees employees={employees} targetFirm={firm} onSave={onSaveEmployees} isReadOnly={isReadOnly} />}
          
          <div className="p-6">
            {activeTab === 'RISKS' && <div className="max-w-4xl mx-auto"><RiskAnalysis data={risks} targetFirm={firm} onSave={onSaveRisks} isReadOnly={isReadOnly} /></div>}
            
            {activeTab === 'MEETINGS' && onSaveMeetings && <div className="max-w-4xl mx-auto"><BoardMeetings data={meetings} targetFirm={firm} onSave={onSaveMeetings} isReadOnly={isReadOnly} /></div>}

            {activeTab === 'EQUIPMENTS' && <Equipments data={equipments} targetFirm={firm} onSave={onSaveEquipments} isReadOnly={isReadOnly} />}
            
            {activeTab === 'NOTES' && (
                <div className="max-w-5xl mx-auto">
                    <div className="flex justify-between items-center mb-4">
                        <p className="text-slate-400 text-sm">Firma ile ilgili notlar.</p>
                        {!isReadOnly && (
                            <button onClick={() => setIsAddingNote(!isAddingNote)} className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded text-xs font-bold transition-colors">
                              {isAddingNote ? 'Vazgeç' : '+ Not Ekle'}
                            </button>
                        )}
                    </div>

                    {isAddingNote && !isReadOnly && (
                        <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 mb-4 animate-fade-in-down">
                            <div className="flex gap-2 mb-2">
                                <input type="text" className="flex-1 bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:border-blue-500 outline-none" placeholder="Not Başlığı" value={newNoteTitle} onChange={e => setNewNoteTitle(e.target.value)} autoFocus />
                                <select className="w-32 bg-slate-900 border border-slate-600 rounded px-2 py-2 text-sm text-white outline-none" value={newNotePriority} onChange={e => setNewNotePriority(e.target.value as NotOncelik)}>
                                    <option value="DUSUK">Düşük</option>
                                    <option value="ORTA">Orta</option>
                                    <option value="YUKSEK">Yüksek</option>
                                </select>
                            </div>
                            <textarea className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:border-blue-500 outline-none resize-none h-20 mb-2" placeholder="İçerik..." value={newNoteContent} onChange={e => setNewNoteContent(e.target.value)}></textarea>
                            <div className="flex justify-end">
                                <button onClick={handleAddNote} className="px-4 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded text-xs font-bold">Kaydet</button>
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        {notes.length === 0 ? (
                            <div className="p-8 text-center border border-dashed border-slate-800 rounded-lg text-slate-600 text-sm">
                                Not yok.
                            </div>
                        ) : (
                            notes.map(note => (
                                <div key={note.id} className="group bg-slate-800 hover:bg-slate-800/80 p-3 rounded border border-slate-700/50 flex gap-3 transition-all relative">
                                    <div className={`w-1 self-stretch rounded-full ${getPriorityColor(note.oncelik)}`}></div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start mb-1">
                                            <h4 className="font-bold text-slate-200 text-sm">{note.baslik}</h4>
                                            <span className="text-[10px] text-slate-500 font-mono bg-slate-900/50 px-1.5 py-0.5 rounded">{formatDateTR(note.tarih)}</span>
                                        </div>
                                        <p className="text-xs text-slate-400 whitespace-pre-wrap">{note.icerik}</p>
                                    </div>
                                    {!isReadOnly && (
                                        <button onClick={() => handleDeleteNote(note.id)} className="text-slate-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all px-2">
                                            <i className="fa-solid fa-trash-can text-xs"></i>
                                        </button>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
          </div>
      </div>
    </div>
  );
};
