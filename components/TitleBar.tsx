
import React, { useState, useEffect } from 'react';

export const TitleBar: React.FC = () => {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    // Pencere durumunu dinle (ikon değişimi için)
    if ((window as any).electronAPI?.onWindowStateChange) {
        (window as any).electronAPI.onWindowStateChange((state: string) => {
            setIsMaximized(state === 'maximized');
        });
    }
  }, []);

  const handleMinimize = () => (window as any).electronAPI?.minimize();
  const handleMaximize = () => (window as any).electronAPI?.toggleMaximize();
  const handleClose = () => (window as any).electronAPI?.close();

  return (
    <div className="h-8 bg-[#0f172a] flex justify-between items-center select-none border-b border-slate-800" style={{ WebkitAppRegion: 'drag' } as any}>
      {/* Sol Taraf: İkon ve Başlık */}
      <div className="flex items-center gap-3 px-4 h-full">
        <div className="text-blue-500 text-xs">
            <i className="fa-solid fa-shield-halved"></i>
        </div>
        <span className="text-xs font-medium text-slate-400 tracking-wide font-sans">İSG Takip Pro</span>
      </div>

      {/* Sağ Taraf: Windows Kontrol Butonları */}
      <div className="flex h-full" style={{ WebkitAppRegion: 'no-drag' } as any}>
        <button 
            onClick={handleMinimize} 
            className="w-12 h-full flex items-center justify-center text-slate-400 hover:bg-slate-800 hover:text-white transition-colors focus:outline-none"
            title="Küçült"
        >
            <i className="fa-solid fa-minus text-[10px]"></i>
        </button>
        
        <button 
            onClick={handleMaximize} 
            className="w-12 h-full flex items-center justify-center text-slate-400 hover:bg-slate-800 hover:text-white transition-colors focus:outline-none"
            title={isMaximized ? "Aşağı Geri Getir" : "Ekranı Kapla"}
        >
            {isMaximized ? (
                <i className="fa-regular fa-window-restore text-[10px]"></i>
            ) : (
                <i className="fa-regular fa-square text-[10px]"></i>
            )}
        </button>
        
        <button 
            onClick={handleClose} 
            className="w-12 h-full flex items-center justify-center text-slate-400 hover:bg-red-600 hover:text-white transition-colors focus:outline-none group"
            title="Kapat"
        >
            <i className="fa-solid fa-xmark text-sm group-hover:text-white"></i>
        </button>
      </div>
    </div>
  );
};
