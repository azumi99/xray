#!/usr/bin/env python3
"""
Training YOLO side-view — objek X-ray menempel tepi bawah.

Alur:
1. PREPROCESS: crop area X-ray murni dari semua gambar training memakai ROI
   (rasio x,y,w,h — sama seperti ROI yang diset di panel dashboard/scan),
   latar di luar ROI diberi mask hitam supaya IDENTIK dengan inferensi.
2. AUGMENTASI via ultralytics: translate/scale/crop tinggi supaya model
   terbiasa objek dekat tepi.
3. Train lanjut (fine-tune) dari model saat ini lalu export ONNX.

Pemakaian:
  pip install ultralytics
  # siapkan dataset YOLO (images/ + labels/ .txt) berisi side-view
  python train_side.py --data dataset.yaml --model ../models/yolo.onnx \
      --roi 0.02,0.04,0.96,0.82 --epochs 60 --imgsz 640
"""
import argparse
import shutil
from pathlib import Path

from ultralytics import YOLO


def preprocess_roi(src_dir: Path, dst_dir: Path, roi, exts=('.jpg', '.jpeg', '.png')):
    """Mask hitam di luar ROI (persis pipeline inferensi ScanCapture)."""
    from PIL import Image, ImageDraw
    x, y, w, h = roi
    dst_dir.mkdir(parents=True, exist_ok=True)
    for img_path in src_dir.rglob('*'):
        if img_path.suffix.lower() not in exts:
            continue
        rel = img_path.relative_to(src_dir)
        out = dst_dir / rel
        out.parent.mkdir(parents=True, exist_ok=True)
        if img_path.parent.name == 'labels' or img_path.suffix == '.txt':
            shutil.copy(img_path, out)
            continue
        im = Image.open(img_path).convert('RGB')
        W, H = im.size
        draw = ImageDraw.Draw(im)
        draw.rectangle([0, 0, W, y * H], fill=(0, 0, 0))
        draw.rectangle([0, (y + h) * H, W, H], fill=(0, 0, 0))
        draw.rectangle([0, y * H, x * W, (y + h) * H], fill=(0, 0, 0))
        draw.rectangle([(x + w) * W, y * H, W, (y + h) * H], fill=(0, 0, 0))
        im.save(out, quality=95)
    # salin file label .txt apa adanya (posisi box relatif tidak berubah oleh masking)
    for txt in src_dir.rglob('*.txt'):
        rel = txt.relative_to(src_dir)
        out = dst_dir / rel
        out.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy(txt, out)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--data', required=True, help='dataset.yaml YOLO')
    ap.add_argument('--model', default='yolov8n.pt', help='model awal (.pt atau .onnx hasil sebelumnya)')
    ap.add_argument('--roi', default=None, help='rasio crop x,y,w,h — kosongkan jika dataset sudah murni X-ray')
    ap.add_argument('--epochs', type=int, default=60)
    ap.add_argument('--imgsz', type=int, default=640)
    args = ap.parse_args()

    data = args.data
    if args.roi:
        roi = tuple(float(v) for v in args.roi.split(','))
        base = Path(data).parent
        proc = base / 'datasets_roi'
        for split in ('train', 'val'):
            src = base / 'images' / split
            if src.exists():
                preprocess_roi(src.parent, proc / split, roi)
        data = str(proc.parent / 'data_roi.yaml') if (proc.parent / 'data_roi.yaml').exists() else data

    model = YOLO(args.model)
    model.train(
        data=data,
        epochs=args.epochs,
        imgsz=args.imgsz,
        # Augmentasi fokus objek menempel tepi:
        translate=0.15,       # geser objek mendekati tepi
        scale=0.5,            # variasi ukuran (parcel besar/menjulur)
        crop_fraction=0.8,    # crop acak memotong tepi
        mosaic=0.5,
        fliplr=0.0,           # arah belt penting — jangan flip kiri-kanan
        degrees=2.0,
        perspective=0.0,
        close_mosaic=10,
    )
    # Export ONNX (opsional) — timpa models/yolo.onnx setelah divalidasi
    best = Path(model.trainer.best)
    best.with_suffix('.onnx').unlink(missing_ok=True)
    YOLO(str(best)).export(format='onnx', imgsz=args.imgsz)
    print(f'selesai: {best} + onnx-nya')


if __name__ == '__main__':
    main()
