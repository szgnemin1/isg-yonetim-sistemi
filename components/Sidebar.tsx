
import React from 'react';
import { Page, User } from '../types';

interface SidebarProps {
  activePage: Page;
  setPage: (page: Page) => void;
  user?: User;
}

export const Sidebar: React.FC<SidebarProps> = ({ activePage, setPage, user }) => {
  
  const menuItems = [
    { id: 'DASHBOARD', label: 'Dashboard', icon: 'fa-chart-line' },
    { id: 'FIRMALAR', label: 'Firmalar', icon: 'fa-building' },
    { id: 'CALENDAR', label: 'Takvim & Rapor', icon: 'fa-calendar-days' }, // Label güncellendi
    { id: 'SETTINGS', label: 'Ayarlar', icon: 'fa-sliders' },
  ];

  return (
    <aside className="w-[280px] h-full bg-[#0f172a] border-r border-slate-800 flex flex-col shrink-0 z-50 shadow-2xl">
      
      {/* HEADER / LOGO */}
      <div className="h-24 flex flex-col justify-center px-8 border-b border-slate-800/50">
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-900/40 text-white">
                <i className="fa-solid fa-shield-halved text-xl"></i>
            </div>
            <div>
                <h1 className="font-bold text-xl text-white tracking-tight leading-none">İSG PRO</h1>
                <span className="text-[11px] text-slate-400 font-medium tracking-wide">Yönetim Paneli v2.0</span>
            </div>
        </div>
      </div>

      {/* MENU */}
      <div className="flex-1 px-4 py-8 overflow-y-auto space-y-1">
        <div className="px-4 mb-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Ana Menü</div>
        
        {menuItems.map(item => {
            const isActive = activePage === item.id || (activePage === 'FIRMA_DETAY' && item.id === 'FIRMALAR');
            
            return (
                <button
                    key={item.id}
                    onClick={() => setPage(item.id as Page)}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-200 group relative ${
                        isActive 
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' 
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`}
                >
                    <i className={`fa-solid ${item.icon} w-6 text-center text-lg transition-transform group-hover:scale-110 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-white'}`}></i>
                    <span className="tracking-wide">{item.label}</span>
                    {isActive && <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white/20 rounded-l-full"></div>}
                </button>
            )
        })}
      </div>
    </aside>
  );
};
