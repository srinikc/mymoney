import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, useColorScheme, Switch, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useAuthStore } from '../store/auth';
import { Colors } from '../constants/Colors';
import api from '../api/client';

interface SettingsItem {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  color?: string;
  subtitle?: string;
  type: 'toggle' | 'action';
  value?: boolean;
  onToggle?: (v: boolean) => void;
  onPress?: () => void;
}

export default function SettingsScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const [notifications, setNotifications] = useState(true);
  const [biometricLock, setBiometricLock] = useState(false);
  const [weeklyReport, setWeeklyReport] = useState(true);
  const [compactMode, setCompactMode] = useState(false);

  // Load preferences from API on mount
  useEffect(() => {
    api.get('/api/users/preferences').then((r) => {
      if (r.data) {
        setNotifications(r.data.notifications ?? true);
        setWeeklyReport(r.data.weeklyReport ?? true);
        setCompactMode(r.data.compactMode ?? false);
      }
    }).catch(() => {});
  }, []);

  const savePreference = async (key: string, value: boolean) => {
    try { await api.put('/api/users/preferences', { [key]: value }); } catch { /* best effort */ }
  };

  const handleBiometricToggle = async (val: boolean) => {
    setBiometricLock(val);
    if (val) {
      try {
        const la = await import('expo-local-authentication');
        const avail = await la.hasHardwareAsync();
        if (!avail) { Alert.alert('Unavailable', 'Biometric authentication is not available on this device'); setBiometricLock(false); }
      } catch { setBiometricLock(false); }
    }
  };

  const sections: { title: string; items: SettingsItem[] }[] = [
    {
      title: 'Preferences',
      items: [
        { title: 'Push Notifications', icon: 'notifications-outline', type: 'toggle' as const, value: notifications, onToggle: (v: boolean) => { setNotifications(v); savePreference('notifications', v); } },
        { title: 'Weekly Report', icon: 'document-text-outline', type: 'toggle' as const, value: weeklyReport, onToggle: (v: boolean) => { setWeeklyReport(v); savePreference('weeklyReport', v); } },
        { title: 'Compact Mode', icon: 'resize-outline', type: 'toggle' as const, value: compactMode, onToggle: (v: boolean) => { setCompactMode(v); savePreference('compactMode', v); } },
        { title: 'Gmail Parser Keywords', icon: 'mail-outline', type: 'action' as const, onPress: () => router.push('/gmail-parser') },
        { title: 'Environment Config', icon: 'server-outline', type: 'action' as const, onPress: () => router.push('/environment') },
      ],
    },
    {
      title: 'Security',
      items: [
        { title: 'Biometric Lock', icon: 'finger-print-outline', type: 'toggle' as const, value: biometricLock, onToggle: handleBiometricToggle },
        { title: 'API Keys & Integrations', icon: 'key-outline', type: 'action' as const, onPress: () => router.push('/api-keys') },
      ],
    },
    {
      title: 'Data',
      items: [
        { title: 'Export Data', icon: 'download-outline', type: 'action' as const, onPress: () => Alert.alert('Export', 'Export feature coming to mobile. Use the web app at /reports for now.') },
        { title: 'Clear All Data', icon: 'trash-outline', type: 'action' as const, color: theme.expense, onPress: () => { Alert.alert('Clear Data', 'Are you sure? This cannot be undone.', [{ text: 'Cancel', style: 'cancel' as const }, { text: 'Clear', style: 'destructive' as const }]); } },
      ],
    },
    {
      title: 'About',
      items: [
        { title: user?.name || 'User', icon: 'person-outline', type: 'action' as const, subtitle: user?.email || '' },
        { title: 'Version', icon: 'information-circle-outline', type: 'action' as const, subtitle: '1.0.0' },
        { title: 'Logout', icon: 'log-out-outline', type: 'action' as const, color: theme.expense, onPress: () => Alert.alert('Logout', 'Are you sure?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Logout', style: 'destructive', onPress: async () => { await logout(); router.replace('/login'); } }]) },
      ],
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12, padding: 4 }}><Ionicons name="arrow-back" size={24} color={theme.text} /></TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {sections.map((section, sIdx) => (
          <View key={sIdx} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.textTertiary }]}>{section.title}</Text>
            <View style={[styles.sectionCard, { backgroundColor: theme.surface }]}>
              {section.items.map((item, iIdx) => (
                <View key={iIdx} style={[styles.settingRow, iIdx < section.items.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.borderLight }]}>
                  <View style={[styles.settingIcon, { backgroundColor: theme.primaryLight }]}>
                    <Ionicons name={item.icon} size={18} color={item.color || theme.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.settingLabel, { color: item.color || theme.text }]}>{item.title}</Text>
                    {item.subtitle ? <Text style={{ fontSize: 12, color: theme.textTertiary }}>{item.subtitle}</Text> : null}
                  </View>
                  {item.type === 'toggle' ? (
                    <Switch value={item.value} onValueChange={item.onToggle} trackColor={{ false: theme.border, true: theme.primaryLight }} thumbColor={item.value ? theme.primary : theme.textTertiary} />
                  ) : (
                    <TouchableOpacity onPress={item.onPress}><Ionicons name="chevron-forward" size={16} color={theme.textTertiary} /></TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          </View>
        ))}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, header: { paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '700' }, content: { padding: 20 },
  section: { marginBottom: 20 }, sectionTitle: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, marginLeft: 4 },
  sectionCard: { borderRadius: 14, overflow: 'hidden' },
  settingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16 },
  settingIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  settingLabel: { flex: 1, fontSize: 15, fontWeight: '500' },
});
