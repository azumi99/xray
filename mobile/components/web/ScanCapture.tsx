import { gql, useMutation } from '@apollo/client';
import { useThemeStore } from '@/lib/store/themeStore';
import { subscribeAwbSnapshot } from '@/components/web/awbEvents';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

type Box = {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  trigger?: boolean;
  confidence?: number;
  source?: 'yolo' | 'blob';
};
type AwbRow = { id: string; airwaybill_number: string; status?: string; created_at?: string };
type SourceKind = 'screen' | 'camera';

const CAPTURE = gql`
  mutation Capture($topImage: String!, $sideImage: String!, $queueIndex: Int) {
    captureXrayPair(topImage: $topImage, sideImage: $sideImage, queueIndex: $queueIndex) { id airwaybill_number status }
  }
`;

const FRAME_WIDTH = 640;
const FRAME_HEIGHT = 360;
const DETECT_INTERVAL_MS = 250;
// Maksimum frame terbaik yang disimpan per panel (memori: ~50KB jpeg per entry)
const BEST_FRAMES_CAP = 16;
// Masa berlaku dedupe capture per indeks (backend restart → id mulai dari 1 lagi)
const CAPTURED_ID_TTL_MS = 3 * 60 * 1000;
// Same-origin (relative) supaya jalan di domain mana pun saat produksi
const VISION_URL = '/api/vision/detect';

/**
 * Engine per panel (top/side) di level module supaya stream & loop deteksi
 * TETAP BERJALAN saat user pindah screen (komponen unmount lalu mount lagi
 * tinggal re-attach, tanpa minta izin ulang).
 *
 * Catatan reload halaman: browser mematikan semua MediaStream saat reload,
 * jadi yang bisa disimpan hanya pilihan source (localStorage) untuk
 * auto-reconnect — kamera bisa otomatis, share screen wajib gesture user.
 */
class PanelEngine {
  key: string;
  stream: MediaStream | null = null;
  kind: SourceKind | null = null;
  deviceId: string | null = null;
  stopped = true;
  boxes: Box[] = [];
  error = '';
  private emptyCycles = 0;
  /** Frame terbaik per indeks objek (penuh di frame & area terbesar) — sumber crop capture
   *  presisi: trigger backend menyala saat objek SUDAH KELUAR kiri, jadi wajib pakai frame simpanan */
  private bestFrames = new Map<number, { frame: string; box: Box }>();
  /** Indeks yang sudah pernah di-capture — menjaga 1 objek = 1 capture walau backend trigger ulang */
  private capturedIds = new Map<number, number>();
  private handlers: { onTrigger?: (image: string, box?: Box, queueIndex?: number) => void; onFrame?: (image: string) => void } = {};
  private video: HTMLVideoElement;
  private canvas: HTMLCanvasElement;
  private uiVideo: HTMLVideoElement | null = null;
  private listeners = new Set<() => void>();
  private snap: EngineSnapshot;
  /** Panel tidak sedang dirender (user pindah screen) → deteksi dipause, stream tetap hidup */
  private visible = false;

  constructor(key: string) {
    this.key = key;
    // Video internal tersembunyi — tetap memutar walau UI panel sedang tidak dirender
    this.video = document.createElement('video');
    this.video.muted = true;
    this.video.playsInline = true;
    this.canvas = document.createElement('canvas');
    this.snap = { running: false, kind: null, boxes: [], error: '' };
  }

  // ---------- state eksternal untuk React ----------
  getSnapshot = (): EngineSnapshot => this.snap;
  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => { this.listeners.delete(fn); };
  };
  private emit() {
    this.snap = { running: !this.stopped, kind: this.kind, boxes: [...this.boxes], error: this.error };
    this.listeners.forEach((l) => l());
  }
  setHandlers(h: { onTrigger?: (image: string, box?: Box, queueIndex?: number) => void; onFrame?: (image: string) => void }) {
    this.handlers = h;
  }

  // ---------- kontrol stream ----------
  async start(kind: SourceKind, deviceId?: string | null) {
    this.stop(false);
    this.error = '';
    // Pilihan kamera per panel (top/samping bisa beda kamera)
    this.deviceId = kind === 'camera' ? (deviceId ?? localStorage.getItem(`awbxray.cam.${this.key}`) ?? null) : null;
    if (kind === 'camera' && this.deviceId) {
      localStorage.setItem(`awbxray.cam.${this.key}`, this.deviceId);
    }
    this.emit();
    try {
      const stream =
        kind === 'screen'
          ? await navigator.mediaDevices.getDisplayMedia({
              video: true,
              audio: false,
              // Preferensi picker: default ke Window (aplikasi luar Chrome), sembunyikan tab sendiri
              displaySurface: 'window',
              selfBrowserSurface: 'exclude',
              surfaceSwitching: 'include',
            } as DisplayMediaStreamOptions)
          : await navigator.mediaDevices.getUserMedia({
              video: this.deviceId
                ? { deviceId: { exact: this.deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
                : { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
              audio: false,
            });
      this.stream = stream;
      this.kind = kind;
      localStorage.setItem(`awbxray.src.${this.key}`, kind);
      this.video.srcObject = stream;
      await this.video.play();
      if (this.uiVideo) {
        this.uiVideo.srcObject = stream;
        void this.uiVideo.play();
      }
      stream.getVideoTracks()[0].onended = () => this.stop();
      this.stopped = false;
      this.emit();
      void this.loop();
    } catch {
      this.error = kind === 'screen' ? 'Gagal memulai share screen' : 'Gagal mengakses kamera (izin ditolak?)';
      this.emit();
    }
  }

  /** Ganti kamera saat panel sedang jalan dengan source kamera */
  async switchCamera(deviceId: string) {
    if (this.kind !== 'camera') return;
    await this.start('camera', deviceId);
  }

  /** Kamera yang sedang dipakai panel lain (biar tidak tabrakan pilihan) */
  static isDeviceInUseByOther(deviceId: string, self: PanelEngine): boolean {
    for (const e of engines.values()) {
      if (e !== self && e.deviceId === deviceId && !e.stopped) return true;
    }
    return false;
  }

  stop(clearSaved = true) {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.video.srcObject = null;
    this.stopped = true;
    this.kind = null;
    this.deviceId = null;
    this.boxes = [];
    this.bestFrames.clear();
    this.capturedIds.clear();
    if (clearSaved) localStorage.removeItem(`awbxray.src.${this.key}`);
    this.emit();
  }

  /** Dipanggil saat panel mount: kalau ada source tersimpan, coba sambung ulang otomatis */
  reconnect() {
    if (!this.stopped) return;
    const saved = localStorage.getItem(`awbxray.src.${this.key}`);
    // Kamera boleh auto (izin tersimpan di browser); share screen wajib gesture user
    if (saved === 'camera') void this.start('camera');
  }

  /** Daftarkan <video> milik UI (dipanggil mount/unmount panel) */
  attachVideo(el: HTMLVideoElement | null) {
    this.uiVideo = el;
    this.visible = el !== null;
    if (el && this.stream) {
      el.srcObject = this.stream;
      void el.play();
    }
  }

  /** Frame terbaik objek SIDE yang PUSAT-X-nya paling dekat dgn pusat-x box Top yang sama.
   *  Pairing posisi belt, bukan urutan indeks: jumlah box side bisa beda dgn top
   *  (2 parcel dempet di side jadi 1 blob) — indeks bergeser, posisi tidak. */
  getBestNearX(cxTop: number): { frame: string; box: Box } | undefined {
    let best: { frame: string; box: Box } | undefined;
    let bestDist = Infinity;
    for (const b of this.boxes) {
      const d = Math.abs(b.x + b.width / 2 - cxTop);
      if (d < bestDist) {
        bestDist = d;
        const bestFrame = this.bestFrames.get(b.id);
        if (bestFrame) best = bestFrame; // frame kosong = belum terekam → biarkan fallback terpakai
      }
    }
    return best;
  }

  /** Frame terbaik dari objek SIDE yang sedang aktif, urut kanan→kiri.
   *  Jangan memakai seluruh cache: objek lama bisa menggeser pasangan Top↔Side. */
  getBest(queueIndex: number): { frame: string; box: Box } | undefined {
    const active = [...this.boxes]
      .sort((a, b) => (b.x + b.width / 2) - (a.x + a.width / 2));
    const target = active[queueIndex];
    return target ? this.bestFrames.get(target.id) : undefined;
  }

  private async loop() {
    while (!this.stopped) {
      // Hemat CPU saat panel tidak terlihat: stream tetap hidup, tapi
      // tanpa capture frame/panggilan deteksi (YOLO/OpenCV di backend berat)
      if (!this.visible) {
        await new Promise((r) => setTimeout(r, 500));
        continue;
      }
      const el = this.video;
      const can = this.canvas;
      if (!el.videoWidth) {
        await new Promise((r) => setTimeout(r, DETECT_INTERVAL_MS));
        continue;
      }
      can.width = FRAME_WIDTH;
      can.height = FRAME_HEIGHT;
      const ctx = can.getContext('2d');
      if (!ctx) break;
      ctx.drawImage(el, 0, 0, FRAME_WIDTH, FRAME_HEIGHT);
      // Ambil frame BERSIH (tanpa garis) sebelum overlay digambar — dipakai untuk deteksi & capture
      const cleanFrame = can.toDataURL('image/jpeg', 0.9);
      this.handlers.onFrame?.(cleanFrame);
      try {
        const response = await fetch(VISION_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ source: this.key, imageBase64: cleanFrame }),
        });
        const result = await response.json();
        // Engine aktif: YOLO (utama) / OpenCV (fallback) — key `detections` selalu diisi
        const detected: Box[] = result?.detections ?? result?.yolo ?? result?.opencv ?? [];
        // Anti kedip: box dipertahankan beberapa cycle saat deteksi kosong sesaat
        if (detected.length > 0) {
          this.emptyCycles = 0;
          this.boxes = detected;
        } else {
          this.emptyCycles += 1;
          if (this.emptyCycles >= 4) this.boxes = [];
        }
        // Simpan frame terbaik per indeks: objek penuh di dalam frame & area terbesar.
        // Trigger capture datang saat objek sudah keluar sisi kiri (sudah tak terlihat),
        // sehingga crop WAJIB memakai frame simpanan ini supaya presisi.
        for (const d of detected) {
          const inside = d.x >= 2 && d.y >= 2 && d.x + d.width <= FRAME_WIDTH - 2 && d.y + d.height <= FRAME_HEIGHT - 2;
          const prev = this.bestFrames.get(d.id);
          if (inside && (!prev || d.width * d.height > prev.box.width * prev.box.height)) {
            this.bestFrames.set(d.id, { frame: cleanFrame, box: d });
            if (this.bestFrames.size > BEST_FRAMES_CAP) {
              const oldest = this.bestFrames.keys().next().value;
              if (oldest !== undefined && oldest !== d.id) this.bestFrames.delete(oldest);
            }
          }
        }
        const now = Date.now();
        for (const [id, at] of this.capturedIds) {
          if (now - at > CAPTURED_ID_TTL_MS) this.capturedIds.delete(id);
        }
        // Urutan antrian mengikuti posisi visual: objek paling KANAN = indeks pertama.
        // ID tracking tetap dipakai untuk deduplikasi, bukan untuk menentukan urutan AWB.
        const triggered = detected
          .filter((b) => b.trigger)
          .sort((a, b) => (b.x + b.width / 2) - (a.x + a.width / 2));
        for (const trig of triggered) {
          // Indeks unik menjaga 1 objek = 1 capture: indeks yang sudah pernah di-capture dilewati
          if (this.capturedIds.has(trig.id)) continue;
          this.capturedIds.set(trig.id, now);
          const best = this.bestFrames.get(trig.id);
          this.bestFrames.delete(trig.id);
          // queueIndex = id objek - 1: objek ke-N (indeks unik bentuk+posisi) ↔ AWB waiting ke-N
          this.handlers.onTrigger?.(best?.frame ?? cleanFrame, best?.box ?? trig, Math.max(0, (trig.id ?? 1) - 1));
        }
      } catch {
        this.emptyCycles += 1;
        if (this.emptyCycles >= 4) this.boxes = [];
      }
      this.emit();
    }
  }
}

type EngineSnapshot = { running: boolean; kind: SourceKind | null; boxes: Box[]; error: string };

const engines = new Map<string, PanelEngine>();
const getEngine = (key: string) => {
  let e = engines.get(key);
  if (!e) {
    e = new PanelEngine(key);
    engines.set(key, e);
  }
  return e;
};

/**
 * Mapping label box (urutan objek) → nomor AWB antrian waiting.
 * Objek ke-1 yang trigger = AWB waiting pertama, dst (FIFO sesuai antrian).
 * Di-update tiap snapshot SSE oleh ScanCapture.
 */
const boxLabels = new Map<string, string[]>();
let labelVersion = 0;
const getBoxLabels = (key: string): string[] => boxLabels.get(key) ?? [];
const setBoxLabels = (key: string, labels: string[]) => {
  boxLabels.set(key, labels);
  labelVersion += 1;
};

function CapturePanel({
  title,
  source,
  onTrigger,
  onFrame,
}: {
  title: string;
  source: string;
  onTrigger: (image: string, box?: Box, queueIndex?: number) => void;
  onFrame: (image: string) => void;
}) {
  const engine = useMemo(() => getEngine(source), [source]);
  const video = useRef<HTMLVideoElement>(null);
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';
  const [snap, setSnap] = useState<EngineSnapshot>(engine.getSnapshot());

  // Ikuti state engine (stream, boxes, error) — termasuk saat berjalan di background
  useEffect(() => engine.subscribe(() => setSnap(engine.getSnapshot())), [engine]);

  // Handler selalu fresh setiap render (menghindari stale closure)
  useEffect(() => {
    engine.setHandlers({ onTrigger, onFrame });
  });

  // Mount: re-attach video UI + coba reconnect otomatis dari pilihan tersimpan
  useEffect(() => {
    engine.attachVideo(video.current);
    engine.reconnect();
    return () => { engine.attachVideo(null); };
  }, [engine]);

  // Daftar kamera untuk pemilihan per panel (label baru terlihat setelah izin diberikan)
  const [cameras, setCameras] = useState<Array<{ deviceId: string; label: string }>>([]);
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) return;
    void navigator.mediaDevices.enumerateDevices().then((all) => {
      setCameras(all
        .filter((d) => d.kind === 'videoinput')
        .map((d, i) => ({ deviceId: d.deviceId, label: d.label || `Camera ${i + 1}` })));
    });
  }, [snap.running]);

  return (
    <View style={{ flex: 1, minWidth: 280, backgroundColor: isDark ? '#111827' : '#FFFFFF', borderWidth: 1, borderColor: isDark ? '#111827' : '#E5E7EB', borderRadius: 12, overflow: 'hidden' }}>
      <Text style={{ color: isDark ? '#fff' : '#111827', padding: 12, fontWeight: '700' }}>
        {title} · {snap.running ? (snap.kind === 'camera' ? 'CAMERA' : 'TRACKING') : 'IDLE'}
      </Text>
      <View style={{ aspectRatio: 16 / 9, position: 'relative', backgroundColor: '#000' }}>
        <video ref={video} muted playsInline style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        {snap.boxes.map((b, i) => {
          // Nomor visual mengikuti urutan kanan→kiri; ID tracker tetap internal.
          const visualIndex = [...snap.boxes]
            .sort((a, z) => (z.x + z.width / 2) - (a.x + a.width / 2))
            .findIndex((x) => x.id === b.id);
          const label = getBoxLabels(source)[visualIndex];
          return (
            <View
              key={`${labelVersion}-${i}`}
              style={{
                position: 'absolute',
                left: `${(b.x / FRAME_WIDTH) * 100}%`,
                top: `${(b.y / FRAME_HEIGHT) * 100}%`,
                width: `${(b.width / FRAME_WIDTH) * 100}%`,
                height: `${(b.height / FRAME_HEIGHT) * 100}%`,
                borderWidth: 3,
                borderColor: b.trigger ? '#4ADE80' : '#38BDF8',
              }}
            >
              <Text style={{ color: '#fff', backgroundColor: b.trigger ? '#16A34A' : '#0284C7', paddingHorizontal: 5 }}>
                {label ? `#${visualIndex + 1} ${label}` : `#${visualIndex + 1}`}
              </Text>
            </View>
          );
        })}
      </View>
      {snap.error ? (
        <Text style={{ paddingHorizontal: 12, paddingBottom: 4, fontSize: 11, color: '#EF4444' }}>{snap.error}</Text>
      ) : null}
      <View style={{ flexDirection: 'row', gap: 8, margin: 12, marginTop: 8 }}>
        {snap.running ? (
          <TouchableOpacity onPress={() => engine.stop()} style={{ flex: 1, padding: 10, backgroundColor: '#DC2626', borderRadius: 8, alignItems: 'center' }}>
            <Text style={{ color: '#fff' }}>Stop</Text>
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity onPress={() => engine.start('screen')} style={{ flex: 1, padding: 10, backgroundColor: '#0284C7', borderRadius: 8, alignItems: 'center' }}>
              <Text style={{ color: '#fff' }}>Share Screen</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => engine.start('camera')} style={{ flex: 1, padding: 10, backgroundColor: '#16A34A', borderRadius: 8, alignItems: 'center' }}>
              <Text style={{ color: '#fff' }}>Camera</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
      {snap.running && snap.kind === 'camera' && cameras.length > 1 ? (
        <View style={{ paddingHorizontal: 12, paddingBottom: 12, gap: 4 }}>
          <Text style={{ fontSize: 10.5, fontWeight: '700', letterSpacing: 0.4, color: isDark ? '#64748B' : '#94A3B8' }}>
            KAMERA ({title.toUpperCase()})
          </Text>
          <select
            value={engine.deviceId ?? ''}
            onChange={(e) => void engine.switchCamera(e.target.value)}
            style={{ width: '100%', padding: '7px 9px', fontSize: 12.5, borderRadius: 8, border: `1px solid ${isDark ? '#374151' : '#E5E7EB'}`, backgroundColor: isDark ? '#111827' : '#FFFFFF', color: isDark ? '#E5E7EB' : '#111827' }}
          >
            {cameras.map((cam) => (
              <option key={cam.deviceId} value={cam.deviceId}>
                {cam.label}{PanelEngine.isDeviceInUseByOther(cam.deviceId, engine) ? ' · dipakai panel lain' : ''}
              </option>
            ))}
          </select>
        </View>
      ) : null}
    </View>
  );
}

export function ScanCapture() {
  const [capture] = useMutation(CAPTURE);
  const topFrame = useRef('');
  const sideFrame = useRef('');
  const sideBox = useRef<Box | undefined>(undefined);
  // Antrian capture diurutkan per indeks objek — capture berdasarkan urutan indeksnya
  const captureQueue = useRef<Array<{ image: string; box?: Box; queueIndex: number }>>([]);
  const pumping = useRef(false);
  const [waiting, setWaiting] = useState<AwbRow[]>([]);
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';

  // Data AWB via SSE realtime — satu koneksi bersama (lihat awbEvents.ts)
  useEffect(
    () =>
      subscribeAwbSnapshot((payload) => {
        setWaiting(((payload?.data ?? []) as AwbRow[]).filter((item) => item.status === 'waiting'));
      }),
    [],
  );

  const current = waiting[0];

  // Waiting list urutan ascending berdasarkan waktu (paling lama diproses lebih dulu)
  const waitingAsc = [...waiting]
    .filter((item) => item.status === 'waiting')
    .sort((a, b) => new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime());

  // Label box kedua panel = antrian AWB waiting (objek ke-N ↔ AWB ke-N)
  useEffect(() => {
    const labels = waitingAsc.map((w) => w.airwaybill_number);
    setBoxLabels('top', labels);
    setBoxLabels('side', labels);
  }, [waiting.map((w) => `${w.id}:${w.status}`).join(',')]);

  /** Crop frame ke area objek (+ margin 5%) supaya capture presisi sesuai objeknya */
  const cropToBox = (frame: string, box: Box | undefined): Promise<string> => {
    if (!box) return Promise.resolve(frame);
    try {
      const img = new Image();
      const src = frame;
      // sinkron via data URL tidak bisa — pakai canvas langsung dari koordinat frame standar
      const margin = 0.12;
      const x = Math.max(0, box.x - box.width * margin);
      const y = Math.max(0, box.y - box.height * margin);
      const w = Math.min(FRAME_WIDTH - x, box.width * (1 + margin * 2));
      const h = Math.min(FRAME_HEIGHT - y, box.height * (1 + margin * 2));
      const can = document.createElement('canvas');
      can.width = Math.round(w);
      can.height = Math.round(h);
      const ctx = can.getContext('2d');
      if (!ctx) return Promise.resolve(src);
      const base = document.createElement('canvas');
      base.width = FRAME_WIDTH;
      base.height = FRAME_HEIGHT;
      const bctx = base.getContext('2d');
      if (!bctx) return Promise.resolve(src);
      // gambarkan frame asli lalu crop — butuh decode async
      return new Promise<string>((resolve) => {
        img.onload = () => {
          bctx.drawImage(img, 0, 0, FRAME_WIDTH, FRAME_HEIGHT);
          ctx.drawImage(base, x, y, w, h, 0, 0, can.width, can.height);
          resolve(can.toDataURL('image/jpeg', 0.9));
        };
        img.onerror = () => resolve(src);
        img.src = src;
      });
    } catch {
      return Promise.resolve(frame);
    }
  };

  /** Proses antrian capture satu per satu, selalu ambil indeks terkecil dulu
   *  (capture berdasarkan urutan indeks objek). Satu job gagal tidak menghentikan antrian. */
  const pumpQueue = async () => {
    if (pumping.current) return;
    pumping.current = true;
    try {
      while (captureQueue.current.length > 0) {
        captureQueue.current.sort((a, b) => a.queueIndex - b.queueIndex);
        const job = captureQueue.current.shift()!;
        // Pasangan tampak samping: objek side yang PUSAT-X-nya paling dekat dengan objek top
        // yang di-capture (belt sama → posisi horizontal ±sama di kedua kamera).
        // Jatuh kembali ke frame side terakhir bila side belum sempat merekam.
        const sideBest = job.box
          ? engines.get('side')?.getBestNearX(job.box.x + job.box.width / 2)
          : engines.get('side')?.getBest(job.queueIndex);
        const topImage = await cropToBox(job.image, job.box);
        const sideImage = await cropToBox(sideBest?.frame ?? sideFrame.current, sideBest?.box ?? sideBox.current);
        try {
          await capture({ variables: { topImage, sideImage, queueIndex: job.queueIndex } });
          // Queue waiting diperbarui otomatis via SSE (backend publish event setelah capture)
        } catch (error) {
          console.error('[XRay] capture failed', error);
        }
      }
    } finally {
      pumping.current = false;
    }
  };

  const onTopTrigger = (image: string, box?: Box, queueIndex?: number) => {
    captureQueue.current.push({ image, box, queueIndex: queueIndex ?? 0 });
    void pumpQueue();
  };

  return (
    <View style={{ gap: 16 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
        <CapturePanel title="X-ray Top" source="top" onTrigger={onTopTrigger} onFrame={(image) => { topFrame.current = image; }} />
        <CapturePanel
          title="X-ray Side"
          source="side"
          onTrigger={() => {}}
          onFrame={(image) => {
            sideFrame.current = image;
            // box terakhir yang terdeteksi di panel samping → crop fit saat capture
            const e = engines.get('side');
            sideBox.current = e?.boxes?.[0];
          }}
        />
      </View>
      <Text style={{ color: '#64748B' }}>
        {current ? `Next: ${current.airwaybill_number}` : 'No AWB waiting'}
      </Text>

      {/* Waiting List — ascending berdasarkan waktu */}
      <View style={{ borderWidth: 1, borderColor: isDark ? '#1F2937' : '#E5E7EB', borderRadius: 12, overflow: 'hidden', backgroundColor: isDark ? '#111827' : '#FFFFFF' }}>
        <View style={{ flexDirection: 'row', backgroundColor: isDark ? '#0F1A2E' : '#F1F5F9', borderBottomWidth: 1, borderBottomColor: isDark ? '#1F2937' : '#E5E7EB', paddingHorizontal: 14, paddingVertical: 10 }}>
          {[
            { label: 'NO', flex: 0.5 },
            { label: 'NO. AWB', flex: 2 },
            { label: 'WAKTU', flex: 1.5 },
            { label: 'STATUS', flex: 0.8 },
          ].map((col) => (
            <Text key={col.label} style={{ flex: col.flex, fontSize: 10.5, fontWeight: '800', letterSpacing: 0.5, color: '#94A3B8' }}>
              {col.label}
            </Text>
          ))}
        </View>
        {waitingAsc.length === 0 ? (
          <View style={{ paddingVertical: 32, alignItems: 'center' }}>
            <Text style={{ color: isDark ? '#64748B' : '#6B7280', fontSize: 12.5 }}>No AWB waiting</Text>
          </View>
        ) : (
          waitingAsc.map((item, index) => (
            <View
              key={item.id}
              style={{
                flexDirection: 'row',
                paddingHorizontal: 14,
                paddingVertical: 10,
                backgroundColor: index % 2 === 1 ? (isDark ? '#0D1526' : '#F8FAFC') : 'transparent',
                borderTopWidth: 1,
                borderTopColor: isDark ? '#1F2937' : '#E5E7EB',
              }}
            >
              <Text style={{ flex: 0.5, fontSize: 12.5, color: isDark ? '#64748B' : '#6B7280' }}>{index + 1}</Text>
              <Text style={{ flex: 2, fontSize: 12.5, fontWeight: '700', color: isDark ? '#F9FAFB' : '#111827' }}>{item.airwaybill_number}</Text>
              <Text style={{ flex: 1.5, fontSize: 12.5, color: isDark ? '#CBD5E1' : '#374151' }}>
                {item.created_at ? new Date(item.created_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'medium' }) : '-'}
              </Text>
              <View style={{ flex: 0.8, alignItems: 'flex-start' }}>
                <View style={{ backgroundColor: 'rgba(245, 158, 11, 0.12)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                  <Text style={{ fontSize: 10, fontWeight: '800', letterSpacing: 0.6, color: '#D97706' }}>WAITING</Text>
                </View>
              </View>
            </View>
          ))
        )}
      </View>
    </View>
  );
}
