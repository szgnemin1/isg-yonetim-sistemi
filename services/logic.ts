
import { TehlikeSinifi } from '../types';

// Tarih formatlama yardımcısı (YYYY-MM-DD -> DD.MM.YYYY)
export const formatDateTR = (dateString: string): string => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('tr-TR');
};

// Tarih ekleme yardımcısı
const addYears = (dateString: string, years: number): string => {
  const date = new Date(dateString);
  date.setFullYear(date.getFullYear() + years);
  return date.toISOString().split('T')[0];
};

const addMonths = (dateString: string, months: number): string => {
  const date = new Date(dateString);
  date.setMonth(date.getMonth() + months);
  return date.toISOString().split('T')[0];
};

// Eğitim Geçerlilik Süresi Hesaplama
export const calculateNextTrainingDate = (lastDate: string, hazardClass: TehlikeSinifi): string => {
  let yearsToAdd = 3; // Default Az Tehlikeli
  if (hazardClass === TehlikeSinifi.TEHLIKELI) yearsToAdd = 2;
  if (hazardClass === TehlikeSinifi.COK_TEHLIKELI) yearsToAdd = 1;
  
  return addYears(lastDate, yearsToAdd);
};

// Risk Analizi Geçerlilik Süresi Hesaplama
export const calculateNextRiskDate = (lastDate: string, hazardClass: TehlikeSinifi): string => {
  let yearsToAdd = 6; // Default Az Tehlikeli
  if (hazardClass === TehlikeSinifi.TEHLIKELI) yearsToAdd = 4;
  if (hazardClass === TehlikeSinifi.COK_TEHLIKELI) yearsToAdd = 2;

  return addYears(lastDate, yearsToAdd);
};

// Ekipman ve Kurul Toplantısı Hesaplama (Ay Bazlı)
export const calculateNextDateByMonth = (lastDate: string, periodMonths: number): string => {
  return addMonths(lastDate, periodMonths);
};

export const calculateNextEquipmentDate = calculateNextDateByMonth;

// Yaklaşan süre kontrolü (Gün)
export const getDaysRemaining = (targetDateStr: string): number => {
  const targetDate = new Date(targetDateStr);
  const today = new Date();
  const diffTime = targetDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export const isExpired = (targetDateStr: string): boolean => {
  return getDaysRemaining(targetDateStr) < 0;
};

export const isApproaching = (targetDateStr: string, daysThreshold: number = 30): boolean => {
  const days = getDaysRemaining(targetDateStr);
  return days >= 0 && days <= daysThreshold;
};
