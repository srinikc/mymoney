import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, useColorScheme, RefreshControl, ActivityIndicator, Modal, TextInput, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { Colors } from '../constants/Colors';
import { formatCurrency, formatDate } from '../utils/format';
import api from '../api/client';

interface FixedDeposit {
  id: number;
  fdNumber?: string;
  principal: number;
  interestRate: number;
  startDate?: string;
  maturityDate?: string;
  maturityAmount?: number;
  status?: string;
}

interface BankAccount {
  id: number;
  bankName: string;
  name: string;
  accountNumber?: string;
  type: string;
  ifscCode?: string;
  balance: number;
  fixedDeposits: FixedDeposit[];
}

interface Transaction {
  id: number;
  vendor?: string;
  description?: string;
  date: string;
  category?: string;
  amount: number;
}

const BANK_TYPES = ['savings', 'current', 'salary', 'credit_card', 'loan'];

export default function BankAccountsScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const router = useRouter();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [totals, setTotals] = useState({ balance: 0, fdValue: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null);
  const [detailTab, setDetailTab] = useState<'fds' | 'transactions'>('fds');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [search, setSearch] = useState('');
  const [showFdForm, setShowFdForm] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formBank, setFormBank] = useState('');
  const [formNumber, setFormNumber] = useState('');
  const [formType, setFormType] = useState('savings');
  const [formIfsc, setFormIfsc] = useState('');
  const [formBalance, setFormBalance] = useState('');

  // FD form state
  const [fdNumber, setFdNumber] = useState('');
  const [fdPrincipal, setFdPrincipal] = useState('');
  const [fdRate, setFdRate] = useState('');
  const [fdStart, setFdStart] = useState('');
  const [fdMaturity, setFdMaturity] = useState('');
  const [fdMaturityAmt, setFdMaturityAmt] = useState('');

  // Cash state
  const [cashAmount, setCashAmount] = useState('');
  const [cashNotes, setCashNotes] = useState('');
  const [savingCash, setSavingCash] = useState(false);
  const [showCashForm, setShowCashForm] = useState(false);

  const fetchAccounts = useCallback(async () => {
    setError(null);
    try {
      const res = await api.get('/api/bank-accounts');
      setAccounts(res.data?.accounts || []);
      setTotals(res.data?.totals || { balance: 0, fdValue: 0 });
    } catch { setError('Failed to load bank accounts'); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  const fetchCash = useCallback(async () => {
    try {
      const res = await api.get('/api/cash-balance');
      const c = res.data?.cash;
      if (c) {
        setCashAmount(c.amount != null ? String(c.amount) : '');
        setCashNotes(c.notes || '');
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchAccounts(); fetchCash(); }, [fetchAccounts, fetchCash]);

  const handleSaveCash = async () => {
    setSavingCash(true);
    try {
      await api.put('/api/cash-balance', { amount: parseFloat(cashAmount || '0') || 0, notes: cashNotes || null });
      setShowCashForm(false);
      fetchCash();
    } catch { Alert.alert('Error', 'Failed to save cash'); }
    finally { setSavingCash(false); }
  };

  const fetchTransactions = async (accountId: number, q?: string) => {
    const params: Record<string, number | string | undefined> = { pageSize: 50 };
    if (q) params.search = q;
    const res = await api.get(`/api/bank-accounts/${accountId}/transactions`, { params });
    setTransactions(res.data?.transactions || []);
  };

  const handleSaveAccount = async () => {
    if (!formBank.trim()) { Alert.alert('Error', 'Bank name is required'); return; }
    try {
      await api.post('/api/bank-accounts', { bankName: formBank, name: formName || formBank, accountNumber: formNumber, type: formType, ifscCode: formIfsc, balance: parseFloat(formBalance) || 0 });
      setShowForm(false);
      setFormBank(''); setFormName(''); setFormNumber(''); setFormType('savings'); setFormIfsc(''); setFormBalance('');
      fetchAccounts();
    } catch { Alert.alert('Error', 'Failed to save'); }
  };

  const handleSaveFd = async () => {
    if (!selectedAccount || !fdPrincipal) return;
    try {
      await api.post(`/api/bank-accounts/${selectedAccount.id}/fds`, { fdNumber, principal: parseFloat(fdPrincipal), interestRate: parseFloat(fdRate || '0'), startDate: fdStart, maturityDate: fdMaturity, maturityAmount: fdMaturityAmt ? parseFloat(fdMaturityAmt) : null });
      setShowFdForm(false);
      setFdNumber(''); setFdPrincipal(''); setFdRate(''); setFdStart(''); setFdMaturity(''); setFdMaturityAmt('');
      const res = await api.get(`/api/bank-accounts/${selectedAccount.id}`);
      setSelectedAccount(res.data);
    } catch { Alert.alert('Error', 'Failed to save FD'); }
  };

  const typeColors: Record<string, string> = { savings: '#10B981', current: '#3B82F6', salary: '#8B5CF6', credit_card: '#F59E0B', loan: '#EF4444' };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <TouchableOpacity onPress={() => selectedAccount ? (setSelectedAccount(null), setTransactions([])) : router.back()} style={{ marginRight: 12, padding: 4 }}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text, flex: 1 }]}>
          {selectedAccount ? selectedAccount.bankName : 'Bank Accounts'}
        </Text>
        {selectedAccount ? null : (
          <TouchableOpacity onPress={() => setShowForm(true)} style={styles.addBtn}>
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {selectedAccount ? (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={[styles.balanceCard, { backgroundColor: theme.primary }]}>
            <Text style={{ color: '#fff', opacity: 0.7, fontSize: 12 }}>{selectedAccount.name}</Text>
            <Text style={{ color: '#fff', fontSize: 32, fontWeight: '800', marginVertical: 4 }}>{formatCurrency(selectedAccount.balance)}</Text>
            <Text style={{ color: '#fff', opacity: 0.6, fontSize: 12 }}>{selectedAccount.accountNumber || ''} {selectedAccount.ifscCode || ''}</Text>
          </View>

          <View style={styles.tabRow}>
            {['fds', 'transactions'].map((t) => (
              <TouchableOpacity key={t} onPress={() => { setDetailTab(t as 'fds' | 'transactions'); if (t === 'transactions' && selectedAccount) fetchTransactions(selectedAccount.id); }}
                style={[styles.tab, { backgroundColor: detailTab === t ? theme.primary : theme.surface }]}>
                <Text style={{ color: detailTab === t ? '#fff' : theme.text, fontSize: 13, fontWeight: '600' }}>
                  {t === 'fds' ? `FDs (${selectedAccount.fixedDeposits?.length || 0})` : 'Transactions'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {detailTab === 'fds' ? (
            <>
              <TouchableOpacity onPress={() => setShowFdForm(true)} style={[styles.actionBtn, { borderColor: theme.primary }]}>
                <Ionicons name="add" size={18} color={theme.primary} /><Text style={{ color: theme.primary, fontWeight: '600' }}>Add FD</Text>
              </TouchableOpacity>

              {showFdForm && (
                <View style={[styles.formCard, { backgroundColor: theme.surface }]}>
                  <TextInput style={[styles.input, { backgroundColor: theme.background, color: theme.text }]} value={fdNumber} onChangeText={setFdNumber} placeholder="FD Number" placeholderTextColor={theme.textTertiary} />
                  <TextInput style={[styles.input, { backgroundColor: theme.background, color: theme.text }]} value={fdPrincipal} onChangeText={setFdPrincipal} keyboardType="numeric" placeholder="Principal (₹)" placeholderTextColor={theme.textTertiary} />
                  <TextInput style={[styles.input, { backgroundColor: theme.background, color: theme.text }]} value={fdRate} onChangeText={setFdRate} keyboardType="decimal-pad" placeholder="Interest Rate (%)" placeholderTextColor={theme.textTertiary} />
                  <TextInput style={[styles.input, { backgroundColor: theme.background, color: theme.text }]} value={fdStart} onChangeText={setFdStart} placeholder="Start Date (YYYY-MM-DD)" placeholderTextColor={theme.textTertiary} />
                  <TextInput style={[styles.input, { backgroundColor: theme.background, color: theme.text }]} value={fdMaturity} onChangeText={setFdMaturity} placeholder="Maturity Date" placeholderTextColor={theme.textTertiary} />
                  <TouchableOpacity onPress={handleSaveFd} style={[styles.saveBtn, { backgroundColor: theme.primary }]}>
                    <Text style={{ color: '#fff', fontWeight: '700' }}>Save FD</Text>
                  </TouchableOpacity>
                </View>
              )}

              {(!selectedAccount.fixedDeposits || selectedAccount.fixedDeposits.length === 0) ? (
                <View style={styles.empty}><Ionicons name="pricetag-outline" size={36} color={theme.textTertiary} /><Text style={{ color: theme.textSecondary }}>No FDs</Text></View>
              ) : (
                selectedAccount.fixedDeposits.map((fd: FixedDeposit) => (
                  <View key={fd.id} style={[styles.card, { backgroundColor: theme.surface }]}>
                    <Text style={[styles.cardTitle, { color: theme.text }]}>{fd.fdNumber || `FD #${fd.id}`}</Text>
                    <Text style={[styles.cardSubtext, { color: theme.textTertiary }]}>
                      {formatCurrency(fd.principal)} @ {fd.interestRate}% · {fd.startDate ? formatDate(fd.startDate) : ''} → {fd.maturityDate ? formatDate(fd.maturityDate) : ''}
                    </Text>
                    {fd.maturityAmount && <Text style={{ color: theme.income, fontSize: 13, fontWeight: '600' }}>Maturity: {formatCurrency(fd.maturityAmount)}</Text>}
                  </View>
                ))
              )}
            </>
          ) : (
            <>
              <View style={[styles.searchBar, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Ionicons name="search" size={18} color={theme.textTertiary} />
                <TextInput style={[styles.searchInput, { color: theme.text }]} value={search} onChangeText={(t) => { setSearch(t); if (selectedAccount) fetchTransactions(selectedAccount.id, t); }} placeholder="Search transactions..." placeholderTextColor={theme.textTertiary} />
              </View>
              {transactions.length === 0 ? (
                <View style={styles.empty}><Ionicons name="document-text-outline" size={36} color={theme.textTertiary} /><Text style={{ color: theme.textSecondary }}>No transactions</Text></View>
              ) : (
                transactions.map((txn: Transaction) => (
                  <View key={txn.id} style={[styles.card, { backgroundColor: theme.surface }]}>
                    <View style={styles.cardRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.cardTitle, { color: theme.text }]}>{txn.vendor || txn.description}</Text>
                        <Text style={[styles.cardSubtext, { color: theme.textTertiary }]}>{formatDate(txn.date)} · {txn.category}</Text>
                      </View>
                      <Text style={[styles.cardAmount, { color: theme.text }]}>{formatCurrency(txn.amount)}</Text>
                    </View>
                  </View>
                ))
              )}
            </>
          )}
        </ScrollView>
      ) : (
        <>
          {loading ? <View style={styles.center}><ActivityIndicator size="large" color={theme.primary} /></View>
          : error ? <View style={styles.center}><Ionicons name="alert-circle" size={40} color={theme.expense} /><Text style={{ color: theme.expense }}>{error}</Text></View>
          : (
            <FlatList
              data={accounts}
              keyExtractor={(a) => String(a.id)}
              ListHeaderComponent={
                <View>
                  <View style={styles.summaryRow}>
                    <View style={[styles.summaryCard, { backgroundColor: theme.primary }]}>
                      <Text style={{ color: '#fff', opacity: 0.7, fontSize: 11 }}>Total Balance</Text>
                      <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800' }}>{formatCurrency(totals.balance)}</Text>
                    </View>
                    <View style={[styles.summaryCard, { backgroundColor: theme.income }]}>
                      <Text style={{ color: '#fff', opacity: 0.7, fontSize: 11 }}>Total FD Value</Text>
                      <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800' }}>{formatCurrency(totals.fdValue)}</Text>
                    </View>
                  </View>
                  <View style={[styles.cashCard, { backgroundColor: theme.surface }]}>
                    <View style={styles.cashHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.cashTitle, { color: theme.text }]}>Cash</Text>
                        <Text style={[styles.cashValue, { color: theme.income }]}>
                          {formatCurrency(parseFloat(cashAmount || '0') || 0)}
                        </Text>
                        {cashNotes ? <Text style={{ color: theme.textTertiary, fontSize: 11, marginTop: 2 }}>{cashNotes}</Text> : null}
                      </View>
                      <TouchableOpacity onPress={() => setShowCashForm(!showCashForm)} style={[styles.actionBtn, { borderColor: theme.primary, marginBottom: 0 }]}>
                        <Ionicons name="wallet-outline" size={16} color={theme.primary} />
                        <Text style={{ color: theme.primary, fontWeight: '600', fontSize: 13 }}>{showCashForm ? 'Cancel' : 'Update'}</Text>
                      </TouchableOpacity>
                    </View>
                    {showCashForm && (
                      <View style={styles.cashForm}>
                        <TextInput style={[styles.input, { backgroundColor: theme.background, color: theme.text }]} value={cashAmount} onChangeText={setCashAmount} keyboardType="numeric" placeholder="Cash amount (₹)" placeholderTextColor={theme.textTertiary} />
                        <TextInput style={[styles.input, { backgroundColor: theme.background, color: theme.text }]} value={cashNotes} onChangeText={setCashNotes} placeholder="Comments" placeholderTextColor={theme.textTertiary} />
                        <TouchableOpacity onPress={handleSaveCash} disabled={savingCash} style={[styles.saveBtn, { backgroundColor: theme.primary }]}>
                          <Text style={{ color: '#fff', fontWeight: '700' }}>{savingCash ? 'Saving...' : 'Save Cash'}</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              }
              renderItem={({ item }) => {
                const fdTotal = item.fixedDeposits.reduce((s: number, f: FixedDeposit) => s + f.principal, 0);
                const activeFds = item.fixedDeposits.filter((f: FixedDeposit) => f.status === 'active').length;
                return (
                  <TouchableOpacity onPress={() => { setSelectedAccount(item); if (item.id) fetchTransactions(item.id); }} style={[styles.card, { backgroundColor: theme.surface }]}>
                    <View style={styles.cardRow}>
                      <View style={[styles.cardIcon, { backgroundColor: typeColors[item.type] + '20' }]}>
                        <Ionicons name="business" size={18} color={typeColors[item.type]} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.cardTitle, { color: theme.text }]}>{item.bankName}</Text>
                        <Text style={[styles.cardSubtext, { color: theme.textTertiary }]}>{item.name} · {item.accountNumber || ''}</Text>
                        {activeFds > 0 && <Text style={{ fontSize: 11, color: theme.income, marginTop: 2 }}>{activeFds} FD · {formatCurrency(fdTotal)}</Text>}
                      </View>
                      <Text style={[styles.cardAmount, { color: theme.text }]}>{formatCurrency(item.balance)}</Text>
                    </View>
                  </TouchableOpacity>
                );
              }}
              contentContainerStyle={styles.listContent}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAccounts(); }} tintColor={theme.primary} />}
              ListEmptyComponent={<View style={styles.empty}><Ionicons name="business-outline" size={48} color={theme.textTertiary} /><Text style={{ color: theme.textSecondary, fontSize: 15 }}>No bank accounts</Text></View>}
            />
          )}

          <Modal visible={showForm} animationType="slide" transparent>
            <View style={styles.modalOverlay}>
              <ScrollView style={[styles.modalContent, { backgroundColor: theme.surface }]}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Add Bank Account</Text>
                <TextInput style={[styles.input, { backgroundColor: theme.background, color: theme.text }]} value={formBank} onChangeText={setFormBank} placeholder="Bank Name *" placeholderTextColor={theme.textTertiary} />
                <TextInput style={[styles.input, { backgroundColor: theme.background, color: theme.text }]} value={formName} onChangeText={setFormName} placeholder="Account Name" placeholderTextColor={theme.textTertiary} />
                <TextInput style={[styles.input, { backgroundColor: theme.background, color: theme.text }]} value={formNumber} onChangeText={setFormNumber} placeholder="Account Number" placeholderTextColor={theme.textTertiary} />
                <View style={styles.typeRow}>{BANK_TYPES.map((t) => (
                  <TouchableOpacity key={t} onPress={() => setFormType(t)} style={[styles.typeBtn, { backgroundColor: formType === t ? theme.primary : theme.background }]}>
                    <Text style={{ color: formType === t ? '#fff' : theme.text, fontSize: 12 }}>{t.replace('_', ' ')}</Text>
                  </TouchableOpacity>
                ))}</View>
                <TextInput style={[styles.input, { backgroundColor: theme.background, color: theme.text }]} value={formIfsc} onChangeText={setFormIfsc} placeholder="IFSC Code" placeholderTextColor={theme.textTertiary} />
                <TextInput style={[styles.input, { backgroundColor: theme.background, color: theme.text }]} value={formBalance} onChangeText={setFormBalance} keyboardType="numeric" placeholder="Balance (₹)" placeholderTextColor={theme.textTertiary} />
                <View style={styles.modalActions}>
                  <TouchableOpacity onPress={() => setShowForm(false)} style={styles.cancelBtn}><Text style={{ color: theme.textSecondary, fontWeight: '600' }}>Cancel</Text></TouchableOpacity>
                  <TouchableOpacity onPress={handleSaveAccount} style={[styles.saveBtn, { backgroundColor: theme.primary }]}><Text style={{ color: '#fff', fontWeight: '700' }}>Save</Text></TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </Modal>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, header: { paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '700' }, addBtn: { backgroundColor: 'rgba(255,255,255,0.2)', width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  summaryRow: { flexDirection: 'row', gap: 10, padding: 16, paddingBottom: 8 },
  summaryCard: { flex: 1, borderRadius: 14, padding: 16 },
  cashCard: { marginHorizontal: 16, marginBottom: 10, borderRadius: 14, padding: 16 },
  cashHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  cashTitle: { fontSize: 13, fontWeight: '600' },
  cashValue: { fontSize: 20, fontWeight: '800', marginTop: 2 },
  cashForm: { gap: 10, marginTop: 12 },
  listContent: { paddingBottom: 20 }, card: { borderRadius: 14, padding: 16, marginHorizontal: 16, marginBottom: 10 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 }, cardIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 14, fontWeight: '600' }, cardSubtext: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  cardAmount: { fontSize: 15, fontWeight: '700' }, empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  balanceCard: { borderRadius: 16, padding: 20, marginBottom: 16 },
  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 12, borderRadius: 10, borderWidth: 1, borderStyle: 'dashed', marginBottom: 12 },
  formCard: { borderRadius: 14, padding: 16, marginBottom: 16, gap: 10 },
  input: { borderRadius: 10, padding: 12, fontSize: 14 },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, paddingHorizontal: 12, height: 42, borderWidth: 1, marginBottom: 12 },
  searchInput: { flex: 1, fontSize: 14, height: '100%' },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  typeBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '90%' },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 16 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  cancelBtn: { flex: 1, alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#ddd' },
  saveBtn: { flex: 1, alignItems: 'center', padding: 14, borderRadius: 12 },
});
