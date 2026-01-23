
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { Dashboard } from './pages/Dashboard';
import { Firms } from './pages/Firms';
import { FirmDetail } from './pages/FirmDetail';
import { Calendar } from './pages/Calendar';
import { Settings } from './pages/Settings';
import { Users } from './pages/Users';
import { Reports } from './pages/Reports';
import { Page, Firma, Calisan, RiskAnalizi, Ekipman, CalendarEvent, User, KurulToplantisi, SpecialDay } from './types';
import { StorageService } from './services/storage';
import { isExpired, isApproaching } from './services/logic';
import { ReportService } from './services/reportService';

// ÖZEL GÜNLER VERİ SETİ
const SPECIAL_DAYS: SpecialDay[] = [
    {
        id: '29_EKIM',
        date: { month: 9, day: 29 }, // Ekim = 9
        title: '29 EKİM CUMHURİYET BAYRAMI',
        message: 'Türk milletinin karakterine en uygun idare, Cumhuriyettir. Cumhuriyetimizin yeni yaşı kutlu olsun! İzindeyiz Başbuğum!',
        theme: 'RED',
        icon: 'fa-star-and-crescent' // Ayyıldız
    },
    {
        id: '30_AGUSTOS',
        date: { month: 7, day: 30 }, // Ağustos = 7
        title: '30 AĞUSTOS ZAFER BAYRAMI',
        message: 'Süngülerle yazılan destan, Başkomutanlık Meydan Muharebesi! Zaferimiz kutlu, kılıcımız keskin olsun.',
        theme: 'RED',
        icon: 'fa-medal' // Zafer Madalyası
    },
    {
        id: '19_MAYIS',
        date: { month: 4, day: 19 }, // Mayıs = 4
        title: '19 MAYIS ATATÜRK\'Ü ANMA GENÇLİK VE SPOR BAYRAMI',
        message: 'O gün bir güneş doğdu Samsun’dan! Türk gençliği, emanetin bekçisidir.',
        theme: 'RED',
        icon: 'fa-fire' // Meşale
    },
    {
        id: '3_MAYIS',
        date: { month: 4, day: 3 }, // Mayıs = 4
        title: '3 MAYIS TÜRKÇÜLÜK GÜNÜ',
        message: 'Türkçülük bayrağını yükseltenlere selam olsun! 3 Mayıs Türkçüler Günü kutlu olsun. Tanrı Türk\'ü Korusun ve Yüceltsin!',
        theme: 'TURQUOISE',
        icon: 'fa-mountain', // Ergenekon / Dağ simgesi
        audio: 'https://files.catbox.moe/flf283.mp3', // Kürşat Marşı Enstrümantal
        // Alternatif Bozkurt Görseli (Unsplash - Yüksek Kalite)
        backgroundImage: 'https://images.unsplash.com/photo-1547844153-acb75d96a794?q=80&w=2670&auto=format&fit=crop'
    }
];

const App: React.FC = () => {
  // Auth State
  const [currentUser, setCurrentUser] = useState<User>({
      id: 'root-admin',
      username: 'admin',
      role: 'ADMIN',
      adSoyad: 'Sistem Yöneticisi'
  });
  
  const [impersonatedUser, setImpersonatedUser] = useState<User | null>(null);
  const [activePage, setActivePage] = useState<Page>('DASHBOARD');
  const [selectedFirmId, setSelectedFirmId] = useState<string | null>(null);
  
  const [firms, setFirms] = useState<Firma[]>([]);
  const [employees, setEmployees] = useState<Calisan[]>([]);
  const [risks, setRisks] = useState<RiskAnalizi[]>([]);
  const [meetings, setMeetings] = useState<KurulToplantisi[]>([]);
  const [equipments, setEquipments] = useState<Ekipman[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string>('');
  
  // Günlük Uyarı State
  const [dailyAlert, setDailyAlert] = useState<{show: boolean, empCount: number, eqCount: number, mtgCount: number} | null>(null);
  
  // Anma ve Özel Gün State'leri
  const [showMemorial, setShowMemorial] = useState(false); // 10 Kasım
  const [activeSpecialDay, setActiveSpecialDay] = useState<SpecialDay | null>(null); // Diğer Bayramlar
  
  const [isMuted, setIsMuted] = useState(false); // Ortak Ses kontrolü
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
      const initData = async () => {
          await loadData();
      };
      initData();
      
      // Force Dark Mode
      document.documentElement.classList.add('dark');
      localStorage.setItem('isg_theme', 'dark');

      const today = new Date();
      const m = today.getMonth();
      const d = today.getDate();

      // 10 KASIM KONTROLÜ
      if (m === 10 && d === 10) {
          setShowMemorial(true);
      } else {
          // DİĞER ÖZEL GÜNLER KONTROLÜ
          const special = SPECIAL_DAYS.find(s => s.date.month === m && s.date.day === d);
          if (special) {
              setActiveSpecialDay(special);
          }
      }

  }, []);

  // ORTAK SES KONTROLÜ (Hem 10 Kasım Hem Diğer Günler İçin)
  // Hangi ekran açıksa ve o ekranda ses varsa onu oynatır.
  useEffect(() => {
    if (audioRef.current) {
        audioRef.current.muted = isMuted;
        
        const shouldPlay = (showMemorial) || (activeSpecialDay && activeSpecialDay.audio);
        
        if (shouldPlay && !isMuted) {
            audioRef.current.play().catch(e => console.log("Otomatik oynatma engellendi:", e));
        } else {
            audioRef.current.pause();
        }
    }
  }, [isMuted, showMemorial, activeSpecialDay]);

  // --- GÜNLÜK AÇILIŞ UYARISI MANTIĞI ---
  useEffect(() => {
      if (!loaded) return;
      
      const checkDailyAlert = () => {
          const todayStr = new Date().toDateString(); // "Fri Mar 15 2024" formatı (Gün hassasiyeti)
          const lastAlert = StorageService.getLastAlertDate();

          // Eğer bugün uyarı gösterilmediyse
          if (lastAlert !== todayStr) {
              let empCount = 0;
              let eqCount = 0;
              let mtgCount = 0;

              // Süresi dolmuş VEYA bugün dolanları say
              employees.forEach(e => {
                  if (e.calismaDurumu !== 'AYRILDI' && e.onayDurumu !== 'BEKLIYOR') {
                      if (isExpired(e.sonrakiEgitimTarihi) || e.sonrakiEgitimTarihi === new Date().toISOString().split('T')[0]) {
                          empCount++;
                      }
                  }
              });

              equipments.forEach(eq => {
                   if (isExpired(eq.sonrakiKontrolTarihi) || eq.sonrakiKontrolTarihi === new Date().toISOString().split('T')[0]) {
                          eqCount++;
                   }
              });

              meetings.forEach(m => {
                  if(isExpired(m.sonrakiToplantiTarihi) || m.sonrakiToplantiTarihi === new Date().toISOString().split('T')[0]) {
                      mtgCount++;
                  }
              });

              // Eğer herhangi bir uyarı varsa Modal'ı tetikle
              if (empCount > 0 || eqCount > 0 || mtgCount > 0) {
                  setDailyAlert({ show: true, empCount, eqCount, mtgCount });
                  StorageService.setLastAlertDate(todayStr);
              }
          }
      };

      // Eğer 10 Kasım veya Özel Gün ekranı açıksa günlük uyarıyı gösterme
      if (!showMemorial && !activeSpecialDay) {
        checkDailyAlert();
      }
  }, [loaded, employees, equipments, meetings, showMemorial, activeSpecialDay]);

  // --- OTOMATİK RAPORLAMA ZAMANLAYICISI ---
  useEffect(() => {
      if (!loaded) return;

      const timer = setInterval(() => {
          const settings = StorageService.getSettings();
          const now = new Date();
          const currentDay = now.getDay(); // 0-6
          const currentTime = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
          
          if (currentDay === settings.autoReportDay && currentTime === settings.autoReportTime) {
               const lastRunKey = `auto_report_run_${now.toDateString()}_${settings.autoReportTime}`;
               if (!localStorage.getItem(lastRunKey)) {
                   console.log("Otomatik rapor tetikleniyor...");
                   ReportService.printNextWeekPlan({ firms, employees, equipments, risks, meetings });
                   localStorage.setItem(lastRunKey, 'true');
               }
          }
      }, 30000); 

      return () => clearInterval(timer);
  }, [loaded, firms, employees, equipments, risks, meetings]);

  const loadData = async () => {
      try {
          setLoadError('');
          // Önce mevcut veriyi çek
          let data = await StorageService.getAllData();
          
          setFirms(data.firms || []);
          setEmployees(data.employees || []);
          setEquipments(data.equipments || []);
          setRisks(data.risks || []);
          setMeetings(data.meetings || []);
          setEvents(data.events || []);
      } catch (err: any) {
          console.error("Veri yüklenemedi:", err);
          setLoadError('Veri yüklenirken hata oluştu.');
      } finally {
          setLoaded(true);
      }
  };

  const handleImpersonate = (targetUser: User) => {
      setImpersonatedUser(targetUser);
      setActivePage('DASHBOARD');
      setSelectedFirmId(null);
  };

  const exitImpersonation = () => {
      setImpersonatedUser(null);
      setActivePage('USERS');
  };

  const activeUserForView = impersonatedUser || currentUser;
  const isReadOnly = !!impersonatedUser;
  const canManageFirms = currentUser?.role === 'ADMIN' && !impersonatedUser;
  const canViewAllFirms = activeUserForView?.role === 'ADMIN' || activeUserForView?.role === 'SECRETARY';

  const visibleFirms = useMemo(() => {
      if (!activeUserForView) return [];
      if (canViewAllFirms) return firms;
      const allowed = activeUserForView.allowedFirmIds || [];
      return firms.filter(f => allowed.includes(f.id));
  }, [firms, activeUserForView, impersonatedUser, canViewAllFirms]);

  const saveFirms = async (data: Firma[]) => {
    if (isReadOnly) return; 
    setFirms(data);
    await StorageService.saveFirms(data);
  };

  const updateFirm = async (updatedFirm: Firma) => {
    if (isReadOnly) return;
    const newData = firms.map(f => f.id === updatedFirm.id ? updatedFirm : f);
    setFirms(newData);
    await StorageService.saveFirms(newData);
  };

  const handleDeleteFirm = async (firmId: string) => {
    if (isReadOnly || !canManageFirms) return;
    if (!window.confirm('Bu firmayı ve ilişkili tüm kayıtları silmek istediğinize emin misiniz?')) return;

    const newFirms = firms.filter(f => f.id !== firmId);
    setFirms(newFirms);
    await StorageService.saveFirms(newFirms);

    const newEmps = employees.filter(e => e.firmaId !== firmId);
    setEmployees(newEmps);
    await StorageService.saveEmployees(newEmps);

    const newEqs = equipments.filter(e => e.firmaId !== firmId);
    setEquipments(newEqs);
    await StorageService.saveEquipments(newEqs);

    const newRisks = risks.filter(r => r.firmaId !== firmId);
    setRisks(newRisks);
    await StorageService.saveRisks(newRisks);

    const newMtgs = meetings.filter(m => m.firmaId !== firmId);
    setMeetings(newMtgs);
    await StorageService.saveMeetings(newMtgs);

    if (selectedFirmId === firmId) {
        setSelectedFirmId(null);
        setActivePage('FIRMALAR');
    }
  };

  const saveEmployees = async (data: Calisan[]) => {
    if (isReadOnly) return;
    setEmployees(data);
    await StorageService.saveEmployees(data);
  };

  const saveRisks = async (data: RiskAnalizi[]) => {
    if (isReadOnly) return;
    setRisks(data);
    await StorageService.saveRisks(data);
  };

  const saveMeetings = async (data: KurulToplantisi[]) => {
      if (isReadOnly) return;
      setMeetings(data);
      await StorageService.saveMeetings(data);
  };

  const saveEquipments = async (data: Ekipman[]) => {
    if (isReadOnly) return;
    setEquipments(data);
    await StorageService.saveEquipments(data);
  };

  const saveEvents = async (data: CalendarEvent[]) => {
      if (isReadOnly) return;
      setEvents(data);
      await StorageService.saveEvents(data);
  };

  const handleFirmSelect = (id: string) => {
    setSelectedFirmId(id);
    setActivePage('FIRMA_DETAY');
  };

  const handleBackToFirms = () => {
    setSelectedFirmId(null);
    setActivePage('FIRMALAR');
  };

  // Özel Gün Tetikleyici (Ayarlar sayfasından gelir)
  const triggerHolidayPreview = (id: string) => {
      // Önce mevcut durumu sıfırla
      setShowMemorial(false);
      setActiveSpecialDay(null);
      setIsMuted(false); // Sesi varsayılan olarak aç

      setTimeout(() => {
          if (id === '10_KASIM') {
              setShowMemorial(true);
          } else {
              const special = SPECIAL_DAYS.find(s => s.id === id);
              if (special) setActiveSpecialDay(special);
          }
      }, 50);
  };

  const selectedFirm = visibleFirms.find(f => f.id === selectedFirmId);

  // Müzik Kaynağını Belirle
  const activeAudioSrc = useMemo(() => {
      if (showMemorial) return "https://files.catbox.moe/bi1zy1.mp3";
      if (activeSpecialDay && activeSpecialDay.audio) return activeSpecialDay.audio;
      return undefined;
  }, [showMemorial, activeSpecialDay]);

  if (!loaded) return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-900 text-blue-500 gap-4">
          <i className="fa-solid fa-spinner fa-spin text-4xl"></i>
          <span className="text-slate-400 text-sm animate-pulse">Sistem hazırlanıyor...</span>
      </div>
  );

  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100 transition-colors duration-300">
      
      {/* ORTAK AUDIO ELEMENTİ */}
      {(showMemorial || (activeSpecialDay?.audio)) && (
          <audio 
              ref={audioRef} 
              src={activeAudioSrc} 
              loop 
              autoPlay 
          />
      )}

      {/* 10 KASIM ANMA EKRANI */}
      {showMemorial && (
          <div 
            onClick={() => { setShowMemorial(false); setIsMuted(false); }}
            className="fixed inset-0 z-[9999] bg-black flex items-center justify-center animate-fade-in-down overflow-hidden cursor-pointer"
          >
              {/* Arkaplan Efekti */}
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-black to-black opacity-90"></div>
              
              {/* Mute Toggle Button - Tıklamayı engellememesi için z-index yüksek ve stopPropagation */}
              <button 
                onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}
                className="absolute top-8 right-8 text-white/50 hover:text-white transition-colors z-50 text-2xl bg-black/50 p-3 rounded-full hover:bg-black/80"
                title={isMuted ? "Sesi Aç" : "Sessize Al"}
              >
                <i className={`fa-solid ${isMuted ? 'fa-volume-xmark' : 'fa-volume-high'}`}></i>
              </button>

              <div className="text-center p-8 max-w-5xl w-full relative z-10">
                  {/* Dekoratif Çizgiler */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-amber-600/50 to-transparent"></div>
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-amber-600/50 to-transparent"></div>
                  
                  <div className="mb-12 relative">
                      <div className="text-amber-500/20 text-9xl absolute left-1/2 -translate-x-1/2 -top-12 animate-pulse-slow">
                          <i className="fa-solid fa-infinity"></i>
                      </div>
                      <i className="fa-solid fa-infinity text-6xl text-amber-500 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]"></i>
                  </div>
                  
                  <h1 className="text-6xl md:text-8xl font-black text-white mb-4 tracking-[0.2em] font-serif drop-shadow-2xl">1881 - 193∞</h1>
                  <h2 className="text-xl md:text-3xl text-amber-500 font-light mb-12 tracking-[0.3em] uppercase border-b border-amber-500/30 inline-block pb-4">Sevgi, Saygı ve Minnetle</h2>
                  
                  <p className="text-slate-300 text-lg md:text-2xl leading-relaxed mb-12 max-w-3xl mx-auto font-light italic">
                      "Beni görmek demek mutlaka yüzümü görmek demek değildir. Benim fikirlerimi, benim duygularımı anlıyorsanız ve hissediyorsanız bu kafidir."
                  </p>
                  
                  <div className="flex flex-col items-center gap-2">
                      <strong className="text-white text-xl tracking-widest font-bold">MUSTAFA KEMAL ATATÜRK</strong>
                      <span className="w-12 h-1 bg-amber-600 rounded-full mt-2"></span>
                  </div>

                  <div className="absolute bottom-10 left-0 w-full text-center text-white/30 text-sm animate-pulse">
                      Devam etmek için ekrana dokunun
                  </div>
              </div>
          </div>
      )}

      {/* DİĞER ÖZEL GÜNLER MODALI (ARKAPLAN GÖRSEL DESTEĞİ İLE) */}
      {activeSpecialDay && !showMemorial && (
          <div 
            onClick={() => { setActiveSpecialDay(null); setIsMuted(false); }}
            className="fixed inset-0 z-[9999] flex items-center justify-center animate-fade-in-down overflow-hidden bg-black/95 cursor-pointer"
          >
              
               {/* Ses Kontrolü (Varsa) */}
               {activeSpecialDay.audio && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }} 
                    className="absolute top-4 right-4 md:top-8 md:right-8 text-white/70 hover:text-white transition-colors z-50 text-xl md:text-2xl bg-black/40 p-2 md:p-3 rounded-full hover:bg-black/80 backdrop-blur-sm border border-white/10"
                    title={isMuted ? "Sesi Aç" : "Sessize Al"}
                  >
                    <i className={`fa-solid ${isMuted ? 'fa-volume-xmark' : 'fa-volume-high'}`}></i>
                  </button>
               )}

              {/* Dinamik Arkaplan */}
              <div 
                  className={`absolute inset-0 bg-cover bg-center transition-all duration-1000 ${
                      !activeSpecialDay.backgroundImage && (activeSpecialDay.theme === 'RED' 
                      ? 'bg-gradient-to-br from-red-950 via-slate-900 to-black' 
                      : 'bg-gradient-to-br from-cyan-950 via-teal-950 to-slate-950')
                  }`}
                  style={activeSpecialDay.backgroundImage ? { backgroundImage: `url(${activeSpecialDay.backgroundImage})` } : {}}
              >
                   {/* Eğer resim varsa karartma uygula, yoksa desen göster */}
                   {activeSpecialDay.backgroundImage ? (
                       <div className="absolute inset-0 bg-black/60"></div>
                   ) : (
                       <div className="absolute inset-0 opacity-10" style={{backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")'}}></div>
                   )}
              </div>

              {/* Ana Kart - RESPONSIVE BOYUTLANDIRMA */}
              <div className={`
                relative w-full max-w-5xl max-h-[90vh] h-auto rounded-3xl
                overflow-hidden shadow-2xl flex flex-col items-center justify-center p-6 md:p-12 text-center 
                border border-white/10 backdrop-blur-md mx-4 z-10
                ${activeSpecialDay.theme === 'TURQUOISE' ? 'shadow-cyan-500/20' : 'shadow-red-500/20'}
              `}>
                  
                  {/* Arkaplan Dev İkon (Daha küçültüldü) - Sadece resim yoksa göster */}
                  {!activeSpecialDay.backgroundImage && (
                    <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[10rem] md:text-[20rem] opacity-5 pointer-events-none ${
                        activeSpecialDay.theme === 'RED' ? 'text-red-500' : 'text-cyan-400'
                    }`}>
                        <i className={`fa-solid ${activeSpecialDay.icon}`}></i>
                    </div>
                  )}

                  {/* İKON KAPSAYICI (Boyutlar ayarlandı) */}
                  <div className="relative mb-6 md:mb-10 group shrink-0">
                      <div className={`absolute inset-0 blur-3xl opacity-30 rounded-full scale-150 animate-pulse-slow ${
                          activeSpecialDay.theme === 'RED' ? 'bg-red-600' : 'bg-cyan-400'
                      }`}></div>
                      <div className={`relative text-6xl md:text-8xl drop-shadow-2xl transition-transform duration-700 group-hover:scale-110 ${
                          activeSpecialDay.theme === 'RED' 
                            ? 'text-transparent bg-clip-text bg-gradient-to-b from-white to-red-200' 
                            : 'text-transparent bg-clip-text bg-gradient-to-b from-white to-cyan-200'
                      }`}>
                          <i className={`fa-solid ${activeSpecialDay.icon}`}></i>
                      </div>
                  </div>

                  {/* BAŞLIK (Responsive Text) */}
                  <h1 className="text-2xl md:text-5xl font-black text-white mb-4 md:mb-8 tracking-wider uppercase drop-shadow-lg leading-tight font-serif">
                      {activeSpecialDay.title}
                  </h1>

                  {/* AYIRAÇ */}
                  <div className="flex items-center gap-4 md:gap-6 mb-6 md:mb-8 opacity-80 shrink-0">
                      <div className={`h-px w-16 md:w-32 ${activeSpecialDay.theme === 'RED' ? 'bg-gradient-to-l from-red-500 to-transparent' : 'bg-gradient-to-l from-cyan-400 to-transparent'}`}></div>
                      <i className={`fa-solid fa-diamond text-[10px] md:text-sm ${activeSpecialDay.theme === 'RED' ? 'text-red-500' : 'text-cyan-400'}`}></i>
                      <div className={`h-px w-16 md:w-32 ${activeSpecialDay.theme === 'RED' ? 'bg-gradient-to-r from-red-500 to-transparent' : 'bg-gradient-to-r from-cyan-400 to-transparent'}`}></div>
                  </div>

                  {/* MESAJ */}
                  <div className="overflow-y-auto max-h-[30vh] md:max-h-none mb-6 md:mb-8 px-2 custom-scrollbar relative z-10">
                    <p className="text-white/95 text-lg md:text-2xl font-serif italic leading-relaxed max-w-4xl drop-shadow-md">
                        "{activeSpecialDay.message}"
                    </p>
                    
                    {activeSpecialDay.id === '3_MAYIS' && (
                        <div className="mt-4 md:mt-6 text-cyan-400 font-bold tracking-widest text-xs md:text-sm uppercase opacity-80 shadow-black drop-shadow-md">
                            - NE MUTLU TÜRKÜM DİYENE -
                        </div>
                    )}
                  </div>
              </div>

              {/* Alt Bilgi Mesajı */}
              <div className="absolute bottom-10 left-0 w-full text-center text-white/30 text-sm animate-pulse pointer-events-none">
                  Devam etmek için ekrana dokunun
              </div>
          </div>
      )}

      {/* DAILY ALERT MODAL */}
      {!showMemorial && !activeSpecialDay && dailyAlert && dailyAlert.show && (
          <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center backdrop-blur-sm p-4 animate-fade-in-down">
              <div className="bg-slate-800 rounded-2xl shadow-2xl border border-red-500/30 w-full max-w-md overflow-hidden relative">
                  <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-red-600 to-amber-500"></div>
                  <div className="p-8 text-center">
                      <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
                          <i className="fa-solid fa-bell"></i>
                      </div>
                      <h2 className="text-2xl font-bold text-white mb-2">Günlük Özet</h2>
                      <p className="text-slate-400 text-sm mb-6">
                          Bugün itibariyle takip etmeniz gereken acil işlemler:
                      </p>
                      
                      <div className="grid grid-cols-3 gap-3 mb-6">
                          <div className="bg-slate-700/50 p-3 rounded-xl border border-slate-700">
                              <div className="text-2xl font-bold text-white mb-1">{dailyAlert.empCount}</div>
                              <div className="text-[10px] text-slate-400 uppercase font-bold">Eğitim</div>
                          </div>
                          <div className="bg-slate-700/50 p-3 rounded-xl border border-slate-700">
                              <div className="text-2xl font-bold text-white mb-1">{dailyAlert.eqCount}</div>
                              <div className="text-[10px] text-slate-400 uppercase font-bold">Ekipman</div>
                          </div>
                          <div className="bg-slate-700/50 p-3 rounded-xl border border-slate-700">
                              <div className="text-2xl font-bold text-white mb-1">{dailyAlert.mtgCount}</div>
                              <div className="text-[10px] text-slate-400 uppercase font-bold">Kurul</div>
                          </div>
                      </div>

                      <div className="text-xs text-red-400 font-medium mb-6">
                          * Süresi bugün dolan veya geçmiş kayıtlar dahildir.
                      </div>

                      <button 
                          onClick={() => setDailyAlert(null)}
                          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl shadow-lg transition-colors"
                      >
                          Anlaşıldı
                      </button>
                  </div>
              </div>
          </div>
      )}

      {loadError && (
          <div className="fixed top-8 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white px-6 py-3 rounded-lg shadow-xl font-bold text-sm flex items-center gap-3">
              <i className="fa-solid fa-triangle-exclamation"></i>
              {loadError}
          </div>
      )}

      {impersonatedUser && (
          <div className="bg-amber-500 text-black px-4 py-2 flex items-center justify-between shadow-lg z-50 animate-fade-in-down">
              <div className="flex items-center gap-3 font-bold text-sm">
                  <div className="bg-black/20 w-8 h-8 rounded-full flex items-center justify-center">
                      <i className="fa-solid fa-eye"></i>
                  </div>
                  <span>
                      Şu an <span className="underline">{impersonatedUser.adSoyad}</span> kullanıcısının gözünden görüyorsunuz.
                      <span className="opacity-70 text-xs ml-2 font-normal">(Düzenleme yapılamaz - Salt Okunur)</span>
                  </span>
              </div>
              <button onClick={exitImpersonation} className="bg-black/80 hover:bg-black text-white px-4 py-1.5 rounded-lg text-xs font-bold transition-colors">
                  Yönetici Görünümüne Dön
              </button>
          </div>
      )}

      <Navbar 
        activePage={activePage} 
        setPage={setActivePage} 
        user={currentUser}
      />
      
      <main className="flex-1 overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-blue-600 via-blue-400 to-slate-900 z-10"></div>
        
        {activePage === 'DASHBOARD' && (
            <Dashboard 
                firms={visibleFirms} 
                employees={employees} 
                equipments={equipments} 
                risks={risks}
                meetings={meetings}
                setPage={setActivePage}
                selectFirm={handleFirmSelect}
                onSaveEmployees={saveEmployees}
                isReadOnly={isReadOnly}
                currentUser={activeUserForView} 
            />
        )}
        
        {activePage === 'FIRMALAR' && (
            <Firms 
                data={visibleFirms} 
                onSave={saveFirms} 
                onDelete={handleDeleteFirm} 
                onSelect={handleFirmSelect}
                isReadOnly={isReadOnly} 
                canManage={canManageFirms} 
            />
        )}
        
        {activePage === 'CALENDAR' && (
            <Calendar 
              events={events} 
              onSave={saveEvents}
              firms={visibleFirms}
              employees={employees}
              equipments={equipments}
              risks={risks}
              meetings={meetings}
            />
        )}

        {activePage === 'REPORTS' && (
            <Reports 
                firms={visibleFirms}
                employees={employees}
                equipments={equipments}
                risks={risks}
                meetings={meetings}
            />
        )}
        
        {activePage === 'SETTINGS' && (
            <Settings 
                firms={visibleFirms} 
                employees={employees} 
                currentUser={activeUserForView}
            />
        )}

        {activePage === 'USERS' && canManageFirms && (
            <Users availableFirms={firms} onImpersonate={handleImpersonate} />
        )}

        {activePage === 'FIRMA_DETAY' && selectedFirm && (
            <FirmDetail 
                firm={selectedFirm}
                employees={employees}
                equipments={equipments}
                risks={risks}
                meetings={meetings.filter(m => m.firmaId === selectedFirm.id)}
                onBack={handleBackToFirms}
                onSaveEmployees={saveEmployees}
                onSaveEquipments={saveEquipments}
                onSaveRisks={saveRisks}
                onSaveMeetings={saveMeetings}
                onUpdateFirm={updateFirm}
                isReadOnly={isReadOnly}
                canEditFirmInfo={canManageFirms} 
                currentUser={activeUserForView} 
            />
        )}
      </main>
    </div>
  );
};

export default App;
