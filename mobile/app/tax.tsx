import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, useColorScheme, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { Colors } from '../constants/Colors';
import { formatCurrency } from '../utils/format';
import api from '../api/client';

export default function TaxScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  const fetch = useCallback(async () => {
    setError(null);
    try {
      const res = await api.get('/api/tax', { params: { year: selectedYear } });
      setData(res.data);
    } catch { setError('Failed to load tax summary'); }
    finally { setLoading(false); }
  }, [selectedYear]);

  useEffect(() => { fetch(); }, [fetch]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12, padding: 4 }}><Ionicons name="arrow-back" size={24} color={theme.text} /></TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Tax Summary</Text>
      </View>

      {loading ? <View style={styles.center}><ActivityIndicator size="large" color={theme.primary} /></View>
      : error ? <View style={styles.center}><Ionicons name="alert-circle" size={40} color={theme.expense} /><Text style={{ color: theme.expense, fontSize: 14, fontWeight: '500' }}>{error}</Text></View>
      : (
        <ScrollView contentContainerStyle={styles.content}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.yearRow}>
            {[2024, 2025, 2026].map((y) => (
              <TouchableOpacity key={y} style={[styles.yearPill, selectedYear === String(y) && { backgroundColor: theme.primary }]} onPress={() => { setSelectedYear(String(y)); setLoading(true); }}>
                <Text style={{ color: selectedYear === String(y) ? theme.white : theme.textSecondary, fontSize: 14, fontWeight: '600' }}>{y}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={[styles.card, { backgroundColor: theme.surface }]}>
            <Text style={{ color: theme.textSecondary, fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Income Breakdown</Text>
            {data?.incomeSources ? Object.entries(data.incomeSources).map(([k, v]: [string, any]) => (
              <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
                <Text style={{ color: theme.textSecondary, fontSize: 13, textTransform: 'capitalize' }}>{k}</Text>
                <Text style={{ color: theme.text, fontSize: 13, fontWeight: '600' }}>{formatCurrency(Number(v) || 0)}</Text>
              </View>
            )) : null}
          </View>

          <View style={[styles.card, { backgroundColor: theme.surface }]}>
            <Text style={{ color: theme.textSecondary, fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Deductions</Text>
            {data?.deductions ? Object.entries(data.deductions).map(([k, v]: [string, any]) => (
              <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
                <Text style={{ color: theme.textSecondary, fontSize: 13, textTransform: 'capitalize' }}>{k.replace(/([A-Z])/g, ' $1')}</Text>
                <Text style={{ color: theme.income, fontSize: 13, fontWeight: '600' }}>{formatCurrency(Number(v) || 0)}</Text>
              </View>
            )) : <Text style={{ color: theme.textTertiary, fontSize: 13 }}>No deductions recorded</Text>}
          </View>

          <View style={[styles.card, { backgroundColor: theme.primary }]}>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 }}>Estimated Tax</Text>
            <Text style={{ color: '#fff', fontSize: 28, fontWeight: '800', marginTop: 4 }}>{formatCurrency(data?.estimatedTax || data?.tax || 0)}</Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, header: { paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '700' }, center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  content: { padding: 20 },
  yearRow: { marginBottom: 16, flexDirection: 'row' },
  yearPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8 },
  card: { borderRadius: 14, padding: 16, marginBottom: 12 },
});
