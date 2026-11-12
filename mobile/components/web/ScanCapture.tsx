import { gql, useMutation } from '@apollo/client';
import { useThemeStore } from '@/lib/store/themeStore';
import { subscribeAwbSnapshot } from '@/components/web/awbEvents';
import { API_ORIGIN } from '@/constants/api';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Text, TouchableOpacity, View } from 'react-native';

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
type AwbRow = {
  id: string;
  airwaybill_number: string;
  hawb?: string | null;
  status?: string;
  created_at?: string;
  part?: number | null;
  colly_label?: string | null;
  colly_total?: number | null;
  hostawb?: { airlinesCode?: string | null; flightNo?: string | null; origin?: string | null } | null;
};
type SourceKind = 'screen' | 'camera';

const CAPTURE = gql`
  mutation Capture($topImage: String!, $sideImage: String!, $queueIndex: Int) {
    captureXrayPair(topImage: $topImage, sideImage: $sideImage, queueIndex: $queueIndex) { id airwaybill_number status }
  }
`;

const FRAME_WIDTH = 1280;
const FRAME_HEIGHT = 720;
// Backend mendeteksi di ruang 640x360; skala box ke resolusi frame penuh
const BOX_SCALE = FRAME_WIDTH / 640;
const DETECT_INTERVAL_MS = 250;
// Maksimum frame terbaik yang disimpan per panel (memori: ~50KB jpeg per entry)
const BEST_FRAMES_CAP = 16;
// Masa berlaku dedupe capture per indeks (backend restart → id mulai dari 1 lagi)
const CAPTURED_ID_TTL_MS = 3 * 60 * 1000;
const VISION_URL = `${API_ORIGIN}/api/vision/detect`;

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
  private bestFrames = new Map<number, { frame: string; box: Box; scale?: number }>();
  /** Indeks yang sudah pernah di-capture — menjaga 1 objek = 1 capture walau backend trigger ulang */
  private capturedIds = new Map<number, number>();
  /** Hasil capture selesai per panel, bernomor urut objek — dipasangkan seq top ↔ seq side */
  private completedQueue: Array<{ frame: string; box: Box; ts: number; seq: number }> = [];
  /** Urutan trigger sesi ini — objek ke-N yang selesai ↔ AWB waiting ke-N (id ASC), bukan id tracker */
  private triggerSeq = 0;
  /** Guard pipelined: hanya satu POST detect in-flight */
  private inflight = false;
  private handlers: { onTrigger?: (image: string, box?: Box, queueIndex?: number) => void; onFrame?: (image: string) => void } = {};
  private video: HTMLVideoElement;
  private canvas: HTMLCanvasElement;
  private hires: HTMLCanvasElement | null = null;
  /** ROI area X-ray murni (rasio 0..1) — di luar ROI diberi mask hitam sebelum inferensi
   *  supaya objek yang menempel tepi bawah (UI viewer) terdeteksi sebagai objek edge */
  roi: { x: number; y: number; w: number; h: number } | null = null;
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
    try {
      const saved = localStorage.getItem(`xray-roi-${key}`);
      if (saved) this.roi = JSON.parse(saved);
    } catch { /* abaikan */ }
  }

  setRoi(roi: { x: number; y: number; w: number; h: number } | null) {
    // Abaikan ROI tidak valid (terlalu kecil → berisiko menutup seluruh frame)
    if (roi && (roi.w < 0.05 || roi.h < 0.05)) roi = null;
    this.roi = roi;
    try {
      if (roi) localStorage.setItem(`xray-roi-${this.key}`, JSON.stringify(roi));
      else localStorage.removeItem(`xray-roi-${this.key}`);
    } catch { /* abaikan */ }
    this.emit();
  }

  /** Mask hitam di luar ROI — efektif "crop area X-ray murni" untuk inferensi
   *  tanpa mengubah ruang koordinat (overlay & box tetap akurat) */
  private applyRoiMask(ctx: CanvasRenderingContext2D) {
    const r = this.roi;
    if (!r) return;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, FRAME_WIDTH, r.y * FRAME_HEIGHT);
    ctx.fillRect(0, (r.y + r.h) * FRAME_HEIGHT, FRAME_WIDTH, FRAME_HEIGHT);
    ctx.fillRect(0, r.y * FRAME_HEIGHT, r.x * FRAME_WIDTH, r.h * FRAME_HEIGHT);
    ctx.fillRect((r.x + r.w) * FRAME_WIDTH, r.y * FRAME_HEIGHT, FRAME_WIDTH, r.h * FRAME_HEIGHT);
  }

  /** Mean luminance cepat (sampler 16x9) — mendeteksi frame hitam total akibat ROI salah */
  private frameMeanLum(src: HTMLCanvasElement): number {
    if (!PanelEngine.sampler) PanelEngine.sampler = document.createElement('canvas');
    const s = PanelEngine.sampler;
    s.width = 16; s.height = 9;
    const sctx = s.getContext('2d');
    if (!sctx) return 255;
    sctx.drawImage(src, 0, 0, 16, 9);
    const px = sctx.getImageData(0, 0, 16, 9).data;
    let sum = 0;
    for (let i = 0; i < px.length; i += 4) sum += (px[i] + px[i + 1] + px[i + 2]) / 3;
    return sum / (px.length / 4);
  }

  private static sampler: HTMLCanvasElement | null = null;

  /** Frame HI-RES pada resolusi native video (maks 2560) — untuk hasil capture tajam */
  private hiresFrame(el: HTMLVideoElement): { data: string; width: number } | null {
    try {
      const w = Math.min(el.videoWidth, 2560);
      if (!w) return null;
      const h = Math.round(w * (el.videoHeight / el.videoWidth));
      if (!this.hires) this.hires = document.createElement('canvas');
      if (this.hires.width !== w) { this.hires.width = w; this.hires.height = h; }
      const ctx = this.hires.getContext('2d');
      if (!ctx) return null;
      ctx.drawImage(el, 0, 0, w, h);
      return { data: this.hires.toDataURL('image/jpeg', 0.95), width: w };
    } catch {
      return null;
    }
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
      this.completedQueue = [];
      this.triggerSeq = 0;
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

  /** Ambil completion ber-nomor urut tertentu; entri basi (seq lebih kecil) dibuang */
  takeCompleted(seq: number): { frame: string; box: Box } | undefined {
    while (this.completedQueue.length > 0 && this.completedQueue[0].seq < seq) this.completedQueue.shift();
    const entry = this.completedQueue[0];
    if (entry && entry.seq === seq) {
      this.completedQueue.shift();
      return { frame: entry.frame, box: entry.box };
    }
    return undefined;
  }

  /** Seq completion berikutnya yang tersedia (null = kosong) */
  peekCompletedSeq(): number | null {
    return this.completedQueue[0]?.seq ?? null;
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
      // Gambar video dengan geometri CONTAIN (sama seperti tampilan UI) supaya
      // koordinat ROI yang di-drag user di atas preview SELALU cocok dengan canvas.
      const vAspect = el.videoWidth / el.videoHeight;
      const cAspect = FRAME_WIDTH / FRAME_HEIGHT;
      let dx = 0, dy = 0, dw = FRAME_WIDTH, dh = FRAME_HEIGHT;
      if (vAspect > cAspect) { dh = FRAME_WIDTH / vAspect; dy = (FRAME_HEIGHT - dh) / 2; }
      else if (vAspect < cAspect) { dw = FRAME_HEIGHT * vAspect; dx = (FRAME_WIDTH - dw) / 2; }
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, FRAME_WIDTH, FRAME_HEIGHT);
      ctx.drawImage(el, dx, dy, dw, dh);
      // Crop area X-ray murni: luar ROI dimask hitam SEBELUM frame dikirim ke deteksi
      this.applyRoiMask(ctx);
      // Guard: ROI yang salah bisa membuat frame hitam total — auto-reset + peringatan
      if (this.roi && this.frameMeanLum(can) < 4) {
        this.setRoi(null);
        this.snap = { ...this.snap, error: 'ROI direset — frame menjadi hitam total. Set ulang Set X-ray Area.' };
        this.emit();
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, FRAME_WIDTH, FRAME_HEIGHT);
        ctx.drawImage(el, dx, dy, dw, dh);
      }
      // Ambil frame BERSIH (tanpa garis) sebelum overlay digambar — dipakai untuk deteksi & capture
      const cleanFrame = can.toDataURL('image/jpeg', 0.9);
      this.handlers.onFrame?.(cleanFrame);
      // PIPELINED: kirim tanpa menunggu respons siklus sebelumnya (guard anti tumpuk)
      // supaya deteksi tetap responsif meski RTT/latensi server besar.
      if (!this.inflight) {
        this.inflight = true;
        const payload = cleanFrame;
        void (async () => {
          try {
            const response = await fetch(VISION_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ source: this.key, imageBase64: payload }),
            });
            const result = await response.json();
            // Engine aktif: YOLO (utama) / OpenCV (fallback) — key `detections` selalu diisi
            // Koordinat backend 640x360 → skala ke frame 1280x720
            const detected: Box[] = ((result?.detections ?? result?.yolo ?? result?.opencv ?? []) as Box[])
              .map((b) => ({ ...b, x: b.x * BOX_SCALE, y: b.y * BOX_SCALE, width: b.width * BOX_SCALE, height: b.height * BOX_SCALE }));
            // Anti kedip: box dipertahankan beberapa cycle saat deteksi kosong sesaat
            if (detected.length > 0) {
              this.emptyCycles = 0;
              this.boxes = detected;
            } else {
              this.emptyCycles += 1;
              if (this.emptyCycles >= 4) this.boxes = [];
            }
            // Simpan frame terbaik per indeks: objek penuh di dalam frame & area terbesar.
            for (const d of detected) {
              const inside = d.x >= 2 && d.y >= 2 && d.x + d.width <= FRAME_WIDTH - 2 && d.y <= FRAME_HEIGHT - 2;
              const dClamped: Box = { ...d, height: Math.min(d.height, FRAME_HEIGHT - d.y) };
              const prev = this.bestFrames.get(d.id);
              if (inside && (!prev || dClamped.width * dClamped.height > (prev.box.width * prev.box.height) / Math.max(1, prev.scale ?? BOX_SCALE) ** 2)) {
                const hi = this.hiresFrame(this.video);
                if (hi) {
                  const sf = hi.width / FRAME_WIDTH;
                  this.bestFrames.set(d.id, { frame: hi.data, box: { ...dClamped, x: dClamped.x * sf, y: dClamped.y * sf, width: dClamped.width * sf, height: dClamped.height * sf }, scale: sf });
                  if (this.bestFrames.size > BEST_FRAMES_CAP) {
                    const oldest = this.bestFrames.keys().next().value;
                    if (oldest !== undefined && oldest !== d.id) this.bestFrames.delete(oldest);
                  }
                }
              }
            }
            const now = Date.now();
            for (const [id, at] of this.capturedIds) {
              if (now - at > CAPTURED_ID_TTL_MS) this.capturedIds.delete(id);
            }
            const triggered = detected
              .filter((b) => b.trigger)
              .sort((a, b) => (a.x + a.width / 2) - (b.x + b.width / 2));
            for (const trig of triggered) {
              if (this.capturedIds.has(trig.id)) continue;
              this.capturedIds.set(trig.id, now);
              const best = this.bestFrames.get(trig.id);
              this.bestFrames.delete(trig.id);
              const seq = this.triggerSeq++;
              this.completedQueue.push({ frame: best?.frame ?? payload, box: best?.box ?? trig, ts: now, seq });
              if (this.completedQueue.length > 32) this.completedQueue.shift();
              this.handlers.onTrigger?.(best?.frame ?? payload, best?.box ?? trig, seq);
            }
          } catch {
            this.emptyCycles += 1;
            if (this.emptyCycles >= 4) this.boxes = [];
          } finally {
            this.inflight = false;
          }
        })();
      }
      this.emit();
      await new Promise((r) => setTimeout(r, DETECT_INTERVAL_MS));
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

  // Editor ROI: tandai area X-ray murni — luar area di-mask (panel kontrol terkecuali)
  const [roiEdit, setRoiEdit] = useState(false);
  const [roiDraft, setRoiDraft] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [roiActive, setRoiActive] = useState(!!engine.roi);
  const dragRef = useRef<{ x: number; y: number } | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const ptRatio = (e: { clientX: number; clientY: number }) => {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return { x: Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)), y: Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height)) };
  };

  return (
    <View style={{ flex: 1, minWidth: 280, backgroundColor: isDark ? '#111827' : '#FFFFFF', borderWidth: 1, borderColor: isDark ? '#111827' : '#E5E7EB', borderRadius: 12, overflow: 'hidden' }}>
      <Text style={{ color: isDark ? '#fff' : '#111827', padding: 12, fontWeight: '700' }}>
        {title} · {snap.running ? (snap.kind === 'camera' ? 'CAMERA' : 'TRACKING') : 'IDLE'}
        {snap.error ? <span style={{ color: '#F59E0B', fontSize: 11, fontWeight: '400' }}> · {snap.error}</span> : null}
        {'  '}
        <span
          onClick={() => { setRoiEdit(!roiEdit); setRoiDraft(null); }}
          style={{ cursor: 'pointer', textDecoration: 'underline', fontSize: 11, fontWeight: '400', opacity: roiEdit ? 1 : 0.7 }}
        >
          {roiEdit ? 'drag area on video → Save' : 'Set X-ray Area'}
        </span>
        {roiActive && !roiEdit ? (
          <span onClick={() => { engine.setRoi(null); setRoiActive(false); }} style={{ cursor: 'pointer', marginLeft: 10, color: '#DC2626', fontSize: 11, fontWeight: '400' }}>· Reset</span>
        ) : null}
        {roiEdit && roiDraft && roiDraft.w > 0.02 ? (
          <span onClick={() => { engine.setRoi(roiDraft); setRoiActive(true); setRoiEdit(false); setRoiDraft(null); }} style={{ cursor: 'pointer', marginLeft: 10, color: '#16A34A', fontSize: 11, fontWeight: '700' }}>· SAVE</span>
        ) : null}
      </Text>
      <View
        ref={stageRef as never}
        style={{ aspectRatio: 16 / 9, position: 'relative', backgroundColor: '#000' }}
        onPointerDown={roiEdit ? (e: any) => { const p = ptRatio(e); if (p) { dragRef.current = p; setRoiDraft({ x: p.x, y: p.y, w: 0, h: 0 }); } } : undefined}
        onPointerMove={roiEdit ? (e: any) => {
          const p = ptRatio(e); const s = dragRef.current;
          if (p && s) setRoiDraft({ x: Math.min(s.x, p.x), y: Math.min(s.y, p.y), w: Math.abs(p.x - s.x), h: Math.abs(p.y - s.y) });
        } : undefined}
        onPointerUp={roiEdit ? () => { dragRef.current = null; } : undefined}
      >
        <video ref={video} muted playsInline style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        {roiEdit && roiDraft && roiDraft.w > 0.02 ? (
          <View style={{ position: 'absolute', left: `${roiDraft.x * 100}%`, top: `${roiDraft.y * 100}%`, width: `${roiDraft.w * 100}%`, height: `${roiDraft.h * 100}%`, borderWidth: 2, borderColor: '#16A34A', backgroundColor: 'rgba(22, 163, 74, 0.15)' }} pointerEvents="none" />
        ) : null}
        {roiEdit ? <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} /> : null}
        {snap.boxes.map((b, i) => {
          // Nomor visual mengikuti urutan kanan→kiri; ID tracker tetap internal.
          const visualIndex = [...snap.boxes]
            .sort((a, z) => (z.x + z.width / 2) - (a.x + a.width / 2))
            .findIndex((x) => x.id === b.id);
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
                {`#${visualIndex + 1}`}
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
            CAMERA ({title.toUpperCase()})
          </Text>
          <select
            value={engine.deviceId ?? ''}
            onChange={(e) => void engine.switchCamera(e.target.value)}
            style={{ width: '100%', padding: '7px 9px', fontSize: 12.5, borderRadius: 8, border: `1px solid ${isDark ? '#374151' : '#E5E7EB'}`, backgroundColor: isDark ? '#111827' : '#FFFFFF', color: isDark ? '#E5E7EB' : '#111827' }}
          >
            {cameras.map((cam) => (
              <option key={cam.deviceId} value={cam.deviceId}>
                {cam.label}{PanelEngine.isDeviceInUseByOther(cam.deviceId, engine) ? ' · in use by another panel' : ''}
              </option>
            ))}
          </select>
        </View>
      ) : null}
    </View>
  );
}

/**
 * Baris waiting dengan animasi:
 * - entering: muncul (fade + slide dari bawah)
 * - exiting : hilang (fade + slide kiri, tint hijau = status berubah)
 */
function AnimatedWaitRow({ entering, exiting, children }: { entering: boolean; exiting: boolean; children: React.ReactNode }) {
  const v = useRef(new Animated.Value(entering ? 0 : 1)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: exiting ? 0 : 1, duration: entering || exiting ? 450 : 0, useNativeDriver: true }).start();
  }, [entering, exiting, v]);
  const translate = v.interpolate({ inputRange: [0, 1], outputRange: exiting ? [-60, 0] : [10, 0] });
  return (
    <Animated.View style={{ opacity: v, transform: [{ translateX: translate }], backgroundColor: exiting ? 'rgba(22, 163, 74, 0.12)' : 'transparent' }}>
      {children}
    </Animated.View>
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
  /** Baris dengan animasi: entering (baru masuk) / exiting (status berubah, keluar antrean) */
  const [rowAnim, setRowAnim] = useState<{ entering: Set<number>; exiting: Set<number> }>({ entering: new Set(), exiting: new Set() });
  const prevWaitingRef = useRef<Set<number>>(new Set());
  const exitTimersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';

  // Data AWB via SSE realtime — satu koneksi bersama (lihat awbEvents.ts)
  useEffect(
    () =>
      subscribeAwbSnapshot((payload) => {
        const rows = ((payload?.data ?? []) as AwbRow[]).filter((item) => item.status === 'waiting');
        const nextIds = new Set(rows.map((r) => Number(r.id)));
        const prevIds = prevWaitingRef.current;
        const entering = new Set([...nextIds].filter((id) => !prevIds.has(id)));
        const leaving = [...prevIds].filter((id) => !nextIds.has(id));
        prevWaitingRef.current = nextIds;
        // Baris keluar tetap dirender sebentar untuk animasi hilang
        for (const id of leaving) {
          exitTimersRef.current.get(id) && clearTimeout(exitTimersRef.current.get(id));
        }
        setWaiting((prev) => {
          const kept = prev.filter((r) => nextIds.has(Number(r.id)) || leaving.includes(Number(r.id)));
          return [...kept, ...rows.filter((r) => !kept.some((k) => Number(k.id) === Number(r.id)))];
        });
        setRowAnim({ entering, exiting: new Set(leaving) });
        for (const id of leaving) {
          exitTimersRef.current.set(id, setTimeout(() => {
            setWaiting((prev) => prev.filter((r) => Number(r.id) !== id));
            setRowAnim((ra) => ({ entering: ra.entering, exiting: new Set([...ra.exiting].filter((x) => x !== id)) }));
          }, 600));
        }
      }),
    [],
  );

  // Waiting list urutan ascending berdasarkan waktu (paling lama diproses lebih dulu)
  const waitingAsc = [...waiting]
    .filter((item) => item.status === 'waiting' || rowAnim.exiting.has(Number(item.id)))
    .sort((a, b) => new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime());

  // Label box kedua panel = antrian AWB waiting (objek ke-N ↔ AWB ke-N)
  useEffect(() => {
    const labels = waitingAsc.map((w) => w.airwaybill_number);
    setBoxLabels('top', labels);
    setBoxLabels('side', labels);
  }, [waiting.map((w) => `${w.id}:${w.status}`).join(',')]);

  /** Crop frame ke area objek supaya capture presisi sesuai objeknya.
   *  Margin horizontal kecil: objek pipih punya box lebar → margin besar
   *  membuat objek sebelah (kanan/kiri) ikut masuk crop. */
  const cropToBox = (frame: string, box: Box | undefined): Promise<string> => {
    if (!box || !frame) return Promise.resolve(frame);
    try {
      const img = new Image();
      // Margin presisi: cukup supaya outline parcel yang samar tidak terpotong,
      // tapi kecil supaya objek sebelah tidak ikut masuk crop. Floor absolut
      // untuk parcel kecil yang persentasenya menghasilkan padding terlalu tipis.
      const marginX = 0.08;
      const marginY = 0.22;
      const padX = Math.max(box.width * marginX, 16);
      const padY = Math.max(box.height * marginY, 30);
      // Crop pada UKURAN NATURAL gambar (frame hi-res) — tanpa downscale, hasil maksimal
      return new Promise<string>((resolve) => {
        img.onload = () => {
          const iw = img.naturalWidth || FRAME_WIDTH;
          const ih = img.naturalHeight || FRAME_HEIGHT;
          const x = Math.max(0, box.x - padX);
          const y = Math.max(0, box.y - padY);
          const w = Math.max(1, Math.min(iw - x, box.width + padX * 2));
          const h = Math.max(1, Math.min(ih - y, box.height + padY * 2));
          const can = document.createElement('canvas');
          can.width = Math.round(w);
          can.height = Math.round(h);
          const ctx = can.getContext('2d');
          if (!ctx) { resolve(frame); return; }
          ctx.drawImage(img, x, y, w, h, 0, 0, can.width, can.height);
          resolve(can.toDataURL('image/jpeg', 0.95));
        };
        img.onerror = () => resolve(frame);
        img.src = frame;
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
        const job = captureQueue.current.shift()!;
        const sideEngine = engines.get('side');
        let sideBest: { frame: string; box: Box } | undefined;
        if (sideEngine?.getSnapshot().running) {
          // Tunggu completion side dengan nomor urut SAMA dengan job top (belt sama → objek ke-N = ke-N).
          // Seq lebih kecil = basi (dibuang); seq lebih besar = objek ini terlewat di side.
          for (let t = 0; t < 24 && !sideBest; t += 1) {
            sideBest = sideEngine.takeCompleted(job.queueIndex) ?? undefined;
            if (sideBest) break;
            const next = sideEngine.peekCompletedSeq();
            if (next !== null && next > job.queueIndex) break;
            await new Promise((resolve) => setTimeout(resolve, 250));
          }
        }
        sideBest ??= sideEngine?.getBest(job.queueIndex);
        if (!sideBest && job.box) sideBest = sideEngine?.getBestNearX(job.box.x + job.box.width / 2);
        const topImage = await cropToBox(job.image, job.box);
        const sideImage = await cropToBox(sideBest?.frame ?? sideFrame.current, sideBest?.box ?? sideBox.current);
        let sent = false;
        for (let attempt = 0; attempt < 3 && !sent; attempt += 1) {
          try {
            await capture({ variables: { topImage, sideImage, queueIndex: job.queueIndex } });
            sent = true;
          } catch (error) {
            console.error(`[XRay] capture failed (attempt ${attempt + 1})`, error);
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }
        if (!sent) console.error('[XRay] capture dropped after 3 attempts', job.queueIndex);
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

      {/* Waiting List — ascending berdasarkan waktu (gaya tabel AWB List) */}
      <View style={{ borderWidth: 1, borderColor: isDark ? '#1F2937' : '#E5E7EB', borderRadius: 16, overflow: 'hidden', backgroundColor: isDark ? '#111827' : '#FFFFFF' }}>
        <View style={{ flexDirection: 'row', backgroundColor: isDark ? '#0F1A2E' : '#F1F5F9', borderBottomWidth: 1, borderBottomColor: isDark ? '#1F2937' : '#E5E7EB', paddingHorizontal: 14, paddingVertical: 10 }}>
          {[
            { label: 'AIRLINES', flex: 1.4 },
            { label: 'MAWB', flex: 1.6 },
            { label: 'HAWB', flex: 1.6 },
            { label: 'ORIGIN', flex: 1 },
            { label: 'COLLY', flex: 1 },
            { label: 'STATUS', flex: 1 },
            { label: 'DATE', flex: 1.4 },
          ].map((col) => (
            <Text key={col.label} style={{ flex: col.flex, fontSize: 10.5, fontWeight: '800', letterSpacing: 0.5, color: '#94A3B8', textAlign: 'center' }}>
              {col.label}
            </Text>
          ))}
        </View>
        {waitingAsc.length === 0 ? (
          <View style={{ paddingVertical: 32, alignItems: 'center' }}>
            <Text style={{ color: isDark ? '#64748B' : '#6B7280', fontSize: 12.5 }}>No AWB waiting</Text>
          </View>
        ) : (
          waitingAsc.map((item, index) => {
            const collyMatch = item.colly_label?.match(/^colly-(\d+)-of-(\d+)$/);
            const cIdx = collyMatch ? Number(collyMatch[1]) : 0;
            const cTotal = item.colly_total ?? (collyMatch ? Number(collyMatch[2]) : 0);
            return (
            <AnimatedWaitRow key={item.id} entering={rowAnim.entering.has(Number(item.id))} exiting={rowAnim.exiting.has(Number(item.id))}>
            <View
              style={{
                flexDirection: 'row',
                paddingHorizontal: 14,
                paddingVertical: 10,
                alignItems: 'center',
                backgroundColor: index % 2 === 1 ? (isDark ? '#0D1526' : '#F8FAFC') : 'transparent',
                borderTopWidth: 1,
                borderTopColor: isDark ? '#1F2937' : '#E5E7EB',
              }}
            >
              <Text style={{ flex: 1.4, fontSize: 12.5, color: isDark ? '#CBD5E1' : '#374151', textAlign: 'center' }}>
                {item.hostawb ? [item.hostawb.airlinesCode, item.hostawb.flightNo].filter(Boolean).join(' ') || '-' : '-'}
              </Text>
              <Text style={{ flex: 1.6, fontSize: 12.5, fontWeight: '700', color: isDark ? '#F9FAFB' : '#111827', textAlign: 'center' }}>{item.airwaybill_number}</Text>
              <Text style={{ flex: 1.6, fontSize: 12.5, fontWeight: '700', color: isDark ? '#F9FAFB' : '#111827', textAlign: 'center' }}>{item.hawb || '-'}</Text>
              <Text style={{ flex: 1, fontSize: 12.5, color: isDark ? '#CBD5E1' : '#374151', textAlign: 'center' }}>{item.hostawb?.origin || '-'}</Text>
              <View style={{ flex: 1, alignItems: 'center' }}>
                {cTotal > 0 ? (
                  <View style={{ alignSelf: 'center', backgroundColor: cIdx >= cTotal ? 'rgba(22, 163, 74, 0.12)' : cIdx > 0 ? 'rgba(2, 132, 199, 0.12)' : 'rgba(107, 114, 128, 0.12)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                    <Text style={{ fontSize: 10, fontWeight: '800', letterSpacing: 0.6, color: cIdx >= cTotal ? '#16A34A' : cIdx > 0 ? '#0369A1' : '#6B7280' }}>
                      {item.part ?? cIdx} / {cTotal}
                    </Text>
                  </View>
                ) : (
                  <Text style={{ fontSize: 12.5, color: isDark ? '#CBD5E1' : '#374151', textAlign: 'center' }}>-</Text>
                )}
              </View>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <View style={{ alignSelf: 'center', backgroundColor: 'rgba(245, 158, 11, 0.12)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                  <Text style={{ fontSize: 10, fontWeight: '800', letterSpacing: 0.6, color: '#D97706' }}>WAITING</Text>
                </View>
              </View>
              <Text style={{ flex: 1.4, fontSize: 12.5, color: isDark ? '#CBD5E1' : '#374151', textAlign: 'center' }}>
                {item.created_at ? new Date(item.created_at).toLocaleString('en-US', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(',', '') : '-'}
              </Text>
            </View>
            </AnimatedWaitRow>
            );
          })
        )}
      </View>
    </View>
  );
}
