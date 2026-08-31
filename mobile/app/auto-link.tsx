import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, useColorScheme, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { Colors } from '../constants/Colors';
import api from '../api/client';

interface Suggestion {
  expenseId: number;
  expenseDate: string;
  expenseAmount: number;
  expenseVendor: string;
  matchType: 'income' | 'investment' | 'insurance' | 'loan';
  matchLabel: string;
  targetId?: number;
  targetName: string;
}

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  income: { bg: '#d1fae5', text: '#059669' },
  investment: { bg: '#dbeafe', text: '#2563eb' },
  insurance: { bg: '#f3e8ff', text: '#9333ea' },
  loan: { bg: '#fef3c7', text: '#d97706' },
};

export default function AutoLinkScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const router = useRouter();

  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [accepted, setAccepted] = useState<Set<string>>(new Set());
  const [accepting, setAccepting] = useState<Set<string>>(new Set());

  useEffect(() => {
    api.get('/api/auto-link/suggestions')
      .then((r) => setSuggestions(r.data?.suggestions || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleAccept = async (s: Suggestion) => {
    const key = `${s.expenseId}-${s.matchType}-${s.targetId || s.targetName}`;
    setAccepting((prev) => new Set(prev).add(key));
    try {
      await api.post('/api/auto-link/accept', {
        expenseId: s.expenseId,
        linkType: s.matchType,
        targetId: s.targetId || s.expenseId,
      });
      setAccepted((prev) => new Set(prev).add(key));
    } catch {
      Alert.alert('Error', 'Failed to accept link');
    } finally {
      setAccepting((prev) => { const next = new Set(prev); next.delete(key); return next; });
    }
  };

  if (loading) return <View style={[styles.container, { backgroundColor: theme.background }]}><View style={styles.center}><ActivityIndicator size="large" color={theme.primary} /></View></View>;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Ionicons name="link" size={22} color={theme.primary} style={{ marginRight: 8 }} />
        <Text style={[styles.headerTitle, { color: theme.text }]}>Auto-Link</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {suggestions.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="link" size={48} color={theme.textTertiary} />
            <Text style={[styles.emptyTitle, { color: theme.textSecondary }]}>No suggestions found</Text>
            <Text style={[styles.emptySubtitle, { color: theme.textTertiary }]}>
              Add expenses and income sources to generate auto-link suggestions.
            </Text>
          </View>
        ) : (
          suggestions.map((s, i) => {
            const key = `${s.expenseId}-${s.matchType}-${s.targetId || s.targetName}`;
            const isAccepted = accepted.has(key);
            const isAccepting = accepting.has(key);
            const colors = TYPE_COLORS[s.matchType] || TYPE_COLORS.income;

            return (
              <View key={i} style={[styles.card, { backgroundColor: theme.surface, opacity: isAccepted ? 0.5 : 1 }]}>
                <View style={styles.cardRow}>
                  <View style={styles.cardLeft}>
                    <View style={[styles.badge, { backgroundColor: colors.bg }]}>
                      <Text style={[styles.badgeText, { color: colors.text }]}>{s.matchType}</Text>
                    </View>
                    <View style={styles.cardInfo}>
                      <Text style={[styles.vendor, { color: theme.text }]}>{s.expenseVendor}</Text>
                      <Text style={[styles.meta, { color: theme.textTertiary }]}>
                        {s.expenseDate} — ₹{s.expenseAmount?.toLocaleString('en-IN')}
                      </Text>
                      <Text style={[styles.matchInfo, { color: theme.textTertiary }]}>
                        {s.matchLabel}: <Text style={{ fontWeight: '600', color: theme.textSecondary }}>{s.targetName}</Text>
                      </Text>
                    </View>
                  </View>
                  <View style={styles.cardRight}>
                    {isAccepted ? (
                      <View style={[styles.linkedBadge, { backgroundColor: theme.primaryLight }]}>
                        <Text style={[styles.linkedText, { color: theme.primary }]}>Linked</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={[styles.acceptBtn, { borderColor: theme.primary }]}
                        onPress={() => handleAccept(s)}
                        disabled={isAccepting}
                      >
                        {isAccepting ? (
                          <ActivityIndicator size="small" color={theme.primary} />
                        ) : (
                          <>
                            <Ionicons name="checkmark" size={14} color={theme.primary} />
                            <Text style={[styles.acceptText, { color: theme.primary }]}>Accept</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: 12, padding: 4 },
  headerTitle: { fontSize: 22, fontWeight: '700', flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 20, paddingBottom: 40 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '600', marginTop: 12 },
  emptySubtitle: { fontSize: 13, textAlign: 'center', marginTop: 4, paddingHorizontal: 40 },
  card: { borderRadius: 14, padding: 16, marginBottom: 10 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardLeft: { flexDirection: 'row', alignItems: 'flex-start', flex: 1, gap: 10 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  cardInfo: { flex: 1 },
  vendor: { fontSize: 15, fontWeight: '600' },
  meta: { fontSize: 12, marginTop: 2 },
  matchInfo: { fontSize: 11, marginTop: 2 },
  cardRight: { marginLeft: 8 },
  linkedBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  linkedText: { fontSize: 12, fontWeight: '600' },
  acceptBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1.5 },
  acceptText: { fontSize: 13, fontWeight: '600' },
});