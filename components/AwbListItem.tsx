import { Badge, Box, HStack } from '@gluestack-ui/themed';
import { CalendarIcon, ChevronRightIcon, PackageIcon } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface AwbListItemProps {
  awbNumber: string;
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
  date,
  onPress,
  onDelete,
  index = 0,
  status = 'new',
}: AwbListItemProps) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'new':
        return { label: 'NEW', bg: '$primary100', color: '$primary600' };
      case 'processing':
        return { label: 'IN PROGRESS', bg: '$warning100', color: '$warning600' };
      case 'completed':
        return { label: 'COMPLETED', bg: '$success100', color: '$success600' };
      default:
        return { label: 'NEW', bg: '$primary100', color: '$primary600' };
    }
  };

  const statusConfig = getStatusConfig();

  // const renderHiddenItem = () => (
  //   <View style={styles.rowBack}>
  //     <TouchableOpacity
  //       style={[styles.backRightBtn, styles.backRightBtnRight]}
  //       onPress={onDelete}
  //     >
  //       {/* <Trash2Icon size={20} color="#FFFFFF" /> */}
  //       <Text style={styles.backTextWhite}>Delete</Text>
  //     </TouchableOpacity>
  //   </View>
  // );

  return (
    <View style={styles.container}>
      {/* Hidden Delete Button */}
      {/* {renderHiddenItem()} */}

      {/* Main Content */}
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.8}
        style={styles.frontVisible}
      >
        <Box
          bg="$white"
          borderRadius="$2xl"
          p="$5"
          shadowColor="$backgroundLight500"
          shadowOffset={{ width: 0, height: 4 }}
          shadowOpacity={0.1}
          shadowRadius={8}
          borderWidth={1}
          borderColor="$borderLight100"
        >
          <HStack justifyContent="space-between" alignItems="flex-start">
            {/* Left Content */}
            <View style={{ flex: 1, marginRight: 12 }}>
              <HStack alignItems="center" space="sm" mb="sm">
                <Box
                  w="$10"
                  h="$10"
                  borderRadius="$lg"
                  bg="$primary50"
                  alignItems="center"
                  justifyContent="center"
                >
                  <PackageIcon size={20} color="#0284C7" />
                </Box>
                <Text
                  fontWeight="bold"
                  fontSize="$lg"
                  color="$text900"
                  numberOfLines={1}
                  style={{ flexShrink: 1 }}
                >
                  {awbNumber}
                </Text>
              </HStack>

              {/* Additional information */}
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <CalendarIcon size={12} color="#9CA3AF" />
                <Text style={{ fontSize: 12, color: '#9CA3AF', marginLeft: 6 }}>
                  {date}
                </Text>
              </View>
            </View>

            {/* Right Content */}
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Badge
                bg={statusConfig.bg}
                px="$3"
                py="$1"
                borderRadius="$full"
              >
                <Text
                  fontSize="$xs"
                  fontWeight="600"
                  color={statusConfig.color}
                >
                  {statusConfig.label}
                </Text>
              </Badge>
              <ChevronRightIcon size={18} color="#D1D5DB" />
            </View>
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