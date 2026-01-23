
import React from 'react';
import { Page } from '../types';

interface SidebarProps {
  activePage: Page;
  setPage: (page: Page) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activePage, setPage }) => {
  const menuItems: { id: Page; label: string; icon: string }[] = [
    { id: 'DASHBOARD', label: 'Genel Bakış', icon: 'fa-chart-pie' },
    { id: 'FIRMALAR', label: 'Firmalar', icon: 'fa-building' },
    { id: 'CALENDAR', label: 'Takvim', icon: 'fa-calendar-days' },
    { id: 'REPORTS', label: 'Raporlar', icon: 'fa-file-pdf' },
    { id: 'SETTINGS', label: 'Ayarlar & Yedek', icon: 'fa-gear' },
  ];

  return (
    <div className="w-64 bg-slate-850 text-slate-200 h-screen flex flex-col flex-shrink-0 shadow-xl z-20 border-r border-slate-800">
      <div className="p-6 border-b border-slate-800 flex items-center gap-3">
        <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center shadow-lg shadow-blue-900/40">
            <i className="fa-solid fa-helmet-safety text-white"></i>
        </div>
        <h1 className="text-xl font-bold tracking-tight text-white">İSG Takip Pro</h1>
      </div>
      
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setPage(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group border border-transparent ${
              (activePage === item.id || (activePage === 'FIRMA_DETAY' && item.id === 'FIRMALAR'))
                ? 'bg-blue-900/40 text-blue-100 border-blue-800/50 shadow-[0_0_15px_rgba(59,130,246,0.15)]'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <i className={`fa-solid ${item.icon} w-5 text-center transition-transform group-hover:scale-110 ${
                (activePage === item.id) ? 'text-blue-400' : 'text-slate-500 group-hover:text-white'
            }`}></i>
            <span className="font-medium tracking-wide">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800 bg-slate-850">
          <div className="text-[10px] text-center text-slate-600 uppercase tracking-widest font-bold">
            v1.0.0 &bull; True Dark
          </div>
      </div>
    </div>
  );
};
