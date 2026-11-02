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

  /** Sidik jari murah untuk deteksi perubahan data (dipakai SSE agar tidak push snapshot tiap tick) */
  async fingerprint(): Promise<string> {
    const row = await this.awbRepo
      .createQueryBuilder('awb')
      .select('COUNT(*)', 'n')
      .addSelect('MAX(awb.updated_at)', 'last')
      .getRawOne();
    return `${row?.n ?? 0}:${row?.last ?? ''}`;
  }

  /**
   * Label colly per baris: grup = (airwaybill_number, hawb), posisi = urutan created_at ASC
   * (insert pertama = colly 1). Format: `colly-2-of-6`.
   */
  private withColly(rows: AirwaybillXray[]) {
    const labels = this.collyLabels(rows);
    return rows.map((row) => {
      const info = labels.get(Number(row.id));
      // Record hasil scan baru (MAWB_PART_TOTAL): part sendiri + total dari jumlah_koli
      if (row.part && row.part > 0) {
        const total = Number(row.jumlah_koli) > 0 ? Number(row.jumlah_koli) : (info?.total ?? 1);
        return { ...row, colly_label: `colly-${row.part}-of-${total}`, colly_total: total };
      }
      return { ...row, colly_label: info?.label ?? null, colly_total: info?.total ?? null };
    });
  }

  /** Map id → label colly (posisi created_at ASC dalam grup) + total anggota grup */
  private collyLabels(rows: AirwaybillXray[]) {
    const groups = new Map<string, AirwaybillXray[]>();
    for (const row of rows) {
      const key = `${row.airwaybill_number ?? ''}|${row.hawb ?? ''}`;
      const members = groups.get(key);
      if (members) members.push(row); else groups.set(key, [row]);
    }
    const labels = new Map<number, { label: string; total: number }>();
    for (const members of groups.values()) {
      const sorted = [...members].sort((a, b) => a.id - b.id);
      sorted.forEach((row, i) => labels.set(Number(row.id), { label: `colly-${i + 1}-of-${sorted.length}`, total: sorted.length }));
    }
    return labels;
  }

  /** Muat ulang SEMUA anggota grup dari record yang cocok filter (agregat tidak boleh dari subset) */
  private async fetchFullGroups(matched: AirwaybillXray[], orderKey: string, dir: 'ASC' | 'DESC'): Promise<AirwaybillXray[]> {
    const seen = new Set<string>();
    const conds: string[] = [];
    const params: Record<string, string> = {};
    for (const [i, r] of matched.entries()) {
      const key = `${r.airwaybill_number}|${r.hawb ?? ''}`;
      if (seen.has(key)) continue;
      seen.add(key);
      if (conds.length >= 100) break;
      conds.push(`(awb.airwaybill_number = :gm${i} AND IFNULL(awb.hawb, '') = :gh${i})`);
      params[`gm${i}`] = r.airwaybill_number;
      params[`gh${i}`] = r.hawb ?? '';
    }
    return this.awbRepo.createQueryBuilder('awb')
      .leftJoinAndSelect('awb.airwaybillXrayDetails', 'detail')
      .where(`(${conds.join(' OR ')})`, params)
      .orderBy(`awb.${orderKey}`, dir)
      .getMany();
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

  /** Label colly untuk satu baris (query grup dari DB, urut id ASC) */
  private async collyGroupOf(awb: Pick<AirwaybillXray, 'airwaybill_number' | 'hawb'>) {
    return this.awbRepo
      .createQueryBuilder('awb')
      .where('awb.airwaybill_number = :num', { num: awb.airwaybill_number })
      .andWhere('(awb.hawb = :hawb OR (awb.hawb IS NULL AND :hawb IS NULL))', { hawb: awb.hawb ?? null })
      .orderBy('awb.id', 'ASC')
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
      // Record dengan part (scan baru MAWB_PART_TOTAL): label pakai part-nya sendiri
      const partLabel = latest.part && latest.part > 0 ? `colly-${latest.part}-of-${qtyTotal}` : null;
      return {
        ...latest,
        colly_label: partLabel ?? `colly-${lastIdx}-of-${qtyTotal}`,
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

  async search(search?: string, first?: number, page?: number, orderBy?: QueryOrderByClause[], ungrouped?: boolean, filters?: { mawb?: string; hawb?: string; airlines?: string; origin?: string; dateFrom?: string; dateTo?: string }) {
    const f = {
      mawb: filters?.mawb?.trim() || undefined,
      hawb: filters?.hawb?.trim() || undefined,
      airlines: filters?.airlines?.trim() || undefined,
      origin: filters?.origin?.trim() || undefined,
      dateFrom: filters?.dateFrom || undefined,
      dateTo: filters?.dateTo || undefined,
    };
    const q = search?.trim();
    const hasFilters = !!(q || f.mawb || f.hawb || f.airlines || f.origin || f.dateFrom || f.dateTo);
    if (!hasFilters) {
      return this.awbRepo.find({ relations: { airwaybillXrayDetails: true }, order: this.order(orderBy) }).then((rows) => this.page(rows, first, page, ungrouped));
    }
    const orderMap = this.order(orderBy) as Record<string, 'ASC' | 'DESC'>;
    const orderKey = Object.keys(orderMap)[0] ?? 'created_at';
    const qb = this.awbRepo.createQueryBuilder('awb')
      .leftJoinAndSelect('awb.airwaybillXrayDetails', 'detail')
      .orderBy(`awb.${orderKey}`, orderMap[orderKey] ?? 'DESC');
    if (q) qb.andWhere('(awb.airwaybill_number LIKE :q OR awb.hawb LIKE :q)', { q: `%${q}%` });
    if (f.mawb) qb.andWhere('awb.airwaybill_number LIKE :mawb', { mawb: `%${f.mawb}%` });
    if (f.hawb) qb.andWhere('(awb.hawb LIKE :hawb OR awb.airwaybill_number LIKE :hawb)', { hawb: `%${f.hawb}%` });
    if (f.dateFrom) qb.andWhere('awb.created_at >= :dateFrom', { dateFrom: f.dateFrom });
    if (f.dateTo) qb.andWhere('awb.created_at <= :dateTo', { dateTo: `${f.dateTo} 23:59:59` });
    if (f.airlines || f.origin) {
      const pairs = await this.hostawbService?.listAwbByAirlinesOrOrigin(f.airlines, f.origin);
      if (!pairs) return this.page([], first, page, ungrouped);
      const { mawbs, hawbs } = pairs;
      if (mawbs.length === 0 && hawbs.length === 0) return this.page([], first, page, ungrouped);
      const conds: string[] = [];
      const params: Record<string, string[]> = {};
      if (mawbs.length > 0) { conds.push('awb.airwaybill_number IN (:...fm)'); params.fm = mawbs; }
      if (hawbs.length > 0) { conds.push('awb.hawb IN (:...fh)'); params.fh = hawbs; }
      qb.andWhere(`(${conds.join(' OR ')})`, params);
    }
    const rows = await qb.getMany();
    if (rows.length === 0) return this.page([], first, page, ungrouped);
    // Filter hanya boleh memilih GRUP/RECORD yang tampil; label & agregat colly wajib
    // dihitung dari SEMUA anggota grup (bukan subset hasil filter), kalau tidak
    // grup lengkap tampak "incomplete" / posisi colly salah saat filter tanggal.
    if (ungrouped === false) {
      const full = await this.fetchFullGroups(rows, orderKey, orderMap[orderKey] ?? 'DESC');
      return this.page(full, first, page, false);
    }
    if (ungrouped === true) {
      const full = await this.fetchFullGroups(rows, orderKey, orderMap[orderKey] ?? 'DESC');
      const labelMap = this.collyLabels(full);
      const data = await Promise.all(rows.map(async (row) => {
        const info = labelMap.get(Number(row.id));
        const qtyTotal = await this.collyTotalFor(row, info?.total ?? 1);
        return { ...row, xray_photos_count: row.airwaybillXrayDetails?.length ?? 0, colly_label: info?.label ?? null, colly_total: qtyTotal };
      }));
      const total = data.length;
      const per = first ?? 15;
      const lastPage = Math.max(1, Math.ceil(total / per));
      const current = Math.min(Math.max(1, page ?? 1), lastPage);
      const slice = data.slice((current - 1) * per, current * per);
      const paginatorInfo: PaginatorInfo = { count: slice.length, currentPage: current, firstItem: slice[0]?.id ?? null, hasMorePages: current < lastPage, lastItem: slice.at(-1)?.id ?? null, lastPage, perPage: per, total };
      return { data: slice, paginatorInfo };
    }
    return this.page(rows, first, page, ungrouped);
  }

  async byNumber(number: string) {
    const row = await this.awbRepo.findOne({ where: { airwaybill_number: number }, relations: { airwaybillXrayDetails: true } }).then((r) => r && this.withCount([r])[0]);
    row?.airwaybillXrayDetails?.sort((a, b) => a.id - b.id);
    return row ? this.withCollyMembers(row) : null;
  }
  async byId(id: string) {
    const row = await this.awbRepo.findOne({ where: { id: Number(id) }, relations: { airwaybillXrayDetails: true } }).then((r) => r && this.withCount([r])[0]);
    row?.airwaybillXrayDetails?.sort((a, b) => a.id - b.id);
    return row ? this.withCollyMembers(row) : null;
  }

  /** colly_label/total/members untuk satu record detail: query grup penuh dari DB */
  private async withCollyMembers(row: AirwaybillXray & { xray_photos_count?: number }) {
    const groupRaw = await this.collyGroupOf(row);
    // Urutan tampilan: record dengan part (scan baru) diurut part ASC; tanpa part tetap id ASC
    const hasParts = groupRaw.some((m) => m.part && m.part > 0);
    const group = hasParts
      ? [...groupRaw].sort((a, b) => ((a.part ?? 0) > 0 ? a.part! : 99999) - ((b.part ?? 0) > 0 ? b.part! : 99999) || a.id - b.id)
      : groupRaw;
    const index = group.findIndex((member) => member.id === row.id);
    const qtyTotal = await this.collyTotalFor(row, group.length);
    const members = await Promise.all(group.map(async (member, i) => {
      // Foto per anggota: pakai relasi detail (label nama file _top_ / _side_)
      const withDetails = member.id === row.id
        ? row
        : await this.awbRepo.findOne({ where: { id: member.id }, relations: { airwaybillXrayDetails: true } });
      const photos = withDetails?.airwaybillXrayDetails ?? [];
      const top = photos.find((d) => /_top_/.test(d.xray_photo) && d.rescan == null);
      const side = photos.find((d) => /_side_/.test(d.xray_photo) && d.rescan == null);
      const archived = photos
        .filter((d) => d.rescan != null)
        .sort((a, b) => (a.rescan ?? 0) - (b.rescan ?? 0))
        .map((d) => ({ xray_photo: d.xray_photo, rescan: d.rescan ?? 0, created_at: d.created_at }));
      return {
        id: member.id,
        colly_index: i + 1,
        colly_label: member.part && member.part > 0 ? `colly-${member.part}-of-${qtyTotal}` : `colly-${i + 1}-of-${qtyTotal}`,
        part: member.part ?? null,
        status: member.status,
        photo_airwaybill: member.photo_airwaybill ?? null,
        created_at: member.created_at,
        top_photo: top?.xray_photo ?? null,
        side_photo: side?.xray_photo ?? null,
        archived_photos: archived,
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

  /** Cek duplikat scan baru: mawb + part sudah ada? */
  async existsScan(mawb: string, part: number) {
    return this.awbRepo.findOne({
      where: { airwaybill_number: mawb, part },
      order: { id: 'DESC' },
      relations: { airwaybillXrayDetails: true },
    });
  }

  /**
   * Re-scan: arsipkan foto lama terpilih (rescan 1, 2, …), update foto label opsional,
   * dan kembalikan status ke waiting — pasangan foto baru akan di-insert oleh capture
   * pipeline dengan rescan NULL.
   */
  async rescan(id: string, types: string[], photo?: string): Promise<AirwaybillXray> {
    const awbId = Number(id);
    const awb = await this.awbRepo.findOne({ where: { id: awbId }, relations: { airwaybillXrayDetails: true } });
    if (!awb) throw new NotFoundException('Airwaybill not found');
    for (const type of types) {
      const pattern = type === 'top' ? '_top_' : '_side_';
      const old = awb.airwaybillXrayDetails.filter((d) => d.xray_photo.includes(pattern) && d.rescan == null);
      if (old.length === 0) continue;
      const archived = awb.airwaybillXrayDetails.filter((d) => d.xray_photo.includes(pattern) && d.rescan != null);
      const next = archived.reduce((max, d) => Math.max(max, d.rescan ?? 0), 0) + 1;
      for (const d of old) await this.detailRepo.update(d.id, { rescan: next });
    }
    if (photo) await this.awbRepo.update(awbId, { photo_airwaybill: photo, status: 'waiting' });
    else await this.awbRepo.update(awbId, { status: 'waiting' });
    this.events.publish({ action: 'detail-added', id: awbId, airwaybill_number: awb.airwaybill_number });
    return (await this.byId(id))!;
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
      // Objek yang selesai lebih dulu ↔ AWB waiting PERTAMA (id ASC = urutan insert).
      // Frontend mengirim job berurutan + retry, jadi cukup ambil kepala antrean.
      const rows = await manager.getRepository(AirwaybillXray)
        .createQueryBuilder('awb')
        .setLock('pessimistic_write')
        .where('awb.status = :status', { status: 'waiting' })
        .orderBy('awb.id', 'ASC')
        .getMany();
      const awb = rows[0];
      if (!awb) throw new NotFoundException('No waiting AWB available');
      // Watermark: mawb.hawb.urutan-of-jumlah — mawb/hawb/jumlah dari manifest (hostawb),
      // urutan = posisi record dalam grup (awb+hawb) berdasar created_at ASC.
      const group = await this.collyGroupOf(awb);
      const collyIndex = group.findIndex((member) => member.id === awb.id);
      const host = await this.hostawbService?.findByAwb(awb.airwaybill_number, awb.hawb);
      const wmMawb = host?.mawb || awb.airwaybill_number;
      const wmHawb = host?.hawb || awb.hawb || '';
      // Mode scan baru (barcode MAWB_PART_TOTAL): pos/total diambil dari field record,
      // bukan urutan grup colly.
      const pos = awb.part && awb.part > 0 ? awb.part : (collyIndex >= 0 ? collyIndex + 1 : group.length);
      const qtyTotal = awb.part && awb.part > 0
        ? (Number(awb.jumlah_koli) > 0 ? Number(awb.jumlah_koli) : (host?.quantity && host.quantity > 0 ? Math.round(host.quantity) : group.length))
        : (host?.quantity && host.quantity > 0 ? Math.round(host.quantity) : group.length);
      const wmParts = [wmMawb, wmHawb, `${pos}OF${qtyTotal}`].filter((v): v is string => !!v).map((v) => v.toUpperCase());
      const saveImage = async (data: string, label: string) => {
        const raw = data.replace(/^data:image\/\w+;base64,/, '');
        const name = `xray_${awb.id}_${label}_${Date.now()}.jpg`;
        await mkdir(join(process.cwd(), 'uploads'), { recursive: true });
        // Watermark strip bawah: satu baris label berformat MAWB_HAWB_POSOFQTY_TOP/SIDE.
        // Wrap dihitung dari LEBAR PIKSEL gambar hasil crop (bukan jumlah char),
        // supaya label tidak terpotong pada crop objek kecil.
        const meta = await sharp(Buffer.from(raw, 'base64')).metadata();
        const imgW = meta.width ?? 640;
        const fontSize = Math.min(17, Math.max(6, Math.round(imgW / 56)));
        const lineH = fontSize * 1.4;
        const charW = fontSize * 0.62; // monospace bold
        const maxChars = Math.max(8, Math.floor((imgW - fontSize * 1.5) / charW));
        const lines = [`${wmParts.join('_')}_${label.toUpperCase()}`].flatMap((l) => l.match(new RegExp(`.{1,${maxChars}}`, 'g')) ?? []);
        const stripH = Math.max(lineH * 1.4, lines.length * lineH + fontSize * 0.5);
        const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const textEls = lines
          .map((line, i) => `<text x="${fontSize}" y="${lineH * (i + 0.78)}" font-family="monospace" font-weight="bold" font-size="${fontSize}" fill="#FFFFFF">${esc(line)}</text>`)
          .join('');
        const svg = `<svg width="${imgW}" height="${Math.ceil(stripH)}" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="rgba(0,0,0,0.72)"/>
          ${textEls}
        </svg>`;
        const marked = await sharp(Buffer.from(raw, 'base64'))
          .extend({ bottom: Math.ceil(stripH), background: '#000000' })
          .composite([{ input: Buffer.from(svg), top: meta.height ?? 360, left: 0 }])
          .jpeg({ quality: 90 })
          .toBuffer();
        await writeFile(join(process.cwd(), 'uploads', name), marked);
        // Mode hybrid (DB server + capture lokal): salin file ke uploads server agar
        // web produksi bisa men-serve-nya (fire-and-forget; via kredensial DB_SSH_*).
        if (process.env.REMOTE_UPLOADS_SYNC === 'ssh') {
          void this.syncUploadRemote(name).catch(() => undefined);
        }
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

  /** Koneksi SFTP tunggal (dipakai ulang) untuk sync uploads ke server */
  private sftpClient: import('ssh2').Client | null = null;
  private sftpReady: Promise<import('ssh2').SFTPWrapper> | null = null;

  private async sftp(): Promise<import('ssh2').SFTPWrapper> {
    const host = process.env.DB_SSH_HOST;
    const port = Number(process.env.DB_SSH_PORT ?? 23022);
    const user = process.env.DB_SSH_USER ?? 'root';
    const pass = process.env.DB_SSH_PASSWORD;
    if (!host || !pass) throw new Error('DB_SSH_* tidak lengkap untuk sync uploads');
    if (!this.sftpClient || !this.sftpReady) {
      const { Client } = await import('ssh2');
      const client = new Client();
      this.sftpClient = client;
      this.sftpReady = new Promise((resolve, reject) => {
        client.on('ready', () => client.sftp((err, sftp) => (err ? reject(err) : resolve(sftp))));
        client.on('error', (err) => { this.sftpClient = null; this.sftpReady = null; reject(err); });
        client.on('close', () => { this.sftpClient = null; this.sftpReady = null; });
        client.connect({ host, port, username: user, password: pass, readyTimeout: 15000, keepaliveInterval: 15000 });
      });
    }
    return this.sftpReady;
  }

  /** Salin file hasil capture lokal ke folder uploads server produksi (SFTP via ssh2 — portable) */
  private async syncUploadRemote(name: string) {
    const sftp = await this.sftp();
    await new Promise<void>((resolve, reject) => {
      sftp.fastPut(join(process.cwd(), 'uploads', name), `/opt/awbxray/backend/uploads/${name}`, (err) => (err ? reject(err) : resolve()));
    });
  }

  watchedFilesPage(first?: number) { return this.fileRepo.find({ take: first ?? 15, order: { created_at: 'DESC' } }).then((data) => ({ data })); }
  createWatchedFile(input: CreateWatchedFileInput) { return this.fileRepo.save(this.fileRepo.create(input)); }
}
