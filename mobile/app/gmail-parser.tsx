import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, useColorScheme,
  ActivityIndicator, TextInput, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { Colors } from '../constants/Colors';
import api from '../api/client';

const PARSER_CONFIGS = [
  { label: 'UPI Payments', key: 'upi', defaultKeywords: ['upi', 'paid', 'payment', 'debited', 'transaction'], description: 'UPI payment receipts' },
  { label: 'Bank Transactions', key: 'bank', defaultKeywords: ['debited', 'credited', 'transaction', 'withdrawal', 'deposit', 'trf', 'imps', 'neft', 'rtgs'], description: 'Bank transaction alerts' },
  { label: 'Salary', key: 'salary', defaultKeywords: ['salary', 'payslip', 'payroll', 'wage', 'salary credit'], description: 'Salary credit emails' },
  { label: 'Purchases', key: 'purchase', defaultKeywords: ['order', 'placed', 'shipped', 'purchase', 'receipt', 'invoice'], description: 'Online purchase receipts' },
  { label: 'Gold', key: 'gold', defaultKeywords: ['gold', '24k', '22k', '916', 'tanishq', 'mmtc'], description: 'Gold transactions' },
  { label: 'Silver', key: 'silver', defaultKeywords: ['silver', 'silver coin', '999 silver'], description: 'Silver purchases' },
  { label: 'Mutual Funds', key: 'mutualFund', defaultKeywords: ['mutual fund', 'folio', 'nav', 'sip', 'cams', 'kfintech'], description: 'MF transaction emails' },
  { label: 'Stock Trades', key: 'trade', defaultKeywords: ['bought', 'sold', 'trade', 'order', 'executed', 'zerodha', 'groww', 'upstox'], description: 'Stock trade confirmations' },
  { label: 'Insurance', key: 'insurance', defaultKeywords: ['insurance', 'premium', 'policy', 'renewal', 'cover'], description: 'Insurance emails' },
  { label: 'Subscriptions', key: 'subscription', defaultKeywords: ['subscription', 'renewal', 'billed', 'monthly', 'annual'], description: 'Subscription payments' },
  { label: 'Tax', key: 'tax', defaultKeywords: ['form 16', 'itr', 'income tax', 'tax return', '26as', 'ais', 'tax credit'], description: 'Tax document emails' },
];

export default function GmailParserScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const router = useRouter();

  const [keywords, setKeywords] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newKeyword, setNewKeyword] = useState<Record<string, string>>({});

  useEffect(() => {
    api.get('/api/settings/gmail-parser')
      .then((r) => {
        const kw: Record<string, string[]> = {};
        for (const c of PARSER_CONFIGS) kw[c.key] = r.data?.keywords?.[c.key] || [...c.defaultKeywords];
        setKeywords(kw);
      })
      .catch(() => {
        const kw: Record<string, string[]> = {};
        for (const c of PARSER_CONFIGS) kw[c.key] = [...c.defaultKeywords];
        setKeywords(kw);
      })
      .finally(() => setLoading(false));
  }, []);

  const addKeyword = (key: string) => {
    const val = newKeyword[key]?.trim();
    if (!val) return;
    setKeywords((prev) => ({ ...prev, [key]: [...(prev[key] || []), val] }));
    setNewKeyword((prev) => ({ ...prev, [key]: '' }));
  };

  const removeKeyword = (key: string, index: number) => {
    setKeywords((prev) => ({ ...prev, [key]: prev[key].filter((_, i) => i !== index) }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/api/settings/gmail-parser', { keywords });
      Alert.alert('Saved', 'Keywords saved successfully');
    } catch {
      Alert.alert('Error', 'Failed to save');
    } finally {
      setSaving(false);
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
        <Text style={[styles.headerTitle, { color: theme.text }]}>Gmail Keywords</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving} style={[styles.saveBtn, { backgroundColor: theme.primary }]}>
          {saving ? <ActivityIndicator color="white" size="small" /> : <Text style={styles.saveBtnText}>Save</Text>}
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.description, { color: theme.textTertiary }]}>Customize keywords used to detect financial emails.</Text>
        {PARSER_CONFIGS.map((config) => (
          <View key={config.key} style={[styles.card, { backgroundColor: theme.surface }]}>
            <View style={styles.cardHeader}>
              <Text style={[styles.cardLabel, { color: theme.text }]}>{config.label}</Text>
              <Text style={[styles.cardCount, { color: theme.textTertiary }]}>{keywords[config.key]?.length || 0} keywords</Text>
            </View>
            <Text style={[styles.cardDesc, { color: theme.textTertiary }]}>{config.description}</Text>
            <View style={styles.keywordsRow}>
              {(keywords[config.key] || []).map((kw, i) => (
                <View key={i} style={[styles.keywordBadge, { backgroundColor: theme.primaryLight }]}>
                  <Text style={[styles.keywordText, { color: theme.primary }]}>{kw}</Text>
                  <TouchableOpacity onPress={() => removeKeyword(config.key, i)}>
                    <Ionicons name="close" size={14} color={theme.primary} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
            <View style={styles.addRow}>
              <TextInput
                style={[styles.addInput, { color: theme.text, borderColor: theme.border }]}
                value={newKeyword[config.key] || ''}
                onChangeText={(v) => setNewKeyword((prev) => ({ ...prev, [config.key]: v }))}
                placeholder="Add keyword..."
                placeholderTextColor={theme.textTertiary}
              />
              <TouchableOpacity onPress={() => addKeyword(config.key)} style={[styles.addBtn, { backgroundColor: theme.primary }]}>
                <Ionicons name="add" size={18} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: 12, padding: 4 },
  headerTitle: { fontSize: 22, fontWeight: '700', flex: 1 },
  saveBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  saveBtnText: { color: 'white', fontSize: 14, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 20, paddingBottom: 40 },
  description: { fontSize: 13, marginBottom: 16 },
  card: { borderRadius: 14, padding: 16, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardLabel: { fontSize: 15, fontWeight: '600' },
  cardCount: { fontSize: 12, fontWeight: '500' },
  cardDesc: { fontSize: 12, marginBottom: 10 },
  keywordsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  keywordBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  keywordText: { fontSize: 12, fontWeight: '600' },
  addRow: { flexDirection: 'row', gap: 8 },
  addInput: { flex: 1, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14 },
  addBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
