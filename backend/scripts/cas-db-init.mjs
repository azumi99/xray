/** Duplikasi database awbxray BGD (3308) → CAS (3309).
 *  Struktur SEMUA tabel + data konfigurasi (users, label_fedex).
 *  Tabel operasional (airwaybill_xray*) dibuat KOSONG — gudang baru mulai bersih.
 *  Jalankan dari backend/: node scripts/cas-db-init.mjs
 */
import mysql from 'mysql2/promise';
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => /^[A-Z]/.test(l))
    .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]),
);

const src = await mysql.createConnection({
  host: env.DB_HOST, port: Number(env.DB_PORT), user: env.DB_USER,
  password: env.DB_PASSWORD, database: env.DB_NAME, multipleStatements: false,
});
const dst = await mysql.createConnection({
  host: env.CAS_DB_HOST, port: Number(env.CAS_DB_PORT), user: env.CAS_DB_USER,
  password: env.CAS_DB_PASSWORD, multipleStatements: false,
});

const COPY_DATA = new Set(['users', 'label_fedex']);
const [tables] = await src.query('SHOW TABLES');
const names = tables.map((r) => Object.values(r)[0]);
console.log('Tabel sumber:', names.join(', '));

await dst.query(`CREATE DATABASE IF NOT EXISTS \`${env.CAS_DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
await dst.changeUser({ database: env.CAS_DB_NAME });
await dst.query('SET FOREIGN_KEY_CHECKS=0');

for (const t of names) {
  const [[ddl]] = await src.query(`SHOW CREATE TABLE \`${t}\``);
  let sql = ddl['Create Table'];
  sql = sql.replace(/AUTO_INCREMENT=\d+/, ''); // counter mulai dari 1
  await dst.query(`DROP TABLE IF EXISTS \`${t}\``);
  await dst.query(sql);
  if (COPY_DATA.has(t)) {
    const [rows] = await src.query(`SELECT * FROM \`${t}\``);
    if (rows.length) {
      const cols = Object.keys(rows[0]).map((c) => `\`${c}\``).join(',');
      await dst.query(
        `INSERT INTO \`${t}\` (${cols}) VALUES ?`,
        [rows.map((r) => Object.values(r))],
      );
    }
    console.log(`  ${t}: struktur + ${rows.length} baris data`);
  } else {
    console.log(`  ${t}: struktur (kosong)`);
  }
}

await dst.query('SET FOREIGN_KEY_CHECKS=1');
await src.end();
await dst.end();
console.log('Duplikasi awbxray → CAS selesai.');
