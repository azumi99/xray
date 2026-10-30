import { Controller, Sse } from '@nestjs/common';
import { Observable } from 'rxjs';
import { AwbEventsService } from './awb-events.service.js';
import { AwbService } from './awb.service.js';

@Controller('awb-events')
export class AwbEventsController {
  constructor(
    private readonly events: AwbEventsService,
    private readonly awbService: AwbService,
  ) {}

  @Sse()
  stream(): Observable<{ type: string; data: unknown }> {
    return new Observable((subscriber) => {
      let closed = false;

      const sendSnapshot = async () => {
        if (closed) return;
        // ungrouped: snapshot per-record — dipakai list mobile (batch insert tampil semua record)
        const result = await this.awbService.list(100, 1, undefined, true);
        subscriber.next({ type: 'snapshot', data: result });
      };

      const onChange = () => { void sendSnapshot(); };
      this.events.emitter.on('awb_changed', onChange);
      void sendSnapshot();

      // ponytail: cek fingerprint tiap 2s, push snapshot hanya saat data berubah
      // (menangkap perubahan dari proses lain; mutasi internal sudah lewat awb_changed)
      let lastFp = '';
      void this.awbService.fingerprint().then((fp) => { lastFp = fp; });
      const refresh = setInterval(async () => {
        if (closed) return;
        try {
          const fp = await this.awbService.fingerprint();
          if (fp !== lastFp) {
            lastFp = fp;
            await sendSnapshot();
          }
        } catch { /* db blip: coba lagi tick berikutnya */ }
      }, 2_000);

      return () => {
        closed = true;
        clearInterval(refresh);
        this.events.emitter.off('awb_changed', onChange);
      };
    });
  }
}
