
export enum TehlikeSinifi {
  AZ_TEHLIKELI = 'Az Tehlikeli',
  TEHLIKELI = 'Tehlikeli',
  COK_TEHLIKELI = 'Çok Tehlikeli',
}

export type UserRole = 'ADMIN' | 'USER' | 'SECRETARY';

export interface User {
  id: string;
  username: string;
  password?: string;
  role: UserRole;
  adSoyad: string;
  allowedFirmIds?: string[]; // Kullanıcının görmeye yetkili olduğu firma ID'leri (Sadece USER için anlamlı)
}

export type NotOncelik = 'DUSUK' | 'ORTA' | 'YUKSEK';

export interface FirmaNotu {
  id: string;
  baslik: string;
  icerik: string;
  tarih: string;
  oncelik: NotOncelik;
}

export interface Firma {
  id: string;
  ad: string;
  tehlikeSinifi: TehlikeSinifi;
  notlar?: string;
  gelismisNotlar?: FirmaNotu[];
}

export interface Calisan {
  id: string;
  firmaId: string;
  tcNo: string;
  adSoyad: string;
  sonEgitimTarihi: string;
  sonrakiEgitimTarihi: string;
  calismaDurumu?: 'AKTIF' | 'AYRILDI';
  cikisTarihi?: string; // İşten çıkış tarihi (Re-hiring kontrolü için)
  onayDurumu?: 'ONAYLANDI' | 'BEKLIYOR'; // Yeni onay mekanizması
}

export interface RiskAnalizi {
  id: string;
  firmaId: string;
  sonTarih: string;
  gecerlilikTarihi: string;
}

export interface KurulToplantisi {
  id: string;
  firmaId: string;
  sonToplantiTarihi: string;
  periyotAy: number; // 1, 2 veya 3
  sonrakiToplantiTarihi: string;
}

export interface Ekipman {
  id: string;
  firmaId: string;
  ad: string;
  sonKontrolTarihi: string;
  periyotAy: number;
  sonrakiKontrolTarihi: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  description?: string;
}

export interface AppSettings {
  autoReportDay: number; // 0: Pazar, 1: Pazartesi ... 5: Cuma
  autoReportTime: string; // "17:00" formatında
}

export interface SpecialDay {
    id: string;
    date: { month: number, day: number }; // JS Month (0-11)
    title: string;
    message: string;
    theme: 'RED' | 'TURQUOISE';
    icon: string;
    audio?: string; 
    backgroundImage?: string; // Arka plan resmi eklendi
}

export type Page = 'DASHBOARD' | 'FIRMALAR' | 'FIRMA_DETAY' | 'CALENDAR' | 'SETTINGS' | 'USERS';
