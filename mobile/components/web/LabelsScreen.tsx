import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
import { API_ORIGIN } from '@/constants/api';
import { useThemeStore } from '@/lib/store/themeStore';

type LabelRow = {
  id: number;
  mawb: string;
  pcs_mawb?: number | null;
  hawb: string;
  pcs_hawb?: number | null;
  part?: number | null;
  airlines_name?: string | null;
  flight_no?: string | null;
  route?: string | null;
};

/** Render barcode ke data-URL (dipakai print window terpisah) */
function barcodeDataUrl(value: string, height = 44): string | null {
  try {
    const canvas = document.createElement('canvas');
    JsBarcode(canvas, value, { format: 'CODE128', height, width: 2, displayValue: false, margin: 0, lineColor: '#111111' });
    return canvas.toDataURL('image/png');
  } catch {
    return null;
  }
}

/** QR ke data-URL — dipakai label print (value mawb_part_jumlah) */
async function qrDataUrl(value: string): Promise<string | null> {
  try {
    return await QRCode.toDataURL(value, { margin: 0, width: 160, errorCorrectionLevel: 'M' });
  } catch {
    return null;
  }
}

/** Print di window terpisah — bebas dari CSS/quirk react-native-web */
async function printLabels(rows: LabelRow[], partMap: Map<number, number>) {
  if (rows.length === 0) return;
  // Barcode MAWB & HAWB polos; QR di kanan section HAWB memuat hawb_part_jumlah
  const section = (title: string, bcVal: string, numText: string, rightHtml: string) => {
    const bc = barcodeDataUrl(bcVal, 26);
    return `
      <div class="sec">
        <div class="sec-title">${title}</div>
        <div class="sec-row">
          <div class="sec-left">
            ${bc ? `<img class="bc" src="${bc}" />` : ''}
            <div class="sec-num">${numText}</div>
          </div>
          ${rightHtml}
        </div>
      </div>`;
  };
  const partPcs = (r: LabelRow, pcs: number | null | undefined) => `<div class="pp">${partMap.get(r.id) ?? '-'}/${pcs ?? '-'}</div>`;
  const qrRight = async (value: string) => {
    const qr = await qrDataUrl(value);
    return qr ? `<img class="qr" src="${qr}" />` : '';
  };
  const html = `<!doctype html><html><head><title>Labels ${rows.length}</title><style>
    @page { size: 100mm 50mm; margin: 0; }
    body { margin: 0; font-family: Helvetica, Arial, sans-serif; }
    .page { width: 100mm; height: 50mm; box-sizing: border-box; border: 1px solid #111; padding: 2.5mm; page-break-after: always; display: flex; flex-direction: column; }
    .head { display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #111; padding-bottom: 1mm; }
    .airline { font-size: 9.5pt; font-weight: 900; color: #111; }
    .flight { font-size: 9pt; font-weight: 700; color: #111; }
    .route { font-size: 9pt; font-weight: 700; color: #111; }
    .sec { flex: 1; display: flex; flex-direction: column; justify-content: center; }
    .sec + .sec { border-top: 1px dashed #999; }
    .sec-title { font-size: 7.5pt; font-weight: 800; color: #333; text-transform: uppercase; letter-spacing: 0.3mm; }
    .sec-row { display: flex; align-items: center; justify-content: space-between; }
    .sec-left { flex: 1; min-width: 0; }
    .bc { width: 72mm; max-width: 100%; height: auto; margin-top: 0.5mm; }
    .sec-num { font-size: 10pt; font-weight: 800; color: #111; margin-top: 0.5mm; }
    .pp { font-size: 12pt; font-weight: 900; color: #111; padding-right: 2mm; white-space: nowrap; }
    .qr { width: 16mm; height: 16mm; }
  </style></head><body>${(await Promise.all(rows.map(async (r) => `
    <div class="page">
      <div class="head"><span class="airline">${r.airlines_name ?? '-'}</span><span class="flight">${r.flight_no ?? ''}</span><span class="route">${r.route ?? ''}</span></div>
      ${section('Air Waybill No:', r.mawb, r.mawb, partPcs(r, r.pcs_mawb ?? r.pcs_hawb))}
      ${section('H. Waybill No:', r.hawb, r.hawb, await qrRight(`${r.hawb}_${partMap.get(r.id) ?? 1}_${r.pcs_hawb ?? r.pcs_mawb ?? 0}`))}
    </div>`))).join('')}</body></html>`;
  const w = window.open('', '_blank', 'width=800,height=600');
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 300);
}

export function LabelsScreen() {
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';
  const [rows, setRows] = useState<LabelRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [filters, setFilters] = useState({ mawb: '', hawb: '', airlines: '', flight: '' });
  const [applied, setApplied] = useState<{ mawb?: string; hawb?: string; airlines?: string; flight?: string } | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [page, setPage] = useState(1);
  const [groupMode, setGroupMode] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const PAGE_SIZE = 20;
  const fileRef = useRef<HTMLInputElement | null>(null);

  const toggleGroup = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const doPrint = (ids: number[] | null) => {
    void printLabels(ids === null ? filtered : filtered.filter((r) => ids.includes(r.id)), partMap);
  };
  const toggle = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Part: urutan insert (id ASC) dalam grup MAWB+HAWB yang sama — 1..N (N = jumlah record grup)
  const partMap = new Map<number, number>();
  {
    const groups = new Map<string, LabelRow[]>();
    for (const r of rows) {
      const key = `${r.mawb}|${r.hawb}`;
      const arr = groups.get(key);
      if (arr) arr.push(r); else groups.set(key, [r]);
    }
    for (const arr of groups.values()) {
      arr.sort((a, b) => a.id - b.id).forEach((r, i) => partMap.set(r.id, r.part ?? i + 1));
    }
  }

  const filtered = applied
    ? rows.filter((r) =>
        (!applied.mawb || r.mawb.toUpperCase().includes(applied.mawb.toUpperCase()))
        && (!applied.hawb || r.hawb.toUpperCase().includes(applied.hawb.toUpperCase()))
        && (!applied.airlines || (r.airlines_name ?? '').toUpperCase().includes(applied.airlines.toUpperCase()))
        && (!applied.flight || (r.flight_no ?? '').toUpperCase().includes(applied.flight.toUpperCase())))
    : rows;

  const lastPage = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, lastPage);
  const paged = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  // Grup MAWB+HAWB (anggota urut id ASC = urutan part) untuk mode grouping
  const groups = new Map<string, LabelRow[]>();
  for (const r of paged) {
    const key = `${r.mawb}|${r.hawb}`;
    const arr = groups.get(key);
    if (arr) arr.push(r); else groups.set(key, [r]);
  }

  useEffect(() => { setPage(1); }, [applied, rows]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_ORIGIN}/api/labels`);
      setRows(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const upload = async (file: File) => {
    setBusy(true);
    try {
      const body = new FormData();
      body.append('file', file);
      const res = await fetch(`${API_ORIGIN}/api/labels/import`, { method: 'POST', body });
      if (!res.ok) throw new Error(`Import gagal (${res.status})`);
      await load();
    } catch (e) {
      console.error('[Labels] import failed', e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ gap: 16 }}>
      <View style={{ backgroundColor: isDark ? '#111827' : '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: isDark ? '#1F2937' : '#E5E7EB', padding: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <View style={{ gap: 3 }}>
          <Text style={{ fontSize: 13, fontWeight: '800', color: isDark ? '#F9FAFB' : '#111827' }}>Print Label (10 × 5 cm)</Text>
          <Text style={{ fontSize: 11.5, color: '#9CA3AF' }}>{rows.length} label — import Excel replace all data</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            style={{ display: 'none' }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); e.target.value = ''; }}
          />
          <TouchableOpacity disabled={busy} onPress={() => fileRef.current?.click()} style={{ paddingVertical: 9, paddingHorizontal: 18, borderRadius: 10, backgroundColor: '#0284C7' }}>
            <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 12.5 }}>{busy ? 'Importing…' : 'Import Excel'}</Text>
          </TouchableOpacity>
          <TouchableOpacity disabled={rows.length === 0} onPress={() => doPrint(null)} style={{ paddingVertical: 9, paddingHorizontal: 18, borderRadius: 10, borderWidth: 1, borderColor: isDark ? '#1F2937' : '#E5E7EB' }}>
            <Text style={{ color: rows.length === 0 ? '#9CA3AF' : (isDark ? '#CBD5E1' : '#475569'), fontWeight: '700', fontSize: 12.5 }}>Print All</Text>
          </TouchableOpacity>
          {selected.size > 0 ? (
            <TouchableOpacity onPress={() => doPrint([...selected])} style={{ paddingVertical: 9, paddingHorizontal: 18, borderRadius: 10, backgroundColor: '#16A34A' }}>
              <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 12.5 }}>Print Selected ({selected.size})</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <View style={{ backgroundColor: isDark ? '#111827' : '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: isDark ? '#1F2937' : '#E5E7EB', padding: 18, gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <Text style={{ fontSize: 13, fontWeight: '800', color: isDark ? '#F9FAFB' : '#111827' }}>Display Mode</Text>
          <View style={{ flexDirection: 'row', borderRadius: 12, borderWidth: 1, borderColor: isDark ? '#1F2937' : '#E5E7EB', backgroundColor: isDark ? '#0B1220' : '#F1F5F9', padding: 3, gap: 2 }}>
            {[
              { label: 'Grouping', active: groupMode, on: true },
              { label: 'Non-Grouping', active: !groupMode, on: false },
            ].map((opt) => (
              <TouchableOpacity
                key={opt.label}
                onPress={() => setGroupMode(opt.on)}
                style={{ paddingVertical: 8, paddingHorizontal: 18, borderRadius: 9, backgroundColor: opt.active ? '#0284C7' : 'transparent' }}
              >
                <Text style={{ fontSize: 12.5, fontWeight: '700', color: opt.active ? '#FFFFFF' : (isDark ? '#CBD5E1' : '#475569') }}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {([
            { key: 'mawb', label: 'MAWB', placeholder: 'e.g. 023-54074672' },
            { key: 'hawb', label: 'HAWB', placeholder: 'e.g. TC826040075' },
            { key: 'airlines', label: 'Airlines', placeholder: 'e.g. FEDEX' },
            { key: 'flight', label: 'Flight', placeholder: 'e.g. FX6068' },
          ] as const).map((f) => (
            <View key={f.key} style={{ gap: 5, flexGrow: 1, flexBasis: 170, minWidth: 155 }}>
              <Text style={{ fontSize: 10, fontWeight: '800', color: isDark ? '#94A3B8' : '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 }}>{f.label}</Text>
              <input
                value={filters[f.key]}
                onChange={(e) => setFilters((prev) => ({ ...prev, [f.key]: e.target.value }))}
                onKeyDown={(e) => { if (e.key === 'Enter') { const obj = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== '')); setApplied(Object.keys(obj).length ? obj : null); } }}
                placeholder={f.placeholder}
                style={{ width: '100%', padding: '9px 11px', fontSize: 12.5, borderRadius: 9, border: `1px solid ${isDark ? '#1F2937' : '#E5E7EB'}`, backgroundColor: isDark ? '#0B1220' : '#F8FAFC', color: isDark ? '#E5E7EB' : '#111827', boxSizing: 'border-box' }}
              />
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <TouchableOpacity
            onPress={() => { const obj = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== '')); setApplied(Object.keys(obj).length ? obj : null); }}
            style={{ paddingVertical: 9, paddingHorizontal: 20, borderRadius: 10, backgroundColor: '#0284C7' }}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 12.5 }}>Apply Filters</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => { setFilters({ mawb: '', hawb: '', airlines: '', flight: '' }); setApplied(null); }}
            style={{ paddingVertical: 9, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1, borderColor: isDark ? '#1F2937' : '#E5E7EB' }}
          >
            <Text style={{ color: isDark ? '#CBD5E1' : '#475569', fontWeight: '700', fontSize: 12.5 }}>Reset</Text>
          </TouchableOpacity>
          {applied ? <Text style={{ fontSize: 11.5, color: '#9CA3AF' }}>Filters active</Text> : null}
        </View>
      </View>

      <View style={{ backgroundColor: isDark ? '#111827' : '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: isDark ? '#1F2937' : '#E5E7EB', overflow: 'hidden' }}>
        <View style={{ flexDirection: 'row', backgroundColor: isDark ? '#0F1A2E' : '#F1F5F9', borderBottomWidth: 1, borderBottomColor: isDark ? '#1F2937' : '#E5E7EB', paddingHorizontal: 14, paddingVertical: 10 }}>
          <View style={{ flex: 0.5, alignItems: 'center' }}>
            {groupMode ? <Text style={{ fontSize: 10.5, fontWeight: '800', color: '#94A3B8' }} /> : (
              <input type="checkbox" checked={filtered.length > 0 && selected.size === filtered.length} onChange={(e) => setSelected(e.target.checked ? new Set(filtered.map((r) => r.id)) : new Set())} />
            )}
          </View>
          {['#', 'PART', 'MAWB', 'MAWB PCS', 'HAWB', 'HAWB PCS', 'AIRLINES', 'FLIGHT', 'ROUTE'].map((h, i) => (
            <Text key={`${h}-${i}`} style={{ flex: h === 'MAWB' || h === 'HAWB' || h === 'AIRLINES' ? 1.4 : 0.8, fontSize: 10.5, fontWeight: '800', letterSpacing: 0.5, color: '#94A3B8', textAlign: 'center' }}>{h}</Text>
          ))}
          <Text style={{ flex: 0.8, fontSize: 10.5, fontWeight: '800', letterSpacing: 0.5, color: '#94A3B8', textAlign: 'center' }}>PRINT</Text>
        </View>
        {loading ? (
          <View style={{ paddingVertical: 32, alignItems: 'center' }}><ActivityIndicator color="#0284C7" /></View>
        ) : filtered.length === 0 ? (
          <View style={{ paddingVertical: 32, alignItems: 'center' }}>
            <Text style={{ color: isDark ? '#64748B' : '#6B7280', fontSize: 12.5 }}>No labels — import Excel to start</Text>
          </View>
        ) : groupMode ? (
          [...groups.entries()].map(([key, members], gi) => {
            const head = members[0];
            const isOpen = expanded.has(key);
            return (
              <View key={key} style={{ borderTopWidth: gi === 0 ? 0 : 1, borderTopColor: isDark ? '#1F2937' : '#E5E7EB', backgroundColor: gi % 2 === 1 ? (isDark ? '#0D1526' : '#F8FAFC') : 'transparent' }}>
                <TouchableOpacity onPress={() => toggleGroup(key)} style={{ flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 10, alignItems: 'center' }}>
                  <Text style={{ flex: 0.5, fontSize: 12.5, color: '#0284C7', fontWeight: '800', textAlign: 'center' }}>{isOpen ? '▾' : '▸'}</Text>
                  <Text style={{ flex: 0.8, fontSize: 12.5, color: isDark ? '#64748B' : '#6B7280', textAlign: 'center' }}>{gi + 1}</Text>
                  <Text style={{ flex: 0.8, fontSize: 12.5, fontWeight: '800', color: '#0284C7', textAlign: 'center' }}>1-{members.length}</Text>
                  <Text style={{ flex: 1.4, fontSize: 12.5, fontWeight: '700', color: isDark ? '#F9FAFB' : '#111827', textAlign: 'center' }}>{head.mawb}</Text>
                  <Text style={{ flex: 0.8, fontSize: 12.5, color: isDark ? '#CBD5E1' : '#374151', textAlign: 'center' }}>{head.pcs_mawb ?? '-'}</Text>
                  <Text style={{ flex: 1.4, fontSize: 12.5, fontWeight: '700', color: isDark ? '#F9FAFB' : '#111827', textAlign: 'center' }}>{head.hawb}</Text>
                  <Text style={{ flex: 0.8, fontSize: 12.5, color: isDark ? '#CBD5E1' : '#374151', textAlign: 'center' }}>{head.pcs_hawb ?? head.pcs_mawb ?? '-'}</Text>
                  <Text style={{ flex: 1.4, fontSize: 12.5, color: isDark ? '#CBD5E1' : '#374151', textAlign: 'center' }}>{head.airlines_name ?? '-'}</Text>
                  <Text style={{ flex: 0.8, fontSize: 12.5, color: isDark ? '#CBD5E1' : '#374151', textAlign: 'center' }}>{head.flight_no ?? '-'}</Text>
                  <Text style={{ flex: 0.8, fontSize: 12.5, color: isDark ? '#CBD5E1' : '#374151', textAlign: 'center' }}>{head.route ?? '-'}</Text>
                  <View style={{ flex: 0.8, alignItems: 'center' }}>
                    <TouchableOpacity onPress={() => doPrint(members.map((m) => m.id))} style={{ paddingVertical: 5, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#0284C7' }}>
                      <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 11 }}>Print All</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
                {isOpen ? members.map((row) => (
                  <View key={row.id} style={{ flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 8, alignItems: 'center', borderTopWidth: 1, borderTopColor: isDark ? '#111827' : '#F1F5F9', backgroundColor: isDark ? '#0B1220' : '#F1F5F9' }}>
                    <Text style={{ flex: 0.5 }} />
                    <Text style={{ flex: 0.8, fontSize: 11.5, color: isDark ? '#64748B' : '#6B7280', textAlign: 'center' }}>·</Text>
                    <Text style={{ flex: 0.8, fontSize: 11.5, fontWeight: '800', color: isDark ? '#F9FAFB' : '#111827', textAlign: 'center' }}>{partMap.get(row.id) ?? '-'}</Text>
                    <Text style={{ flex: 1.4, fontSize: 11.5, color: '#94A3B8', textAlign: 'center' }}>—</Text>
                    <Text style={{ flex: 0.8 }} />
                    <Text style={{ flex: 1.4, fontSize: 11.5, color: isDark ? '#CBD5E1' : '#374151', textAlign: 'center' }}>{row.hawb}</Text>
                    <Text style={{ flex: 0.8, fontSize: 11.5, color: isDark ? '#CBD5E1' : '#374151', textAlign: 'center' }}>{row.pcs_hawb ?? '-'}</Text>
                    <Text style={{ flex: 1.4 }} />
                    <Text style={{ flex: 0.8, fontSize: 11.5, color: '#94A3B8', textAlign: 'center' }}>id {row.id}</Text>
                    <Text style={{ flex: 0.8 }} />
                    <View style={{ flex: 0.8, alignItems: 'center' }}>
                      <TouchableOpacity onPress={() => doPrint([row.id])} style={{ paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: '#0284C7' }}>
                        <Text style={{ color: '#0284C7', fontWeight: '700', fontSize: 10.5 }}>Print</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )) : null}
              </View>
            );
          })
        ) : (
          paged.map((row, i) => (
            <View key={row.id} style={{ flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 10, alignItems: 'center', backgroundColor: i % 2 === 1 ? (isDark ? '#0D1526' : '#F8FAFC') : 'transparent', borderTopWidth: 1, borderTopColor: isDark ? '#1F2937' : '#E5E7EB' }}>
              <View style={{ flex: 0.5, alignItems: 'center' }}>
                <input type="checkbox" checked={selected.has(row.id)} onChange={() => toggle(row.id)} />
              </View>
              <Text style={{ flex: 0.8, fontSize: 12.5, color: isDark ? '#64748B' : '#6B7280', textAlign: 'center' }}>{i + 1}</Text>
              <Text style={{ flex: 0.8, fontSize: 12.5, fontWeight: '700', color: isDark ? '#F9FAFB' : '#111827', textAlign: 'center' }}>{partMap.get(row.id) ?? '-'}</Text>
              <Text style={{ flex: 1.4, fontSize: 12.5, fontWeight: '700', color: isDark ? '#F9FAFB' : '#111827', textAlign: 'center' }}>{row.mawb}</Text>
              <Text style={{ flex: 0.8, fontSize: 12.5, color: isDark ? '#CBD5E1' : '#374151', textAlign: 'center' }}>{row.pcs_mawb ?? '-'}</Text>
              <Text style={{ flex: 1.4, fontSize: 12.5, fontWeight: '700', color: isDark ? '#F9FAFB' : '#111827', textAlign: 'center' }}>{row.hawb}</Text>
              <Text style={{ flex: 0.8, fontSize: 12.5, color: isDark ? '#CBD5E1' : '#374151', textAlign: 'center' }}>{row.pcs_hawb ?? '-'}</Text>
              <Text style={{ flex: 1.4, fontSize: 12.5, color: isDark ? '#CBD5E1' : '#374151', textAlign: 'center' }}>{row.airlines_name ?? '-'}</Text>
              <Text style={{ flex: 0.8, fontSize: 12.5, color: isDark ? '#CBD5E1' : '#374151', textAlign: 'center' }}>{row.flight_no ?? '-'}</Text>
              <Text style={{ flex: 0.8, fontSize: 12.5, color: isDark ? '#CBD5E1' : '#374151', textAlign: 'center' }}>{row.route ?? '-'}</Text>
              <View style={{ flex: 0.8, alignItems: 'center' }}>
                <TouchableOpacity onPress={() => doPrint([row.id])} style={{ paddingVertical: 5, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#0284C7' }}>
                  <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 11 }}>Print</Text>
                </TouchableOpacity>
              </View>
            </View>
           ))
        )}

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 8, borderTopWidth: 1, borderTopColor: isDark ? '#1F2937' : '#E5E7EB', backgroundColor: isDark ? '#0F1A2E' : '#F1F5F9', gap: 12 }}>
          <Text style={{ fontSize: 11.5, color: '#94A3B8' }}>
            Showing {paged.length} of {filtered.length} records
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <TouchableOpacity
              disabled={current <= 1}
              onPress={() => setPage(Math.max(1, current - 1))}
              style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, backgroundColor: current <= 1 ? (isDark ? '#1F2937' : '#F1F5F9') : '#0284C7' }}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: current <= 1 ? '#94A3B8' : '#FFFFFF' }}>←</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 11.5, color: '#94A3B8', paddingHorizontal: 4 }}>
              {current} / {lastPage}
            </Text>
            <TouchableOpacity
              disabled={current >= lastPage}
              onPress={() => setPage(Math.min(lastPage, current + 1))}
              style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, backgroundColor: current >= lastPage ? (isDark ? '#1F2937' : '#F1F5F9') : '#0284C7' }}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: current >= lastPage ? '#94A3B8' : '#FFFFFF' }}>→</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

    </View>
  );
}
