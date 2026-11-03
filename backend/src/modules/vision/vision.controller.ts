import { Controller, Get, NotFoundException, Param, Post, Body, Res } from '@nestjs/common';
import type { Response } from 'express';
import { YoloService } from './yolo.service.js';
import { OpenCvService } from './opencv.service.js';

@Controller('vision')
export class VisionController {
  /** Frame terakhir per source — untuk debug tuning deteksi (GET /vision/frame/:source) */
  private readonly lastFrames = new Map<string, Buffer>();

  constructor(
    private readonly yolo: YoloService,
    private readonly opencv: OpenCvService,
  ) {}

  @Post('detect')
  async detect(@Body() body: { imageBase64: string; lineX?: number; source?: string }) {
    const source = body.source ?? 'default';
    // simpan frame mentah untuk debug (tanpa debug flag agar ringan: hanya decode base64)
    try {
      this.lastFrames.set(source, Buffer.from(body.imageBase64.replace(/^data:image\/\w+;base64,/, ''), 'base64'));
      if (this.lastFrames.size > 4) {
        const oldest = this.lastFrames.keys().next().value;
        if (oldest !== undefined && oldest !== source) this.lastFrames.delete(oldest);
      }
    } catch { /* frame invalid — abaikan */ }
    if (this.yolo.enabled) {
      const yolo = await this.yolo.detect(source, body.imageBase64);
      return { engine: 'yolo', yolo, detections: yolo };
    }
    const opencv = await this.opencv.detect(source, body.imageBase64);
    return { engine: 'opencv', opencv, detections: opencv };
  }

  /** Frame terakhir source (JPEG) — untuk diagnosis deteksi */
  @Get('frame/:source')
  frame(@Param('source') source: string, @Res() res: Response) {
    const buf = this.lastFrames.get(source);
    if (!buf) throw new NotFoundException(`No frame buffered for source "${source}"`);
    res.setHeader('content-type', 'image/jpeg');
    res.send(buf);
  }
}
