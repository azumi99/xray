import { DashboardScreen } from '@/components/web/DashboardScreen';
import { useLocalSearchParams } from 'expo-router';

const VALID = ['dashboard', 'awb', 'scan', 'labels'] as const;
type Section = (typeof VALID)[number];

/** /dashboard/:warehouse/:section — dashboard terpisah per gudang
 *  (bgd → awbxray_bgd + rdwarehouse_jkt, cas → awbxray_cas + rdwarehouse_sna). */
export default function DashboardWarehouseWebScreen() {
  const { warehouse, section } = useLocalSearchParams<{ warehouse: string; section: string }>();
  const wh = warehouse === 'cas' ? 'cas' : 'bgd';
  const active = (VALID as readonly string[]).includes(section ?? '') ? (section as Section) : 'dashboard';
  return <DashboardScreen section={active} warehouse={wh} />;
}
