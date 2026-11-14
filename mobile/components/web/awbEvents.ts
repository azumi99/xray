/**
 * Satu koneksi SSE bersama untuk seluruh halaman web.
 *
 * Sebelumnya DashboardScreen dan ScanCapture masing-masing membuka
 * EventSource sendiri — backend menjawab dengan query snapshot penuh
 * tiap 2 detik PER KONEKSI, jadi makin banyak koneksi makin berat.
 * Modul ini membagi satu koneksi ke semua listener (ref-counted).
 */

import { API_ORIGIN } from '@/constants/api';

type AwbSnapshot = { data?: unknown[] };
type Listener = (payload: AwbSnapshot) => void;
type Warehouse = 'bgd' | 'cas';

// Satu koneksi SSE PER GUDANG (bgd/cas) — snapshot datang dari database
// gudang masing-masing (lihat AwbEventsController ?wh=).
const listeners: Record<Warehouse, Set<Listener>> = { bgd: new Set(), cas: new Set() };
const sources: Record<Warehouse, EventSource | null> = { bgd: null, cas: null };

export function subscribeAwbSnapshot(listener: Listener, warehouse: Warehouse = 'bgd'): () => void {
  listeners[warehouse].add(listener);
  // Selalu buka koneksi baru saat ada subscriber masuk: server mengirim snapshot
  // awal pada connect, jadi tiap navigasi ke halaman (scan/dashboard) mendapat
  // data waiting-list segar tanpa menunggu perubahan data berikutnya.
  if (sources[warehouse]) {
    sources[warehouse]!.close();
    sources[warehouse] = null;
  }
  const source = new EventSource(`${API_ORIGIN}/api/awb-events?wh=${warehouse}`);
  sources[warehouse] = source;
  source.addEventListener('snapshot', (event) => {
    try {
      const raw = JSON.parse((event as MessageEvent).data);
      // Snapshot bisa array langsung (format baru) atau { data: [...] } (lama)
      const payload: AwbSnapshot = Array.isArray(raw) ? { data: raw } : raw;
      listeners[warehouse].forEach((l) => l(payload));
    } catch { /* snapshot invalid, abaikan */ }
  });
  return () => {
    listeners[warehouse].delete(listener);
    // Tutup koneksi hanya kalau tidak ada lagi pemakai (mis. keluar dashboard)
    if (listeners[warehouse].size === 0 && sources[warehouse]) {
      sources[warehouse]!.close();
      sources[warehouse] = null;
    }
  };
}
