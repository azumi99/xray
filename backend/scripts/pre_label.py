"""Auto pre-label X-ray frames untuk training YOLOv8 1-kelas (parcel).

Strategi: threshold loose (0.45× jarak bg↔strict) menangkap outline parcel
(dinding karton/plastik yang nyaris transparan di X-ray) + inti isi dalam satu
komponen tersambung. Kemudian morph CLOSE 7×7 untuk menyatukan gap internal,
connected components, filter area, output YOLO .txt per gambar.

Hasil = STARTER label — tetap perlu review/koreksi manual di LabelImg sebelum
dipakai training (otomatis cuma mencontohkan ~70-85% box dengan benar).

Jalankan:
  /Users/ilhambintang/.yolo-venv/bin/python backend/scripts/pre_label.py \
    /Users/ilhambintang/Downloads/training_data
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy.ndimage import binary_closing, label, find_objects


MIN_AREA_RATIO = 0.0015    # 0.15% frame — ~1300 px di 720p (parcel kecil/tipis di side)
MAX_AREA_RATIO = 0.55      # parcel besar bisa 50%+ frame side
MIN_W_RATIO = 0.035        # ~45px di 1280
MIN_H_RATIO = 0.04         # ~29px di 720
CLOSE_K = 11               # bridge gap internal parcel + rongga udara yang lebih besar
BG_STRIP_FRAC = (0.01, 0.04)  # baris 1%..4% dari atas untuk ukur background


def bg_level(gray: np.ndarray) -> tuple[float, float]:
    """Return (bgMean, bgStd) dari strip atas; fallback ke persentil 90 kalau strip tercemar."""
    h = gray.shape[0]
    y0, y1 = int(h * BG_STRIP_FRAC[0]), int(h * BG_STRIP_FRAC[1])
    strip = gray[y0:y1]
    m, s = float(strip.mean()), float(strip.std())
    if m < 140 or s > 28:  # strip tercemar chrome/toolbar → pakai persentil 90 dari seluruh frame
        m = float(np.percentile(gray.flatten()[::17], 90))
        s = 10.0
    return m, s


def build_mask(gray: np.ndarray) -> tuple[np.ndarray, float, float]:
    bg, bg_std = bg_level(gray)
    # strict th: bg - clamp(14..30, 12 + 2σ) — identik dengan backend yolo.service.ts
    margin = max(14.0, min(30.0, 12.0 + 2.0 * bg_std))
    strict_th = max(20.0, min(235.0, bg - margin))
    # loose th: 0.7× jarak bg↔strict — tangkap dinding parcel yang nyaris transparan
    # (karton/plastik). Pre-label sengaja AGRESIF — biar banyak kandidat tampil
    # untuk direview; false positive lebih mudah dihapus daripada parcel yang hilang.
    loose_th = bg - 0.3 * (bg - strict_th)
    mask = gray < loose_th
    # close 7×7: sambungkan rongga udara internal parcel supaya 1 parcel = 1 komponen
    mask = binary_closing(mask, structure=np.ones((CLOSE_K, CLOSE_K), dtype=bool))
    return mask, bg, strict_th


def pre_label_image(img_path: Path) -> int:
    """Pre-label satu gambar → tulis .txt sibling. Return jumlah box dihasilkan."""
    img = Image.open(img_path).convert("L")
    gray = np.asarray(img, dtype=np.uint8)
    h, w = gray.shape
    mask, _bg, _th = build_mask(gray)

    labeled, n = label(mask)
    if n == 0:
        img_path.with_suffix(".txt").write_text("")
        return 0

    min_area = int(w * h * MIN_AREA_RATIO)
    max_area = int(w * h * MAX_AREA_RATIO)
    min_w = int(w * MIN_W_RATIO)
    min_h = int(h * MIN_H_RATIO)

    lines: list[str] = []
    for slc in find_objects(labeled):
        if slc is None:
            continue
        y0, y1 = slc[0].start, slc[0].stop
        x0, x1 = slc[1].start, slc[1].stop
        bw, bh = x1 - x0, y1 - y0
        area = bw * bh
        if area < min_area or area > max_area:
            continue
        if bw < min_w or bh < min_h:
            continue
        # buang sidebar/chrome yang menempel tepi + penuh tinggi
        if (x0 <= 2 or x1 >= w - 2) and bh >= 0.8 * h:
            continue
        cx = (x0 + bw / 2) / w
        cy = (y0 + bh / 2) / h
        nw, nh = bw / w, bh / h
        lines.append(f"0 {cx:.6f} {cy:.6f} {nw:.6f} {nh:.6f}")

    img_path.with_suffix(".txt").write_text("\n".join(lines))
    return len(lines)


def main() -> int:
    if len(sys.argv) < 2:
        print("Pakai: pre_label.py <root_folder>")
        return 1
    root = Path(sys.argv[1]).expanduser().resolve()
    if not root.exists():
        print(f"Folder tidak ada: {root}")
        return 1

    jpgs = sorted(root.rglob("*.jpg"))
    if not jpgs:
        print(f"Tidak ada .jpg di {root}")
        return 1

    per_subdir: dict[str, tuple[int, int]] = {}  # subdir → (gambar, total_box)
    for p in jpgs:
        n = pre_label_image(p)
        sub = p.parent.name
        g, t = per_subdir.get(sub, (0, 0))
        per_subdir[sub] = (g + 1, t + n)

    print("Pre-label selesai:")
    for sub, (g, t) in sorted(per_subdir.items()):
        avg = t / g if g else 0
        print(f"  {sub}: {g} gambar, {t} box (avg {avg:.2f}/gambar)")
    print()
    print("Berikutnya: buka LabelImg (`pip install labelImg; labelImg`),")
    print(f"pilih 'Open Dir' → {root}/side atau {root}/top, format YOLO,")
    print("review dan koreksi tiap box agar menempel OUTLINE parcel (bukan isi).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
