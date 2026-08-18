import { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, useColorScheme, ActivityIndicator, Alert, TextInput } from 'react-native';
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
  emailSubject?: string;
  emailSnippet?: string;
  emailFrom?: string;
  alreadyExists?: boolean;
  source?: string;
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

interface ScanStatus {
  id: number;
  status: string;
  totalEmails: number;
  processed: number;
  parsed: number;
  alreadyImported: number;
  error?: string | null;
}

interface JournalEntry {
  matched: number;
  alreadyExists: number;
  imported: number;
}

export default function GmailImportScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const router = useRouter();

  const [scanning, setScanning] = useState(false);
  const [importing, setImporting] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [summary, setSummary] = useState<ScanStatus | null>(null);
  const [scanId, setScanId] = useState<number | null>(null);
  const [importedResults, setImportedResults] = useState<Array<{ id: number; type: string; amount: number; date: string; description: string; vendor?: string; emailSnippet?: string }>>([]);
  const [journal, setJournal] = useState<Record<string, JournalEntry> | null>(null);
  const [keywords, setKeywords] = useState<Record<string, string[]>>({});
  const [showKeywords, setShowKeywords] = useState(false);
  const [savingKeywords, setSavingKeywords] = useState(false);
  const [newTerm, setNewTerm] = useState<Record<string, string>>({});
  const [scanRange, setScanRange] = useState('since-last');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const moduleLabel = (type: string) => {
    switch (type) {
      case 'expense': return 'Expenses';
      case 'income':
      case 'salary': return 'Income';
      case 'investment': return 'Investments';
      case 'insurance': return 'Insurance';
      case 'subscription': return 'Subscriptions';
      case 'asset': return 'Assets';
      case 'tax_document': return 'Tax Documents';
      default: return 'Expenses';
    }
  };

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const handleCancelScan = () => {
    stopPolling();
    setScanning(false);
    setScanId(null);
    setSummary(null);
  };

  const applyStatus = (scan: ScanStatus, txs: Transaction[], j: Record<string, JournalEntry> | null = null) => {
    setSummary(scan);
    setTransactions(txs);
    if (j) setJournal(j);
    if (scan.status === 'done' || scan.status === 'error') {
      setScanning(false);
      stopPolling();
      setScanId(null);
      if (scan.status === 'error') {
        Alert.alert('Error', scan.error || 'Scan failed');
      }
    }
  };

  const pollScan = (id: number) => {
    stopPolling();
    const tick = async () => {
      try {
        const res = await api.get(`/api/gmail/scan/status?scanId=${id}`);
        const data = res.data;
        if (data.error) throw new Error(data.error);
        if (!data.scan) return;
        applyStatus(data.scan, data.transactions || [], data.journal || null);
      } catch {
        // transient — keep polling
      }
    };
    void tick();
    pollRef.current = setInterval(() => void tick(), 2500);
  };

  useEffect(() => {
    // Resume a scan still running in the background (e.g. after navigating back)
    api.get('/api/gmail/scan/status')
      .then((res) => {
        const data = res.data;
        if (!data.scan) return;
        const s = data.scan as ScanStatus;
        setScanId(s.id);
        setTransactions(data.transactions || []);
        if (data.journal) setJournal(data.journal);
        if (s.status === 'running') {
          setScanning(true);
          setSummary(s);
          pollScan(s.id);
        } else if (s.status === 'done' && data.transactions?.length) {
          setSummary(s);
        }
      })
      .catch(() => {});
    api.get('/api/gmail/keywords')
      .then((res) => setKeywords(res.data?.keywords || {}))
      .catch(() => {});
    return stopPolling;
  }, []);

  const handleScan = async () => {
    setScanning(true);
    setTransactions([]);
    setSelected(new Set());
    setSummary(null);
    setJournal(null);
    try {
      const res = await api.post('/api/gmail/scan', {
        range: scanRange,
        from: scanRange === 'custom' ? customFrom : undefined,
        to: scanRange === 'custom' ? customTo : undefined,
      });
      const data = res.data;
      if (data.error) throw new Error(data.error);
      setScanId(data.scanId);
      pollScan(data.scanId);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } }; message?: string }).response?.data?.error || (err as Error).message || 'Scan failed';
      Alert.alert('Error', msg);
      setScanning(false);
    }
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      const items = transactions.filter((t) => selected.has(t.messageId));
      const res = await api.post('/api/gmail/import', {
        scanId,
        transactions: items.map((t) => ({
          type: t.type, date: t.date, amount: t.amount, description: t.description,
          vendor: t.vendor, category: t.category, messageId: t.messageId,
          emailSubject: t.emailSubject, emailSnippet: t.emailSnippet, emailFrom: t.emailFrom,
          source: t.source,
        })),
      });
      setImportedResults(res.data.results || []);
      Alert.alert('Success', `Imported ${res.data.imported} transactions successfully!`);
      setSelected(new Set());
      setScanId(null);
      api.get('/api/gmail/scan/status')
        .then((sr) => {
          if (sr.data?.journal) setJournal(sr.data.journal);
          if (sr.data?.scan) setSummary(sr.data.scan);
        })
        .catch(() => {});
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

  const handleSaveKeywords = async () => {
    setSavingKeywords(true);
    try {
      const res = await api.put('/api/gmail/keywords', { keywords });
      setKeywords(res.data?.keywords || {});
      Alert.alert('Saved', 'Parser keywords saved — next scan uses them');
    } catch {
      Alert.alert('Error', 'Failed to save keywords');
    } finally {
      setSavingKeywords(false);
    }
  };

  const addTerm = (cat: string) => {
    const term = (newTerm[cat] || '').trim();
    if (!term) return;
    setKeywords({ ...keywords, [cat]: [...(keywords[cat] || []), term] });
    setNewTerm({ ...newTerm, [cat]: '' });
  };

  const removeTerm = (cat: string, term: string) => {
    setKeywords({ ...keywords, [cat]: (keywords[cat] || []).filter((t) => t !== term) });
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
        <View style={[styles.rangeCard, { backgroundColor: theme.surface }]}>
          <Text style={[styles.rangeLabel, { color: theme.text }]}>Scan range</Text>
          <View style={styles.rangeChips}>
            {[
              { value: 'since-last', label: 'Since last' },
              { value: '3m', label: '3 mo' },
              { value: '6m', label: '6 mo' },
              { value: '1y', label: '1 yr' },
              { value: '18m', label: '1.5 yr' },
              { value: 'all', label: 'All' },
              { value: 'custom', label: 'Custom' },
            ].map((opt) => {
              const active = scanRange === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.rangeChip, { borderColor: active ? theme.primary : theme.border, backgroundColor: active ? theme.primaryLight : 'transparent' }]}
                  onPress={() => setScanRange(opt.value)}
                >
                  <Text style={[styles.rangeChipText, { color: active ? theme.primary : theme.text }]}>{opt.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {scanRange === 'custom' && (
            <View style={styles.rangeCustomRow}>
              <TextInput
                style={[styles.rangeInput, { borderColor: theme.border, color: theme.text }]}
                placeholder="From YYYY-MM-DD"
                placeholderTextColor={theme.textTertiary}
                value={customFrom}
                onChangeText={setCustomFrom}
              />
              <TextInput
                style={[styles.rangeInput, { borderColor: theme.border, color: theme.text }]}
                placeholder="To YYYY-MM-DD"
                placeholderTextColor={theme.textTertiary}
                value={customTo}
                onChangeText={setCustomTo}
              />
            </View>
          )}
          <Text style={[styles.rangeHint, { color: theme.textTertiary }]}>
            {scanRange === 'since-last'
              ? 'Emails since the last scan (skips already imported).'
              : 'All emails in the window — AI picks the real transactions.'}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.kwToggle, { backgroundColor: theme.surface }]}
          onPress={() => setShowKeywords(prev => !prev)}
        >
          <Ionicons name={showKeywords ? 'chevron-up' : 'settings-outline'} size={18} color={theme.primary} />
          <Text style={[styles.kwToggleText, { color: theme.text }]}>Parser Keywords</Text>
        </TouchableOpacity>

        {showKeywords && (
          <View style={[styles.summaryCard, { backgroundColor: theme.surface }]}>
            <Text style={[styles.txnDesc, { color: theme.text }]}>Search keywords per category</Text>
            <Text style={[styles.kwHint, { color: theme.textTertiary }]}>
              Drive the Gmail search. Add/remove terms — saved keywords are used by the next scan. AI still classifies each email, so broad keywords are safe.
            </Text>
            {Object.entries(keywords).map(([cat, terms]) => (
              <View key={cat} style={styles.kwCat}>
                <Text style={[styles.kwCatLabel, { color: theme.textTertiary }]}>{cat}</Text>
                <View style={styles.kwTerms}>
                  {(terms || []).map((t) => (
                    <View key={t} style={[styles.kwBadge, { backgroundColor: theme.primaryLight }]}>
                      <Text style={[styles.kwBadgeText, { color: theme.primary }]}>{t}</Text>
                      <TouchableOpacity onPress={() => removeTerm(cat, t)}>
                        <Ionicons name="close" size={12} color={theme.primary} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
                <View style={[styles.kwAddRow, { borderColor: theme.border }]}>
                  <TextInput
                    style={[styles.kwInput, { color: theme.text }]}
                    placeholder="Add keyword…"
                    placeholderTextColor={theme.textTertiary}
                    value={newTerm[cat] || ''}
                    onChangeText={(v) => setNewTerm({ ...newTerm, [cat]: v })}
                    onSubmitEditing={() => addTerm(cat)}
                    returnKeyType="done"
                  />
                  <TouchableOpacity onPress={() => addTerm(cat)} style={[styles.kwAddBtn, { backgroundColor: theme.primary }]}>
                    <Ionicons name="add" size={16} color="white" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            <TouchableOpacity
              style={[styles.importBtn, { backgroundColor: theme.primary, marginTop: 8 }]}
              onPress={handleSaveKeywords}
              disabled={savingKeywords}
            >
              {savingKeywords ? <ActivityIndicator color="white" size="small" /> : <Text style={styles.importBtnText}>Save Keywords</Text>}
            </TouchableOpacity>
          </View>
        )}

        {summary && (
          <View style={[styles.summaryCard, { backgroundColor: theme.surface }]}>
            {scanning && (
              <View style={styles.scanProgress}>
                <View style={styles.scanProgressTop}>
                  <Text style={[styles.scanProgressText, { color: theme.textSecondary }]}>
                    Scanning in background: {summary.processed}/{summary.totalEmails} emails
                  </Text>
                  <TouchableOpacity onPress={handleCancelScan}>
                    <Text style={[styles.cancelText, { color: theme.primary }]}>Stop</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        backgroundColor: theme.primary,
                        width: summary.totalEmails ? `${Math.round((summary.processed / summary.totalEmails) * 100)}%` : '0%',
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.scanProgressHint, { color: theme.textTertiary }]}>
                  You can leave this page — the scan keeps running.
                </Text>
              </View>
            )}
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryText, { color: theme.textSecondary }]}>
                Scanned <Text style={{ fontWeight: '700' }}>{summary.totalEmails}</Text> emails
              </Text>
              {summary.alreadyImported ? (
                <Text style={[styles.summaryText, { color: theme.textSecondary }]}>
                  Skipped <Text style={{ fontWeight: '700' }}>{summary.alreadyImported}</Text>
                </Text>
              ) : null}
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

        {journal && Object.keys(journal).length > 0 && (
          <View style={[styles.summaryCard, { backgroundColor: theme.surface }]}>
            <Text style={[styles.txnDesc, { color: theme.text }]}>Scan journal (last scan)</Text>
            <View style={styles.journalRow}>
              {Object.entries(journal).map(([type, j]) => {
                const colors = TYPE_COLORS[type] || TYPE_COLORS.expense;
                return (
                  <View key={type} style={[styles.journalItem, { backgroundColor: colors.bg }]}>
                    <Text style={[styles.journalText, { color: colors.text }]}>
                      {type}: {j.matched} matched{j.alreadyExists > 0 ? ` · ${j.alreadyExists} existed` : ''}{j.imported > 0 ? ` · ${j.imported} imported` : ''}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {importedResults.length > 0 && (
          <View style={[styles.summaryCard, { backgroundColor: theme.surface }]}>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>Imported {importedResults.length} items</Text>
            {importedResults.map((r, i) => {
              const colors = TYPE_COLORS[r.type] || TYPE_COLORS.expense;
              return (
                <View key={`${r.id}-${i}`} style={styles.importedRow}>
                  <View style={styles.txnRow}>
                    <View style={[styles.typeBadge, { backgroundColor: colors.bg }]}>
                      <Text style={[styles.typeText, { color: colors.text }]}>{r.type}</Text>
                    </View>
                    <View style={styles.txnInfo}>
                      <Text style={[styles.txnDesc, { color: theme.text }]} numberOfLines={1}>{r.description}</Text>
                      <Text style={[styles.txnMeta, { color: theme.textTertiary }]} numberOfLines={2}>
                        {new Date(r.date).toLocaleDateString('en-IN')}
                        {r.vendor ? ` — ${r.vendor}` : ''}
                        {r.emailSnippet ? ` — "${r.emailSnippet}"` : ''}
                      </Text>
                    </View>
                    <Text style={[styles.amountText, { color: r.type === 'income' || r.type === 'salary' ? '#059669' : theme.text }]}>
                      ₹{r.amount?.toLocaleString('en-IN')}
                    </Text>
                  </View>
                  <Text style={[styles.importedLink, { color: theme.primary }]}>
                    Saved to {moduleLabel(r.type)}
                  </Text>
                </View>
              );
            })}
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
                {t.source === 'bank' || t.source === 'upi' ? (
                  <View style={[styles.sourceBadge, { backgroundColor: theme.primary + '15' }]}>
                    <Text style={[styles.sourceText, { color: theme.primary }]}>
                      {t.source === 'bank' ? 'Bank' : 'UPI'}
                    </Text>
                  </View>
                ) : null}
                {t.alreadyExists ? (
                  <View style={[styles.sourceBadge, { backgroundColor: '#fef3c7' }]}>
                    <Text style={[styles.sourceText, { color: '#d97706' }]}>Already in app</Text>
                  </View>
                ) : null}
                <View style={styles.txnInfo}>
                  <Text style={[styles.txnDesc, { color: theme.text }]} numberOfLines={1}>{t.description}</Text>
                  <Text style={[styles.txnMeta, { color: theme.textTertiary }]}>
                    {new Date(t.date).toLocaleDateString('en-IN')}
                    {t.vendor ? ` — ${t.vendor}` : ''}
                  </Text>
                  {t.emailSnippet ? (
                    <Text style={[styles.txnMeta, { color: theme.textTertiary, fontStyle: 'italic' }]} numberOfLines={2}>
                      &quot;{t.emailSnippet}&quot;
                    </Text>
                  ) : null}
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
  importedRow: { marginTop: 10, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 8 },
  importedLink: { fontSize: 11, fontWeight: '600', marginTop: 6, textAlign: 'right' },
  scanProgress: { marginBottom: 12 },
  scanProgressTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  scanProgressText: { fontSize: 12, fontWeight: '600', flex: 1 },
  cancelText: { fontSize: 12, fontWeight: '700' },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: '#e5e7eb', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  scanProgressHint: { fontSize: 11, marginTop: 6, fontStyle: 'italic' },
  journalRow: { marginTop: 8, gap: 6 },
  journalItem: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-start' },
  journalText: { fontSize: 11, fontWeight: '600' },
  sourceBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  sourceText: { fontSize: 9, fontWeight: '700' },
  kwToggle: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, marginBottom: 10 },
  kwToggleText: { fontSize: 14, fontWeight: '600' },
  rangeCard: { borderRadius: 12, padding: 12, marginBottom: 10 },
  rangeLabel: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  rangeChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  rangeChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1 },
  rangeChipText: { fontSize: 12, fontWeight: '600' },
  rangeCustomRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  rangeInput: { flex: 1, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13 },
  rangeHint: { fontSize: 11, marginTop: 8, fontStyle: 'italic' },
  kwHint: { fontSize: 11, marginTop: 4, marginBottom: 8 },
  kwCat: { marginTop: 10 },
  kwCatLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: 6 },
  kwTerms: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  kwBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  kwBadgeText: { fontSize: 11, fontWeight: '600' },
  kwAddRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 8, marginTop: 8, overflow: 'hidden' },
  kwInput: { flex: 1, fontSize: 13, paddingHorizontal: 10, paddingVertical: 8 },
  kwAddBtn: { paddingHorizontal: 12, paddingVertical: 8 },
});