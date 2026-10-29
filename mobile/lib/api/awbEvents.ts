/**
 * SSE bersama untuk mobile (react-native-sse).
 * List screen subscribe snapshot AWB realtime — refresh saat backend publish event.
 */
import EventSource from 'react-native-sse';

export type AwbRowSnapshot = {
  id: string;
  airwaybill_number?: string | null;
  hawb?: string | null;
  photo_airwaybill?: string | null;
  status?: string | null;
  created_at?: string;
  updated_at?: string;
  xray_photos_count?: number | null;
  colly_label?: string | null;
  colly_total?: number | null;
};

type AwbSnapshot = { data?: AwbRowSnapshot[]; paginatorInfo?: { total?: number } };
type Listener = (payload: AwbSnapshot) => void;

let source: EventSource<'snapshot'> | null = null;
const listeners = new Set<Listener>();

const EVENTS_URL =
  (process.env.EXPO_PUBLIC_API_BASE_URL || 'https://xray.paratekno.com/api').replace(/\/api$/, '') + '/api/awb-events';

function ensureSource() {
  if (source) return;
  source = new EventSource<'snapshot'>(EVENTS_URL, { timeout: 0, pollingInterval: 0 });
  source.addEventListener('snapshot', (event) => {
    try {
      const payload = JSON.parse((event as { data?: string }).data ?? '{}') as AwbSnapshot;
      listeners.forEach((l) => l(payload));
    } catch { /* snapshot invalid, abaikan */ }
  });
  source.addEventListener('error', () => { /* biarkan reconnect otomatis */ });
}

export function subscribeAwbSnapshot(listener: Listener): () => void {
  listeners.add(listener);
  ensureSource();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && source) {
      source.removeAllEventListeners();
      source.close();
      source = null;
    }
  };
}
