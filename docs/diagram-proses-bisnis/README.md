# Diagram Proses Bisnis — AWB X-Ray Scanning

Dibuat dengan [bang-motion](https://github.com/bangtutorial/bang-motion) — motion graphic
satu berkas `index.html` (buka langsung di browser, klik dua kali, autoplay + loop).

## Isi folder

| Berkas | Keterangan |
|---|---|
| `index.html` | Diagram animasi — kamera menyusuri tahapan + node keputusan, lalu zoom-out |
| `png/00-full-diagram.png` | Full flowchart end-to-end |
| `png/01…06-*.png` | Satu PNG per tahapan proses |

## Alur (bahasa awam, tanpa istilah teknis)

1. **Akses operator** — operator masuk ke dashboard
2. **Antrian AWB masuk** — scan barcode lewat kamera HP → masuk antrian *(menunggu)*
3. **Kamera memantau paket** — tampak atas & samping, paket terdeteksi otomatis
4. **Foto atas + samping** — paket selesai lewat → foto tersimpan sendiri sesuai urutan antrian
   - keputusan **"foto lengkap?"** → *ya* lanjut, *belum* kembali ke pemantauan
5. **Tersimpan & selesai** — foto terpasang ke AWB yang menunggu, status berubah *(selesai)*
6. **Pantauan langsung** — daftar AWB update sendiri: menunggu · kurang foto · lengkap

## Kontrol

- `?debug=1` — panel scrub · `?clean=1` — tahan autoplay (untuk export)
- `R` ulang · `Space` jeda

## Re-ekspor PNG

```bash
URL="file://$PWD/index.html?clean=1" node <path>/snap.mjs png 6.9 10.9 14.9 18.9 22.9 26.9 36
```
