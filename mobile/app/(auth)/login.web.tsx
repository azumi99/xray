import { login as apiLogin } from '@/lib/api/authAPI';
import { useAuth } from '@/lib/store/auth';
import { useThemeStore } from '@/lib/store/themeStore';
import { useBreakpoint } from '@/components/web/useBreakpoint';
import { ScanLineIcon, ShieldCheckIcon, EyeIcon, EyeOffIcon, PackageIcon, CameraIcon } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function LoginWebScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { login } = useAuth();
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';
  const { isSmall } = useBreakpoint();

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Mohon isi email dan password');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiLogin({ email, password });
      if (response && response.token) {
        login(response.token, {
          name: response.user?.name || '',
          id: Number(response.user?.id),
        });
        router.replace('/dashboard');
      } else {
        throw new Error('Format respons login tidak valid');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message.replace('ApolloError: ', '') : 'Terjadi kesalahan saat login');
    } finally {
      setIsLoading(false);
    }
  };

  const inputStyle = {
    backgroundColor: isDark ? '#111827' : '#FFFFFF',
    borderWidth: 1,
    borderColor: isDark ? '#374151' : '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: isDark ? '#F9FAFB' : '#111827',
    flex: 1,
    minWidth: 0,
    outlineWidth: 0,
  };

  return (
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: isDark ? '#0B1220' : '#F8FAFC' }}>
      {/* Panel kiri: branding (hidden di layar kecil) */}
      {!isSmall && (
      <LinearGradient
        colors={['#0369A1', '#1D4ED8', '#1E3A8A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1.1, padding: 64, justifyContent: 'center' }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 40 }}>
          <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }}>
            <ScanLineIcon size={24} color="#FFFFFF" />
          </View>
          <Text style={{ fontSize: 20, fontWeight: '800', color: '#FFFFFF', letterSpacing: 1 }}>AWB X-Ray</Text>
        </View>

        <Text style={{ fontSize: 40, fontWeight: '800', color: '#FFFFFF', lineHeight: 48, marginBottom: 16 }}>
          Dashboard pengelolaan{'\n'}airwaybill Anda
        </Text>
        <Text style={{ fontSize: 15, color: 'rgba(255,255,255,0.75)', lineHeight: 24, marginBottom: 40, maxWidth: 460 }}>
          Scan label pengiriman, hasil OCR otomatis via AI, dan kelola seluruh data AWB dalam satu tempat.
        </Text>

        <View style={{ gap: 18 }}>
          {[
            { icon: <CameraIcon size={18} color="#93C5FD" />, text: 'OCR label dengan AI qwen3-vl' },
            { icon: <PackageIcon size={18} color="#93C5FD" />, text: 'Riwayat AWB & foto X-ray terpusat' },
            { icon: <ShieldCheckIcon size={18} color="#93C5FD" />, text: 'Autentikasi aman berbasis JWT' },
          ].map((item, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' }}>
                {item.icon}
              </View>
              <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 14 }}>{item.text}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>
      )}

      {/* Panel kanan: form login */}
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: isSmall ? 20 : 48 }}>
        <View style={{
          width: 400,
          maxWidth: '100%',
          backgroundColor: isDark ? '#111827' : '#FFFFFF',
          borderRadius: 20,
          borderWidth: 1,
          borderColor: isDark ? '#1F2937' : '#E5E7EB',
          padding: 32,
          gap: 18,
        }}>
          <View>
            <Text style={{ fontSize: 24, fontWeight: '800', color: isDark ? '#F9FAFB' : '#111827' }}>Masuk</Text>
            <Text style={{ fontSize: 13, color: '#9CA3AF', marginTop: 4 }}>Silakan login untuk melanjutkan ke dashboard</Text>
          </View>

          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: isDark ? '#9CA3AF' : '#4B5563' }}>EMAIL</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="nama@perusahaan.com"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="none"
              keyboardType="email-address"
              style={inputStyle}
            />
          </View>

          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: isDark ? '#9CA3AF' : '#4B5563' }}>PASSWORD</Text>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: isDark ? '#111827' : '#FFFFFF',
              borderWidth: 1,
              borderColor: isDark ? '#374151' : '#D1D5DB',
              borderRadius: 10,
            }}>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!showPassword}
                onSubmitEditing={handleLogin}
                style={{
                  flex: 1,
                  minWidth: 0,
                  paddingLeft: 14,
                  paddingVertical: 12,
                  fontSize: 14,
                  color: isDark ? '#F9FAFB' : '#111827',
                  outlineWidth: 0,
                } as any}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ paddingHorizontal: 12, paddingVertical: 12 }}>
                {showPassword ? <EyeOffIcon size={18} color="#9CA3AF" /> : <EyeIcon size={18} color="#9CA3AF" />}
              </TouchableOpacity>
            </View>
          </View>

          {error ? (
            <View style={{ backgroundColor: isDark ? '#450A0A' : '#FEF2F2', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#FECACA' }}>
              <Text style={{ color: '#DC2626', fontSize: 12.5 }}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.9}
            style={{
              backgroundColor: '#0284C7',
              borderRadius: 10,
              paddingVertical: 13,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            {isLoading ? <ActivityIndicator color="#FFFFFF" /> : null}
            <Text style={{ color: '#FFFFFF', fontSize: 14.5, fontWeight: '700' }}>
              {isLoading ? 'Memproses...' : 'Masuk ke Dashboard'}
            </Text>
          </TouchableOpacity>

          <View style={{ paddingTop: 8, borderTopWidth: 1, borderTopColor: isDark ? '#1F2937' : '#F3F4F6' }}>
            <Text style={{ fontSize: 11.5, color: '#9CA3AF', textAlign: 'center' }}>
              Akun demo: demo@awbxray.com / password
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
