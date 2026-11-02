import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as XLSX from 'xlsx';
import { LabelFedex } from '../../entities/label-fedex.entity.js';

export type LabelRow = {
  mawb: string;
  pcs_mawb?: number | null;
  hawb: string;
  pcs_hawb?: number | null;
  airlines_name?: string | null;
  flight_no?: string | null;
  route?: string | null;
};

@Injectable()
export class LabelsService {
  private readonly logger = new Logger(LabelsService.name);

  constructor(
    @InjectRepository(LabelFedex) private readonly repo: Repository<LabelFedex>,
  ) {}

  list() {
    return this.repo.find({ order: { id: 'ASC' } });
  }

  /** Parse XLSX (buffer) → rows siap insert. Header bebas urutan, case-insensitive. */
  parseWorkbook(buffer: Buffer): LabelRow[] {
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null });
    const pick = (row: Record<string, unknown>, ...keys: string[]) => {
      for (const k of keys) {
        const found = Object.keys(row).find((c) => c.trim().toLowerCase() === k);
        if (found && row[found] !== null && row[found] !== undefined && String(row[found]).trim() !== '') return row[found];
      }
      return null;
    };
    const rows: LabelRow[] = [];
    for (const row of raw) {
      const mawb = pick(row, 'mawb');
      const hawb = pick(row, 'hawb');
      if (!mawb && !hawb) continue;
      rows.push({
        mawb: String(mawb ?? '').trim(),
        hawb: String(hawb ?? '').trim(),
        pcs_mawb: Number(pick(row, 'pcs_mawb')) || null,
        pcs_hawb: Number(pick(row, 'pcs_hawb')) || null,
        airlines_name: pick(row, 'airlines_name') ? String(pick(row, 'airlines_name')) : null,
        flight_no: pick(row, 'flightno', 'flight_no') ? String(pick(row, 'flightno', 'flight_no')) : null,
        route: pick(row, 'route') ? String(pick(row, 'route')) : null,
      });
    }
    return rows;
  }

  /** Replace-all: data lama dibuang supaya isi tabel = isi file terakhir */
  async importRows(rows: LabelRow[]) {
    if (rows.length === 0) return { imported: 0 };
    await this.repo.clear();
    const saved = await this.repo.save(rows.map((r) => this.repo.create(r)));
    this.logger.log(`import label_fedex: ${saved.length} rows`);
    return { imported: saved.length };
  }

  async importBuffer(buffer: Buffer) {
    return this.importRows(this.parseWorkbook(buffer));
  }

  async clear() {
    await this.repo.clear();
    return { cleared: true };
  }
}
