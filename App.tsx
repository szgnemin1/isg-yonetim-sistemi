import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
// TitleBar importu kaldırıldı
import { Dashboard } from './pages/Dashboard';
import { Firms } from './pages/Firms';
import { FirmDetail } from './pages/FirmDetail';
import { Calendar } from './pages/Calendar';
import { Settings } from './pages/Settings';
import { Reports } from './pages/Reports';
import { Page, Firma, Calisan, RiskAnalizi, Ekipman, CalendarEvent, User, KurulToplantisi } from './types';
import { StorageService } from './services/storage';

const App: React.FC = () => {
  // --- USER STATE (Sabit Admin) ---
  const currentUser: User = {
      id: 'root-admin',
      username: 'admin',
      role: 'ADMIN',
      adSoyad: 'Sistem Yöneticisi'
  };
  
  // --- NAVIGATION STATE ---
  const [activePage, setActivePage] = useState<Page>('DASHBOARD');
  const [selectedFirmId, setSelectedFirmId] = useState<string | null>(null);
  
  // --- DATA STATE ---
  const [firms, setFirms] = useState<Firma[]>([]);
  const [employees, setEmployees] = useState<Calisan[]>([]);
  const [risks, setRisks] = useState<RiskAnalizi[]>([]);
  const [meetings, setMeetings] = useState<KurulToplantisi[]>([]);
  const [equipments, setEquipments] = useState<Ekipman[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loaded, setLoaded] = useState(false);

  // --- INIT DATA ---
  useEffect(() => {
      const initData = async () => {
          try {
            const data = await StorageService.getAllData();
            setFirms(data.firms || []);
            setEmployees(data.employees || []);
            setEquipments(data.equipments || []);
            setRisks(data.risks || []);
            setMeetings(data.meetings || []);
            setEvents(data.events || []);
          } catch(e) {
              console.error(e);
          } finally {
              setLoaded(true);
          }
      };
      initData();
  }, []);

  // --- LOGIC ---
  const isReadOnly = false;
  const visibleFirms = firms;

  // --- HANDLERS ---
  const handleFirmSelect = (id: string) => { setSelectedFirmId(id); setActivePage('FIRMA_DETAY'); };
  
  const saveFirms = async (data: Firma[]) => { setFirms(data); await StorageService.saveFirms(data); };
  const saveEmployees = async (data: Calisan[]) => { setEmployees(data); await StorageService.saveEmployees(data); };
  const saveEquipments = async (data: Ekipman[]) => { setEquipments(data); await StorageService.saveEquipments(data); };
  const saveRisks = async (data: RiskAnalizi[]) => { setRisks(data); await StorageService.saveRisks(data); };
  const saveMeetings = async (data: KurulToplantisi[]) => { setMeetings(data); await StorageService.saveMeetings(data); };
  const saveEvents = async (data: CalendarEvent[]) => { setEvents(data); await StorageService.saveEvents(data); };

  const updateFirm = async (updatedFirm: Firma) => {
    const newData = firms.map(f => f.id === updatedFirm.id ? updatedFirm : f);
    setFirms(newData);
    await StorageService.saveFirms(newData);
  };
  
  const handleDeleteFirm = async (firmId: string) => {
      if(!window.confirm('Firma silinecek. Emin misiniz?')) return;
      const newFirms = firms.filter(f => f.id !== firmId);
      setFirms(newFirms); await StorageService.saveFirms(newFirms);
  };

  const selectedFirm = visibleFirms.find(f => f.id === selectedFirmId);

  if (!loaded) return <div className="h-screen w-screen flex items-center justify-center bg-slate-950 text-blue-500"><i className="fa-solid fa-circle-notch fa-spin text-4xl"></i></div>;

  return (
    // Border ve rounded classları kaldırıldı çünkü artık sistem penceresi kullanılıyor
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      
      {/* TitleBar Kaldırıldı - Sistem TitleBar'ı kullanılacak */}

      <div className="flex flex-1 overflow-hidden">
        {/* SOL MENÜ */}
        <Sidebar 
            activePage={activePage} 
            setPage={setActivePage} 
            user={currentUser}
        />

        {/* SAĞ İÇERİK ALANI */}
        <main className="flex-1 flex flex-col min-w-0 bg-slate-950 relative overflow-hidden">
          
          {/* Üst Dekorasyon (Glow) */}
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent z-10"></div>
          <div className="absolute -top-20 -left-20 w-64 h-64 bg-blue-600/10 rounded-full blur-[100px] pointer-events-none"></div>

          <div className="flex-1 overflow-y-auto overflow-x-hidden relative z-0">
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
                      isReadOnly={false}
                      currentUser={currentUser} 
                  />
              )}
              
              {activePage === 'FIRMALAR' && (
                  <Firms 
                      data={visibleFirms} 
                      onSave={saveFirms} 
                      onDelete={handleDeleteFirm} 
                      onSelect={handleFirmSelect}
                      isReadOnly={false} 
                      canManage={true} 
                  />
              )}

              {activePage === 'CALENDAR' && (
                  <Calendar events={events} onSave={saveEvents} firms={visibleFirms} employees={employees} equipments={equipments} risks={risks} meetings={meetings} />
              )}

              {activePage === 'REPORTS' && (
                  <Reports firms={visibleFirms} employees={employees} equipments={equipments} risks={risks} meetings={meetings} />
              )}
              
              {activePage === 'SETTINGS' && (
                  <Settings firms={visibleFirms} employees={employees} currentUser={currentUser} />
              )}

              {activePage === 'FIRMA_DETAY' && selectedFirm && (
                  <FirmDetail 
                      firm={selectedFirm}
                      employees={employees}
                      equipments={equipments}
                      risks={risks}
                      meetings={meetings.filter(m => m.firmaId === selectedFirm.id)}
                      onBack={() => { setSelectedFirmId(null); setActivePage('FIRMALAR'); }}
                      onSaveEmployees={saveEmployees}
                      onSaveEquipments={saveEquipments}
                      onSaveRisks={saveRisks}
                      onSaveMeetings={saveMeetings}
                      onUpdateFirm={updateFirm}
                      isReadOnly={false}
                      canEditFirmInfo={true} 
                  />
              )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;