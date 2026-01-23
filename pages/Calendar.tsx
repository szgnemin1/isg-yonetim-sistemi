
import React, { useState, useMemo } from 'react';
import { CalendarEvent, Firma, Calisan, Ekipman, RiskAnalizi, TehlikeSinifi, KurulToplantisi } from '../types';
import { isExpired, formatDateTR } from '../services/logic';
import { ReportService } from '../services/reportService';

interface CalendarProps {
  events: CalendarEvent[]; 
  onSave: (events: CalendarEvent[]) => void;
  firms: Firma[];
  employees: Calisan[];
  equipments: Ekipman[];
  risks: RiskAnalizi[];
  meetings?: KurulToplantisi[]; // Yeni
}

interface CalendarItem {
    id: string;
    text: string; 
    detail?: string; 
    date: string;
    status: 'expired' | 'approaching';
}

interface FirmMonthData {
    firmId: string;
    firmName: string;
    hazardClass: TehlikeSinifi;
    trainings: CalendarItem[];
    equipments: CalendarItem[];
    risk: CalendarItem | null;
    meeting: CalendarItem | null; // Yeni
    totalCount: number;
    hasExpired: boolean;
}

export const Calendar: React.FC<CalendarProps> = ({ events, onSave, firms, employees, equipments, risks, meetings = [] }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedFirmData, setSelectedFirmData] = useState<FirmMonthData | null>(null);
  const [loading, setLoading] = useState(false);

  // --- HESAPLAMA MANTIĞI ---
  const monthData = useMemo(() => {
      const dataMap = new Map<string, FirmMonthData>();

      const getFirmEntry = (firmId: string): FirmMonthData => {
          if (!dataMap.has(firmId)) {
              const firm = firms.find(f => f.id === firmId);
              dataMap.set(firmId, {
                  firmId,
                  firmName: firm ? firm.ad : 'Bilinmeyen Firma',
                  hazardClass: firm ? firm.tehlikeSinifi : TehlikeSinifi.AZ_TEHLIKELI,
                  trainings: [],
                  equipments: [],
                  risk: null,
                  meeting: null,
                  totalCount: 0,
                  hasExpired: false
              });
          }
          return dataMap.get(firmId)!;
      };

      const shouldShowItem = (dateStr: string) => {
          if (!dateStr) return false;
          const targetDate = new Date(dateStr);
          const today = new Date();
          
          const isMonthMatch = targetDate.getMonth() === currentDate.getMonth() && 
                               targetDate.getFullYear() === currentDate.getFullYear();
          if (isMonthMatch) return true;

          const isViewingRealCurrentMonth = currentDate.getMonth() === today.getMonth() && 
                                            currentDate.getFullYear() === today.getFullYear();

          if (isViewingRealCurrentMonth && isExpired(dateStr)) return true;
          return false;
      };

      employees.forEach(emp => {
          if (shouldShowItem(emp.sonrakiEgitimTarihi)) {
              const entry = getFirmEntry(emp.firmaId);
              const status = isExpired(emp.sonrakiEgitimTarihi) ? 'expired' : 'approaching';
              entry.trainings.push({ id: emp.id, text: emp.adSoyad, detail: emp.tcNo, date: emp.sonrakiEgitimTarihi, status: status });
              entry.totalCount++;
              if (status === 'expired') entry.hasExpired = true;
          }
      });

      equipments.forEach(eq => {
          if (shouldShowItem(eq.sonrakiKontrolTarihi)) {
              const entry = getFirmEntry(eq.firmaId);
              const status = isExpired(eq.sonrakiKontrolTarihi) ? 'expired' : 'approaching';
              entry.equipments.push({ id: eq.id, text: eq.ad, date: eq.sonrakiKontrolTarihi, status: status });
              entry.totalCount++;
              if (status === 'expired') entry.hasExpired = true;
          }
      });

      risks.forEach(r => {
          if (shouldShowItem(r.gecerlilikTarihi)) {
              const entry = getFirmEntry(r.firmaId);
              const status = isExpired(r.gecerlilikTarihi) ? 'expired' : 'approaching';
              entry.risk = { id: r.id, text: 'Risk Analizi Yenileme', date: r.gecerlilikTarihi, status: status };
              entry.totalCount++;
              if (status === 'expired') entry.hasExpired = true;
          }
      });

      meetings.forEach(m => {
          if (shouldShowItem(m.sonrakiToplantiTarihi)) {
              const entry = getFirmEntry(m.firmaId);
              const status = isExpired(m.sonrakiToplantiTarihi) ? 'expired' : 'approaching';
              entry.meeting = { id: m.id, text: 'Kurul Toplantısı', date: m.sonrakiToplantiTarihi, status: status };
              entry.totalCount++;
              if (status === 'expired') entry.hasExpired = true;
          }
      });

      return Array.from(dataMap.values()).sort((a, b) => {
          if (a.hasExpired && !b.hasExpired) return -1;
          if (!a.hasExpired && b.hasExpired) return 1;
          return a.firmName.localeCompare(b.firmName);
      });

  }, [employees, equipments, risks, meetings, firms, currentDate]);

  const manualEvents = useMemo(() => {
      return events.filter(e => {
          const d = new Date(e.date);
          return d.getMonth() === currentDate.getMonth() && d.getFullYear() === currentDate.getFullYear();
      }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [events, currentDate]);

  const monthNames = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

  const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  // --- PDF RAPOR ---
  const handleDownloadMonthly = async () => {
      setLoading(true);
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();

      const startOfMonth = new Date(year, month, 1);
      const endOfMonth = new Date(year, month + 1, 0); 
      const label = `${monthNames[month]} ${year}`;
      
      await ReportService.generateReport(
          'Aylık Planlama Raporu',
          label,
          startOfMonth,
          endOfMonth,
          { firms, employees, equipments, risks, meetings }
      );
      setLoading(false);
  };

  const handleDownloadWeekly = async () => {
      setLoading(true);
      const today = new Date();
      const day = today.getDay();
      const diff = today.getDate() - day + (day === 0 ? -6 : 1); 
      
      const startOfWeek = new Date(today);
      startOfWeek.setDate(diff);
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);

      const label = `${formatDateTR(startOfWeek.toISOString())} - ${formatDateTR(endOfWeek.toISOString())}`;

      await ReportService.generateReport(
          'Haftalık Planlama Raporu',
          label,
          startOfWeek,
          endOfWeek,
          { firms, employees, equipments, risks, meetings }
      );
      setLoading(false);
  };

  return (
    <div className="p-8 h-full overflow-y-auto flex flex-col bg-slate-900 text-slate-100">
        
        {/* HEADER */}
        <header className="mb-8 flex flex-col xl:flex-row justify-between items-center gap-6 shrink-0 border-b border-slate-800 pb-6">
            <div className="text-center xl:text-left">
                <h2 className="text-3xl font-bold text-white flex items-center justify-center xl:justify-start gap-3">
                    <i className="fa-solid fa-calendar-days text-blue-500"></i>
                    Takvim ve Planlama
                </h2>
                <p className="text-slate-400 mt-1">
                    {currentDate.getMonth() === new Date().getMonth() && currentDate.getFullYear() === new Date().getFullYear() 
                        ? "Bu ayın planlaması ve geçmişten kalan acil işlemler." 
                        : "Seçili ay için planlanan işlemler."}
                </p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-3">
                <button 
                    onClick={handleDownloadWeekly}
                    disabled={loading}
                    className="h-10 px-4 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 hover:text-blue-400 border border-slate-700 rounded-xl flex items-center gap-2 transition-all font-bold text-sm shadow-lg group whitespace-nowrap"
                    title="İçinde bulunulan haftanın raporu"
                >
                    {loading ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-calendar-week text-blue-500 group-hover:scale-110 transition-transform text-lg"></i>}
                    <span>Bu Hafta</span>
                </button>

                <button 
                    onClick={handleDownloadMonthly}
                    disabled={loading}
                    className="h-10 px-4 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 hover:text-red-400 border border-slate-700 rounded-xl flex items-center gap-2 transition-all font-bold text-sm shadow-lg group whitespace-nowrap"
                    title={`${monthNames[currentDate.getMonth()]} Ayı Raporunu İndir`}
                >
                    {loading ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-file-pdf text-red-500 group-hover:scale-110 transition-transform text-lg"></i>}
                    <span>{monthNames[currentDate.getMonth()]} Raporu</span>
                </button>

                <div className="w-px h-8 bg-slate-700 mx-2 hidden sm:block"></div>

                <div className="flex items-center gap-4 bg-slate-800 p-2 rounded-xl shadow-lg border border-slate-700">
                    <button onClick={handlePrevMonth} className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors">
                        <i className="fa-solid fa-chevron-left"></i>
                    </button>
                    <div className="flex flex-col items-center min-w-[120px]">
                        <span className="font-bold text-xl text-white select-none">
                            {monthNames[currentDate.getMonth()]}
                        </span>
                        <span className="text-xs text-slate-500 font-mono">
                            {currentDate.getFullYear()}
                        </span>
                    </div>
                    <button onClick={handleNextMonth} className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors">
                        <i className="fa-solid fa-chevron-right"></i>
                    </button>
                </div>
            </div>
        </header>

        {/* CONTENT */}
        <div className="flex-1">
            
            {/* Özel Notlar */}
            {manualEvents.length > 0 && (
                <div className="mb-8 animate-fade-in-down">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <i className="fa-solid fa-note-sticky text-yellow-500"></i> Kişisel Notlar
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {manualEvents.map((ev, idx) => (
                            <div key={`man-${idx}`} className="bg-yellow-900/10 p-4 rounded-xl border border-yellow-500/20 relative group hover:border-yellow-500/40 transition-colors">
                                <div className="text-xs text-yellow-500/70 mb-2 font-mono flex items-center gap-2">
                                    <i className="fa-regular fa-calendar"></i> {formatDateTR(ev.date)}
                                </div>
                                <div className="font-bold text-yellow-100">{ev.title}</div>
                                {ev.description && <div className="text-xs text-slate-400 mt-1">{ev.description}</div>}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* FİRMA LİSTESİ */}
            {monthData.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
                    {monthData.map((data) => (
                        <div 
                            key={data.firmId} 
                            onClick={() => setSelectedFirmData(data)}
                            className={`
                                relative rounded-xl border overflow-hidden transition-all hover:-translate-y-1 hover:shadow-xl cursor-pointer flex flex-col group h-full
                                ${data.hasExpired 
                                    ? 'bg-slate-800 border-red-500/40 shadow-red-900/10' 
                                    : 'bg-slate-800 border-slate-700 hover:border-blue-500/40'}
                            `}
                        >
                            {data.hasExpired && (
                                <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-red-600 to-red-400"></div>
                            )}

                            <div className="p-5 border-b border-slate-700/50 bg-slate-800/50">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-lg text-white truncate pr-2 w-full group-hover:text-blue-400 transition-colors" title={data.firmName}>
                                        {data.firmName}
                                    </h3>
                                    {data.hasExpired && <i className="fa-solid fa-triangle-exclamation text-red-500 animate-pulse text-lg" title="Süresi dolmuş işlemler var"></i>}
                                </div>
                                <span className={`text-[10px] px-2 py-0.5 rounded border uppercase tracking-wide font-bold ${
                                    data.hazardClass === TehlikeSinifi.COK_TEHLIKELI ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                    data.hazardClass === TehlikeSinifi.TEHLIKELI ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                    'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                }`}>
                                    {data.hazardClass}
                                </span>
                            </div>

                            <div className="p-5 flex-1 flex flex-col justify-center gap-4">
                                {data.risk && (
                                    <div className={`text-xs font-bold px-3 py-2 rounded flex items-center justify-between border ${data.risk.status === 'expired' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                                        <div className="flex items-center gap-2">
                                            <i className="fa-solid fa-file-shield"></i> Risk
                                        </div>
                                        <span>{data.risk.status === 'expired' ? 'SÜRE DOLDU' : 'YENİLE'}</span>
                                    </div>
                                )}
                                
                                {data.meeting && (
                                     <div className={`text-xs font-bold px-3 py-2 rounded flex items-center justify-between border ${data.meeting.status === 'expired' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'}`}>
                                        <div className="flex items-center gap-2">
                                            <i className="fa-solid fa-users-rectangle"></i> Kurul
                                        </div>
                                        <span>{data.meeting.status === 'expired' ? 'SÜRE DOLDU' : 'YAPILACAK'}</span>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-slate-700/30 border border-slate-700/50 rounded p-3 text-center">
                                        <div className="text-2xl font-bold text-white mb-1">{data.trainings.length}</div>
                                        <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                                            <i className="fa-solid fa-helmet-safety mr-1"></i> Eğitim
                                        </div>
                                    </div>
                                    <div className="bg-slate-700/30 border border-slate-700/50 rounded p-3 text-center">
                                        <div className="text-2xl font-bold text-white mb-1">{data.equipments.length}</div>
                                        <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                                            <i className="fa-solid fa-wrench mr-1"></i> Ekipman
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="bg-slate-900/50 p-3 border-t border-slate-700/50 flex justify-center items-center text-xs text-blue-500 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                <span className="font-bold">Detayları Gör</span> <i className="fa-solid fa-chevron-right ml-2 text-[10px]"></i>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center h-96 text-slate-600">
                    <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-4">
                        <i className="fa-regular fa-calendar-check text-4xl opacity-50"></i>
                    </div>
                    <h3 className="text-xl font-bold text-slate-500">Planlanmış İşlem Yok</h3>
                    <p className="text-sm mt-2">
                         {currentDate.getMonth() === new Date().getMonth() && currentDate.getFullYear() === new Date().getFullYear() 
                            ? "Harika! Bu ay için yapılması gereken veya gecikmiş bir işlem bulunmuyor."
                            : `Seçili ay (${monthNames[currentDate.getMonth()]}) için takip edilmesi gereken bir kayıt bulunmuyor.`}
                    </p>
                </div>
            )}
        </div>

        {/* MODAL: Tüm Detayları Göster */}
        {selectedFirmData && (
            <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center backdrop-blur-sm p-4 animate-fade-in-down">
                <div className="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col border border-slate-700">
                    <div className="p-6 border-b border-slate-700 flex justify-between items-start bg-slate-900/50 rounded-t-2xl">
                        <div>
                            <div className="text-xs font-bold text-blue-500 uppercase tracking-wider mb-1">
                                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()} Planı
                            </div>
                            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                                {selectedFirmData.firmName}
                                <span className={`text-xs px-2 py-0.5 rounded border uppercase tracking-wide font-bold ${
                                    selectedFirmData.hazardClass === TehlikeSinifi.COK_TEHLIKELI ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                    selectedFirmData.hazardClass === TehlikeSinifi.TEHLIKELI ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                    'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                }`}>
                                    {selectedFirmData.hazardClass}
                                </span>
                            </h2>
                        </div>
                        <button onClick={() => setSelectedFirmData(null)} className="w-8 h-8 rounded-full bg-slate-700 hover:bg-slate-600 text-slate-400 hover:text-white flex items-center justify-center transition-colors">
                            <i className="fa-solid fa-xmark text-lg"></i>
                        </button>
                    </div>

                    <div className="p-6 overflow-y-auto custom-scrollbar space-y-8 bg-slate-800">
                        {/* 1. RİSK DETAY */}
                        {selectedFirmData.risk && (
                            <div className={`border rounded-xl p-5 flex gap-4 items-center ${
                                selectedFirmData.risk.status === 'expired' 
                                    ? 'bg-red-500/10 border-red-500/20' 
                                    : 'bg-slate-700/20 border-slate-600'
                            }`}>
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl shrink-0 ${
                                    selectedFirmData.risk.status === 'expired' 
                                        ? 'bg-red-500/20 text-red-500' 
                                        : 'bg-blue-500/20 text-blue-500'
                                }`}>
                                    <i className="fa-solid fa-file-shield"></i>
                                </div>
                                <div>
                                    <h4 className={`font-bold text-lg ${
                                        selectedFirmData.risk.status === 'expired' ? 'text-red-400' : 'text-blue-400'
                                    }`}>
                                        {selectedFirmData.risk.status === 'expired' ? 'Risk Analizi Süresi Doldu' : 'Risk Analizi Yenileme'}
                                    </h4>
                                    <p className="text-sm text-slate-300 mt-1">
                                        Bu firmanın risk analizi geçerlilik süresi <strong className="text-white">{formatDateTR(selectedFirmData.risk.date)}</strong> tarihinde dolmaktadır.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* 2. KURUL DETAY */}
                        {selectedFirmData.meeting && (
                            <div className={`border rounded-xl p-5 flex gap-4 items-center ${
                                selectedFirmData.meeting.status === 'expired' 
                                    ? 'bg-red-500/10 border-red-500/20' 
                                    : 'bg-slate-700/20 border-slate-600'
                            }`}>
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl shrink-0 ${
                                    selectedFirmData.meeting.status === 'expired' 
                                        ? 'bg-red-500/20 text-red-500' 
                                        : 'bg-indigo-500/20 text-indigo-500'
                                }`}>
                                    <i className="fa-solid fa-users-rectangle"></i>
                                </div>
                                <div>
                                    <h4 className={`font-bold text-lg ${
                                        selectedFirmData.meeting.status === 'expired' ? 'text-red-400' : 'text-indigo-400'
                                    }`}>
                                        {selectedFirmData.meeting.status === 'expired' ? 'Kurul Toplantısı Gecikti' : 'Kurul Toplantısı Planla'}
                                    </h4>
                                    <p className="text-sm text-slate-300 mt-1">
                                        Toplantı zamanı: <strong className="text-white">{formatDateTR(selectedFirmData.meeting.date)}</strong>
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* 3. EĞİTİM DETAYLARI */}
                        {selectedFirmData.trainings.length > 0 && (
                            <div>
                                <h3 className="flex items-center gap-2 text-lg font-bold text-white mb-4 border-b border-slate-700 pb-2">
                                    <span className="w-8 h-8 rounded bg-blue-600/20 text-blue-400 flex items-center justify-center text-sm"><i className="fa-solid fa-helmet-safety"></i></span>
                                    Personel Eğitimleri ({selectedFirmData.trainings.length})
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {selectedFirmData.trainings.map((item, idx) => (
                                        <div key={idx} className={`p-3 rounded-lg border flex justify-between items-center ${item.status === 'expired' ? 'bg-red-500/10 border-red-500/30' : 'bg-slate-700/30 border-slate-700'}`}>
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">
                                                    {item.text.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className={`font-bold text-sm ${item.status === 'expired' ? 'text-red-300' : 'text-slate-200'}`}>{item.text}</div>
                                                    <div className="text-xs text-slate-500 font-mono">{item.detail}</div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-xs font-mono text-slate-400">{formatDateTR(item.date)}</div>
                                                {item.status === 'expired' && <div className="text-[10px] font-bold text-red-500 uppercase">Süresi Doldu</div>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 4. EKİPMAN DETAYLARI */}
                        {selectedFirmData.equipments.length > 0 && (
                            <div>
                                <h3 className="flex items-center gap-2 text-lg font-bold text-white mb-4 border-b border-slate-700 pb-2">
                                    <span className="w-8 h-8 rounded bg-purple-600/20 text-purple-400 flex items-center justify-center text-sm"><i className="fa-solid fa-wrench"></i></span>
                                    Ekipman Periyodik Kontrolleri ({selectedFirmData.equipments.length})
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {selectedFirmData.equipments.map((item, idx) => (
                                        <div key={idx} className={`p-3 rounded-lg border flex justify-between items-center ${item.status === 'expired' ? 'bg-red-500/10 border-red-500/30' : 'bg-slate-700/30 border-slate-700'}`}>
                                            <div className="flex items-center gap-3">
                                                 <div className="w-8 h-8 rounded bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">
                                                    <i className="fa-solid fa-gears"></i>
                                                </div>
                                                <div>
                                                    <div className={`font-bold text-sm ${item.status === 'expired' ? 'text-red-300' : 'text-slate-200'}`}>{item.text}</div>
                                                    <div className="text-xs text-slate-500">Periyodik Kontrol</div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-xs font-mono text-slate-400">{formatDateTR(item.date)}</div>
                                                {item.status === 'expired' && <div className="text-[10px] font-bold text-red-500 uppercase">Süresi Doldu</div>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    
                    <div className="p-5 bg-slate-900 border-t border-slate-700 flex justify-end">
                        <button onClick={() => setSelectedFirmData(null)} className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold text-sm transition-colors">
                            Kapat
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
