
import React, { useState } from 'react';
import { Firma, Calisan, Ekipman, RiskAnalizi, KurulToplantisi } from '../types';
import { ReportService } from '../services/reportService';
import { formatDateTR } from '../services/logic';

interface ReportsProps {
    firms: Firma[];
    employees: Calisan[];
    equipments: Ekipman[];
    risks: RiskAnalizi[];
    meetings?: KurulToplantisi[];
}

export const Reports: React.FC<ReportsProps> = ({ firms, employees, equipments, risks, meetings = [] }) => {
    const [loading, setLoading] = useState(false);
    
    // --- WEEKLY STATE ---
    const [weekDate, setWeekDate] = useState(new Date().toISOString().split('T')[0]);

    // --- MONTHLY STATE ---
    const [monthYear, setMonthYear] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

    const handleWeeklyReport = async () => {
        setLoading(true);
        const selected = new Date(weekDate);
        
        const day = selected.getDay();
        const diff = selected.getDate() - day + (day === 0 ? -6 : 1);
        
        const startOfWeek = new Date(selected);
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

    const handleMonthlyReport = async () => {
        setLoading(true);
        const [year, month] = monthYear.split('-').map(Number);
        
        const startOfMonth = new Date(year, month - 1, 1);
        const endOfMonth = new Date(year, month, 0);

        const monthNames = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
        const label = `${monthNames[month - 1]} ${year}`;

        await ReportService.generateReport(
            'Aylık Planlama Raporu',
            label,
            startOfMonth,
            endOfMonth,
            { firms, employees, equipments, risks, meetings }
        );
        setLoading(false);
    };

    return (
        <div className="p-8 h-full overflow-y-auto bg-slate-900 text-slate-100">
            <header className="mb-8 border-b border-slate-800 pb-6">
                <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                    <i className="fa-solid fa-file-pdf text-red-500"></i>
                    Raporlar
                </h2>
                <p className="text-slate-400 mt-1">
                    İleri tarihli haftalık ve aylık raporlar oluşturun. <br/>
                    <span className="text-xs text-amber-500"><i className="fa-solid fa-triangle-exclamation"></i> Raporlar, geçmişte kalmış (yapılmamış) acil işleri de otomatik içerir.</span>
                </p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl">
                
                {/* HAFTALIK RAPOR KARTI */}
                <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 hover:border-blue-500/30 transition-all shadow-lg group">
                    <div className="w-12 h-12 bg-blue-900/30 text-blue-400 rounded-xl flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
                        <i className="fa-solid fa-calendar-week"></i>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Haftalık Rapor</h3>
                    <p className="text-slate-400 text-sm mb-6">
                        Seçilen haftaya ait planlanan tüm eğitim, ekipman kontrolü ve risk analizlerini listeler.
                    </p>
                    
                    <div className="bg-slate-900 p-4 rounded-xl border border-slate-700 mb-6">
                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Hafta Seçimi</label>
                        <input 
                            type="date" 
                            className="w-full bg-slate-800 border border-slate-600 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                            value={weekDate}
                            onChange={(e) => setWeekDate(e.target.value)}
                        />
                        <p className="text-[10px] text-slate-500 mt-2">
                            * Seçilen günün içinde bulunduğu Pazartesi-Pazar aralığı baz alınır.
                        </p>
                    </div>

                    <button 
                        onClick={handleWeeklyReport}
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                        {loading ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-download"></i>}
                        {loading ? 'Hazırlanıyor...' : 'PDF İndir'}
                    </button>
                </div>

                {/* AYLIK RAPOR KARTI */}
                <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 hover:border-purple-500/30 transition-all shadow-lg group">
                    <div className="w-12 h-12 bg-purple-900/30 text-purple-400 rounded-xl flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
                        <i className="fa-regular fa-calendar-days"></i>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Aylık Rapor</h3>
                    <p className="text-slate-400 text-sm mb-6">
                        Seçilen ayın tamamını kapsayan genel durum raporu. Gelecek aylar için planlama yapmakta kullanılır.
                    </p>
                    
                    <div className="bg-slate-900 p-4 rounded-xl border border-slate-700 mb-6">
                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Ay Seçimi</label>
                        <input 
                            type="month" 
                            className="w-full bg-slate-800 border border-slate-600 rounded-lg p-3 text-white focus:border-purple-500 outline-none"
                            value={monthYear}
                            onChange={(e) => setMonthYear(e.target.value)}
                        />
                         <p className="text-[10px] text-slate-500 mt-2">
                            * İleri tarihli ayları seçerek gelecek planlarını dökebilirsiniz.
                        </p>
                    </div>

                    <button 
                        onClick={handleMonthlyReport}
                        disabled={loading}
                        className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl shadow-lg shadow-purple-600/20 flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                        {loading ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-download"></i>}
                        {loading ? 'Hazırlanıyor...' : 'PDF İndir'}
                    </button>
                </div>

            </div>
        </div>
    );
};
