import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, useColorScheme, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { Colors } from '../constants/Colors';
import { formatCurrency } from '../utils/format';
import api from '../api/client';

interface NetWorthData {
  assets?: number;
  totalAssets?: number;
  liabilities?: number;
  totalLiabilities?: number;
  breakdown?: Record<string, number>;
}

export default function NetWorthScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const router = useRouter();
  const [data, setData] = useState<NetWorthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setError(null);
    try {
      const res = await api.get('/api/net-worth');
      setData(res.data);
    } catch { setError('Failed to load net worth'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const netWorth = (data?.assets || data?.totalAssets || 0) - (data?.liabilities || data?.totalLiabilities || 0);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12, padding: 4 }}><Ionicons name="arrow-back" size={24} color={theme.text} /></TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Net Worth</Text>
      </View>

      {loading ? <View style={styles.center}><ActivityIndicator size="large" color={theme.primary} /></View>
      : error ? <View style={styles.center}><Ionicons name="alert-circle" size={40} color={theme.expense} /><Text style={{ color: theme.expense, fontSize: 14, fontWeight: '500' }}>{error}</Text></View>
      : (
        <View style={styles.content}>
          <View style={[styles.netWorthCard, { backgroundColor: theme.primary }]}>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 }}>Total Net Worth</Text>
            <Text style={{ color: '#FFFFFF', fontSize: 36, fontWeight: '800', marginTop: 4 }}>{formatCurrency(netWorth)}</Text>
          </View>

          <View style={styles.row}>
            <View style={[styles.miniCard, { backgroundColor: theme.surface }]}>
              <Ionicons name="trending-up-outline" size={22} color={theme.income} />
              <Text style={{ color: theme.textSecondary, fontSize: 11, marginTop: 6, fontWeight: '600' }}>Assets</Text>
              <Text style={{ color: theme.income, fontSize: 20, fontWeight: '700', marginTop: 2 }}>{formatCurrency(data?.assets || data?.totalAssets || 0)}</Text>
            </View>
            <View style={[styles.miniCard, { backgroundColor: theme.surface }]}>
              <Ionicons name="trending-down-outline" size={22} color={theme.expense} />
              <Text style={{ color: theme.textSecondary, fontSize: 11, marginTop: 6, fontWeight: '600' }}>Liabilities</Text>
              <Text style={{ color: theme.expense, fontSize: 20, fontWeight: '700', marginTop: 2 }}>{formatCurrency(data?.liabilities || data?.totalLiabilities || 0)}</Text>
            </View>
          </View>

          {data?.breakdown && (
            <View style={[styles.detailCard, { backgroundColor: theme.surface }]}>
              <Text style={{ color: theme.text, fontSize: 15, fontWeight: '700', marginBottom: 12 }}>Breakdown</Text>
              {Object.entries(data.breakdown).map(([key, value]: [string, unknown]) => (
                <View key={key} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
                  <Text style={{ color: theme.textSecondary, fontSize: 13, textTransform: 'capitalize' }}>{key.replaceAll(/([A-Z])/g, ' $1')}</Text>
                  <Text style={{ color: theme.text, fontSize: 13, fontWeight: '600' }}>{formatCurrency(Number(value) || 0)}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  content: { padding: 20 },
  netWorthCard: { borderRadius: 16, padding: 24, marginBottom: 16 },
  row: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  miniCard: { flex: 1, borderRadius: 14, padding: 16, alignItems: 'center' },
  detailCard: { borderRadius: 14, padding: 16 },
});
