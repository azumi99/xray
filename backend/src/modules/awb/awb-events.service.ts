import { Injectable } from '@nestjs/common';
import { EventEmitter } from 'node:events';

export type AwbChangeEvent = {
  action: 'created' | 'deleted' | 'detail-added';
  id?: number;
  airwaybill_number?: string;
};

@Injectable()
export class AwbEventsService {
  readonly emitter = new EventEmitter();

  constructor() {
    this.emitter.setMaxListeners(50);
  }

  publish(event: AwbChangeEvent) {
    this.emitter.emit('awb_changed', event);
  }
}
