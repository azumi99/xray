import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import mysql from 'mysql2/promise';
import { HostawbData } from './hostawb.types.js';

/**
 * Akses database eksternal rdwarehouse_jkt (MySQL 10.1.1.102:3306).
 * Dari server aplikasi hanya bisa dijangkau lewat SSH tunnel
 * (systemd unit `hostawb-tunnel` → 127.0.0.1:3307).
 *
 * Pool dibuat lazy: kalau tunnel belum siap, query cukup gagal (null)
 * tanpa membuat aplikasi crash.
 */
@Injectable()
export class HostawbService implements OnModuleDestroy {
  private readonly logger = new Logger(HostawbService.name);
  private pool: mysql.Pool | null = null;

  private getPool(): mysql.Pool {
    if (!this.pool) {
      this.pool = mysql.createPool({
        host: process.env.HOSTAWB_DB_HOST ?? '127.0.0.1',
        port: Number(process.env.HOSTAWB_DB_PORT ?? 3307),
        user: process.env.HOSTAWB_DB_USER ?? 'ipung',
        password: process.env.HOSTAWB_DB_PASSWORD ?? '',
        database: process.env.HOSTAWB_DB_NAME ?? 'rdwarehouse_jkt',
        connectionLimit: 3,
        connectTimeout: 5000,
      });
    }
    return this.pool;
  }

  /** Cari 1 baris terbaru yang MasterAWB/HostAWB-nya cocok dengan mawb/hawb */
  async findByAwb(mawb?: string | null, hawb?: string | null): Promise<HostawbData | null> {
    const candidates = [...new Set([mawb, hawb].map((v) => v?.trim()).filter((v): v is string => !!v))];
    if (candidates.length === 0) return null;
    try {
      const [rows] = await this.getPool().query(
        `SELECT * FROM imp_hostawb
         WHERE MasterAWB IN (?) OR HostAWB IN (?)
         ORDER BY (HostAWB IN (?) AND HostAWB <> '') DESC, noid DESC
         LIMIT 1`,
        [candidates, candidates, candidates],
      );
      const row = (rows as Record<string, unknown>[])[0];
      if (!row) return null;
      return this.toHostawbData(row);
    } catch (error) {
      this.logger.warn(`hostawb lookup failed: ${error instanceof Error ? error.message : error}`);
      return null;
    }
  }

  /** Daftar MAWB/HAWB dari manifest yang airlinescode/Origin-nya cocok — untuk filter list */
  async listAwbByAirlinesOrOrigin(airlines?: string, origin?: string): Promise<{ mawbs: string[]; hawbs: string[] } | null> {
    const conds: string[] = [];
    const params: Record<string, string> = {};
    if (airlines) { conds.push('airlinescode LIKE :airlines'); params.airlines = `%${airlines}%`; }
    if (origin) { conds.push('Origin LIKE :origin'); params.origin = `%${origin}%`; }
    if (conds.length === 0) return null;
    try {
      const [rows] = await this.getPool().query(
        `SELECT MasterAWB, HostAWB FROM imp_hostawb WHERE ${conds.join(' OR ')} LIMIT 500`,
        params,
      );
      const list = rows as Record<string, unknown>[];
      return {
        mawbs: [...new Set(list.map((r) => String(r.MasterAWB ?? '').trim()).filter(Boolean))],
        hawbs: [...new Set(list.map((r) => String(r.HostAWB ?? '').trim()).filter(Boolean))],
      };
    } catch (error) {
      this.logger.warn(`hostawb filter lookup failed: ${error instanceof Error ? error.message : error}`);
      return null;
    }
  }

  private toHostawbData(row: Record<string, unknown>): HostawbData {
    const str = (v: unknown) => (v === null || v === undefined ? null : String(v));
    const num = (v: unknown) => (v === null || v === undefined || v === '' ? null : Number(v));
    return {
      mawb: str(row.MasterAWB),
      hawb: str(row.HostAWB),
      airlinesCode: str(row.airlinescode),
      flightNo: str(row.FlightNo),
      dateOfFlight: str(row.DateOfFlight),
      origin: str(row.Origin),
      quantity: num(row.Quantity),
      weight: num(row.Weight),
      volume: num(row.Volume),
      hsCode: str(row.HSCode),
      descriptionGoods: str(row.DescriptionGoods),
      shipperName: str(row.shippername),
      shipperCity: str(row.shippercity),
      consigneeName: str(row.Consigneename),
      consigneeCity: str(row.Consigneecity),
      consigneeCountry: str(row.Consigneecountry),
      bc11: str(row.bc11),
      tglBc: str(row.tglbc),
      sppb: str(row.SPPB),
      tglSppb: str(row.TGLSPPB),
      dateEntry: str(row.DateEntry),
      timeEntry: str(row.TimeEntry),
      bagNumber: str(row.BagNumber),
    };
  }

  async onModuleDestroy() {
    await this.pool?.end().catch(() => undefined);
  }
}
