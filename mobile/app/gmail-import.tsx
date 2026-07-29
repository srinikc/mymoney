import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, useColorScheme, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { Colors } from '../constants/Colors';
import api from '../api/client';

interface Transaction {
  type: string;
  date: string;
  amount: number;
  description: string;
  vendor?: string;
  category?: string;
  messageId: string;
}

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  expense: { bg: '#fee2e2', text: '#dc2626' },
  income: { bg: '#d1fae5', text: '#059669' },
  investment: { bg: '#dbeafe', text: '#2563eb' },
  insurance: { bg: '#f3e8ff', text: '#9333ea' },
  subscription: { bg: '#cffafe', text: '#0891b2' },
  salary: { bg: '#d1fae5', text: '#16a34a' },
  tax_document: { bg: '#fef3c7', text: '#d97706' },
};

export default function GmailImportScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const router = useRouter();

  const [scanning, setScanning] = useState(false);
  const [importing, setImporting] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [summary, setSummary] = useState<{ totalEmails: number; parsed: number } | null>(null);
  const [sessionId, setSessionId] = useState<number | null>(null);

  const handleScan = async () => {
    setScanning(true);
    setTransactions([]);
    setSelected(new Set());
    setSummary(null);
    try {
      const res = await api.post('/api/gmail/scan');
      const data = res.data;
      setTransactions(data.transactions || []);
      setSummary({ totalEmails: data.totalEmails, parsed: data.parsed });
      setSessionId(data.sessionId);
      setSelected(new Set((data.transactions || []).map((t: Transaction) => t.messageId)));
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } }; message?: string }).response?.data?.error || (err as Error).message || 'Scan failed';
      Alert.alert('Error', msg);
    } finally {
      setScanning(false);
    }
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      const items = transactions.filter((t) => selected.has(t.messageId));
      const res = await api.post('/api/gmail/import', {
        sessionId,
        transactions: items.map((t) => ({
          type: t.type, date: t.date, amount: t.amount, description: t.description,
          vendor: t.vendor, category: t.category, messageId: t.messageId,
        })),
      });
      Alert.alert('Success', `Imported ${res.data.imported} transactions successfully!`);
      setTransactions([]);
      setSummary(null);
    } catch {
      Alert.alert('Error', 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Ionicons name="mail" size={22} color={theme.primary} style={{ marginRight: 8 }} />
        <Text style={[styles.headerTitle, { color: theme.text }]}>Gmail Import</Text>
        <TouchableOpacity
          style={[styles.scanBtn, { backgroundColor: theme.primary }]}
          onPress={handleScan}
          disabled={scanning}
        >
          {scanning ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text style={styles.scanBtnText}>Scan</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {summary && (
          <View style={[styles.summaryCard, { backgroundColor: theme.surface }]}>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryText, { color: theme.textSecondary }]}>
                Scanned <Text style={{ fontWeight: '700' }}>{summary.totalEmails}</Text> emails
              </Text>
              <Text style={[styles.summaryText, { color: theme.textSecondary }]}>
                Found <Text style={{ fontWeight: '700' }}>{summary.parsed}</Text> transactions
              </Text>
              <Text style={[styles.summaryText, { color: theme.textSecondary }]}>
                Selected <Text style={{ fontWeight: '700' }}>{selected.size}</Text>
              </Text>
            </View>
            {selected.size > 0 && (
              <TouchableOpacity
                style={[styles.importBtn, { backgroundColor: theme.primary }]}
                onPress={handleImport}
                disabled={importing}
              >
                {importing ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={styles.importBtnText}>Import Selected</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}

        {scanning && (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.scanningText, { color: theme.textSecondary }]}>Scanning your Gmail...</Text>
          </View>
        )}

        {transactions.length === 0 && !scanning && (
          <View style={styles.emptyState}>
            <Ionicons name="mail" size={48} color={theme.textTertiary} />
            <Text style={[styles.emptyTitle, { color: theme.textSecondary }]}>No transactions scanned</Text>
            <Text style={[styles.emptySubtitle, { color: theme.textTertiary }]}>
              Tap Scan to find financial transactions in your Gmail inbox.
            </Text>
          </View>
        )}

        {transactions.length > 0 && transactions.map((t, i) => {
          const colors = TYPE_COLORS[t.type] || TYPE_COLORS.expense;
          return (
            <TouchableOpacity
              key={t.messageId || i}
              style={[styles.txnCard, { backgroundColor: theme.surface }]}
              onPress={() => toggleSelect(t.messageId)}
              activeOpacity={0.7}
            >
              <View style={styles.txnRow}>
                <TouchableOpacity onPress={() => toggleSelect(t.messageId)} style={styles.checkbox}>
                  <Ionicons
                    name={selected.has(t.messageId) ? 'checkbox' : 'square-outline'}
                    size={22}
                    color={selected.has(t.messageId) ? theme.primary : theme.textTertiary}
                  />
                </TouchableOpacity>
                <View style={[styles.typeBadge, { backgroundColor: colors.bg }]}>
                  <Text style={[styles.typeText, { color: colors.text }]}>{t.type}</Text>
                </View>
                <View style={styles.txnInfo}>
                  <Text style={[styles.txnDesc, { color: theme.text }]} numberOfLines={1}>{t.description}</Text>
                  <Text style={[styles.txnMeta, { color: theme.textTertiary }]}>
                    {new Date(t.date).toLocaleDateString('en-IN')}
                    {t.vendor ? ` — ${t.vendor}` : ''}
                  </Text>
                </View>
                <View style={styles.txnAmount}>
                  <Text style={[styles.amountText, { color: t.type === 'income' || t.type === 'salary' ? '#059669' : theme.text }]}>
                    ₹{t.amount?.toLocaleString('en-IN')}
                  </Text>
                  {t.category && <Text style={[styles.categoryText, { color: theme.textTertiary }]}>{t.category}</Text>}
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: 12, padding: 4 },
  headerTitle: { fontSize: 22, fontWeight: '700', flex: 1 },
  scanBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  scanBtnText: { color: 'white', fontSize: 14, fontWeight: '700' },
  center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  scanningText: { fontSize: 14, marginTop: 12 },
  content: { padding: 20, paddingBottom: 40 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '600', marginTop: 12 },
  emptySubtitle: { fontSize: 13, textAlign: 'center', marginTop: 4, paddingHorizontal: 40 },
  summaryCard: { borderRadius: 14, padding: 16, marginBottom: 16 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12 },
  summaryText: { fontSize: 13 },
  importBtn: { paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  importBtnText: { color: 'white', fontSize: 14, fontWeight: '700' },
  txnCard: { borderRadius: 12, padding: 12, marginBottom: 8 },
  txnRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkbox: { padding: 2 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  typeText: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase' },
  txnInfo: { flex: 1 },
  txnDesc: { fontSize: 14, fontWeight: '500' },
  txnMeta: { fontSize: 11, marginTop: 1 },
  txnAmount: { alignItems: 'flex-end' },
  amountText: { fontSize: 14, fontWeight: '700' },
  categoryText: { fontSize: 10, marginTop: 1 },
});