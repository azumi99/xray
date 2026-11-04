import { Controller, Get, Logger, NotFoundException, Param, Post, Body, Res } from '@nestjs/common';
import type { Response } from 'express';
import { YoloService } from './yolo.service.js';
import { OpenCvService } from './opencv.service.js';

@Controller('vision')
export class VisionController {
  private readonly logger = new Logger(VisionController.name);
  /** Frame terakhir per source — untuk debug tuning deteksi (GET /vision/frame/:source) */
  private readonly lastFrames = new Map<string, Buffer>();
  private readonly detectLog = new Map<string, { n: number; boxes: number; last: number }>();

  constructor(
    private readonly yolo: YoloService,
    private readonly opencv: OpenCvService,
  ) {}

  @Post('detect')
  async detect(@Body() body: { imageBase64: string; lineX?: number; source?: string }) {
    const source = body.source ?? 'default';
    try {
      this.lastFrames.set(source, Buffer.from(body.imageBase64.replace(/^data:image\/\w+;base64,/, ''), 'base64'));
      if (this.lastFrames.size > 4) {
        const oldest = this.lastFrames.keys().next().value;
        if (oldest !== undefined && oldest !== source) this.lastFrames.delete(oldest);
      }
    } catch { /* frame invalid — abaikan */ }
    let result: { engine: string; detections?: unknown[]; yolo?: unknown[]; opencv?: unknown[] };
    if (this.yolo.enabled) {
      const yolo = await this.yolo.detect(source, body.imageBase64);
      result = { engine: 'yolo', yolo, detections: yolo };
    } else {
      const opencv = await this.opencv.detect(source, body.imageBase64);
      result = { engine: 'opencv', opencv, detections: opencv };
    }
    // Debug live: ringkasan per source setiap 20 request
    const st = this.detectLog.get(source) ?? { n: 0, boxes: 0, last: 0 };
    st.n += 1;
    st.boxes += Array.isArray(result.detections) ? result.detections.length : 0;
    if (st.n - st.last >= 20) {
      this.logger.log(`[detect:${source}] req=${st.n} totalBoxes=${st.boxes} (avg ${(st.boxes / st.n).toFixed(2)}/req)`);
      st.last = st.n;
    }
    this.detectLog.set(source, st);
    return result;
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
