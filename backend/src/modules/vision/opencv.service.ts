import { Injectable, OnModuleInit } from '@nestjs/common';
import sharp from 'sharp';

type Rect = { x: number; y: number; width: number; height: number };

type TrackedObject = {
  id: number; // indeks unik urutan kedatangan objek (1, 2, 3, ...)
  box: Rect; // posisi terakhir terlihat
  bestBox: Rect | null; // box saat tampilan terbaik (penuh di dalam frame, area terbesar)
  signature: number[]; // Hu moments + posisi — identitas unik BENTUK + POSISI objek
  seen: number; // berapa frame objek ini terdeteksi
  missed: number; // frame berturut-turut tidak terlihat
  captured: boolean; // sudah pernah di-capture? 1 indeks = 1 capture (anti ganda)
  enteredFromRight: boolean; // lahir di strip kanan = objek baru keluar dari kanan
  fullySeen: boolean; // pernah terlihat penuh di dalam frame
};

export type Detection = Rect & { id: number; trigger: boolean };

@Injectable()
export class OpenCvService implements OnModuleInit {
  private cv: any;
  // Background = referensi belt kosong; deteksi = selisih frame vs background
  // sehingga objek yang bergerak MAUPUN diam tetap terdeteksi.
  private background = new Map<string, any>();
  private bgUpdatedAt = new Map<string, number>();
  private calmCycles = new Map<string, number>();
  private tracked = new Map<string, TrackedObject[]>();
  private nextId = new Map<string, number>();

  private static readonly BG_MAX_AGE_MS = 5 * 60 * 1000; // refresh saat tenang & sudah tua
  private static readonly CALM_CYCLES_TO_REFRESH = 40; // ~10 detik pada 4 fps
  private static readonly MIN_AREA = 2500; // luas minimum (px) supaya dianggap paket
  private static readonly MIN_CONTOUR_AREA = 500; // contour kecil tetap dikumpulkan untuk merge
  private static readonly MERGE_GAP = 14; // jarak (px) contour dianggap satu objek
  private static readonly STABLE_FRAMES = 2; // frame konfirmasi sebelum objek boleh di-capture
  private static readonly MAX_MISSED = 8; // hilang ~2 detik → objek pergi (nomor tetap disimpan)
  private static readonly IOU_MATCH = 0.3;
  private static readonly SIG_TOLERANCE = 0.5; // ambang kemiripan signature (bentuk + posisi)
  private static readonly FRAME_W = 640; // frame standar deteksi (samakan dengan frontend)
  private static readonly FRAME_H = 360;
  // --- kebijakan capture (belt bergerak ke KIRI: objek muncul dari kanan, keluar di kiri) ---
  private static readonly ENTER_RIGHT_RATIO = 0.7; // lahir menyentuh 30% kanan frame = objek baru dari kanan
  private static readonly EXIT_EDGE_RATIO = 0.08; // tepi kanan box melewati strip kiri 8% = sudah keluar kiri
  private static readonly EXIT_GAP_FRAMES = 2; // jeda frame setelah keluar kiri sebelum capture (jeda antar objek)

  async onModuleInit() {
    const imported: any = await import('@techstark/opencv-js');
    this.cv = await (imported.default ?? imported);
  }

  async detect(source: string, imageBase64: string): Promise<Detection[]> {
    const buffer = Buffer.from(imageBase64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
    const { data, info } = await sharp(buffer).resize(640, 360, { fit: 'fill' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const cv = this.cv;
    const src = cv.matFromImageData({ data: new Uint8ClampedArray(data), width: info.width, height: info.height });
    const now = Date.now();
    const blurred = new cv.Mat();
    cv.GaussianBlur(src, blurred, new cv.Size(9, 9), 0);

    let bg = this.background.get(source);
    if (!bg) {
      // Frame pertama dijadikan background awal (diasumsikan belt kosong)
      this.background.set(source, blurred.clone());
      this.bgUpdatedAt.set(source, now);
      this.calmCycles.set(source, 0);
      blurred.delete(); src.delete();
      return [];
    }

    const diff = new cv.Mat(), gray = new cv.Mat();
    cv.absdiff(blurred, bg, diff);
    cv.cvtColor(diff, gray, cv.COLOR_RGBA2GRAY);
    cv.threshold(gray, gray, 25, 255, cv.THRESH_BINARY);
    const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(11, 11));
    cv.morphologyEx(gray, gray, cv.MORPH_CLOSE, kernel);
    const contours = new cv.MatVector(), hierarchy = new cv.Mat();
    cv.findContours(gray, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

    // Kumpulkan contour kandidat (paket bisa terpecah jadi beberapa contour)
    const candidates: Array<{ rect: Rect; index: number; area: number }> = [];
    for (let i = 0; i < contours.size(); i++) {
      const rect = cv.boundingRect(contours.get(i));
      const area = rect.width * rect.height;
      if (area >= OpenCvService.MIN_CONTOUR_AREA && rect.width > 20 && rect.height > 15) {
        candidates.push({ rect, index: i, area });
      }
    }

    // Merge contour yang berdekatan/overlapping → satu bounding box per paket (presisi)
    const groups = this.mergeRects(candidates.map((c) => c.rect)).map((box) => {
      const members = candidates.filter((c) => this.rectsOverlap(box, c.rect, 2));
      const main = members.sort((a, b) => b.area - a.area)[0];
      return { box, mainContourIndex: main?.index };
    }).filter((g) => g.box.width * g.box.height >= OpenCvService.MIN_AREA);

    const detections: Detection[] = [];
    const list = this.tracked.get(source) ?? [];
    for (const g of groups) {
      const { box } = g;
      // 1) Coba match dengan objek yang sedang terlihat (kontinuitas posisi/IoU)
      let obj = this.bestIouMatch(list, box);
      if (!obj) {
        // 2) Bandingkan signature (bentuk + posisi) dengan semua objek yang pernah dilihat
        const signature = g.mainContourIndex != null ? this.objectSignature(contours.get(g.mainContourIndex), box) : null;
        const similar = signature ? list.find((t) => this.signatureDistance(t.signature, signature) < OpenCvService.SIG_TOLERANCE) : null;
        if (similar) {
          // objek lama muncul lagi → indeks tetap, tidak capture ulang
          obj = similar;
          obj.box = box; obj.missed = 0; obj.seen += 1;
        } else {
          // objek BENAR-BENAR baru → indeks urut berikutnya (unik: bentuk contour + posisi)
          const id = (this.nextId.get(source) ?? 0) + 1;
          this.nextId.set(source, id);
          obj = {
            id,
            box,
            bestBox: null,
            signature: signature ?? [],
            seen: 1,
            missed: 0,
            captured: false,
            enteredFromRight: box.x + box.width >= OpenCvService.FRAME_W * OpenCvService.ENTER_RIGHT_RATIO,
            fullySeen: false,
          };
          list.push(obj);
        }
      } else {
        obj.box = box; obj.missed = 0; obj.seen += 1;
      }

      // Catat tampilan terbaik: penuh di dalam frame & area terbesar → sumber crop capture presisi
      const fullyInside = box.x >= 4 && box.y >= 4 && box.x + box.width <= OpenCvService.FRAME_W - 4 && box.y + box.height <= OpenCvService.FRAME_H - 4;
      if (fullyInside) {
        obj.fullySeen = true;
        if (!obj.bestBox || box.width * box.height > obj.bestBox.width * obj.bestBox.height) obj.bestBox = box;
      }

      detections.push({ id: obj.id, x: box.x, y: box.y, width: box.width, height: box.height, trigger: false });
    }

    // Tandai objek yang menghilang; indeks + signature tetap disimpan sebagai riwayat
    // supaya objek lama yang muncul lagi tetap dikenali (tidak dapat indeks baru)
    for (const t of list) {
      if (!detections.some((d) => d.id === t.id)) {
        t.missed += 1;
      }
    }

    // ---- CAPTURE: sekali per indeks, saat objek SUDAH KELUAR sisi kiri + ada jeda ----
    // Frame crop diambil frontend dari frame terbaik yang disimpannya per indeks,
    // jadi trigger boleh menyala saat objek sudah tidak ada di frame saat ini.
    for (const t of list) {
      if (t.captured || !t.enteredFromRight || t.seen < OpenCvService.STABLE_FRAMES) continue;
      const rightEdge = t.box.x + t.box.width;
      const exitedLeft = rightEdge <= OpenCvService.FRAME_W * OpenCvService.EXIT_EDGE_RATIO;
      const goneForGood = t.fullySeen && t.missed >= OpenCvService.MAX_MISSED; // hilang tanpa keluar kiri (belt berhenti/diambil)
      if ((exitedLeft && t.missed >= OpenCvService.EXIT_GAP_FRAMES) || goneForGood) {
        t.captured = true; // indeks ini selesai — tidak akan di-capture dua kali
        const b = t.bestBox ?? t.box;
        detections.push({ id: t.id, x: b.x, y: b.y, width: b.width, height: b.height, trigger: true });
      }
    }
    this.tracked.set(source, list);

    // Background di-refresh hanya saat scene tenang supaya objek diam tidak ikut terbakar
    if (detections.length === 0) {
      const calm = (this.calmCycles.get(source) ?? 0) + 1;
      const age = now - (this.bgUpdatedAt.get(source) ?? now);
      if (calm >= OpenCvService.CALM_CYCLES_TO_REFRESH || age > OpenCvService.BG_MAX_AGE_MS) {
        this.background.set(source, blurred.clone());
        bg.delete();
        this.bgUpdatedAt.set(source, now);
        this.calmCycles.set(source, 0);
      } else {
        this.calmCycles.set(source, calm);
      }
    } else {
      this.calmCycles.set(source, 0);
    }

    blurred.delete(); src.delete(); diff.delete(); gray.delete(); kernel.delete(); contours.delete(); hierarchy.delete();
    return detections;
  }

  /** Gabungkan rect yang overlapping / berdekatan (iteratif sampai stabil) */
  private mergeRects(rects: Rect[]): Rect[] {
    const merged = [...rects];
    let changed = true;
    while (changed) {
      changed = false;
      for (let i = 0; i < merged.length && !changed; i++) {
        for (let j = i + 1; j < merged.length; j++) {
          if (this.rectsOverlap(merged[i], merged[j], OpenCvService.MERGE_GAP)) {
            merged[i] = this.unionRect(merged[i], merged[j]);
            merged.splice(j, 1);
            changed = true;
            break;
          }
        }
      }
    }
    return merged;
  }

  private rectsOverlap(a: Rect, b: Rect, gap: number): boolean {
    return a.x - gap < b.x + b.width && b.x - gap < a.x + a.width &&
           a.y - gap < b.y + b.height && b.y - gap < a.y + a.height;
  }

  private unionRect(a: Rect, b: Rect): Rect {
    const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y);
    return {
      x, y,
      width: Math.max(a.x + a.width, b.x + b.width) - x,
      height: Math.max(a.y + a.height, b.y + b.height) - y,
    };
  }

  private bestIouMatch(list: TrackedObject[], box: Rect): TrackedObject | null {
    let best: TrackedObject | null = null;
    let bestIou = OpenCvService.IOU_MATCH;
    for (const t of list) {
      // hanya match posisi dengan objek yang masih terlihat baru-baru ini
      if (t.missed > OpenCvService.MAX_MISSED) continue;
      const iou = this.iou(t.box, box);
      if (iou > bestIou) { bestIou = iou; best = t; }
    }
    return best;
  }

  private iou(a: Rect, b: Rect): number {
    const x1 = Math.max(a.x, b.x), y1 = Math.max(a.y, b.y);
    const x2 = Math.min(a.x + a.width, b.x + b.width), y2 = Math.min(a.y + a.height, b.y + b.height);
    const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
    if (inter === 0) return 0;
    return inter / (a.width * a.height + b.width * b.height - inter);
  }

  /** Identitas unik objek = BENTUK contour (7 Hu moments, log) + POSISI (lane vertikal &
   *  ukuran relatif). Dua paket berbentuk sama tapi di lane/posisi berbeda → indeks berbeda. */
  private objectSignature(contour: any, box: Rect): number[] {
    return [
      ...this.huSignature(contour),
      (box.y + box.height / 2) / OpenCvService.FRAME_H, // lane vertikal — stabil saat objek bergerak horizontal
      box.height / OpenCvService.FRAME_H,
      box.width / OpenCvService.FRAME_W,
    ];
  }

  /** Signature bentuk dari contour: 7 Hu moments (log-transformed, invarian posisi & skala) */
  private huSignature(contour: any): number[] {
    const cv = this.cv;
    const m = cv.moments(contour);
    const hu = new cv.Mat();
    cv.HuMoments(m, hu);
    const out: number[] = [];
    for (let i = 0; i < 7; i++) {
      const v = hu.data32F[i];
      out.push(Math.sign(v) * Math.log10(Math.abs(v) + 1e-12));
    }
    hu.delete();
    return out;
  }

  /** Jarak signature: fitur bentuk (7 pertama) bobot 1, fitur posisi bobot 2 —
   *  posisi lebih menentukan keunikan agar dua objek mirip tidak tertukar indeks */
  private signatureDistance(a: number[], b: number[]): number {
    if (!a.length || a.length !== b.length) return Number.POSITIVE_INFINITY;
    let sum = 0;
    let weight = 0;
    for (let i = 0; i < a.length; i++) {
      const w = i >= 7 ? 2 : 1;
      sum += Math.abs(a[i] - b[i]) * w;
      weight += w;
    }
    return sum / weight;
  }
}
