import dayjs from 'dayjs';

// Format date to DD/MM/YYYY
export const formatDate = (date: string | Date): string => {
  return dayjs(date).format('DD/MM/YYYY');
};

// Format date to YYYY-MM-DD (for API calls)
export const formatDateForAPI = (date: string | Date): string => {
  return dayjs(date).format('YYYY-MM-DD');
};

// Format date time to DD/MM/YYYY HH:mm:ss
export const formatDateTime = (date: string | Date): string => {
  return dayjs(date).format('DD/MM/YYYY HH:mm:ss');
};

// Format time duration from seconds to HH:MM:SS
export const formatDuration = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  
  return [h, m, s]
    .map(v => v.toString().padStart(2, '0'))
    .join(':');
};

// Format number with thousand separators
export const formatNumber = (num: number): string => {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

// Truncate text to specified length
export const truncateText = (text: string, length: number): string => {
  if (text.length <= length) return text;
  return text.substring(0, length) + '...';
};

// Format currency (IDR example)
export const formatCurrency = (amount: number, currency: string = 'IDR'): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: currency,
  }).format(amount);
};