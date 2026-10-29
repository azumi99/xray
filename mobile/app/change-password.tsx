import { changePassword } from '@/lib/api/authAPI';
import { useThemeStore } from '@/lib/store/themeStore';
import { Stack, useRouter } from 'expo-router';
import { ArrowLeft, Eye, EyeOff, Key } from 'lucide-react-native';
import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function ChangePasswordScreen() {
  const router = useRouter();
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const background = isDark ? '#111827' : '#F0F9FF';
  const card = isDark ? '#1F2937' : '#ffffff';
  const input = isDark ? '#374151' : '#f3f4f6';
  const text = isDark ? '#F9FAFB' : '#111827';

  const submit = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Error', 'New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      Alert.alert('Success', 'Password updated successfully', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (error) {
      Alert.alert('Failed', error instanceof Error ? error.message : 'Unable to update password');
    } finally {
      setLoading(false);
    }
  };

  const Field = ({ label, value, onChangeText, visible, onToggle }: { label: string; value: string; onChangeText: (value: string) => void; visible: boolean; onToggle: () => void }) => (
    <View style={{ gap: 8 }}>
      <Text style={{ fontSize: 11, fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase' }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: input, borderRadius: 12 }}>
        <TextInput value={value} onChangeText={onChangeText} secureTextEntry={!visible} placeholder={label} placeholderTextColor="#9ca3af" autoCapitalize="none" style={{ flex: 1, paddingHorizontal: 16, paddingVertical: 14, color: text, fontSize: 15 }} />
        <TouchableOpacity onPress={onToggle} style={{ padding: 14 }}>
          {visible ? <EyeOff size={19} color="#9ca3af" /> : <Eye size={19} color="#9ca3af" />}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: background }}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 56 }} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 28 }}><ArrowLeft size={24} color={text} /></TouchableOpacity>
          <View style={{ alignItems: 'center', marginBottom: 28 }}>
            <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}><Key size={30} color="#0284c7" /></View>
            <Text style={{ color: text, fontSize: 25, fontWeight: '700' }}>Change Password</Text>
            <Text style={{ color: '#9ca3af', fontSize: 14, marginTop: 8, textAlign: 'center' }}>Keep your account secure with a strong password.</Text>
          </View>
          <View style={{ backgroundColor: card, borderRadius: 24, padding: 22, gap: 20 }}>
            <Field label="Current password" value={currentPassword} onChangeText={setCurrentPassword} visible={showCurrent} onToggle={() => setShowCurrent(!showCurrent)} />
            <Field label="New password" value={newPassword} onChangeText={setNewPassword} visible={showNew} onToggle={() => setShowNew(!showNew)} />
            <Field label="Confirm new password" value={confirmPassword} onChangeText={setConfirmPassword} visible={showConfirm} onToggle={() => setShowConfirm(!showConfirm)} />
            <TouchableOpacity onPress={submit} disabled={loading} style={{ backgroundColor: '#0284c7', borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 4 }}><Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>{loading ? 'Updating...' : 'Update Password'}</Text></TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
