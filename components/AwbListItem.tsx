import { Box, HStack } from '@gluestack-ui/themed';
import { CalendarIcon, ChevronRightIcon, PackageIcon } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface AwbListItemProps {
  awbNumber: string;
  hawb: string;
  date: string;
  onPress: () => void;
  onDelete?: () => void;
  index?: number;
  status?: 'new' | 'processing' | 'completed';
  customerName?: string;
  origin?: string;
  destination?: string;
}

const AwbListItem = ({
  awbNumber,
  hawb,
  date,
  onPress,
  onDelete,
  index = 0,
  status = 'new',
}: AwbListItemProps) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'new':
        return { label: 'NEW', bg: '#E0F2FE', color: '#0284C7' }; // Blue-50/Blue-600
      case 'processing':
        return { label: 'PROCESSING', bg: '#FFF7ED', color: '#EA580C' }; // Orange
      case 'completed':
        return { label: 'COMPLETED', bg: '#F0FDF4', color: '#16A34A' }; // Green
      default:
        return { label: 'NEW', bg: '#E0F2FE', color: '#0284C7' };
    }
  };

  const statusConfig = getStatusConfig();

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.9}
        style={styles.frontVisible}
      >
        <Box
          bg="$white"
          borderRadius={20}
          p="$4"
          style={{ gap: 12 }}
        >
          {/* Header Row: Label + Status */}
          <HStack justifyContent="space-between" alignItems="center">
            <Text style={{ fontSize: 10, color: '#9CA3AF', fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' }}>
              MASTER AWB
            </Text>
            <Box
              bg={statusConfig.bg}
              px="$2.5"
              py="$1"
              borderRadius="$lg"
            >
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: '700',
                  color: statusConfig.color,
                  textTransform: 'uppercase'
                }}
              >
                {statusConfig.label}
              </Text>
            </Box>
          </HStack>

          {/* AWB Number */}
          <Text style={{ fontSize: 20, fontWeight: '800', color: '#111827', marginTop: -4 }}>
            {awbNumber}
          </Text>

          {/* HAWB Box (Placeholder/Conditional) */}
          <Box
            bg="#F9FAFB"
            borderRadius="$lg"
            p="$3"
            flexDirection="row"
            alignItems="center"
            justifyContent="space-between"
          >
             <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <PackageIcon size={16} color="#9CA3AF" />
                <View>
                   <Text style={{ fontSize: 10, color: '#9CA3AF', fontWeight: '600' }}>HAWB Number</Text>
                   <Text style={{ fontSize: 14, color: '#374151', fontWeight: '600' }}>{hawb}</Text>
                </View>
             </View>
             <TouchableOpacity>
               <View style={{ padding: 4 }}>
                  <Text style={{ fontSize: 16, color: '#D1D5DB' }}>❑</Text> 
                  {/* Using unicode for copy icon roughly or Lucide if available in import */}
               </View>
             </TouchableOpacity>
          </Box>

          {/* Footer Row: Date + Arrow */}
          <HStack justifyContent="space-between" alignItems="center" mt="$1">
             <HStack alignItems="center" space="xs">
               <CalendarIcon size={14} color="#9CA3AF" />
               <Text style={{ fontSize: 12, color: '#6B7280', fontWeight: '500' }}>
                 {date}
               </Text>
             </HStack>
             <ChevronRightIcon size={18} color="#9CA3AF" />
          </HStack>
        </Box>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    position: 'relative',
  },
  frontVisible: {
    width: '100%',
  },
  rowBack: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingLeft: 15,
  },
  backRightBtn: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'center',
    position: 'absolute',
    top: 0,
    width: 75,
  },
  backRightBtnRight: {
    backgroundColor: '#DC2626',
    right: 0,
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
  },
  backTextWhite: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
});

export default AwbListItem;