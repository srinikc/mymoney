import { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, useColorScheme, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { Colors } from '../constants/Colors';
import { formatCurrency } from '../utils/format';
import api from '../api/client';

interface GmailTxn {
  messageId: string;
  type: string;
  date: string;
  amount: number;
  description: string;
  vendor?: string;
  category?: string;
}

export default function GmailImportScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const router = useRouter();
  const [scanning, setScanning] = useState(false);
  const [importing, setImporting] = useState(false);
  const [transactions, setTransactions] = useState<GmailTxn[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [summary, setSummary] = useState<{ totalEmails: number; parsed: number } | null>(null);

  const handleScan = async () => {
    setScanning(true); setTransactions([]); setSelected(new Set()); setSummary(null);
    try {
      const res = await api.post('/api/gmail/scan');
      const data = res.data;
      setTransactions(data.transactions || []);
      setSummary({ totalEmails: data.totalEmails, parsed: data.parsed });
      setSelected(new Set((data.transactions || []).map((t: GmailTxn) => t.messageId)));
    } catch { Alert.alert('Error', 'Scan failed. Ensure Gmail is connected via Google OAuth.'); }
    finally { setScanning(false); }
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      const items = transactions.filter((t) => selected.has(t.messageId));
      const res = await api.post('/api/gmail/import', {
        sessionId: Date.now(),
        transactions: items.map((t: GmailTxn) => ({
          type: t.type, date: t.date, amount: t.amount, description: t.description, vendor: t.vendor, category: t.category, messageId: t.messageId,
        })),
      });
      Alert.alert('Success', `Imported ${res.data.imported} transactions!`);
      setTransactions([]); setSummary(null);
    } catch { Alert.alert('Error', 'Import failed'); }
    finally { setImporting(false); }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  const typeColors: Record<string, string> = { expense: '#ef4444', income: '#22c55e', salary: '#22c55e', investment: '#3b82f6', insurance: '#a855f7', subscription: '#06b6d4', tax_document: '#f59e0b', asset: '#f97316' };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12, padding: 4 }}><Ionicons name="arrow-back" size={24} color={theme.text} /></TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text, flex: 1 }]}>Gmail Import</Text>
        <TouchableOpacity onPress={handleScan} disabled={scanning} style={[styles.scanBtn, { backgroundColor: theme.primary }]}>
          {scanning ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="search" size={20} color="#fff" />}
        </TouchableOpacity>
      </View>

      {scanning && <View style={styles.center}><ActivityIndicator size="large" color={theme.primary} /><Text style={{ color: theme.textSecondary, marginTop: 8 }}>Scanning Gmail...</Text></View>}

      {summary && (
        <View style={[styles.summaryBar, { backgroundColor: theme.surface }]}>
          <Text style={{ color: theme.text, fontSize: 13 }}>Found <Text style={{ fontWeight: '700' }}>{summary.parsed}</Text> transactions from {summary.totalEmails} emails</Text>
          <TouchableOpacity onPress={handleImport} disabled={importing || selected.size === 0} style={[styles.importBtn, { backgroundColor: theme.primary }]}>
            {importing ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>Import {selected.size}</Text>}
          </TouchableOpacity>
        </View>
      )}

      {!scanning && transactions.length === 0 && !summary && (
        <View style={styles.empty}>
          <Ionicons name="mail-outline" size={48} color={theme.textTertiary} />
          <Text style={{ color: theme.textSecondary, fontSize: 15 }}>No transactions scanned</Text>
          <Text style={{ color: theme.textTertiary, fontSize: 12, marginTop: 4 }}>Tap the scan button to find financial emails</Text>
        </View>
      )}

      {transactions.length > 0 && (
        <FlatList data={transactions} keyExtractor={(t, i) => t.messageId || String(i)}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => toggleSelect(item.messageId)} style={[styles.card, { backgroundColor: theme.surface, borderColor: selected.has(item.messageId) ? theme.primary : 'transparent', borderWidth: selected.has(item.messageId) ? 2 : 0 }]}>
              <View style={styles.cardRow}>
                <View style={[styles.dot, { backgroundColor: typeColors[item.type] || '#888' }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardTitle, { color: theme.text }]}>{item.description}</Text>
                  <Text style={[styles.cardSubtext, { color: theme.textTertiary }]}>{new Date(item.date).toLocaleDateString('en-IN')} · {item.vendor || ''}</Text>
                </View>
                <Text style={[styles.cardAmount, { color: item.type === 'income' || item.type === 'salary' ? theme.income : theme.text }]}>{formatCurrency(item.amount)}</Text>
              </View>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, header: { paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '700' }, scanBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  summaryBar: { padding: 16, margin: 20, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  importBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  listContent: { padding: 20 }, card: { borderRadius: 14, padding: 14, marginBottom: 8 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dot: { width: 10, height: 10, borderRadius: 5 }, cardTitle: { fontSize: 14, fontWeight: '600' },
  cardSubtext: { fontSize: 11, fontWeight: '500', marginTop: 2 },
  cardAmount: { fontSize: 14, fontWeight: '700' },
});
