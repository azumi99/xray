import { Controller, Sse } from '@nestjs/common';
import { Observable } from 'rxjs';
import { AwbEventsService } from './awb-events.service.js';
import { AwbService } from './awb.service.js';
import { HostawbService } from './hostawb.service.js';

@Controller('awb-events')
export class AwbEventsController {
  constructor(
    private readonly events: AwbEventsService,
    private readonly awbService: AwbService,
    private readonly hostawbService: HostawbService,
  ) {}

  @Sse()
  stream(): Observable<{ type: string; data: unknown }> {
    return new Observable((subscriber) => {
      let closed = false;

      const sendSnapshot = async () => {
        if (closed) return;
        // Snapshot antrean WAITING per-record, di-enrich manifest (airlines/origin)
        // supaya tabel scan tampil selengkap AWB List. Done rows dilewati —
        // konsumen (scan page & mobile) hanya memakai antrean waiting.
        const result = await this.awbService.list(100, 1, undefined, true);
        const waiting = [];
        for (const row of result.data) {
          if (row.status !== 'waiting') continue;
          const host = await this.hostawbService.findByAwb(row.airwaybill_number, row.hawb).catch(() => null);
          waiting.push({
            ...row,
            hostawb: host ? { airlinesCode: host.airlinesCode, flightNo: host.flightNo, origin: host.origin, quantity: host.quantity } : null,
          });
        }
        subscriber.next({ type: 'snapshot', data: waiting });
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
