import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { AirwaybillXray, AirwaybillXrayDetail } from '../../entities/airwaybill-xray.entity.js';
import { WatchedFile } from '../../entities/watched-file.entity.js';
import { AwbEventsService } from './awb-events.service.js';
import { HostawbService } from './hostawb.service.js';
import { CreateAirwaybillXrayDetailInput, CreateAirwaybillXrayInput, CreateWatchedFileInput, PaginatorInfo, QueryOrderByClause, SortOrder } from './awb.types.js';

@Injectable()
export class AwbService {
  private readonly logger = new Logger(AwbService.name);
  /** Cache Quantity hostawb per grup (awb|hawb) —hindari query tunnel tiap request list */
  private readonly qtyCache = new Map<string, { qty: number | null; exp: number }>();
  constructor(
    @InjectRepository(AirwaybillXray) private readonly awbRepo: Repository<AirwaybillXray>,
    @InjectRepository(AirwaybillXrayDetail) private readonly detailRepo: Repository<AirwaybillXrayDetail>,
    @InjectRepository(WatchedFile) private readonly fileRepo: Repository<WatchedFile>,
    private readonly events: AwbEventsService,
    private readonly hostawbService?: HostawbService,
  ) {}

  private withCount(rows: AirwaybillXray[]) {
    return rows.map((row) => ({ ...row, xray_photos_count: row.airwaybillXrayDetails?.length ?? 0 }));
  }

  /**
   * Label colly per baris: grup = (airwaybill_number, hawb), posisi = urutan created_at ASC
   * (insert pertama = colly 1). Format: `colly-2-of-6`.
   */
  private withColly(rows: AirwaybillXray[]) {
    const groups = new Map<string, AirwaybillXray[]>();
    for (const row of rows) {
      const key = `${row.airwaybill_number ?? ''}|${row.hawb ?? ''}`;
      const members = groups.get(key);
      if (members) members.push(row); else groups.set(key, [row]);
    }
    const labels = new Map<number, { label: string; total: number }>();
    for (const members of groups.values()) {
      const sorted = [...members].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime() || a.id - b.id);
      sorted.forEach((row, i) => labels.set(Number(row.id), { label: `colly-${i + 1}-of-${sorted.length}`, total: sorted.length }));
    }
    return rows.map((row) => {
      const info = labels.get(Number(row.id));
      return { ...row, colly_label: info?.label ?? null, colly_total: info?.total ?? null };
    });
  }

  /**
   * Total colly grup: dari Quantity hostawb (data consignee, database rdwarehouse),
   * fallback ke jumlah record grup bila hostawb tidak tersedia/tidak ada Quantity.
   * Cache 60 detik per grup.
   */
  private async collyTotalFor(group: { airwaybill_number: string; hawb?: string | null }, fallback: number): Promise<number> {
    const key = `${group.airwaybill_number}|${group.hawb ?? ''}`;
    const cached = this.qtyCache.get(key);
    if (cached && cached.exp > Date.now()) return cached.qty ?? fallback;
    let qty: number | null = null;
    if (this.hostawbService) {
      const host = await this.hostawbService.findByAwb(group.airwaybill_number, group.hawb);
      qty = host?.quantity && host.quantity > 0 ? Math.round(host.quantity) : null;
    }
    this.qtyCache.set(key, { qty, exp: Date.now() + 60_000 });
    return qty ?? fallback;
  }

  /** Label colly untuk satu baris (query grup dari DB, urut created_at ASC) */
  private async collyGroupOf(awb: Pick<AirwaybillXray, 'airwaybill_number' | 'hawb'>) {
    return this.awbRepo
      .createQueryBuilder('awb')
      .where('awb.airwaybill_number = :num', { num: awb.airwaybill_number })
      .andWhere('(awb.hawb = :hawb OR (awb.hawb IS NULL AND :hawb IS NULL))', { hawb: awb.hawb ?? null })
      .orderBy('awb.created_at', 'ASC')
      .addOrderBy('awb.id', 'ASC')
      .getMany();
  }

  private async page(rows: AirwaybillXray[], first = 15, page = 1, ungrouped = false) {
    // Group 1 baris per grup colly (awb + house): baris terbaru grup jadi wakil,
    // agregat foto = seluruh anggota grup. colly_total = Quantity hostawb (fallback jumlah record).
    // ungrouped=true: tampilkan per-record (dipakai list mobile, termasuk hasil batch insert).
    const labeled = this.withColly(this.withCount(rows));
    if (ungrouped) {
      const data = await Promise.all(labeled.map(async (row) => {
        const qtyTotal = await this.collyTotalFor(row, row.colly_total ?? 1);
        return { ...row, colly_total: qtyTotal };
      }));
      const total = data.length;
      const lastPage = Math.max(1, Math.ceil(total / first));
      const current = Math.min(Math.max(1, page), lastPage);
      const slice = data.slice((current - 1) * first, current * first);
      const paginatorInfo: PaginatorInfo = { count: slice.length, currentPage: current, firstItem: slice[0]?.id ?? null, hasMorePages: current < lastPage, lastItem: slice.at(-1)?.id ?? null, lastPage, perPage: first, total };
      return { data: slice, paginatorInfo };
    }
    const groups = new Map<string, typeof labeled>();
    for (const row of labeled) {
      const key = `${row.airwaybill_number ?? ''}|${row.hawb ?? ''}`;
      const existing = groups.get(key);
      if (!existing) groups.set(key, [row]);
      else existing.push(row);
    }
    const grouped = await Promise.all([...groups.values()].map(async (members) => {
      const latest = members.reduce((a, b) => (new Date(a.created_at).getTime() >= new Date(b.created_at).getTime() ? a : b));
      const qtyTotal = await this.collyTotalFor(latest, members.length);
      // Colly dihitung dari record yang sudah punya foto X-ray (bukan sekadar ter-insert);
      // semua masih waiting tanpa foto → 0 of total
      const scanned = members.filter((m) => (m.xray_photos_count ?? 0) > 0);
      const lastIdx = scanned.length;
      return {
        ...latest,
        colly_label: `colly-${lastIdx}-of-${qtyTotal}`,
        colly_total: qtyTotal,
        airwaybillXrayDetails: members.flatMap((m) => m.airwaybillXrayDetails ?? []),
        xray_photos_count: members.reduce((sum, m) => sum + (m.xray_photos_count ?? 0), 0),
      };
    }));
    const total = grouped.length;
    const lastPage = Math.max(1, Math.ceil(total / first));
    const current = Math.min(Math.max(1, page), lastPage);
    const data = grouped.slice((current - 1) * first, current * first);
    const paginatorInfo: PaginatorInfo = { count: data.length, currentPage: current, firstItem: data[0]?.id ?? null, hasMorePages: current < lastPage, lastItem: data.at(-1)?.id ?? null, lastPage, perPage: first, total };
    return { data, paginatorInfo };
  }

  private order(orderBy?: QueryOrderByClause[]) {
    const clause = orderBy?.[0];
    if (!clause) return { created_at: 'DESC' as const };
    const key = clause.column === 'UPDATED_AT' ? 'updated_at' : clause.column === 'AIRWAYBILL_NUMBER' ? 'airwaybill_number' : 'created_at';
    return { [key]: clause.order === SortOrder.ASC ? 'ASC' as const : 'DESC' as const };
  }

  list(first?: number, page?: number, orderBy?: QueryOrderByClause[], ungrouped?: boolean) {
    return this.awbRepo.find({ relations: { airwaybillXrayDetails: true }, order: this.order(orderBy) }).then((rows) => this.page(rows, first, page, ungrouped));
  }

  search(search?: string, first?: number, page?: number, orderBy?: QueryOrderByClause[], ungrouped?: boolean) {
    const q = search?.trim();
    return this.awbRepo.find({ where: q ? [{ airwaybill_number: ILike(`%${q}%`) }, { hawb: ILike(`%${q}%`) }] : undefined, relations: { airwaybillXrayDetails: true }, order: this.order(orderBy) }).then((rows) => this.page(rows, first, page, ungrouped));
  }

  async byNumber(number: string) {
    const row = await this.awbRepo.findOne({ where: { airwaybill_number: number }, relations: { airwaybillXrayDetails: true } }).then((r) => r && this.withCount([r])[0]);
    return row ? this.withCollyMembers(row) : null;
  }
  async byId(id: string) {
    const row = await this.awbRepo.findOne({ where: { id: Number(id) }, relations: { airwaybillXrayDetails: true } }).then((r) => r && this.withCount([r])[0]);
    return row ? this.withCollyMembers(row) : null;
  }

  /** colly_label/total/members untuk satu record detail: query grup penuh dari DB */
  private async withCollyMembers(row: AirwaybillXray & { xray_photos_count?: number }) {
    const group = await this.collyGroupOf(row);
    const index = group.findIndex((member) => member.id === row.id);
    const qtyTotal = await this.collyTotalFor(row, group.length);
    const members = await Promise.all(group.map(async (member, i) => {
      // Foto per anggota: pakai relasi detail (label nama file _top_ / _side_)
      const withDetails = member.id === row.id
        ? row
        : await this.awbRepo.findOne({ where: { id: member.id }, relations: { airwaybillXrayDetails: true } });
      const photos = withDetails?.airwaybillXrayDetails ?? [];
      const top = photos.find((d) => /_top_/.test(d.xray_photo));
      const side = photos.find((d) => /_side_/.test(d.xray_photo));
      return {
        id: member.id,
        colly_index: i + 1,
        colly_label: `colly-${i + 1}-of-${qtyTotal}`,
        status: member.status,
        photo_airwaybill: member.photo_airwaybill ?? null,
        created_at: member.created_at,
        top_photo: top?.xray_photo ?? null,
        side_photo: side?.xray_photo ?? null,
      };
    }));
    return { ...row, colly_label: index >= 0 ? `colly-${index + 1}-of-${qtyTotal}` : null, colly_total: qtyTotal, colly_members: members };
  }

  async create(input: CreateAirwaybillXrayInput) {
    // Notifikasi bila nomor sudah pernah discan; tetap simpan sebagai record baru
    const alreadyExists = await this.awbRepo.existsBy({ airwaybill_number: input.airwaybill_number });
    let saved = await this.awbRepo.save(this.awbRepo.create(input));

    // Rekonsiliasi dengan manifest (hostawb): cocokkan hasil scan ke MasterAWB/HostAWB.
    // - Jika yang ter-scan di kolom MAWB ternyata HAWB → tukar (MAWB diambil dari manifest).
    // - Jika HAWB/MAWB kosong → lengkapi dari manifest.
    // - Manifest >1 baris → pakai baris pertama urutan DESC (findByAwb: noid DESC LIMIT 1).
    if (this.hostawbService) {
      try {
        const host = await this.hostawbService.findByAwb(input.airwaybill_number, input.hawb);
        if (host) {
          const hm = (host.mawb ?? '').trim();
          const hh = (host.hawb ?? '').trim();
          const scanNum = (input.airwaybill_number ?? '').trim();
          const scanHawb = (input.hawb ?? '').trim();
          let number = input.airwaybill_number;
          let hawb = input.hawb ?? null;
          const numIsHawb = !!hh && scanNum === hh && (!hm || scanNum !== hm);
          if (numIsHawb) {
            // Nilai tertukar: barcode yang ter-scan sebagai MAWB sebenarnya HAWB
            number = hm || number;
            hawb = hh || scanNum;
          } else {
            const hawbIsMawb = !!hm && scanHawb === hm && scanHawb !== hh;
            if (hawbIsMawb) hawb = hh || null; // hawb ternyata MAWB → ganti dari manifest
            if (!hawb && hh) hawb = hh; // lengkapi HAWB
            if (hm && (input.airwaybill_number ?? '').trim() !== hm) number = hm; // normalisasi MAWB
          }
          if (number !== saved.airwaybill_number || hawb !== saved.hawb) {
            this.logger.log(`manifest fix awb=${saved.id}: ${saved.airwaybill_number}/${saved.hawb ?? '-'} -> ${number}/${hawb ?? '-'}`);
            await this.awbRepo.update(saved.id, { airwaybill_number: number, hawb });
            saved = { ...saved, airwaybill_number: number, hawb };
          }
        }
      } catch (error) {
        this.logger.warn(`manifest reconcile skipped: ${error instanceof Error ? error.message : error}`);
      }
    }

    this.events.publish({ action: 'created', id: Number(saved.id), airwaybill_number: saved.airwaybill_number });
    return { ...saved, xray_photos_count: 0, airwaybillXrayDetails: [], already_exists: alreadyExists };
  }

  /**
   * Batch insert: sekali scan → insert sebanyak Quantity manifest (hostawb).
   * MAWB/HAWB dipetakan dari manifest; foto label sama untuk semua record.
   * Job berjalan di backend (fire-and-forget list, urutan insert = created_at ASC).
   */
  async createBatch(input: CreateAirwaybillXrayInput) {
    const host = this.hostawbService ? await this.hostawbService.findByAwb(input.airwaybill_number, input.hawb).catch(() => null) : null;
    const number = host?.mawb || input.airwaybill_number;
    const hawb = host?.hawb || input.hawb || null;
    const qty = host?.quantity && host.quantity > 0 ? Math.round(host.quantity) : 1;
    const alreadyExists = await this.awbRepo.existsBy({ airwaybill_number: number });
    const rows = Array.from({ length: qty }, () => this.awbRepo.create({ ...input, airwaybill_number: number, hawb }));
    const saved = await this.awbRepo.save(rows);
    this.events.publish({ action: 'created', id: Number(saved[0].id), airwaybill_number: number });
    this.logger.log(`batch insert awb=${number} hawb=${hawb ?? '-'} qty=${qty} rows=${saved.length}`);
    return { ...saved[0], xray_photos_count: 0, airwaybillXrayDetails: [], already_exists: alreadyExists, batch_count: saved.length };
  }

  async createDetail(input: CreateAirwaybillXrayDetailInput) {
    const awbId = Number(input.id_airwaybill);
    if (!(await this.awbRepo.existsBy({ id: awbId }))) {
      throw new NotFoundException('Airwaybill not found');
    }
    const detail = await this.detailRepo.save(this.detailRepo.create({ xray_photo: input.xray_photo, airwaybill: { id: awbId } as AirwaybillXray }));
    this.events.publish({ action: 'detail-added', id: awbId });
    return { ...detail, id_airwaybill: awbId };
  }

  async updateStatus(id: string, status: string): Promise<AirwaybillXray> {
    const value = status === 'done' ? 'done' : 'waiting';
    const awb = await this.byId(id);
    if (!awb) throw new NotFoundException('Airwaybill not found');
    await this.awbRepo.update(Number(id), { status: value });
    this.events.publish({ action: 'detail-added', id: Number(id) });
    return { ...(await this.byId(id))!, status: value };
  }

  async capturePair(topImage: string, sideImage: string, queueIndex = 0) {
    this.logger.log(`capturePair received top=${topImage.length} side=${sideImage.length} queue=${queueIndex}`);
    return this.awbRepo.manager.transaction(async (manager) => {
      // Antrian objek: objek ke-N di layar (urutan kontur) ↔ AWB waiting ke-N (created_at ASC).
      // queueIndex 0-based; di-clamp ke antrian yang tersedia.
      const rows = await manager.getRepository(AirwaybillXray)
        .createQueryBuilder('awb')
        .setLock('pessimistic_write')
        .where('awb.status = :status', { status: 'waiting' })
        .orderBy('awb.created_at', 'ASC')
        .addOrderBy('awb.id', 'ASC')
        .getMany();
      const awb = rows[Math.min(Math.max(0, queueIndex), rows.length - 1)];
      if (!awb) throw new NotFoundException('No waiting AWB available');
      // Watermark: mawb.hawb.urutan-of-jumlah — mawb/hawb/jumlah dari manifest (hostawb),
      // urutan = posisi record dalam grup (awb+hawb) berdasar created_at ASC.
      const group = await this.collyGroupOf(awb);
      const collyIndex = group.findIndex((member) => member.id === awb.id);
      const host = await this.hostawbService?.findByAwb(awb.airwaybill_number, awb.hawb);
      const wmMawb = host?.mawb || awb.airwaybill_number;
      const wmHawb = host?.hawb || awb.hawb || '';
      const qtyTotal = host?.quantity && host.quantity > 0 ? Math.round(host.quantity) : group.length;
      const collyPos = collyIndex >= 0 ? collyIndex + 1 : group.length;
      const wmParts = [wmMawb, wmHawb, `${collyPos}-of-${qtyTotal}`].filter((v): v is string => !!v).map((v) => v.toUpperCase());
      const saveImage = async (data: string, label: string) => {
        const raw = data.replace(/^data:image\/\w+;base64,/, '');
        const name = `xray_${awb.id}_${label}_${Date.now()}.jpg`;
        await mkdir(join(process.cwd(), 'uploads'), { recursive: true });
        // Watermark strip bawah: baris pertama = TOP/SIDE, baris berikutnya mawb.hawb.urutan-of-jumlah
        // (wrap per 32 char agar tidak terpotong; strip tinggi menyesuaikan jumlah baris).
        const meta = await sharp(Buffer.from(raw, 'base64')).metadata();
        const fontSize = Math.max(13, Math.round((meta.width ?? 640) / 34));
        const lineH = fontSize * 1.45;
        const lines = [label.toUpperCase(), ...(wmParts.join('.').match(/.{1,32}/g) ?? [])];
        const stripH = Math.max(lineH * 1.4, lines.length * lineH + fontSize * 0.5);
        const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const textEls = lines
          .map((line, i) => `<text x="${fontSize}" y="${lineH * (i + 0.78)}" font-family="monospace" font-weight="bold" font-size="${fontSize}" fill="#FFFFFF">${esc(line)}</text>`)
          .join('');
        const svg = `<svg width="${meta.width ?? 640}" height="${Math.ceil(stripH)}" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="rgba(0,0,0,0.72)"/>
          ${textEls}
        </svg>`;
        const marked = await sharp(Buffer.from(raw, 'base64'))
          .extend({ bottom: Math.ceil(stripH), background: '#000000' })
          .composite([{ input: Buffer.from(svg), top: meta.height ?? 360, left: 0 }])
          .jpeg({ quality: 90 })
          .toBuffer();
        await writeFile(join(process.cwd(), 'uploads', name), marked);
        return `/uploads/${name}`;
      };
      const topPath = await saveImage(topImage, 'top');
      const sidePath = await saveImage(sideImage, 'side');
      const details = manager.getRepository(AirwaybillXrayDetail);
      await details.save([
        details.create({ xray_photo: topPath, airwaybill: awb }),
        details.create({ xray_photo: sidePath, airwaybill: awb }),
      ]);
      await manager.getRepository(AirwaybillXray).update(awb.id, { status: 'done' });
      this.events.publish({ action: 'detail-added', id: Number(awb.id), airwaybill_number: awb.airwaybill_number });
      this.logger.log(`capturePair saved awb=${awb.id} top=${topPath} side=${sidePath}`);
      return { ...(await manager.getRepository(AirwaybillXray).findOne({ where: { id: awb.id }, relations: { airwaybillXrayDetails: true } }))!, xray_photos_count: 2 };
    });
  }

  async delete(id: string) {
    const awb = await this.byId(id);
    if (!awb) throw new NotFoundException('Airwaybill not found');
    const snapshot = { ...awb };
    await this.awbRepo.remove(awb);
    this.events.publish({ action: 'deleted', id: Number(id), airwaybill_number: snapshot.airwaybill_number });
    return snapshot;
  }

  watchedFilesPage(first?: number) { return this.fileRepo.find({ take: first ?? 15, order: { created_at: 'DESC' } }).then((data) => ({ data })); }
  createWatchedFile(input: CreateWatchedFileInput) { return this.fileRepo.save(this.fileRepo.create(input)); }
}
