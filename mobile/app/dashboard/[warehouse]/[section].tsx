import { DashboardScreen } from '@/components/web/DashboardScreen';
import { useLocalSearchParams } from 'expo-router';

const VALID = ['dashboard', 'awb', 'scan', 'labels'] as const;
type Section = (typeof VALID)[number];

/** Native fallback /dashboard/:warehouse/:section — native app memakai BGD;
 *  route ini supaya deep-link per-gudang tetap jalan di native. */
export default function DashboardWarehouseScreen() {
  const { warehouse, section } = useLocalSearchParams<{ warehouse: string; section: string }>();
  const wh = warehouse === 'cas' ? 'cas' : 'bgd';
  const active = (VALID as readonly string[]).includes(section ?? '') ? (section as Section) : 'dashboard';
  return <DashboardScreen section={active} warehouse={wh} />;
}
