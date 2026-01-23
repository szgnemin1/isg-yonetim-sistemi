
import React from 'react';
import { Page, User } from '../types';

interface NavbarProps {
  activePage: Page;
  setPage: (page: Page) => void;
  user: User;
}

export const Navbar: React.FC<NavbarProps> = ({ activePage, setPage, user }) => {
  const menuItems: { id: Page; label: string; icon: string; hidden?: boolean }[] = [
    { id: 'DASHBOARD', label: 'Genel Bakış', icon: 'fa-chart-pie' },
    { id: 'FIRMALAR', label: 'Firmalar', icon: 'fa-building' },
    { id: 'CALENDAR', label: 'Takvim', icon: 'fa-calendar-days' },
    // { id: 'USERS', label: 'Kullanıcılar', icon: 'fa-users-gear', hidden: true }, // Login kalktığı için gizlendi
    { id: 'SETTINGS', label: 'Ayarlar', icon: 'fa-gear' },
  ];

  return (
    <div className="w-full bg-slate-900/90 backdrop-blur-xl border-b border-slate-800 px-6 h-16 flex items-center justify-center z-50 flex-shrink-0 sticky top-0 transition-all">
      {/* Navigasyon */}
      <nav className="flex items-center gap-1 bg-slate-800/40 p-1 rounded-lg border border-white/5 overflow-x-auto custom-scrollbar">
        {menuItems.map((item) => {
            if (item.hidden) return null;
            const isActive = activePage === item.id || (activePage === 'FIRMA_DETAY' && item.id === 'FIRMALAR');
            
            return (
              <button
                key={item.id}
                onClick={() => setPage(item.id)}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-md transition-all duration-200 text-xs font-semibold whitespace-nowrap outline-none ${
                  isActive
                    ? 'bg-slate-700 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/30'
                }`}
              >
                <i className={`fa-solid ${item.icon} ${isActive ? 'text-blue-400' : 'text-slate-500'} text-[10px]`}></i>
                <span>{item.label}</span>
              </button>
            );
        })}
      </nav>
    </div>
  );
};
