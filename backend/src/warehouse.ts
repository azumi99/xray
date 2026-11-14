import { AsyncLocalStorage } from 'node:async_hooks';
import type { NextFunction, Request, Response } from 'express';
import { JwtService } from '@nestjs/jwt';

/** Gudang aktif: BGD (default) atau CAS. Dipilih per-request
 *  lewat header `x-warehouse` (GraphQL/Apollo) atau query `?wh=` (REST/SSE),
 *  dibaca AsyncLocalStorage supaya semua service turutannya kebab belakang
 *  mengambil instance DB yang benar tanpa threading parameter manual. */
export type Warehouse = 'bgd' | 'cas';

export const warehouseAls = new AsyncLocalStorage<{ warehouse: Warehouse }>();

const jwt = new JwtService({ secret: process.env.JWT_SECRET ?? 'dev-secret-change-me' });

export function warehouseMiddleware(req: Request, res: Response, next: NextFunction) {
  const raw = String(req.headers['x-warehouse'] ?? (req.query as Record<string, unknown>)?.wh ?? 'bgd').toLowerCase();
  const warehouse: Warehouse = raw === 'cas' ? 'cas' : 'bgd';
  // Guard hak akses: user (bila login) hanya boleh gudang miliknya.
  // 'all' = dua-duanya; request tanpa token valid (login, publik) lolos tanpa clamp.
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) {
    void jwt
      .verifyAsync(auth.slice(7))
      .then((payload) => {
        const allowed = String((payload as { wh?: string }).wh ?? '');
        if (allowed && allowed !== 'all' && allowed !== warehouse) {
          res.status(403).json({
            statusCode: 403,
            message: `Akses gudang ${warehouse.toUpperCase()} tidak diizinkan untuk user ini (hak: ${allowed.toUpperCase()})`,
          });
          return;
        }
        warehouseAls.run({ warehouse }, next);
      })
      .catch(() => warehouseAls.run({ warehouse }, next)); // token invalid → jalur auth masing-masing yang menolak
    return;
  }
  warehouseAls.run({ warehouse }, next);
}

export function currentWarehouse(): Warehouse {
  return warehouseAls.getStore()?.warehouse ?? 'bgd';
}
