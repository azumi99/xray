import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { getDataSourceToken } from '@nestjs/typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AirwaybillXray, AirwaybillXrayDetail } from '../../entities/airwaybill-xray.entity.js';
import { WatchedFile } from '../../entities/watched-file.entity.js';
import { AwbService } from './awb.service.js';
import { HostawbService } from './hostawb.service.js';
import { AwbEventsService } from './awb-events.service.js';
import { currentWarehouse, type Warehouse } from '../../warehouse.js';

/** Registry service per gudang: BGD (default) + CAS.
 *  Semua akses lewat getter `awb()` / `hostawb()` yang membaca gudang aktif
 *  dari AsyncLocalStorage (middleware x-warehouse / ?wh=) — resolver dan
 *  controller tidak perlu meng-thread parameter gudang manual. */
@Injectable()
export class AwbRegistry implements OnModuleInit, OnModuleDestroy {
  private cas?: { awb: AwbService; hostawb: HostawbService };

  constructor(
    @InjectRepository(AirwaybillXray) private readonly bgdAwbRepo: Repository<AirwaybillXray>,
    @InjectRepository(AirwaybillXrayDetail) private readonly bgdDetailRepo: Repository<AirwaybillXrayDetail>,
    @InjectRepository(WatchedFile) private readonly bgdFileRepo: Repository<WatchedFile>,
    private readonly events: AwbEventsService,
    private readonly bgdHostawb: HostawbService,
    @Inject(getDataSourceToken('cas')) private readonly casSource: DataSource,
  ) {}

  /** Instance BGD — dibuat di onModuleInit (bukan field initializer) supaya
   *  repo parameter-properties sudah pasti terisi. */
  private bgdAwb!: AwbService;

  onModuleInit() {
    this.bgdAwb = new AwbService(this.bgdAwbRepo, this.bgdDetailRepo, this.bgdFileRepo, this.events, this.bgdHostawb);
    const casHostawb = new HostawbService({
      host: process.env.CAS_MANIFEST_DB_HOST,
      port: Number(process.env.CAS_MANIFEST_DB_PORT ?? 3309),
      user: process.env.CAS_MANIFEST_DB_USER,
      password: process.env.CAS_MANIFEST_DB_PASSWORD,
      database: process.env.CAS_MANIFEST_DB_NAME,
    });
    this.cas = {
      awb: new AwbService(
        this.casSource.getRepository(AirwaybillXray),
        this.casSource.getRepository(AirwaybillXrayDetail),
        this.casSource.getRepository(WatchedFile),
        this.events,
        casHostawb,
      ),
      hostawb: casHostawb,
    };
  }

  async onModuleDestroy() {
    await this.cas?.hostawb.onModuleDestroy();
    await this.bgdHostawb.onModuleDestroy();
  }

  awb(warehouse: Warehouse = currentWarehouse()): AwbService {
    return warehouse === 'cas' && this.cas ? this.cas.awb : this.bgdAwb;
  }

  hostawb(warehouse: Warehouse = currentWarehouse()): HostawbService {
    return warehouse === 'cas' && this.cas ? this.cas.hostawb : this.bgdHostawb;
  }
}
