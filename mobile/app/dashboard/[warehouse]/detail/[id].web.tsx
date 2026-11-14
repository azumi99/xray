import { AwbDetailScreen } from '@/components/web/AwbDetailScreen';
import { useLocalSearchParams } from 'expo-router';

export default function WarehouseDetailWebScreen() {
  const { id, warehouse } = useLocalSearchParams<{ id: string; warehouse: string }>();
  return <AwbDetailScreen id={id} warehouse={warehouse === 'cas' ? 'cas' : 'bgd'} />;
}
