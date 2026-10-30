// API base URL configuration
// Nilai di-inline saat build dari .env.development / .env.production (lihat .env.example).
// Fallback ke URL produksi supaya salah env tidak mengarah ke host yang tidak ada.
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://xray.paratekno.com/api';

// Origin API (tanpa path /api) — dipakai untuk endpoint turunan seperti SSE & vision
export const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '');
