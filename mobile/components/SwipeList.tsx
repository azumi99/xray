import { useThemeStore } from '@/lib/store/themeStore';
import { formatDateTime } from '@/utils/formatDate';
import { gql, useMutation } from '@apollo/client';
import { Trash2Icon } from 'lucide-react-native';
import React from 'react';
import { Alert, RefreshControl, Text, TouchableOpacity, View } from 'react-native';
import { SwipeListView } from 'react-native-swipe-list-view';
import AwbListItem from './AwbListItem';

// GraphQL mutation untuk delete AWB
const DELETE_AWB_MUTATION = gql`
  mutation DeleteAirwaybillXray($id: ID!) {
    deleteAirwaybillXray(id: $id) {
      id
      airwaybill_number
      photo_airwaybill
      created_at
      updated_at
    }
  }
`;

interface SwipeListProps {
  data: Array<{
    id: string;
    airwaybill_number: string;
    photo_airwaybill?: string;
    created_at: string;
    updated_at?: string;
    xray_photos_count?: number;
    hawb?: string | null;
    status?: string | null;
    colly_label?: string | null;
    colly_total?: number | null;
    groupCount?: number | null;
  }>;
  onRefresh?: () => void;
  onDeleted?: (id: string) => void;
  onItemClick: (id: string) => void;
  refreshing?: boolean;
  onScroll?: (e: any) => void;
  contentContainerStyle?: any;
}

const SwipeList = React.forwardRef<any, SwipeListProps>(({
  data,
  onRefresh,
  onDeleted,
  onItemClick,
  refreshing = false,
  onScroll,
  contentContainerStyle
}, ref) => {
  const [deleteAwb] = useMutation(DELETE_AWB_MUTATION);
  const internalListRef = React.useRef<any>(null);
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';

  React.useImperativeHandle(ref, () => ({
    scrollToOffset: (params: any) => {
      if (internalListRef.current) {
        if (typeof internalListRef.current.scrollToOffset === 'function') {
           internalListRef.current.scrollToOffset(params);
        } else if (internalListRef.current._listView && typeof internalListRef.current._listView.scrollToOffset === 'function') {
           internalListRef.current._listView.scrollToOffset(params);
        }
      }
    }
  }));

  const handleDelete = (id: string, awbNumber: string) => {
    Alert.alert(
      'Delete AWB',
      `Are you sure you want to delete ${awbNumber}? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            console.log('Attempting to delete AWB:', { id, awbNumber });
            try {
              const result = await deleteAwb({
                variables: { id },
                onCompleted: (data: any) => {
                  console.log('Delete completed successfully:', data);
                   if (onRefresh) {
                     onRefresh();
                   }
                   onDeleted?.(id);
                },
                onError: (error: any) => {
                  console.error('Delete error details:', {
                    message: error.message,
                    graphQLErrors: error.graphQLErrors,
                    networkError: error.networkError,
                    error: error
                  });

                  let errorMessage = 'Failed to delete AWB';

                  // Check for specific error patterns
                  if (error.message.includes('would modify models') ||
                      error.message.includes('use argument to filter')) {
                    errorMessage = 'This AWB has X-ray photos that must be deleted first. Please contact your administrator to delete this record.';
                  } else if (error.message) {
                    errorMessage = `Failed to delete AWB: ${error.message}`;
                  }

                  Alert.alert('Delete Error', errorMessage);
                },
              });
              console.log('Delete mutation result:', result);
            } catch (error: any) {
              console.error('Delete exception:', error);
              Alert.alert('Error', 'An unexpected error occurred while deleting AWB');
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item, index }: { item: any; index: number }) => {
    console.log('Rendering item:', item); // Debug log

    return (
      // Padding (bukan margin) agar area delete tidak memanjang ke celah antar kartu
      <View style={{ paddingBottom: 10 }}>
        <View style={{
          backgroundColor: isDark ? '#1F2937' : 'white',
          borderRadius: 16,
        }}>
          <AwbListItem
            awbNumber={item.airwaybill_number || 'N/A'}
            hawb={item.hawb}
            date={formatDateTime(item.created_at)}
            status={item.status === 'done' ? 'complete' : item.status === 'incomplete' ? 'incomplete' : 'waiting'}
            colly={
              item.colly_label
                ? (() => {
                    const m = String(item.colly_label).match(/^colly-(\d+)-of-(\d+)$/);
                    if (!m) return null;
                    const idx = Number(m[1]);
                    const total = item.colly_total ?? Number(m[2]);
                    return `${idx} / ${total}`;
                  })()
                : null
            }
            groupCount={item.groupCount ?? null}
            onPress={() => onItemClick(item.id)}
          />
        </View>
      </View>
    );
  };

  const renderHiddenItem = ({ item }: { item: any }) => (
    <View style={{
      flex: 1,
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'stretch',
      // 2px ekstra di bawah agar pembulatan tinggi baris tidak pernah memunculkan merah di bawah kartu
      paddingBottom: 12,
    }}>
      <TouchableOpacity
        style={{
          width: 75,
          backgroundColor: '#ef4444',
          justifyContent: 'center',
          alignItems: 'center',
          borderTopRightRadius: 16,
          borderBottomRightRadius: 16,
        }}
        onPress={() => handleDelete(item.id, item.airwaybill_number)}
        activeOpacity={0.9}
      >
        <Trash2Icon size={20} color="#FFFFFF" />
        <Text style={{
          color: '#FFF',
          fontSize: 10,
          fontWeight: '700',
          textTransform: 'uppercase',
          marginTop: 4
        }}>Delete</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SwipeListView
      ref={internalListRef}
      data={data}
      renderItem={renderItem}
      renderHiddenItem={renderHiddenItem}
      leftOpenValue={0}
      rightOpenValue={-75}
      closeOnRowBeginSwipe={true}
      closeOnScroll={true}
      swipeToOpenPercent={15}
      disableRightSwipe={true}
      useNativeDriver={true}
      closeOnRowPress={true}
      recalculateHiddenLayout={true}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={contentContainerStyle}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={isDark ? ['#60A5FA'] : ['#0284C7']}
          tintColor={isDark ? '#60A5FA' : '#0284C7'}
        />
      }
      onScroll={onScroll}
      scrollEventThrottle={16}
      onRowOpen={(rowKey) => {
        // Handle row open if needed
      }}
      onRowClose={() => {
        // Handle row close if needed
      }}
    />
  );
});

SwipeList.displayName = 'SwipeList';

export default SwipeList;