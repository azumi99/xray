import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';

interface InventoryItem {
  id?: number;
  item_code?: string;
  item_name?: string;
  quantity?: number;
  location?: string;
  category?: string;
  uom?: string;
  [key: string]: any; // for additional fields
}

interface InventoryCardProps {
  item: InventoryItem;
  onPress?: (item: InventoryItem) => void;
}

const InventoryCard: React.FC<InventoryCardProps> = ({ item, onPress }) => {
  const handlePress = () => {
    if (onPress) {
      onPress(item);
    }
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <Text style={styles.itemCode} numberOfLines={1}>
          {item.item_code || 'N/A'}
        </Text>
        <View style={styles.quantityContainer}>
          <Text style={styles.quantity}>
            {item.quantity || 0}
          </Text>
          <Text style={styles.uom}>
            {item.uom || 'pcs'}
          </Text>
        </View>
      </View>

      <Text style={styles.itemName} numberOfLines={2}>
        {item.item_name || 'No name available'}
      </Text>

      <View style={styles.footer}>
        <View style={styles.locationContainer}>
          <Text style={styles.locationLabel}>Location:</Text>
          <Text style={styles.locationValue}>
            {item.location || 'Unassigned'}
          </Text>
        </View>

        {item.category && (
          <View style={styles.categoryContainer}>
            <Text style={styles.categoryLabel}>Category:</Text>
            <Text style={styles.categoryValue}>
              {item.category}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemCode: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2e7d32',
    flex: 1,
    marginRight: 12,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  quantity: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 4,
  },
  uom: {
    fontSize: 12,
    color: '#666',
    textTransform: 'uppercase',
  },
  itemName: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 12,
    minHeight: 40,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  locationContainer: {
    flex: 1,
    marginRight: 12,
  },
  locationLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  locationValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1976d2',
  },
  categoryContainer: {
    flex: 1,
    alignItems: 'flex-end',
  },
  categoryLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  categoryValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#f57c00',
    textAlign: 'right',
  },
});

export default InventoryCard;