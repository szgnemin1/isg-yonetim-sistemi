
import { Firma, Calisan, RiskAnalizi, Ekipman, CalendarEvent, User, TehlikeSinifi, AppSettings, KurulToplantisi } from '../types';

// --- YEREL DEPOLAMA YARDIMCILARI ---
const getLocal = <T>(key: string, def: T): T => {
    try {
        const val = localStorage.getItem(`isg_data_${key}`);
        return val ? JSON.parse(val) : def;
    } catch (e) {
        console.error("Veri okuma hatası:", e);
        return def;
    }
};

const setLocal = (key: string, data: any) => {
    try {
        localStorage.setItem(`isg_data_${key}`, JSON.stringify(data));
    } catch (e) {
        console.error("Veri yazma hatası:", e);
    }
};

export interface LoginResponse {
  success: boolean;
  token?: string;
  user?: User;
  message?: string;
}

export interface AllDataResponse {
  firms: Firma[];
  employees: Calisan[];
  equipments: Ekipman[];
  risks: RiskAnalizi[];
  meetings: KurulToplantisi[];
  events: CalendarEvent[];
}

export interface ApiResponse {
  success: boolean;
  message?: string;
}

// --- STORAGE SERVICE ---
export const StorageService = {
  isOffline: () => true,

  // --- AUTH ---
  login: async (username: string, password: string): Promise<LoginResponse> => {
      await new Promise(r => setTimeout(r, 500));
      if (username === 'admin' && password === 'admin123') {
          return { 
              success: true, 
              token: 'local-admin-token', 
              user: { id: 'root-admin', username: 'admin', role: 'ADMIN', adSoyad: 'Sistem Yöneticisi' } 
          };
      }
      const users = getLocal<User[]>('users', []);
      const found = users.find(u => u.username === username && u.password === password);
      if (found) {
          return { success: true, token: 'local-user-token', user: found };
      }
      return { success: false, message: 'Hatalı kullanıcı adı veya şifre.' };
  },

  changePassword: async (userId: string, currentPass: string, newPass: string): Promise<ApiResponse> => {
      const users = getLocal<User[]>('users', []);
      if (userId === 'root-admin') return { success: true, message: 'Yönetici şifresi güncellendi (Simülasyon)' };
      const idx = users.findIndex(u => u.id === userId);
      if (idx > -1) {
          if (users[idx].password !== currentPass) return { success: false, message: 'Mevcut şifre hatalı' };
          users[idx].password = newPass;
          setLocal('users', users);
          return { success: true };
      }
      return { success: false, message: 'Kullanıcı bulunamadı' };
  },

  // --- DATA ---
  getAllData: async (): Promise<AllDataResponse> => {
    return {
        firms: getLocal('firms', []),
        employees: getLocal('employees', []),
        equipments: getLocal('equipments', []),
        risks: getLocal('risks', []),
        meetings: getLocal('meetings', []),
        events: getLocal('events', [])
    };
  },

  // --- USER MANAGEMENT ---
  getUsers: async (): Promise<User[]> => {
    return getLocal('users', []);
  },

  saveUser: async (user: Partial<User>): Promise<ApiResponse> => {
    const users = getLocal<User[]>('users', []);
    if (user.id) {
        const idx = users.findIndex(u => u.id === user.id);
        if (idx > -1) users[idx] = { ...users[idx], ...user } as User;
    } else {
        users.push({ ...user, id: crypto.randomUUID() } as User);
    }
    setLocal('users', users);
    return { success: true };
  },

  deleteUser: async (id: string): Promise<ApiResponse> => {
      const users = getLocal<User[]>('users', []);
      setLocal('users', users.filter(u => u.id !== id));
      return { success: true };
  },

  // --- APP SETTINGS ---
  getSettings: (): AppSettings => {
      return getLocal<AppSettings>('settings', { autoReportDay: 5, autoReportTime: '17:00' }); // Default Cuma 17:00
  },
  
  saveSettings: (settings: AppSettings) => {
      setLocal('settings', settings);
  },

  getLastAlertDate: (): string | null => {
      return localStorage.getItem('isg_last_alert_date');
  },

  setLastAlertDate: (dateStr: string) => {
      localStorage.setItem('isg_last_alert_date', dateStr);
  },

  // --- ENTITY SAVERS ---
  saveFirms: async (data: Firma[]): Promise<void> => setLocal('firms', data),
  saveEmployees: async (data: Calisan[]): Promise<void> => setLocal('employees', data),
  saveRisks: async (data: RiskAnalizi[]): Promise<void> => setLocal('risks', data),
  saveMeetings: async (data: KurulToplantisi[]): Promise<void> => setLocal('meetings', data),
  saveEquipments: async (data: Ekipman[]): Promise<void> => setLocal('equipments', data),
  saveEvents: async (data: CalendarEvent[]): Promise<void> => setLocal('events', data),
  
  // --- SESSION ---
  setSession: (token: string, user: User) => {
      localStorage.setItem('isg_token', token);
      localStorage.setItem('isg_user', JSON.stringify(user));
  },
  getSession: () => {
      const token = localStorage.getItem('isg_token');
      const userStr = localStorage.getItem('isg_user');
      if(token && userStr) {
          try { return { token, user: JSON.parse(userStr) as User }; } 
          catch (e) { localStorage.clear(); return null; }
      }
      return null;
  },
  clearSession: () => {
      localStorage.removeItem('isg_token');
      localStorage.removeItem('isg_user');
  }
};
