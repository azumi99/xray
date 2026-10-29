import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InferenceSession, Tensor } from 'onnxruntime-node';
import sharp from 'sharp';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Deteksi parcel/paket pada video X-ray (HiTraX) via YOLOv8 ONNX + blob-assist.
 *
 * Domain X-ray: belt kosong TERANG, paket menyerap sinar → GELAP.
 * YOLO COCO pretrained mengenali paket sebagai kelas parcel-friendly
 * (book/suitcase/backpack/handbag) setelah CLAHE. Paket kecil/low-contrast
 * yang lolos dari YOLO ditangkap blob gelap (connected components).
 * Hasil digabung → NMS → tracking IoU → capture sekali per indeks, saat objek
 * keluar sisi kiri + jeda (belt bergerak ke kiri; objek muncul dari kanan).
 */
export type YoloDetection = {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  trigger: boolean;
  source: 'yolo' | 'blob';
};

type Rect = { x: number; y: number; width: number; height: number };

type TrackedObject = {
  id: number; // indeks unik urutan kedatangan objek (stabil lintas frame)
  box: Rect;
  bestBox: Rect | null; // box saat tampilan terbaik (penuh di dalam frame, area terbesar)
  seen: number;
  missed: number;
  captured: boolean; // sudah pernah di-capture? 1 indeks = 1 capture (anti ganda)
  confidence: number;
  source: 'yolo' | 'blob';
  /** riwayat box utk stabilisasi EMA + estimasi kecepatan (anti-telat saat bergerak) */
  history: Rect[];
  /** estimasi kecepatan px/frame (EMA) — box output dikompensasi supaya tidak telat */
  vx: number;
  /** lahir menyentuh strip kiri = objek BARU keluar/masuk dari kiri (pola cv-service; baseline tidak boleh capture) */
  enteredFromLeft: boolean;
  /** pernah terlihat penuh di dalam frame */
  fullySeen: boolean;
};

const PARCEL_CLASSES = new Set<number>([24, 25, 28, 73]); // backpack, handbag, suitcase, book

@Injectable()
export class YoloService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(YoloService.name);
  private session?: InferenceSession;
  private cv: any;
  private readonly size = 640;
  private readonly tracked = new Map<string, TrackedObject[]>();
  private readonly nextId = new Map<string, number>();
  private readonly frameSize = new Map<string, { w: number; h: number }>();

  // --- tunables ---
  private readonly confThreshold = Number(process.env.YOLO_CONF ?? 0.3);
  private readonly iouNms = 0.45;
  private readonly iouMatch = 0.25;
  /** fallback tracking: center distance < 40% diagonal box → objek sama (box jitter) */
  private readonly centerMatchRatio = 0.4;
  private readonly stableFrames = 2;
  private readonly maxMissed = 8;
  // --- kebijakan capture (belt bergerak ke KIRI: objek muncul dari kanan, keluar di kiri) ---
  /** lahir menyentuh strip KIRI frame = objek BARU keluar/masuk dari kiri
   *  (pola cv-service StripTracker: parcel baru masuk dari tepi kiri);
   *  objek yang sejak awal ada di tengah/kanan layar = baseline lama, tidak boleh di-capture */
  private readonly enterLeftRatio = 0.15;
  /** tepi kanan box melewati strip kiri 8% frame = objek sudah keluar sisi kiri — LEWATI, jangan capture */
  private readonly exitEdgeRatio = 0.08;
  /** celah kosong (background) di kiri objek — konfirmasi "fully entered" ala cv-service
   *  min_clear_gap: kolom background bersih antara tepi kiri frame dan objek */
  private readonly minClearGapCols = 6;
  private readonly edgeMargin = 6; // objek dianggap penuh di dalam frame bila box menjauh tepi sekian px
  private readonly bottomBand = 0.87; // buang status bar HiTraX di bawah frame
  private readonly blobMinArea = 3000;
  private readonly blobMaxArea = 100000;
  private readonly blobMinW = 45;
  private readonly blobMinH = 35;

  async onModuleInit() {
    const model = process.env.YOLO_MODEL_PATH ?? join(process.cwd(), 'models', 'yolo.onnx');
    try {
      const imported: any = await import('@techstark/opencv-js');
      this.cv = await (imported.default ?? imported);
    } catch {
      this.logger.warn('opencv-js gagal dimuat — blob-assist nonaktif');
    }
    if (!existsSync(model)) {
      this.logger.warn(`Model YOLO tidak ditemukan (${model}) — deteksi YOLO nonaktif`);
      return;
    }
    const t0 = Date.now();
    this.session = await InferenceSession.create(model, { executionProviders: ['cpu'] });
    // warm-up sekali supaya request pertama tidak lambat
    const dummy = new Tensor('float32', new Float32Array(3 * this.size * this.size), [1, 3, this.size, this.size]);
    await this.session.run({ images: dummy });
    this.logger.log(`YOLO siap (${model}) warm-up ${Date.now() - t0}ms`);
  }

  get enabled() {
    return Boolean(this.session);
  }

  async onModuleDestroy() {
    await this.session?.release();
  }

  async detect(source: string, imageBase64: string): Promise<YoloDetection[]> {
    if (!this.session) return [];
    const raw = Buffer.from(imageBase64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
    const { data, info } = await sharp(raw).resize(640, 360, { fit: 'fill' }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const W = info.width;
    const H = info.height;
    this.frameSize.set(source, { w: W, h: H });

    // ---------- gray + CLAHE ----------
    let gray: Float32Array | null = null;
    const cv = this.cv;
    if (cv) {
      const src = cv.matFromImageData({ data: new Uint8ClampedArray(toRgba(data, W, H)), width: W, height: H });
      const g = new cv.Mat();
      cv.cvtColor(src, g, cv.COLOR_RGBA2GRAY);
      src.delete();
      const claheOut = new cv.Mat();
      const clahe = new cv.CLAHE(3.0, new cv.Size(8, 8));
      clahe.apply(g, claheOut);
      clahe.delete();
      g.delete();
      gray = new Float32Array(H * W);
      for (let i = 0; i < H * W; i++) gray[i] = claheOut.data[i];
      claheOut.delete();
    }

    // ---------- 1) deteksi YOLO ----------
    const yoloBoxes = await this.inferYolo(gray ?? grayFromRgb(data, W, H), W, H);

    // ---------- 2) blob gelap (assist domain X-ray) ----------
    const blobBoxes = gray ? this.detectBlobs(gray, W, H) : [];

    // ---------- 3) gabung + NMS ----------
    const merged = this.nms([
      ...blobBoxes.map((b) => ({ ...b, source: 'blob' as const })),
      ...yoloBoxes.map((b) => ({ ...b, source: 'yolo' as const })),
    ]);

    // ---------- 4) tracking + trigger ----------
    return this.track(source, merged, W, H);
  }

  /** Inference YOLOv8 pada grayscale (3 kanal identik), letterbox tanpa distorsi */
  private async inferYolo(gray: Float32Array, W: number, H: number) {
    const s = this.size / Math.max(W, H);
    const nw = Math.round(W * s);
    const nh = Math.round(H * s);
    const padX = Math.floor((this.size - nw) / 2);
    const padY = Math.floor((this.size - nh) / 2);
    const input = new Float32Array(3 * this.size * this.size).fill(114 / 255);
    for (let y = 0; y < nh; y++) {
      const sy = Math.min(H - 1, Math.round(y / s));
      for (let x = 0; x < nw; x++) {
        const sx = Math.min(W - 1, Math.round(x / s));
        const v = gray[sy * W + sx] / 255;
        const o = (padY + y) * this.size + (padX + x);
        input[o] = v;
        input[this.size * this.size + o] = v;
        input[2 * this.size * this.size + o] = v;
      }
    }
    const output = await this.session!.run({ images: new Tensor('float32', input, [1, 3, this.size, this.size]) });
    const tensor = output.output0 as Tensor;
    const values = tensor.data as Float32Array;
    // YOLOv8 export: [1, 84, N] — 4 box + 80 class scores
    const dims = tensor.dims;
    const rows = dims[1] ?? 84;
    const n = dims[2] ?? dims[dims.length - 1];
    const raw: Array<Rect & { confidence: number }> = [];
    for (let i = 0; i < n; i++) {
      let best = 0;
      let cls = -1;
      for (let c = 0; c < rows - 4; c++) {
        const conf = values[(4 + c) * n + i];
        if (conf > best) {
          best = conf;
          cls = c;
        }
      }
      if (best < this.confThreshold || !PARCEL_CLASSES.has(cls)) continue;
      const cx = values[i];
      const cy = values[n + i];
      const bw = values[2 * n + i];
      const bh = values[3 * n + i];
      // balik letterbox → koordinat frame asli
      raw.push({
        x: (cx - bw / 2 - padX) / s,
        y: (cy - bh / 2 - padY) / s,
        width: bw / s,
        height: bh / s,
        confidence: best,
      });
    }
    return raw;
  }

  /** Blob gelap = kandidat paket (belt X-ray terang, paket menyerap sinar).
   *  Background belt putih & stabil → pisahkan objek dgn threshold BERBASIS BG:
   *  level bg diukur dari strip atas frame (baris paling sedikit tertutup objek),
   *  noise bg dihitung dari deviasi strip tsb. Objek = piksel < bg - k*noise.
   *  Lebih presisi dari percentile global: tidak tergeser jumlah objek di frame. */
  private detectBlobs(gray: Float32Array, W: number, H: number): Array<Rect & { confidence: number }> {
    const cv = this.cv;
    // ---------- ukur background dari strip atas (8 baris pertama di bawah margin) ----------
    // belt kosong paling atas frame — objek masuk dari kiri dan mengisi tengah/bawah
    let bgSum = 0;
    let bgSumSq = 0;
    const bgRows = Math.max(2, Math.floor(H * 0.03));
    const bgStart = Math.floor(H * 0.01);
    const bgCount = (bgRows) * W;
    for (let y = bgStart; y < bgStart + bgRows; y++) {
      for (let x = 0; x < W; x++) {
        const v = gray[y * W + x];
        bgSum += v;
        bgSumSq += v * v;
      }
    }
    const bgMean = bgSum / bgCount;
    const bgStd = Math.sqrt(Math.max(0, bgSumSq / bgCount - bgMean * bgMean));
    // fallback: kalau strip atas ternyata tertutup objek (mean aneh), pakai p90 histogram
    let sortedSample: number[] = [];
    const useFallbackBg = bgMean < 140 || bgStd > 28;
    let bgLevel: number;
    if (useFallbackBg) {
      sortedSample = Array.from({ length: 4096 }, (_, i) => gray[Math.floor((i * gray.length) / 4096)]);
      sortedSample.sort((a, b) => a - b);
      bgLevel = sortedSample[Math.floor(sortedSample.length * 0.9)];
    } else {
      bgLevel = bgMean;
    }
    // threshold objek: bg - margin. margin = 12 + noise bg, minimal 14 level di bawah bg
    // → tepi kabur (gradasi perlahan ke bg) tetap lolos, bg bersih pasti ditolak
    const thByte = Math.max(20, Math.min(235, Math.round(bgLevel - Math.max(14, 12 + bgStd * 2))));

    const src = new cv.Mat(H, W, cv.CV_8UC1);
    for (let i = 0; i < gray.length; i++) src.data[i] = gray[i] < thByte ? 255 : 0;
    const mask = new cv.Mat();
    const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(9, 9));
    cv.morphologyEx(src, mask, cv.MORPH_CLOSE, kernel);
    const opened = new cv.Mat();
    // kernel 3x3 (bukan 5x5): open ringan — jangan ikis tepi halus objek kabur
    const kernel2 = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(3, 3));
    cv.morphologyEx(mask, opened, cv.MORPH_OPEN, kernel2);

    const contours = new cv.MatVector();
    const hierarchy = new cv.Mat();
    cv.findContours(opened, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
    const out: Array<Rect & { confidence: number }> = [];
    const bottomY = H * this.bottomBand;
    // edge threshold utk pertumbuhan box: antara blob-th dan background —
    // tepi kabur masih "lebih gelap dari background" meski lolos dari blob threshold
    const edgeTh = thByte + 0.45 * (bgLevel - thByte);
    const colMean = (x: number, y0: number, y1: number) => {
      let s = 0;
      for (let y = y0; y < y1; y++) s += gray[y * W + x];
      return s / Math.max(1, y1 - y0);
    };
    const rowMean = (y: number, x0: number, x1: number) => {
      let s = 0;
      for (let x = x0; x < x1; x++) s += gray[y * W + x];
      return s / Math.max(1, x1 - x0);
    };
    for (let i = 0; i < contours.size(); i++) {
      const rect = cv.boundingRect(contours.get(i));
      let { x, y, width, height } = rect;
      const area = width * height;
      if (area < this.blobMinArea || area > this.blobMaxArea) continue;
      if (width < this.blobMinW || height < this.blobMinH) continue;
      if (y + height > bottomY) continue; // status bar HiTraX
      if (x <= 2 && x + width >= W - 2) continue; // noise full-width
      // --- adaptive edge growth: perluas box selama strip tepi masih < edgeTh (tepi kabur) ---
      const GROW = 4; // px per langkah
      const MAXG = 24; // batas total pertumbuhan per sisi
      for (let g = 0; g < MAXG; g += GROW) {
        const grown: Rect = { x, y, width, height };
        // kiri: kolom di kiri box lebih gelap dari edgeTh → geser keluar
        if (x - GROW >= 0 && colMean(x - GROW, y, y + height) < edgeTh) { x -= GROW; width += GROW; }
        // kanan
        else if (x + width + GROW <= W && colMean(x + width, y, y + height) < edgeTh) { width += GROW; }
        // atas
        else if (y - GROW >= 0 && rowMean(y - GROW, x, x + width) < edgeTh) { y -= GROW; height += GROW; }
        // bawah
        else if (y + height + GROW <= Math.min(H, bottomY) && rowMean(y + height, x, x + width) < edgeTh) { height += GROW; }
        else if (grown.x === x && grown.y === y && grown.width === width && grown.height === height) break; // berhenti bila tak tumbuh
        if (width * height > this.blobMaxArea) break;
      }
      out.push({ x, y, width, height, confidence: 0.25 });
    }
    src.delete();
    mask.delete();
    opened.delete();
    kernel.delete();
    kernel2.delete();
    contours.delete();
    hierarchy.delete();
    return out;
  }

  /** NMS — deteksi confidence tertinggi dipertahankan */
  private nms(items: Array<Rect & { confidence: number; source: 'yolo' | 'blob' }>) {
    const sorted = [...items].sort((a, b) => b.confidence - a.confidence);
    const keep: typeof sorted = [];
    for (const item of sorted) {
      // merge jika: IoU tinggi ATAU box contained >= 60% di dalam box yang sudah keep
      // (YOLO setengah objek + blob penuh sering IoU-nya rendah tapi saling contain)
      if (keep.some((k) => this.iou(k, item) >= this.iouNms || this.containment(k, item) >= 0.6)) continue;
      keep.push(item);
    }
    return keep;
  }

  /** rasio area item yang berada di dalam box ref (0..1) */
  private containment(ref: Rect, item: Rect): number {
    const x1 = Math.max(ref.x, item.x);
    const y1 = Math.max(ref.y, item.y);
    const x2 = Math.min(ref.x + ref.width, item.x + item.width);
    const y2 = Math.min(ref.y + ref.height, item.y + item.height);
    const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
    const itemArea = item.width * item.height;
    return itemArea > 0 ? inter / itemArea : 0;
  }

  /** box median dari riwayat — meredam jitter supaya crop presisi */
  private medianBox(history: Rect[]): Rect {
    if (history.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
    const xs = history.map((b) => b.x).sort((a, b) => a - b);
    const ys = history.map((b) => b.y).sort((a, b) => a - b);
    const ws = history.map((b) => b.width).sort((a, b) => a - b);
    const hs = history.map((b) => b.height).sort((a, b) => a - b);
    const mid = Math.floor(history.length / 2);
    const pick = <T,>(arr: T[]) => (history.length % 2 ? arr[mid] : arr[mid - 1]);
    return { x: pick(xs), y: pick(ys), width: pick(ws), height: pick(hs) };
  }

  /** box EMA + kompensasi kecepatan — mengikuti gerakan tanpa telat (anti-lag),
   *  smoothing ringan utk meredam jitter box pada objek samar */
  private stableBox(obj: TrackedObject): Rect {
    const h = obj.history;
    if (h.length === 0) return obj.box;
    const ema = h.reduce((acc, b, i) => ({
      x: (acc.x * i + b.x) / (i + 1),
      y: (acc.y * i + b.y) / (i + 1),
      width: (acc.width * i + b.width) / (i + 1),
      height: (acc.height * i + b.height) / (i + 1),
    }), { x: 0, y: 0, width: 0, height: 0 });
    // kompensasi 1 frame ke depan sesuai kecepatan → box tidak tertinggal di belakang objek
    return { x: ema.x + obj.vx, y: ema.y, width: ema.width, height: ema.height };
  }

  /** Tracking IoU lintas frame — capture sekali saat paket baru dari kiri sudah full terlihat. */
  private track(source: string, boxes: Array<Rect & { confidence: number; source: 'yolo' | 'blob' }>, W: number, H: number): YoloDetection[] {
    const list = this.tracked.get(source) ?? [];
    const detections: YoloDetection[] = [];
    for (const box of boxes) {
      // clip ke frame utk display
      const bx = Math.max(0, box.x);
      const by = Math.max(0, box.y);
      const bw = Math.min(box.width, W - bx);
      const bh = Math.min(box.height, H - by);
      if (bw < 10 || bh < 10) continue;

      let obj = this.bestIouMatch(list, { x: bx, y: by, width: bw, height: bh });
      if (!obj) {
        const id = (this.nextId.get(source) ?? 0) + 1;
        this.nextId.set(source, id);
        obj = {
          id,
          box: { x: bx, y: by, width: bw, height: bh },
          bestBox: null,
          seen: 1,
          missed: 0,
          captured: false,
          confidence: box.confidence,
          source: box.source,
          history: [{ x: bx, y: by, width: bw, height: bh }],
          vx: 0,
          // objek BARU hanya boleh di-capture bila lahir menyentuh strip KIRI
          // (objek sedang masuk dari kiri, pola cv-service); lahir di tengah/kanan = baseline lama
          enteredFromLeft: bx <= W * this.enterLeftRatio,
          fullySeen: false,
        };
        list.push(obj);
      } else {
        // estimasi kecepatan (EMA): dx frame ini, dihaluskan
        const dx = bx - obj.box.x;
        obj.vx = obj.vx * 0.6 + dx * 0.4;
        obj.box = { x: bx, y: by, width: bw, height: bh };
        obj.missed = 0;
        obj.seen += 1;
        obj.confidence = box.confidence;
        obj.source = box.source;
        obj.history = [...obj.history, { x: bx, y: by, width: bw, height: bh }].slice(-3);
      }
      // box output = EMA + kompensasi velocity (tidak telat saat objek bergerak)
      const stable = this.stableBox(obj);
      // catat tampilan terbaik: penuh di dalam frame & area terbesar → sumber crop capture presisi
      const fullyInside = stable.x >= this.edgeMargin && stable.y >= this.edgeMargin && stable.x + stable.width <= W - this.edgeMargin && stable.y + stable.height <= H * this.bottomBand - 2;
      if (fullyInside) {
        obj.fullySeen = true;
        if (!obj.bestBox || stable.width * stable.height > obj.bestBox.width * obj.bestBox.height) obj.bestBox = { ...stable };
      }
      detections.push({
        id: obj.id,
        x: Math.round(stable.x),
        y: Math.round(stable.y),
        width: Math.round(stable.width),
        height: Math.round(stable.height),
        confidence: Number(box.confidence.toFixed(2)),
        trigger: false,
        source: box.source,
      });
    }
    for (const t of list) {
      if (!detections.some((d) => d.id === t.id)) t.missed += 1;
    }

    // Capture hanya untuk track yang lahir dari kiri lalu sudah masuk penuh.
    // Track yang pertama kali muncul di tengah/kanan dianggap baseline dan dilewati.
    for (const t of list) {
      if (t.captured || !t.enteredFromLeft || t.seen < this.stableFrames) continue;
      const b = this.stableBox(t);
      const fullyInside = b.x >= this.edgeMargin
        && b.y >= this.edgeMargin
        && b.x + b.width <= W - this.edgeMargin
        && b.y + b.height <= H * this.bottomBand - 2;
      const leftGap = b.x >= this.edgeMargin + this.minClearGapCols;
      if (!fullyInside || !leftGap) continue;
      t.captured = true;
      detections.push({
        id: t.id,
        x: Math.round(b.x),
        y: Math.round(b.y),
        width: Math.round(b.width),
        height: Math.round(b.height),
        confidence: Number(t.confidence.toFixed(2)),
        trigger: true,
        source: t.source,
      });
    }
    // simpan riwayat id selama session (objek lama muncul lagi tidak dapat id baru)
    this.tracked.set(source, list.filter((t) => t.missed <= 400));
    return detections;
  }

  private bestIouMatch(list: TrackedObject[], box: Rect): TrackedObject | null {
    let best: TrackedObject | null = null;
    let bestIou = this.iouMatch;
    for (const t of list) {
      if (t.missed > this.maxMissed) continue;
      const v = this.iou(t.box, box);
      if (v > bestIou) {
        bestIou = v;
        best = t;
      }
    }
    if (best) return best;
    // fallback: box jitter pada objek samar sering IoU < threshold tapi pusatnya tidak jauh bergerak —
    // anggap objek sama jika jarak pusat < 40% diagonal box
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    const diag = Math.hypot(box.width, box.height);
    for (const t of list) {
      if (t.missed > this.maxMissed) continue;
      const tx = t.box.x + t.box.width / 2;
      const ty = t.box.y + t.box.height / 2;
      if (Math.hypot(tx - cx, ty - cy) < diag * this.centerMatchRatio) return t;
    }
    return null;
  }

  private iou(a: Rect, b: Rect): number {
    const x1 = Math.max(a.x, b.x);
    const y1 = Math.max(a.y, b.y);
    const x2 = Math.min(a.x + a.width, b.x + b.width);
    const y2 = Math.min(a.y + a.height, b.y + b.height);
    const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
    if (inter === 0) return 0;
    return inter / (a.width * a.height + b.width * b.height - inter);
  }
}

// ---------- helpers ----------
function toRgba(rgb: Buffer, W: number, H: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(W * H * 4);
  for (let i = 0; i < W * H; i++) {
    out[i * 4] = rgb[i * 3];
    out[i * 4 + 1] = rgb[i * 3 + 1];
    out[i * 4 + 2] = rgb[i * 3 + 2];
    out[i * 4 + 3] = 255;
  }
  return out;
}

function grayFromRgb(data: Buffer, W: number, H: number): Float32Array {
  const out = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) {
    out[i] = 0.299 * data[i * 3] + 0.587 * data[i * 3 + 1] + 0.114 * data[i * 3 + 2];
  }
  return out;
}
