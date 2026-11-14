/**
 * SSE bersama untuk mobile (react-native-sse).
 * List screen subscribe snapshot AWB realtime — refresh saat backend publish event.
 */
import EventSource from 'react-native-sse';
import { API_ORIGIN } from '@/constants/api';
import { getGraphqlWarehouse } from '@/graphql/client';

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

const eventsUrl = () => `${API_ORIGIN}/api/awb-events?wh=${getGraphqlWarehouse()}`;

/** Ganti koneksi SSE ke gudang aktif — dipanggil saat login/logout user berbeda. */
export function resetAwbSnapshotSource() {
  if (source) {
    source.close();
    source = null;
  }
  if (listeners.size > 0) ensureSource();
}

function ensureSource() {
  if (source) return;
  source = new EventSource<'snapshot'>(eventsUrl(), { timeout: 0, pollingInterval: 0 });
  source.addEventListener('snapshot', (event) => {
    try {
      const raw = JSON.parse((event as { data?: string }).data ?? '{}');
      const payload: AwbSnapshot = Array.isArray(raw) ? { data: raw } : raw;
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
