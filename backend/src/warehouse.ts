import { AsyncLocalStorage } from 'node:async_hooks';
import type { NextFunction, Request, Response } from 'express';

/** Gudang aktif: BGD (Bandung? default lama) atau CAS. Dipilih per-request
 *  lewat header `x-warehouse` (GraphQL/Apollo) atau query `?wh=` (REST/SSE),
 *  dibaca AsyncLocalStorage supaya semua service turutannya kebab belakang
 *  mengambil instance DB yang benar tanpa threading parameter manual. */
export type Warehouse = 'bgd' | 'cas';

export const warehouseAls = new AsyncLocalStorage<{ warehouse: Warehouse }>();

export function warehouseMiddleware(req: Request, _res: Response, next: NextFunction) {
  const raw = String(req.headers['x-warehouse'] ?? (req.query as Record<string, unknown>)?.wh ?? 'bgd').toLowerCase();
  const warehouse: Warehouse = raw === 'cas' ? 'cas' : 'bgd';
  warehouseAls.run({ warehouse }, next);
}

export function currentWarehouse(): Warehouse {
  return warehouseAls.getStore()?.warehouse ?? 'bgd';
}
