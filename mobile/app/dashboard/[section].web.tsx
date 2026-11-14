import { DashboardScreen } from '@/components/web/DashboardScreen';
import { Redirect } from 'expo-router';
import { useLocalSearchParams } from 'expo-router';

const VALID = ['awb', 'scan', 'labels'] as const;
type Section = (typeof VALID)[number];

/** Route satu-segmen /dashboard/:x:
 *  - /dashboard/bgd dan /dashboard/cas → OVERVIEW gudang tsb
 *  - /dashboard/awb|scan|labels        → section legacy gudang BGD
 *  - section tak dikenal               → halaman pilihan gudang (exception) */
export default function DashboardSectionWebScreen() {
  const { section } = useLocalSearchParams<{ section: string }>();
  if (section === 'bgd' || section === 'cas') {
    return <DashboardScreen section="dashboard" warehouse={section} />;
  }
  if ((VALID as readonly string[]).includes(section ?? '')) {
    return <DashboardScreen section={section as Section} warehouse="bgd" />;
  }
  return <Redirect href="/dashboard" />;
}
