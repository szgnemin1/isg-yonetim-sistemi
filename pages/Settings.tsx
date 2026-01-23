
import React, { useRef, useState, useEffect } from 'react';
import { StorageService } from '../services/storage';
import { Firma, Calisan, TehlikeSinifi, User, AppSettings } from '../types';

interface SettingsProps {
    firms?: Firma[];
    employees?: Calisan[];
    currentUser?: User | null;
}

export const Settings: React.FC<SettingsProps> = ({ firms = [], employees = [], currentUser }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<{msg: string, type: 'success' | 'error' | ''}>({ msg: '', type: '' });
  
  // Rapor Ayarları
  const [settings, setSettings] = useState<AppSettings>({ autoReportDay: 5, autoReportTime: '17:00' });
  const [saveMsg, setSaveMsg] = useState('');

  useEffect(() => {
      setSettings(StorageService.getSettings());
  }, []);

  const handleSaveSettings = () => {
      StorageService.saveSettings(settings);
      setSaveMsg('Ayarlar kaydedildi.');
      setTimeout(() => setSaveMsg(''), 3000);
  };

  const handleExport = async () => {
    try {
      const allData = await StorageService.getAllData();
      const data = {
        firms: allData.firms || [],
        employees: allData.employees || [],
        risks: allData.risks || [],
        equipments: allData.equipments || [],
        events: allData.events || [],
        exportDate: new Date().toISOString(),
        version: '1.0'
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ISG_Takip_Yedek_${new Date().toLocaleDateString('tr-TR').replace(/\./g, '-')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Yedek alınırken hata:", error);
      alert("Veriler sunucudan alınamadı.");
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        if (!json.firms || !json.employees) throw new Error('Geçersiz yedek dosyası formatı.');

        if (window.confirm('DİKKAT: Bu işlem mevcut verilerinizi silecek ve yedek dosyasındaki verileri yükleyecektir. Devam etmek istiyor musunuz?')) {
            await StorageService.saveFirms(json.firms || []);
            await StorageService.saveEmployees(json.employees || []);
            await StorageService.saveRisks(json.risks || []);
            await StorageService.saveEquipments(json.equipments || []);
            await StorageService.saveEvents(json.events || []);
            
            setImportStatus({ msg: 'Yedek başarıyla yüklendi! Sayfa yenileniyor...', type: 'success' });
            setTimeout(() => window.location.reload(), 1500);
        }
      } catch (error) {
        console.error(error);
        setImportStatus({ msg: 'Dosya okunamadı veya hatalı format.', type: 'error' });
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleClearData = async () => {
      if(window.confirm('TÜM VERİLER SİLİNECEK! Bu işlem geri alınamaz. Emin misiniz?')) {
          await StorageService.saveFirms([]);
          await StorageService.saveEmployees([]);
          await StorageService.saveRisks([]);
          await StorageService.saveEquipments([]);
          await StorageService.saveEvents([]);
          StorageService.clearSession();
          window.location.reload();
      }
  };

  const days = [
      { val: 1, label: 'Pazartesi' },
      { val: 2, label: 'Salı' },
      { val: 3, label: 'Çarşamba' },
      { val: 4, label: 'Perşembe' },
      { val: 5, label: 'Cuma' },
      { val: 6, label: 'Cumartesi' },
      { val: 0, label: 'Pazar' },
  ];

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
        <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-8 py-6 shrink-0 transition-colors">
            <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Ayarlar</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
            <div className="animate-fade-in-down max-w-6xl mx-auto">
                <p className="text-slate-500 dark:text-slate-400 mb-8">Veri yönetimi ve sistem ayarları.</p>

                {/* --- OTOMATİK RAPOR AYARLARI --- */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 mb-8 transition-colors">
                     <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xl">
                            <i className="fa-solid fa-print"></i>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Otomatik Raporlama</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Belirlenen gün ve saatte, gelecek haftanın planını otomatik olarak yazdırır.
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex flex-col md:flex-row gap-6 items-end">
                         <div className="w-full md:w-1/3">
                            <label className="block text-xs font-bold text-slate-500 mb-1">Rapor Günü</label>
                            <select 
                                value={settings.autoReportDay} 
                                onChange={(e) => setSettings({...settings, autoReportDay: parseInt(e.target.value)})}
                                className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                            >
                                {days.map(d => <option key={d.val} value={d.val}>{d.label}</option>)}
                            </select>
                         </div>
                         <div className="w-full md:w-1/3">
                            <label className="block text-xs font-bold text-slate-500 mb-1">Rapor Saati</label>
                            <input 
                                type="time"
                                value={settings.autoReportTime}
                                onChange={(e) => setSettings({...settings, autoReportTime: e.target.value})}
                                className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                            />
                         </div>
                         <div className="w-full md:w-auto">
                             <button onClick={handleSaveSettings} className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2.5 rounded-lg text-sm font-bold shadow-lg shadow-emerald-600/20 transition-all active:scale-95 w-full">
                                Kaydet
                             </button>
                         </div>
                    </div>
                    {saveMsg && <div className="mt-3 text-emerald-500 text-sm font-bold animate-pulse"><i className="fa-solid fa-check mr-1"></i> {saveMsg}</div>}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                    {/* Yedek Alma Kartı */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 transition-colors">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xl">
                                <i className="fa-solid fa-download"></i>
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Yedek Al (Dışa Aktar)</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Tüm verilerinizi bilgisayarınıza kaydedin.</p>
                            </div>
                        </div>
                        <p className="text-slate-600 dark:text-slate-300 text-sm mb-6 leading-relaxed">
                            Bu işlem firmalar, çalışanlar, risk analizleri ve ekipmanlar dahil olmak üzere tüm verilerinizi bir <b>.json</b> dosyası olarak indirir.
                        </p>
                        <button 
                            onClick={handleExport}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20">
                            <i className="fa-solid fa-file-export"></i> Verileri İndir
                        </button>
                    </div>

                    {/* Yedek Yükleme Kartı */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 transition-colors">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center text-xl">
                                <i className="fa-solid fa-upload"></i>
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Yedek Yükle (İçe Aktar)</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Daha önce alınan yedeği geri yükleyin.</p>
                            </div>
                        </div>
                        <p className="text-slate-600 dark:text-slate-300 text-sm mb-6 leading-relaxed">
                            Bilgisayarınızdaki bir yedek dosyasını seçerek verilerinizi geri yükleyebilirsiniz. 
                            <br/><span className="text-red-500 font-bold">DİKKAT:</span> Bu işlem mevcut verilerin üzerine yazar.
                        </p>
                        
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleFileChange} 
                            accept=".json" 
                            className="hidden" 
                        />
                        
                        <button 
                            onClick={handleImportClick}
                            className="w-full bg-slate-800 dark:bg-slate-700 hover:bg-slate-700 dark:hover:bg-slate-600 text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 border border-slate-700 dark:border-slate-600">
                            <i className="fa-solid fa-folder-open"></i> Yedek Dosyası Seç
                        </button>

                        {importStatus.msg && (
                            <div className={`mt-4 p-3 rounded-lg text-sm font-medium flex items-center gap-2 ${importStatus.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                <i className={`fa-solid ${importStatus.type === 'success' ? 'fa-check-circle' : 'fa-circle-exclamation'}`}></i>
                                {importStatus.msg}
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="border-t border-slate-200 dark:border-slate-700 pt-8">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-4">Sistem Araçları</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-red-50 dark:bg-red-900/10 p-6 rounded-xl border border-red-200 dark:border-red-900/30 transition-colors">
                            <h4 className="font-bold text-red-800 dark:text-red-400 mb-2">
                                <i className="fa-solid fa-triangle-exclamation mr-2"></i> Sıfırlama
                            </h4>
                            <p className="text-sm text-red-700 dark:text-red-500 mb-4">
                                Uygulamadaki <b>TÜM VERİLERİ</b> siler. Geri alınamaz.
                            </p>
                            <button 
                                onClick={handleClearData}
                                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium w-full transition-colors">
                                Tüm Verileri Sil
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};
