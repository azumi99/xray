import React from 'react';
import { Modal, View, Text, ActivityIndicator, StyleSheet } from 'react-native';

interface ProgressDialogProps {
  visible: boolean;
  title?: string;
  message?: string;
}

const ProgressDialog: React.FC<ProgressDialogProps> = ({ 
  visible, 
  title = 'Loading...', 
  message = 'Please wait...' 
}) => {
  if (!visible) return null;

  return (
    <Modal
      transparent={true}
      animationType="none"
      visible={visible}
      onRequestClose={() => {}}
    >
      <View style={styles.modalContainer}>
        <View style={styles.dialogContainer}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  dialogContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    width: '80%',
    alignItems: 'center',
    elevation: 5,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 10,
    color: '#374151',
  },
  message: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    color: '#6b7280',
  },
});

export default ProgressDialog;