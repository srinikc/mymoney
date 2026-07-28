import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, useColorScheme, RefreshControl, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { Colors } from '../constants/Colors';
import { formatCurrency } from '../utils/format';
import api from '../api/client';

interface Suggestion {
  expenseId: string;
  matchType: string;
  targetId?: string;
  targetName?: string;
  expenseVendor: string;
  expenseDate: string;
  expenseAmount: number;
  matchLabel?: string;
}

export default function AutoLinkScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const router = useRouter();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [accepted, setAccepted] = useState<Set<string>>(new Set());

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/auto-link/suggestions');
      setSuggestions(res.data?.suggestions || []);
    } catch { /* ignore */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const handleAccept = async (s: Suggestion) => {
    const key = `${s.expenseId}-${s.matchType}-${s.targetId || s.targetName}`;
    try {
      await api.post('/api/auto-link/accept', { expenseId: s.expenseId, linkType: s.matchType, targetId: s.targetId || s.expenseId });
      setAccepted((prev) => new Set(prev).add(key));
    } catch { /* ignore */ }
  };

  const typeColors: Record<string, string> = { income: '#22c55e', investment: '#3b82f6', insurance: '#a855f7', loan: '#f59e0b' };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12, padding: 4 }}><Ionicons name="arrow-back" size={24} color={theme.text} /></TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Auto-Link</Text>
      </View>

      {loading ? <View style={styles.center}><ActivityIndicator size="large" color={theme.primary} /></View>
      : suggestions.length === 0 ? (
        <View style={styles.empty}><Ionicons name="link-outline" size={48} color={theme.textTertiary} /><Text style={{ color: theme.textSecondary, fontSize: 15 }}>No suggestions found</Text></View>
      ) : (
        <FlatList data={suggestions} keyExtractor={(_, i) => String(i)}
          renderItem={({ item }) => {
            const key = `${item.expenseId}-${item.matchType}-${item.targetId || item.targetName}`;
            const isAccepted = accepted.has(key);
            return (
              <View style={[styles.card, { backgroundColor: theme.surface, opacity: isAccepted ? 0.5 : 1 }]}>
                <View style={styles.cardRow}>
                  <View style={[styles.badge, { backgroundColor: typeColors[item.matchType] + '20' }]}>
                    <Text style={{ color: typeColors[item.matchType], fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>{item.matchType}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, { color: theme.text }]}>{item.expenseVendor}</Text>
                    <Text style={[styles.cardSubtext, { color: theme.textTertiary }]}>{item.expenseDate} · {formatCurrency(item.expenseAmount)}</Text>
                    <Text style={{ fontSize: 11, color: theme.textTertiary, marginTop: 2 }}>{item.matchLabel}: <Text style={{ fontWeight: '600' }}>{item.targetName}</Text></Text>
                  </View>
                  {isAccepted ? (
                    <Ionicons name="checkmark-circle" size={24} color={theme.income} />
                  ) : (
                    <TouchableOpacity onPress={() => handleAccept(item)} style={[styles.acceptBtn, { backgroundColor: theme.primary }]}>
                      <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>Accept</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          }}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetch(); }} tintColor={theme.primary} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, header: { paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '700' }, center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  listContent: { padding: 20 }, card: { borderRadius: 14, padding: 16, marginBottom: 10 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 }, badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  cardTitle: { fontSize: 14, fontWeight: '600' }, cardSubtext: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  acceptBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
});
