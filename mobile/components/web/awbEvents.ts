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
  if (!source) {
    source = new EventSource(eventsUrl);
    source.addEventListener('snapshot', (event) => {
      try {
        const payload = JSON.parse((event as MessageEvent).data) as AwbSnapshot;
        listeners.forEach((l) => l(payload));
      } catch { /* snapshot invalid, abaikan */ }
    });
  }
  return () => {
    listeners.delete(listener);
    // Tutup koneksi hanya kalau tidak ada lagi pemakai (mis. keluar dashboard)
    if (listeners.size === 0 && source) {
      source.close();
      source = null;
    }
  };
}
