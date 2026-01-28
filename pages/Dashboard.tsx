
import React, { useMemo } from 'react';
import { Firma, Calisan, Ekipman, RiskAnalizi, Page, User, KurulToplantisi } from '../types';
import { isExpired, isApproaching, formatDateTR } from '../services/logic';

interface DashboardProps {
  firms: Firma[];
  employees: Calisan[];
  equipments: Ekipman[];
  risks: RiskAnalizi[];
  meetings: KurulToplantisi[];
  setPage: (page: Page) => void;
  selectFirm: (firmId: string) => void;
  onSaveEmployees: (data: Calisan[]) => void;
  isReadOnly?: boolean; 
  currentUser?: User | null;
}

export const Dashboard: React.FC<DashboardProps> = ({ firms, employees, equipments, risks, meetings, selectFirm }) => {
  
  // İstatistik Hesaplama
  const stats = useMemo(() => {
    let expiredCount = 0;
    let approachingCount = 0;
    
    // Basit birleştirme
    [...employees.map(e => e.sonrakiEgitimTarihi), ...equipments.map(e => e.sonrakiKontrolTarihi), ...risks.map(r => r.gecerlilikTarihi), ...meetings.map(m => m.sonrakiToplantiTarihi)]
    .forEach(date => {
        if(date) {
            if (isExpired(date)) expiredCount++;
            else if (isApproaching(date)) approachingCount++;
        }
    });

    return { expiredCount, approachingCount };
  }, [employees, equipments, risks, meetings]);

  const alerts = useMemo(() => {
    const list: any[] = [];
    // Basit Alert Listesi Oluşturma (Detaylı mantık korundu)
    risks.forEach(r => {
        const firm = firms.find(f => f.id === r.firmaId);
        if (isExpired(r.gecerlilikTarihi)) list.push({ type: 'danger', msg: 'Risk Analizi Süresi Doldu', sub: firm?.ad, date: r.gecerlilikTarihi, id: r.firmaId });
    });
    meetings.forEach(m => {
        const firm = firms.find(f => f.id === m.firmaId);
        if (isExpired(m.sonrakiToplantiTarihi)) list.push({ type: 'danger', msg: 'Kurul Toplantısı Gecikti', sub: firm?.ad, date: m.sonrakiToplantiTarihi, id: m.firmaId });
    });
    // Limit 10 items
    return list.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(0, 10);
  }, [risks, meetings, firms]);

  return (
    <div className="p-8 h-full overflow-y-auto">
      
      {/* HEADER */}
      <div className="flex justify-between items-end mb-8">
        <div>
            <h2 className="text-3xl font-bold text-white mb-1">Genel Bakış</h2>
            <p className="text-slate-400 text-sm">İş sağlığı ve güvenliği süreçlerinin anlık durumu.</p>
        </div>
        <div className="flex gap-3">
             <div className="px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-sm font-medium">
                <i className="fa-regular fa-calendar mr-2"></i> {new Date().toLocaleDateString('tr-TR')}
             </div>
        </div>
      </div>

      {/* CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          
          {/* CARD 1 */}
          <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-lg relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <i className="fa-solid fa-building text-6xl text-blue-500"></i>
              </div>
              <div className="relative z-10">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center text-xl mb-4">
                      <i className="fa-solid fa-city"></i>
                  </div>
                  <h3 className="text-4xl font-bold text-white mb-1">{firms.length}</h3>
                  <p className="text-slate-400 text-sm font-medium">Toplam Firma</p>
              </div>
          </div>

          {/* CARD 2 */}
          <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-lg relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <i className="fa-solid fa-users text-6xl text-emerald-500"></i>
              </div>
              <div className="relative z-10">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center text-xl mb-4">
                      <i className="fa-solid fa-user-group"></i>
                  </div>
                  <h3 className="text-4xl font-bold text-white mb-1">{employees.length}</h3>
                  <p className="text-slate-400 text-sm font-medium">Aktif Personel</p>
              </div>
          </div>

          {/* CARD 3 - ALERT */}
          <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-lg relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <i className="fa-solid fa-triangle-exclamation text-6xl text-red-500"></i>
              </div>
              <div className="relative z-10">
                  <div className="w-12 h-12 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center text-xl mb-4">
                      <i className="fa-solid fa-bell"></i>
                  </div>
                  <h3 className="text-4xl font-bold text-white mb-1">{stats.expiredCount}</h3>
                  <p className="text-slate-400 text-sm font-medium">Acil Aksiyon</p>
              </div>
          </div>

          {/* CARD 4 - WARNING */}
          <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-lg relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <i className="fa-solid fa-hourglass-half text-6xl text-amber-500"></i>
              </div>
              <div className="relative z-10">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center text-xl mb-4">
                      <i className="fa-solid fa-clock"></i>
                  </div>
                  <h3 className="text-4xl font-bold text-white mb-1">{stats.approachingCount}</h3>
                  <p className="text-slate-400 text-sm font-medium">Yaklaşan İşlem</p>
              </div>
          </div>
      </div>

      {/* CONTENT AREA */}
      <div className="flex flex-col gap-8">
          
          {/* FULL WIDTH ALERTS TABLE */}
          <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-xl overflow-hidden w-full">
              <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
                  <h3 className="font-bold text-white text-lg">Acil İşlem Listesi</h3>
                  <span className="bg-red-500/20 text-red-400 text-xs font-bold px-3 py-1 rounded-full">{alerts.length} Kayıt</span>
              </div>
              <div className="p-0">
                  {alerts.length === 0 ? (
                      <div className="p-12 text-center text-slate-500">
                          <i className="fa-solid fa-check-circle text-4xl mb-4 text-emerald-500/20"></i>
                          <p>Harika! Bekleyen acil işlem yok.</p>
                      </div>
                  ) : (
                    <table className="w-full text-left">
                        <thead className="bg-slate-900/50 text-xs uppercase text-slate-400 font-bold border-b border-slate-700">
                            <tr>
                                <th className="px-6 py-4">Firma</th>
                                <th className="px-6 py-4">Durum</th>
                                <th className="px-6 py-4 text-right">Tarih</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {alerts.map((alert, idx) => (
                                <tr key={idx} onClick={() => selectFirm(alert.id)} className="hover:bg-slate-700/30 cursor-pointer transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-white">{alert.sub}</div>
                                        <div className="text-xs text-slate-500">ID: {alert.id.substring(0,6)}...</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/20">
                                            <i className="fa-solid fa-circle-exclamation"></i> {alert.msg}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="text-sm font-mono text-slate-300">{formatDateTR(alert.date)}</div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                  )}
              </div>
          </div>
      </div>

    </div>
  );
};
