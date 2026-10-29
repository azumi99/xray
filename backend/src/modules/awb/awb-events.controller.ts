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

      const refresh = setInterval(() => { void sendSnapshot(); }, 2_000);

      return () => {
        closed = true;
        clearInterval(refresh);
        this.events.emitter.off('awb_changed', onChange);
      };
    });
  }
}
