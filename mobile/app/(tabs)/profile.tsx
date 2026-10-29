import StatusBarSafeArea from '@/components/StatusBarSafeArea';
import { gql, useQuery } from '@apollo/client';
import { useRouter } from 'expo-router';
import { ChevronRight, HelpCircle, Key, Layers, LogOut, Moon, Settings, Sun } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { getCurrentUser, logoutAPI } from '../../lib/api/authAPI';
import { useAuth } from '../../lib/store/auth';
import { useBatchModeStore } from '../../lib/store/batchModeStore';
import { useThemeStore } from '../../lib/store/themeStore';

// GraphQL query untuk AWB statistics
const today = new Date().toISOString().split('T')[0];
const GET_AWB_STATS = gql`
 query GetAwbList($first: Int, $page: Int) {
    airwaybillxrays(first: $first, page: $page, ungrouped: true, orderBy: { column: CREATED_AT, order: DESC }) {
      paginatorInfo {
        count
        currentPage
        firstItem
        hasMorePages
        lastItem
        lastPage
        perPage
        total
      }
      data {
        id
        airwaybill_number
        photo_airwaybill
        hawb
        created_at
        updated_at
        xray_photos_count
      }
    }
  }
`;

const ProfileScreen = () => {
  const router = useRouter();
  const { session, user: sessionUser } = useAuth();
  const [userInfo, setUserInfo] = useState<any>(sessionUser ?? null);
  const [loading, setLoading] = useState(true);
  const { theme, toggleTheme } = useThemeStore();
  const { batchMode, setBatchMode } = useBatchModeStore();
  
  const isDark = theme === 'dark';
  
  console.log('User data in ProfileScreen:', session);

  // GraphQL query untuk AWB statistics
  const {
      data,
      loading: awbLoading,
      error,
      refetch,
      fetchMore,
    } = useQuery(GET_AWB_STATS, {
      skip: !session,
      variables: {
        first: 50, // Load 20 items per page
        page: 1,
      },
      fetchPolicy: 'no-cache',
      notifyOnNetworkStatusChange: true,
      onError: (error) => {
        console.log('GraphQL Error:', JSON.stringify(error, null, 2));
      },
      onCompleted: (data) => {
        
      }
    });

  const awbList = data?.airwaybillXrays?.data || [];
  const totalAwb = data?.airwaybillxrays?.paginatorInfo?.total || 0;

  console.log('AWB Data:', data?.airwaybillxrays?.paginatorInfo?.total);

  // Calculate completed AWBs (yang memiliki xray_photos_count > 0)
  const completedAwb = awbList.filter((awb: any) => awb.xray_photos_count > 0).length;

  // Color palette
  const colors = {
    primary: '#0284C7',
    white: '#FFFFFF',
    background: '#F8FAFC',
    text: '#1F2937',
    textLight: '#6B7280',
    border: '#E5E7EB',
    red: '#DC2626',
    redLight: '#FEE2E2'
  };

  const handleLogout = async () => {
    Alert.alert(
      'Confirm Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logoutAPI();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  const userData = async () => {
    try {
      setLoading(true);
      const user = await getCurrentUser();
      if (user) {
        setUserInfo(user);
        console.log('User data fetched:', user);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      // Fallback: tetap pakai data user dari session (zustand/AsyncStorage)
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      userData();
    }
  }, [session]);

  const menuItems = [
    { icon: Settings, label: 'Settings', onPress: () => console.log('Settings') },
    { icon: HelpCircle, label: 'Help & Support', onPress: () => console.log('Help') },
  ];

  const stats = [
    { value: awbLoading ? "..." : totalAwb.toString(), label: "Total AWB" },
    { value: awbLoading ? "..." : completedAwb.toString(), label: "Completed" },
  ];

  return (
    <StatusBarSafeArea style={{ backgroundColor: isDark ? '#111827' : '#f9fafb' }}>
      <View style={{ flex: 1, backgroundColor: isDark ? '#111827' : '#f9fafb' }}>
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100, alignItems: 'center' }}
        >
          {/* Header Section */}
          <View style={{ alignItems: 'center', marginTop: 40, marginBottom: 32 }}>
            {/* Avatar */}
            <View style={{ position: 'relative', marginBottom: 16 }}>
              <View style={{
                width: 100,
                height: 100,
                borderRadius: 50,
                backgroundColor: isDark ? '#1F2937' : '#e0f2fe',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: isDark ? '#374151' : '#e0f2fe'
              }}>
                <Text style={{ fontSize: 36, fontWeight: '400', color: isDark ? '#0284c7' : '#0284c7' }}>
                  {loading || !userInfo ? '...' :
                   userInfo?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 1) || 'A'
                  }
                </Text>
              </View>
              {/* Online indicator */}
              <View style={{
                position: 'absolute',
                bottom: 5,
                right: 5,
                width: 16,
                height: 16,
                borderRadius: 8,
                backgroundColor: '#22c55e',
                borderWidth: 2,
                borderColor: '#ffffff'
              }} />
            </View>

            {/* User Info */}
            <Text style={{ fontSize: 20, fontWeight: '700', color: isDark ? '#F9FAFB' : '#111827', marginBottom: 4 }}>
              {loading || !userInfo ? 'Loading...' : userInfo?.name || 'Admin User'}
            </Text>
            <Text style={{ fontSize: 13, color: '#9ca3af' }}>
              {loading || !userInfo ? 'Loading...' : userInfo?.email || 'admin@email.com'}
            </Text>

            {/* Stats */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 32, gap: 40 }}>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 28, fontWeight: '300', color: isDark ? '#F9FAFB' : '#1f2937', marginBottom: 4 }}>
                  {awbLoading ? "..." : totalAwb.toString()}
                </Text>
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1 }}>
                  TOTAL AWB
                </Text>
              </View>
              <View style={{ width: 1, height: 40, backgroundColor: isDark ? '#374151' : '#f3f4f6' }} />
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 28, fontWeight: '300', color: isDark ? '#F9FAFB' : '#1f2937', marginBottom: 4 }}>
                  {awbLoading ? "..." : completedAwb.toString()}
                </Text>
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1 }}>
                  COMPLETED
                </Text>
              </View>
            </View>
          </View>

          {/* Menu Items */}
          <View style={{ width: '90%', gap: 16, marginBottom: 24 }}>
            {/* Appearance */}
            <TouchableOpacity 
              style={{
                backgroundColor: isDark ? '#1F2937' : '#ffffff',
                padding: 20,
                borderRadius: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.02,
                shadowRadius: 2,
                elevation: 1
              }}
              onPress={toggleTheme}
            >
               <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                <View style={{ width: 24, alignItems: 'center' }}>
                   {isDark ? (
                     <Moon size={24} color={isDark ? "#9ca3af" : "#9ca3af"} />
                   ) : (
                     <Sun size={24} color="#9ca3af" />
                   )}
                </View>
                <View>
                  <Text style={{ fontSize: 15, fontWeight: '500', color: isDark ? '#F9FAFB' : '#1f2937', marginBottom: 2 }}>Appearance</Text>
                  <Text style={{ fontSize: 12, color: '#9ca3af' }}>{isDark ? 'Dark Mode' : 'Light Mode'}</Text>
                </View>
              </View>
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ false: "#d1d5db", true: "#0284c7" }}
                thumbColor={"#f3f4f6"}
              />
            </TouchableOpacity>

            {/* Batch Mode */}
            <View
              style={{
                backgroundColor: isDark ? '#1F2937' : '#ffffff',
                padding: 20,
                borderRadius: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.02,
                shadowRadius: 2,
                elevation: 1
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, flex: 1, marginRight: 12 }}>
                <View style={{ width: 24, alignItems: 'center' }}>
                  <Layers size={24} color="#9ca3af" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '500', color: isDark ? '#F9FAFB' : '#1f2937', marginBottom: 2 }}>Batch Mode</Text>
                  <Text style={{ fontSize: 12, color: '#9ca3af' }}>
                    {batchMode ? 'Insert as many as manifest quantity per scan' : 'Normal mode (1 scan = 1 record)'}
                  </Text>
                </View>
              </View>
              <Switch
                value={batchMode}
                onValueChange={setBatchMode}
                trackColor={{ false: "#d1d5db", true: "#0284c7" }}
                thumbColor={"#f3f4f6"}
              />
            </View>

            {/* Change Password */}
            <TouchableOpacity
              style={{
                backgroundColor: isDark ? '#1F2937' : '#ffffff',
                padding: 20,
                borderRadius: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.02,
                shadowRadius: 2,
                elevation: 1
              }}
              onPress={() => router.push('/change-password')}
            >
               <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                <View style={{ width: 24, alignItems: 'center' }}>
                   <Key size={24} color="#9ca3af" />
                </View>
                <View>
                  <Text style={{ fontSize: 15, fontWeight: '500', color: isDark ? '#F9FAFB' : '#1f2937', marginBottom: 2 }}>Change Password</Text>
                  <Text style={{ fontSize: 12, color: '#9ca3af' }}>Update your account password</Text>
                </View>
              </View>
              <ChevronRight size={20} color="#d1d5db" />
            </TouchableOpacity>

            {/* Help & Support */}
            <TouchableOpacity 
              style={{
                backgroundColor: isDark ? '#1F2937' : '#ffffff',
                padding: 20,
                borderRadius: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.02,
                shadowRadius: 2,
                elevation: 1
              }}
              onPress={() => console.log('Help')}
            >
               <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                <View style={{ width: 24, alignItems: 'center' }}>
                   <HelpCircle size={24} color="#9ca3af" />
                </View>
                <View>
                  <Text style={{ fontSize: 15, fontWeight: '500', color: isDark ? '#F9FAFB' : '#1f2937', marginBottom: 2 }}>Help & Support</Text>
                  <Text style={{ fontSize: 12, color: '#9ca3af' }}>FAQ, contact us</Text>
                </View>
              </View>
              <ChevronRight size={20} color="#d1d5db" />
            </TouchableOpacity>
          </View>

           {/* Logout Button (Hidden from main visible rect in screenshot but likely needed) */}
            <TouchableOpacity
              style={{ padding: 16, marginTop: 16 }}
              onPress={handleLogout}
              activeOpacity={0.7}
            >
               {/* <LogOut size={20} color="#ef4444" /> */}
               <View style={{alignItems: 'center'}}>
                 <View style={{ width: 40, height: 40, backgroundColor: '#fef2f2', borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                    <LogOut size={20} color="#ef4444" />
                 </View>
                  {/* <Text style={{ fontSize: 12, fontWeight: '600', color: '#ef4444' }}>Sign Out</Text> */}
               </View>
            </TouchableOpacity>

        </ScrollView>
      </View>
    </StatusBarSafeArea>
  );
};

export default ProfileScreen;