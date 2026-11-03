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

let source: EventSource | null = null;
const listeners = new Set<Listener>();

const eventsUrl = `${API_ORIGIN}/api/awb-events`;

export function subscribeAwbSnapshot(listener: Listener): () => void {
  listeners.add(listener);
  // Selalu buka koneksi baru saat ada subscriber masuk: server mengirim snapshot
  // awal pada connect, jadi tiap navigasi ke halaman (scan/dashboard) mendapat
  // data waiting-list segar tanpa menunggu perubahan data berikutnya.
  if (source) {
    source.close();
    source = null;
  }
  source = new EventSource(eventsUrl);
  source.addEventListener('snapshot', (event) => {
    try {
      const raw = JSON.parse((event as MessageEvent).data);
      // Snapshot bisa array langsung (format baru) atau { data: [...] } (lama)
      const payload: AwbSnapshot = Array.isArray(raw) ? { data: raw } : raw;
      listeners.forEach((l) => l(payload));
    } catch { /* snapshot invalid, abaikan */ }
  });
  return () => {
    listeners.delete(listener);
    // Tutup koneksi hanya kalau tidak ada lagi pemakai (mis. keluar dashboard)
    if (listeners.size === 0 && source) {
      source.close();
      source = null;
    }
  };
}
