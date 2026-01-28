import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = !app.isPackaged;

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 768,
    title: "İSG Takip Pro",
    frame: true, // Windows standart çerçevesini ve butonlarını geri getirir
    // İkon dosyası dist/icon.png veya public/icon.png yolunda olmalı
    icon: path.join(__dirname, isDev ? 'public' : 'dist', 'icon.png'),
    backgroundColor: '#0f172a',
    webPreferences: {
      // ÖNEMLİ: ESM projelerinde preload.js yerine preload.cjs kullanılır
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webSecurity: false // Yerel dosya ve internet erişimi için
    },
    autoHideMenuBar: true // Dosya menüsünü gizle, sadece kapatma tuşları kalsın
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    console.log("Geliştirme modu: http://localhost:5173 yükleniyor...");
  } else {
    // Üretim modunda dist klasöründeki index.html yüklenir
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }

  // --- WINDOWS PENCERE KONTROLLERİ (IPC) ---
  // Sistem çerçevesi kullanıldığı için bu IPC dinleyicilerine artık gerek yoktur, 
  // ancak preload.js hatası vermemesi için boş bırakılabilir veya kaldırılabilir.
  // Güvenlik için tutuyoruz ama işlevsiz kalacaklar.
  ipcMain.on('window-min', () => mainWindow.minimize());
  ipcMain.on('window-max', () => {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  });
  ipcMain.on('window-close', () => mainWindow.close());
  
  // Pencere durumunu renderer'a bildir (ikon değişimi için)
  mainWindow.on('maximize', () => mainWindow.webContents.send('window-state-change', 'maximized'));
  mainWindow.on('unmaximize', () => mainWindow.webContents.send('window-state-change', 'normal'));
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});