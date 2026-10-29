import { useThemeStore } from '@/lib/store/themeStore';
import { ChevronRightIcon } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';

export type AwbRow = {
  id: string;
  airline?: string | null;
  airwaybill_number: string;
  hawb?: string | null;
  kurir?: string | null;
  penerima_nama?: string | null;
  penerima_kota?: string | null;
  berat?: string | null;
  jumlah_koli?: string | null;
  cod?: boolean | null;
  status?: string | null;
  created_at: string;
  xray_photos_count?: number | null;
  colly_label?: string | null;
  colly_total?: number | null;
};

const COLUMNS: Array<{ key: string; label: string; flex: number }> = [
  { key: 'airline', label: 'Airline', flex: 1.4 },
  { key: 'mawb', label: 'MAWB', flex: 1.6 },
  { key: 'hawb', label: 'HAWB', flex: 1.6 },
  { key: 'colly', label: 'Colly', flex: 1 },
  { key: 'status', label: 'Status', flex: 1 },
  { key: 'tanggal', label: 'Date', flex: 1.4 },
];

const STATUS_CONFIG: Record<string, { bg: string; fg: string }> = {
  waiting: { bg: 'rgba(245, 158, 11, 0.12)', fg: '#D97706' },
  done: { bg: 'rgba(22, 163, 74, 0.12)', fg: '#16A34A' },
  complete: { bg: 'rgba(22, 163, 74, 0.12)', fg: '#16A34A' },
  incomplete: { bg: 'rgba(234, 88, 12, 0.12)', fg: '#EA580C' },
};

export function AwbTable({
  rows,
  loading,
  onOpen,
  page = 1,
  lastPage = 1,
  total,
  onChangePage,
}: {
  rows: AwbRow[];
  loading?: boolean;
  onOpen: (id: string) => void;
  page?: number;
  lastPage?: number;
  total?: number;
  onChangePage?: (page: number) => void;
}) {
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';

  const border = isDark ? '#1F2937' : '#E5E7EB';
  const headerBg = isDark ? '#0F1A2E' : '#F1F5F9';
  const textMain = isDark ? '#E5E7EB' : '#374151';
  const textHead = isDark ? '#94A3B8' : '#64748B';

  if (loading) {
    return (
      <View style={{ padding: 48, alignItems: 'center' }}>
        <ActivityIndicator color="#0284C7" />
      </View>
    );
  }

  const cellStyle = (flex: number): object => ({
    flex,
    paddingHorizontal: 14,
    paddingVertical: 12,
    justifyContent: 'center',
  });

  const cellText = {
    fontSize: 12.5,
    color: textMain,
  } as const;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ width: '100%' }} contentContainerStyle={{ minWidth: 660, flexGrow: 1 }}>
    <View style={{
      borderWidth: 1,
      borderColor: border,
      borderRadius: 12,
      overflow: 'hidden',
      backgroundColor: isDark ? '#111827' : '#FFFFFF',
      minWidth: 660,
      width: '100%',
      flexGrow: 1,
    }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', backgroundColor: headerBg, borderBottomWidth: 1, borderBottomColor: border }}>
        {COLUMNS.map((col) => (
          <View key={col.key} style={cellStyle(col.flex)}>
            <Text style={{ fontSize: 10.5, fontWeight: '800', color: textHead, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {col.label}
            </Text>
          </View>
        ))}
        <View style={{ ...cellStyle(0.35), alignItems: 'center' }}>
          <Text style={{ fontSize: 10.5, fontWeight: '800', color: textHead }} />
        </View>
      </View>

      {/* Rows */}
      {rows.length === 0 ? (
        <View style={{ paddingVertical: 48, alignItems: 'center' }}>
          <Text style={{ color: '#9CA3AF', fontSize: 13 }}>No AWB data</Text>
        </View>
      ) : (
        rows.map((row, index) => (
          <TouchableOpacity
            key={row.id}
            onPress={() => onOpen(row.id)}
            style={{
              flexDirection: 'row',
              backgroundColor: index % 2 === 1 ? (isDark ? '#0D1526' : '#F8FAFC') : 'transparent',
              borderBottomWidth: index === rows.length - 1 ? 0 : 1,
              borderBottomColor: border,
            }}
          >
            <View style={cellStyle(COLUMNS[0].flex)}>
              <Text style={{ ...cellText, fontWeight: '700' }}>{row.airline || '-'}</Text>
            </View>
            <View style={cellStyle(COLUMNS[1].flex)}>
              <Text style={{ ...cellText, fontWeight: '700', color: isDark ? '#F9FAFB' : '#111827' }}>{row.airwaybill_number || '-'}</Text>
            </View>
            <View style={cellStyle(COLUMNS[2].flex)}>
              <Text style={cellText}>{row.hawb || '-'}</Text>
            </View>
            <View style={cellStyle(COLUMNS[3].flex)}>
              {(() => {
                // baris list = wakil grup; tampilkan "idx / total" sebagai badge (gaya status)
                const m = row.colly_label?.match(/^colly-(\d+)-of-(\d+)$/);
                const idx = m ? Number(m[1]) : (row.colly_total ?? 0);
                const total = row.colly_total ?? (m ? Number(m[2]) : 0);
                if (total <= 0) return <Text style={cellText}>-</Text>;
                // warna: lengkap hijau, sebagian biru, kosong abu
                const done = idx >= total;
                const bg = done ? 'rgba(22, 163, 74, 0.12)' : idx > 0 ? 'rgba(2, 132, 199, 0.12)' : 'rgba(107, 114, 128, 0.12)';
                const fg = done ? '#16A34A' : idx > 0 ? '#0369A1' : '#6B7280';
                return (
                  <View style={{ alignSelf: 'flex-start', backgroundColor: bg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                    <Text style={{ fontSize: 10, fontWeight: '800', letterSpacing: 0.6, color: fg }}>
                      {idx} / {total}
                    </Text>
                  </View>
                );
              })()}
            </View>
            <View style={cellStyle(COLUMNS[4].flex)}>
              {(() => {
                const collyMatch = row.colly_label?.match(/^colly-(\d+)-of-(\d+)$/);
                const collected = collyMatch ? Number(collyMatch[1]) : 0;
                const expected = row.colly_total ?? (collyMatch ? Number(collyMatch[2]) : 0);
                // 0 foto → WAITING; sebagian ada foto (< quantity) → INCOMPLETE; lengkap → COMPLETE
                const status = expected > 0 && collected < expected ? (collected > 0 ? 'incomplete' : 'waiting') : (row.status === 'done' ? 'complete' : 'waiting');
                const config = STATUS_CONFIG[status];
                return (
                  <View style={{ alignSelf: 'flex-start', backgroundColor: config.bg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                    <Text style={{ fontSize: 10, fontWeight: '800', letterSpacing: 0.6, color: config.fg }}>
                      {status.toUpperCase()}
                    </Text>
                  </View>
                );
              })()}
            </View>
            <View style={cellStyle(COLUMNS[5].flex)}>
              <Text style={cellText}>
                {row.created_at ? new Date(row.created_at).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '-'}
              </Text>
            </View>
            <View style={{ ...cellStyle(0.35), alignItems: 'center' }}>
              <ChevronRightIcon size={15} color="#94A3B8" />
            </View>
          </TouchableOpacity>
        ))
      )}

      {/* Footer + Pagination */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 8, borderTopWidth: 1, borderTopColor: border, backgroundColor: headerBg, gap: 12 }}>
        <Text style={{ fontSize: 11.5, color: textHead }}>
          Showing {rows.length} of {total ?? rows.length} records
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <TouchableOpacity
            disabled={page <= 1 || !onChangePage}
            onPress={() => onChangePage?.(Math.max(1, page - 1))}
            style={{
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 6,
              backgroundColor: page <= 1 ? (isDark ? '#1F2937' : '#F1F5F9') : '#0284C7',
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '700', color: page <= 1 ? '#94A3B8' : '#FFFFFF' }}>←</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 11.5, color: textHead, paddingHorizontal: 4 }}>
            {page} / {lastPage}
          </Text>
          <TouchableOpacity
            disabled={page >= lastPage || !onChangePage}
            onPress={() => onChangePage?.(Math.min(lastPage, page + 1))}
            style={{
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 6,
              backgroundColor: page >= lastPage ? (isDark ? '#1F2937' : '#F1F5F9') : '#0284C7',
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '700', color: page >= lastPage ? '#94A3B8' : '#FFFFFF' }}>→</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
    </ScrollView>
  );
}
