import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, useColorScheme,
  ActivityIndicator, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { Colors } from '../../constants/Colors';
import api from '../../api/client';

interface BrokerStatus {
  configured: boolean;
  authenticated: boolean;
  loginUrl: string | null;
  message: string;
}

export default function IntegrationsScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const router = useRouter();

  const [zerodha, setZerodha] = useState<BrokerStatus | null>(null);
  const [sharekhan, setSharekhan] = useState<BrokerStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [importingZ, setImportingZ] = useState(false);
  const [importingS, setImportingS] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showMessage = (msg: string, type: 'success' | 'error') => {
    setMessage(msg);
    setMessageType(type);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setMessage(null), 5000);
  };

  const loadStatus = useCallback(async () => {
    try {
      const [zRes, sRes] = await Promise.all([
        api.get('/api/integrations/zerodha?action=status'),
        api.get('/api/integrations/sharekhan?action=status'),
      ]);
      if (zRes.data) setZerodha(zRes.data);
      if (sRes.data) setSharekhan(sRes.data);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
    const handler = (event: { url: string }) => {
      const url = event.url;
      const zMatch = url.match(/zerodha=(success|error)(?:&message=([^&]*))?/);
      const sMatch = url.match(/sharekhan=(success|error)(?:&message=([^&]*))?/);
      if (zMatch) {
        if (zMatch[1] === 'success') showMessage('Zerodha connected successfully! You can now import your holdings.', 'success');
        else showMessage(`Zerodha connection failed: ${zMatch[2] || 'Unknown error'}`, 'error');
        loadStatus();
      }
      if (sMatch) {
        if (sMatch[1] === 'success') showMessage('Sharekhan connected successfully! You can now import your holdings.', 'success');
        else showMessage(`Sharekhan connection failed: ${sMatch[2] || 'Unknown error'}`, 'error');
        loadStatus();
      }
    };
    const subscription = Linking.addEventListener('url', handler);
    return () => subscription.remove();
  }, [loadStatus]);

  const loginZerodha = async () => {
    try {
      const res = await api.get('/api/integrations/zerodha?action=login');
      if (res.data?.loginUrl) Linking.openURL(res.data.loginUrl);
    } catch { showMessage('Failed to initiate Zerodha login', 'error'); }
  };

  const loginSharekhan = async () => {
    try {
      const res = await api.get('/api/integrations/sharekhan?action=login');
      if (res.data?.loginUrl) Linking.openURL(res.data.loginUrl);
    } catch { showMessage('Failed to initiate Sharekhan login', 'error'); }
  };

  const importZerodha = async () => {
    setImportingZ(true);
    try {
      const res = await api.post('/api/integrations/zerodha/import');
      showMessage(res.data?.message || 'Holdings imported successfully', 'success');
    } catch { showMessage('Failed to import holdings', 'error'); }
    finally { setImportingZ(false); }
  };

  const importSharekhan = async () => {
    setImportingS(true);
    try {
      const res = await api.post('/api/integrations/sharekhan/import');
      showMessage(res.data?.message || 'Holdings imported successfully', 'success');
    } catch { showMessage('Failed to import holdings', 'error'); }
    finally { setImportingS(false); }
  };

  const logoutSharekhan = async () => {
    try {
      await api.post('/api/integrations/sharekhan/logout');
      showMessage('Sharekhan disconnected', 'success');
      loadStatus();
    } catch { showMessage('Failed to disconnect', 'error'); }
  };

  const renderBrokerCard = (
    name: string,
    icon: keyof typeof Ionicons.glyphMap,
    iconColor: string,
    status: BrokerStatus | null,
    onLogin: () => void,
    onImport: () => void,
    importing: boolean,
  ) => (
    <View style={[styles.card, { backgroundColor: theme.surface }]}>
      <View style={styles.cardHeader}>
        <View style={[styles.brokerIcon, { backgroundColor: iconColor + '20' }]}>
          <Ionicons name={icon} size={20} color={iconColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.brokerName, { color: theme.text }]}>{name}</Text>
          {loading ? (
            <Text style={[styles.statusText, { color: theme.textTertiary }]}>Checking status...</Text>
          ) : !status ? (
            <Text style={[styles.statusText, { color: theme.expense }]}>Unable to reach API</Text>
          ) : !status.configured ? (
            <Text style={[styles.statusText, { color: theme.warning }]}>Not configured</Text>
          ) : (
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: status.authenticated ? theme.income : theme.textTertiary }]} />
              <Text style={[styles.statusText, { color: status.authenticated ? theme.income : theme.textTertiary }]}>
                {status.authenticated ? 'Authenticated' : 'Not authenticated'}
              </Text>
            </View>
          )}
        </View>
        {status?.configured && (
          <View style={[styles.configuredBadge, { backgroundColor: status.authenticated ? theme.incomeLight : theme.border }]}>
            <Text style={[styles.configuredBadgeText, { color: status.authenticated ? theme.income : theme.textTertiary }]}>
              {status.authenticated ? 'Configured ✓' : 'Not configured'}
            </Text>
          </View>
        )}
      </View>
      <Text style={[styles.brokerMsg, { color: theme.textTertiary }]}>
        {status?.message || `${name} API configuration`}
      </Text>
      <View style={styles.cardActions}>
        {!status?.authenticated ? (
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.primary }]} onPress={onLogin} disabled={!status?.configured}>
            <Ionicons name="link" size={16} color="#fff" />
            <Text style={styles.actionBtnText}>Connect</Text>
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.primary }]} onPress={onImport} disabled={importing}>
              {importing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="download" size={16} color="#fff" />
              )}
              <Text style={styles.actionBtnText}>{importing ? 'Importing...' : 'Import Holdings'}</Text>
            </TouchableOpacity>
            {name === 'Sharekhan' && (
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.border }]} onPress={logoutSharekhan}>
                <Ionicons name="log-out" size={16} color={theme.text} />
                <Text style={[styles.actionBtnText, { color: theme.text }]}>Disconnect</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Integrations</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {message && (
          <View style={[styles.messageBanner, { backgroundColor: messageType === 'error' ? theme.expenseLight : theme.incomeLight }]}>
            <Ionicons name={messageType === 'error' ? 'alert-circle' : 'checkmark-circle'} size={18} color={messageType === 'error' ? theme.expense : theme.income} />
            <Text style={[styles.messageText, { color: messageType === 'error' ? theme.expense : theme.income }]}>{message}</Text>
          </View>
        )}

        {renderBrokerCard('Zerodha', 'business', '#3B82F6', zerodha, loginZerodha, importZerodha, importingZ)}
        {renderBrokerCard('Sharekhan', 'business', '#8B5CF6', sharekhan, loginSharekhan, importSharekhan, importingS)}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: 12, padding: 4 },
  headerTitle: { fontSize: 22, fontWeight: '700' },
  scrollContent: { padding: 16, paddingBottom: 40, gap: 12 },

  messageBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 12 },
  messageText: { fontSize: 13, fontWeight: '500', flex: 1 },

  card: { borderRadius: 14, padding: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  brokerIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  brokerName: { fontSize: 16, fontWeight: '700' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  configuredBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  configuredBadgeText: { fontSize: 10, fontWeight: '700' },
  brokerMsg: { fontSize: 12, marginTop: 10, lineHeight: 16 },
  cardActions: { flexDirection: 'row', gap: 8, marginTop: 14 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  actionBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
});
