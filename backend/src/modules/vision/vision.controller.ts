import { Controller, Logger, Post, Body } from '@nestjs/common';
import { YoloService } from './yolo.service.js';
import { OpenCvService } from './opencv.service.js';

@Controller('vision')
export class VisionController {
  private readonly logger = new Logger(VisionController.name);

  constructor(
    private readonly yolo: YoloService,
    private readonly opencv: OpenCvService,
  ) {}

  /**
   * Deteksi parcel/paket realtime.
   * YOLO (utama, jika model tersedia) — key `yolo`; OpenCV background-subtraction
   * (fallback) — key `opencv`. Kedua key selalu ada agar frontend lama/baru
   * kompatibel; key `detections` = hasil engine aktif.
   */
  @Post('detect')
  async detect(@Body() body: { imageBase64: string; lineX?: number; source?: string }) {
    const source = body.source ?? 'default';
    if (this.yolo.enabled) {
      const yolo = await this.yolo.detect(source, body.imageBase64);
      return { engine: 'yolo', yolo, detections: yolo };
    }
    const opencv = await this.opencv.detect(source, body.imageBase64);
    return { engine: 'opencv', opencv, detections: opencv };
  }
}
