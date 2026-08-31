import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, useColorScheme, ActivityIndicator, TextInput, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { formatCurrency, formatDate } from '../../utils/format';
import api from '../../api/client';

interface AccountDetail {
  id: number;
  bankName: string;
  name: string;
  accountNumber?: string;
  ifscCode?: string;
  balance: number;
  fixedDeposits: FD[];
}

interface FD {
  id: number;
  fdNumber?: string;
  principal: number;
  interestRate?: number;
  startDate?: string;
  maturityDate?: string;
  maturityAmount?: number;
  status?: string;
}

interface TxnItem {
  id: number;
  vendor?: string;
  description?: string;
  date: string;
  category?: string;
  amount: number;
}

export default function BankAccountDetailScreen() {
  const { id } = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const router = useRouter();

  const [account, setAccount] = useState<AccountDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'transactions' | 'fds'>('transactions');
  const [search, setSearch] = useState('');
  const [transactions, setTransactions] = useState<TxnItem[]>([]);
  const [, setTxnPage] = useState(1);
  const [, setTxnTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [editingBalance, setEditingBalance] = useState(false);
  const [balanceValue, setBalanceValue] = useState('');
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [showFdForm, setShowFdForm] = useState(false);
  const [fdNumber, setFdNumber] = useState('');
  const [fdPrincipal, setFdPrincipal] = useState('');
  const [fdRate, setFdRate] = useState('');
  const [fdStart, setFdStart] = useState('');
  const [fdMaturity, setFdMaturity] = useState('');
  const [fdMaturityAmt, setFdMaturityAmt] = useState('');
  const [fdLoading, setFdLoading] = useState(false);

  const fetchAccount = useCallback(async () => {
    setError(null);
    try {
      const res = await api.get(`/api/bank-accounts/${id}`);
      setAccount(res.data);
    } catch {
      setError('Failed to load account');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  const fetchTransactions = useCallback(async (targetPage = 1, append = false) => {
    try {
      const params: Record<string, string | undefined> = { page: String(targetPage), pageSize: '50' };
      if (search) params.search = search;
      const res = await api.get(`/api/bank-accounts/${id}/transactions`, { params });
      const d = res.data;
      const items = d.transactions || d.data || [];
      if (append) {
        setTransactions((prev) => [...prev, ...items]);
      } else {
        setTransactions(items);
      }
      setTxnTotalPages(d.totalPages || 1);
      setTxnPage(targetPage);
    } catch {
      // ignore
    } finally {
      setLoadingMore(false);
    }
  }, [id, search]);

  useEffect(() => { fetchAccount(); }, [fetchAccount]);

  useEffect(() => {
    if (tab === 'transactions') {
      fetchTransactions(1);
    }
  }, [tab, fetchTransactions]);

  const handleSaveBalance = async () => {
    const val = parseFloat(balanceValue);
    if (isNaN(val)) return;
    setBalanceLoading(true);
    try {
      await api.put(`/api/bank-accounts/${id}`, { balance: val });
      setAccount((prev) => (prev ? { ...prev, balance: val } : prev));
      setEditingBalance(false);
    } catch {
      Alert.alert('Error', 'Failed to update balance');
    } finally {
      setBalanceLoading(false);
    }
  };

  const handleAddFd = async () => {
    if (!fdPrincipal) {
      Alert.alert('Validation', 'Principal is required');
      return;
    }
    setFdLoading(true);
    try {
      await api.post(`/api/bank-accounts/${id}/fds`, {
        fdNumber,
        principal: parseFloat(fdPrincipal),
        interestRate: fdRate ? parseFloat(fdRate) : null,
        startDate: fdStart,
        maturityDate: fdMaturity,
        maturityAmount: fdMaturityAmt ? parseFloat(fdMaturityAmt) : null,
      });
      setShowFdForm(false);
      setFdNumber(''); setFdPrincipal(''); setFdRate(''); setFdStart(''); setFdMaturity(''); setFdMaturityAmt('');
      fetchAccount();
    } catch {
      Alert.alert('Error', 'Failed to add FD');
    } finally {
      setFdLoading(false);
    }
  };

  const handleDeleteFd = (fd: FD) => {
    Alert.alert('Delete FD', `Delete FD "${fd.fdNumber || `#${fd.id}`}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/api/bank-accounts/${id}/fds/${fd.id}`);
            fetchAccount();
          } catch {
            Alert.alert('Error', 'Failed to delete FD');
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (error || !account) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, alignItems: 'center', justifyContent: 'center', gap: 12 }]}>
        <Ionicons name="alert-circle" size={40} color={theme.expense} />
        <Text style={{ color: theme.expense }}>{error || 'Account not found'}</Text>
        <TouchableOpacity onPress={() => router.back()} style={[styles.retryBtn, { backgroundColor: theme.primary }]}>
          <Text style={{ color: '#fff', fontWeight: '600' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const fds = account.fixedDeposits || [];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>{account.bankName || account.name}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.balanceCard, { backgroundColor: theme.surface }]}>
          <Text style={[styles.balanceLabel, { color: theme.textSecondary }]}>{account.name}</Text>
          <View style={styles.balanceRow}>
            {editingBalance ? (
              <TextInput
                style={[styles.balanceInput, { color: theme.text, borderColor: theme.primary }]}
                value={balanceValue}
                onChangeText={setBalanceValue}
                keyboardType="decimal-pad"
                autoFocus
                onBlur={() => setEditingBalance(false)}
              />
            ) : (
              <Text style={[styles.balanceAmount, { color: theme.text }]}>{formatCurrency(account.balance)}</Text>
            )}
            {editingBalance ? (
              <TouchableOpacity onPress={handleSaveBalance} disabled={balanceLoading} style={[styles.saveBalanceBtn, { backgroundColor: theme.primary }]}>
                {balanceLoading ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="checkmark" size={20} color="#fff" />}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={() => { setBalanceValue(String(account.balance)); setEditingBalance(true); }} style={styles.editBalanceBtn}>
                <Ionicons name="pencil" size={18} color={theme.textTertiary} />
              </TouchableOpacity>
            )}
          </View>
          {account.accountNumber || account.ifscCode ? (
            <Text style={[styles.balanceMeta, { color: theme.textTertiary }]}>
              {account.accountNumber || ''}{account.accountNumber && account.ifscCode ? ' · ' : ''}{account.ifscCode || ''}
            </Text>
          ) : null}
        </View>

        <View style={styles.tabRow}>
          {['transactions', 'fds'].map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => setTab(t as 'transactions' | 'fds')}
              style={[styles.tab, { backgroundColor: tab === t ? theme.primary : theme.surface, borderColor: tab === t ? theme.primary : theme.border }]}
            >
              <Text style={{ color: tab === t ? '#fff' : theme.text, fontSize: 13, fontWeight: '600' }}>
                {t === 'fds' ? `FDs (${fds.length})` : 'Transactions'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {tab === 'transactions' ? (
          <>
            <View style={[styles.searchRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Ionicons name="search" size={18} color={theme.textTertiary} />
              <TextInput
                style={[styles.searchInput, { color: theme.text }]}
                value={search}
                onChangeText={(v) => { setSearch(v); }}
                placeholder="Search transactions..."
                placeholderTextColor={theme.textTertiary}
              />
            </View>
            {transactions.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons name="document-text-outline" size={36} color={theme.textTertiary} />
                <Text style={{ color: theme.textSecondary }}>No transactions</Text>
              </View>
            ) : (
              <FlatList
                data={transactions}
                keyExtractor={(item, idx) => String(item.id || idx)}
                scrollEnabled={false}
                renderItem={({ item }) => (
                  <View style={[styles.card, { backgroundColor: theme.surface }]}>
                    <View style={styles.cardRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.cardTitle, { color: theme.text }]}>{item.vendor || item.description || '—'}</Text>
                        <View style={styles.cardMeta}>
                          <Text style={[styles.cardSubtext, { color: theme.textTertiary }]}>{formatDate(item.date)}</Text>
                          {item.category ? <Text style={[styles.cardCat, { color: theme.primary }]}>{item.category}</Text> : null}
                        </View>
                      </View>
                      <Text style={[styles.cardAmount, { color: theme.text }]}>{formatCurrency(item.amount)}</Text>
                    </View>
                  </View>
                )}
                ListFooterComponent={loadingMore ? <ActivityIndicator style={{ padding: 16 }} color={theme.primary} /> : null}
              />
            )}
          </>
        ) : (
          <>
            <TouchableOpacity onPress={() => setShowFdForm(true)} style={[styles.addFdBtn, { borderColor: theme.primary }]}>
              <Ionicons name="add" size={18} color={theme.primary} />
              <Text style={{ color: theme.primary, fontWeight: '600' }}>Add FD</Text>
            </TouchableOpacity>

            {showFdForm && (
              <View style={[styles.fdForm, { backgroundColor: theme.surface }]}>
                <TextInput style={[styles.input, { backgroundColor: theme.background, color: theme.text }]} value={fdNumber} onChangeText={setFdNumber} placeholder="FD Number" placeholderTextColor={theme.textTertiary} />
                <TextInput style={[styles.input, { backgroundColor: theme.background, color: theme.text }]} value={fdPrincipal} onChangeText={setFdPrincipal} keyboardType="decimal-pad" placeholder="Principal (₹) *" placeholderTextColor={theme.textTertiary} />
                <TextInput style={[styles.input, { backgroundColor: theme.background, color: theme.text }]} value={fdRate} onChangeText={setFdRate} keyboardType="decimal-pad" placeholder="Interest Rate (%)" placeholderTextColor={theme.textTertiary} />
                <TextInput style={[styles.input, { backgroundColor: theme.background, color: theme.text }]} value={fdStart} onChangeText={setFdStart} placeholder="Start Date (YYYY-MM-DD)" placeholderTextColor={theme.textTertiary} />
                <TextInput style={[styles.input, { backgroundColor: theme.background, color: theme.text }]} value={fdMaturity} onChangeText={setFdMaturity} placeholder="Maturity Date" placeholderTextColor={theme.textTertiary} />
                <TextInput style={[styles.input, { backgroundColor: theme.background, color: theme.text }]} value={fdMaturityAmt} onChangeText={setFdMaturityAmt} keyboardType="decimal-pad" placeholder="Maturity Amount" placeholderTextColor={theme.textTertiary} />
                <TouchableOpacity onPress={handleAddFd} disabled={fdLoading} style={[styles.saveBtn, { backgroundColor: theme.primary }]}>
                  {fdLoading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700' }}>Save FD</Text>}
                </TouchableOpacity>
              </View>
            )}

            {fds.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons name="pricetag-outline" size={36} color={theme.textTertiary} />
                <Text style={{ color: theme.textSecondary }}>No Fixed Deposits</Text>
              </View>
            ) : (
              fds.map((fd: FD) => (
                <TouchableOpacity key={fd.id} onLongPress={() => handleDeleteFd(fd)} activeOpacity={0.7}>
                  <View style={[styles.card, { backgroundColor: theme.surface }]}>
                    <View style={styles.fdRow}>
                      <Text style={[styles.cardTitle, { color: theme.text }]}>{fd.fdNumber || `FD #${fd.id}`}</Text>
                      {fd.interestRate ? <Text style={{ color: theme.income, fontSize: 12, fontWeight: '600' }}>{fd.interestRate}%</Text> : null}
                    </View>
                    <Text style={[styles.cardSubtext, { color: theme.textTertiary, marginTop: 4 }]}>
                      Principal: {formatCurrency(fd.principal)}
                    </Text>
                    {(fd.startDate || fd.maturityDate) && (
                      <Text style={[styles.cardSubtext, { color: theme.textTertiary }]}>
                        {fd.startDate ? formatDate(fd.startDate) : '—'} → {fd.maturityDate ? formatDate(fd.maturityDate) : '—'}
                      </Text>
                    )}
                    {fd.maturityAmount && (
                      <Text style={{ color: theme.income, fontSize: 13, fontWeight: '700', marginTop: 4 }}>
                        Maturity: {formatCurrency(fd.maturityAmount)}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))
            )}
          </>
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
  scrollContent: { padding: 16, paddingBottom: 40 },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  balanceCard: { borderRadius: 14, padding: 20, marginBottom: 16 },
  balanceLabel: { fontSize: 12, fontWeight: '500' },
  balanceRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 8 },
  balanceAmount: { fontSize: 28, fontWeight: '800', flex: 1 },
  balanceInput: { fontSize: 24, fontWeight: '800', flex: 1, borderBottomWidth: 2, paddingVertical: 4 },
  editBalanceBtn: { padding: 6 },
  saveBalanceBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  balanceMeta: { fontSize: 11, marginTop: 4 },
  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, paddingHorizontal: 12, height: 42, borderWidth: 1, marginBottom: 12 },
  searchInput: { flex: 1, fontSize: 14, height: '100%' },
  card: { borderRadius: 14, padding: 14, marginBottom: 8 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardTitle: { fontSize: 14, fontWeight: '600' },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  cardSubtext: { fontSize: 12, fontWeight: '500' },
  cardCat: { fontSize: 11, fontWeight: '500' },
  cardAmount: { fontSize: 15, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 40, gap: 12 },
  addFdBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 12, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', marginBottom: 12 },
  fdForm: { borderRadius: 14, padding: 16, marginBottom: 16, gap: 10 },
  input: { borderRadius: 12, padding: 12, fontSize: 14 },
  saveBtn: { height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  fdRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
