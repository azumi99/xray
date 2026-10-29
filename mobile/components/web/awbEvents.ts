/**
 * Satu koneksi SSE bersama untuk seluruh halaman web.
 *
 * Sebelumnya DashboardScreen dan ScanCapture masing-masing membuka
 * EventSource sendiri — backend menjawab dengan query snapshot penuh
 * tiap 2 detik PER KONEKSI, jadi makin banyak koneksi makin berat.
 * Modul ini membagi satu koneksi ke semua listener (ref-counted).
 */

type AwbSnapshot = { data?: unknown[] };
type Listener = (payload: AwbSnapshot) => void;

let source: EventSource | null = null;
const listeners = new Set<Listener>();

export function subscribeAwbSnapshot(listener: Listener): () => void {
  listeners.add(listener);
  if (!source) {
    source = new EventSource('/api/awb-events');
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
