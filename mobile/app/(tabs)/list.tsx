import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
  RefreshControl,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import {
  formatCurrency,
  formatDate,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
} from '../../utils/format';
import api from '../../api/client';
import QuickCaptureModal from '../../components/QuickCaptureModal';

interface Transaction {
  id?: string;
  _id?: string;
  _type: 'expense' | 'income';
  category: string;
  name?: string;
  description?: string;
  amount: number;
  date?: string;
  createdAt?: string;
}

const PAGE_SIZE = 20;

export default function ListScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filter, setFilter] = useState<'all' | 'expense' | 'income'>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [quickCaptureVisible, setQuickCaptureVisible] = useState(false);

  const fetchTransactions = useCallback(
    async (pageNum: number = 1, append: boolean = false) => {
      if (pageNum === 1) setLoading(true);
      setError(null);
      try {
        const params: Record<string, string | number | undefined> = {
          page: pageNum,
          limit: PAGE_SIZE,
          search: search || undefined,
          month: selectedMonth || undefined,
        };
        if (filter !== 'all') {
          params.type = filter;
        }

        const [expRes, incRes] = await Promise.allSettled([
          filter !== 'income' ? api.get('/api/expenses', { params }) : Promise.resolve({ data: { expenses: [] } }),
          filter !== 'expense' ? api.get('/api/income/sources', { params }) : Promise.resolve({ data: { sources: [] } }),
        ]);

        let combined: Transaction[] = [];

        if (expRes.status === 'fulfilled') {
          const expData = expRes.value.data;
          const exps = (Array.isArray(expData?.expenses) ? expData.expenses : Array.isArray(expData) ? expData : []).map((e: Record<string, unknown>) => ({ ...e, _type: 'expense' as const }));
          combined = [...combined, ...exps as Transaction[]];
        }

        if (incRes.status === 'fulfilled') {
          const incData = incRes.value.data;
          const incs = (Array.isArray(incData?.sources) ? incData.sources : Array.isArray(incData?.income) ? incData.income : Array.isArray(incData) ? incData : []).map((i: Record<string, unknown>) => ({ ...i, _type: 'income' as const }));
          combined = [...combined, ...incs as Transaction[]];
        }

        combined.sort((a, b) => new Date(b.date || b.createdAt || 0).getTime() - new Date(a.date || a.createdAt || 0).getTime());

        if (append) {
          setTransactions((prev) => [...prev, ...combined]);
        } else {
          setTransactions(combined);
        }
        setHasMore(combined.length >= PAGE_SIZE);
      } catch {
        if (!append) setError('Failed to load transactions');
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [filter, search, selectedMonth]
  );

  useEffect(() => {
    setPage(1);
    setTransactions([]);
    fetchTransactions(1);
  }, [filter, selectedMonth, fetchTransactions]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      setTransactions([]);
      fetchTransactions(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search, fetchTransactions]);

  const handleRefresh = () => {
    setRefreshing(true);
    setPage(1);
    fetchTransactions(1);
  };

  const handleLoadMore = () => {
    if (loadingMore || !hasMore || loading) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    setPage(nextPage);
    fetchTransactions(nextPage, true);
  };

  const handleDelete = async (id: string) => {
    Alert.alert('Delete Transaction', 'Are you sure? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setDeleteId(id);
            await api.delete(`/api/expenses/${id}`);
            setTransactions((prev) => prev.filter((t) => t.id !== id && t._id !== id));
          } catch {
            Alert.alert('Error', 'Failed to delete');
          } finally {
            setDeleteId(null);
          }
        },
      },
    ]);
  };

  const getCategoryIcon = (cat: string) => {
    const allCats = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];
    const found = allCats.find((c) => c.value === cat?.toLowerCase());
    return found?.icon || 'ellipsis-horizontal';
  };

  const getAmountColor = (item: Transaction) => {
    if (item._type === 'income') return theme.income;
    const amt = item.amount || 0;
    return amt > 0 ? theme.income : theme.expense;
  };

  const getAmountPrefix = (item: Transaction) => {
    if (item._type === 'income') return '+';
    const amt = item.amount || 0;
    return amt > 0 ? '+' : '';
  };

  const renderItem = ({ item }: { item: Transaction }) => {
    const isDeleting = deleteId === (item.id || item._id);
    return (
      <View style={[styles.transactionRow, { backgroundColor: theme.surface }]}>
        <View
          style={[
            styles.txnIcon,
            {
              backgroundColor:
                item._type === 'income' ? theme.incomeLight : theme.expenseLight,
            },
          ]}
        >
          <Ionicons
            name={getCategoryIcon(item.category)}
            size={18}
            color={item._type === 'income' ? theme.income : theme.expense}
          />
        </View>
        <View style={styles.txnInfo}>
          <Text style={[styles.txnName, { color: theme.text }]} numberOfLines={1}>
            {item.name || item.description || item.category || 'Transaction'}
          </Text>
          <View style={styles.txnMeta}>
            <Text style={[styles.txnCategory, { color: theme.textSecondary }]}>
              {item.category}
            </Text>
            <Text style={[styles.txnDate, { color: theme.textTertiary }]}>
              {formatDate(item.date || item.createdAt)}
            </Text>
          </View>
        </View>
        <View style={styles.txnRight}>
          <Text style={[styles.txnAmount, { color: getAmountColor(item) }]}>
            {getAmountPrefix(item)}
            {formatCurrency(Math.abs(item.amount || 0))}
          </Text>
          <TouchableOpacity onPress={() => handleDelete(item.id || item._id || '')} disabled={isDeleting}>
            {isDeleting ? (
              <ActivityIndicator size="small" color={theme.expense} />
            ) : (
              <Ionicons name="trash-outline" size={16} color={theme.textTertiary} />
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={theme.primary} />
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="receipt-outline" size={48} color={theme.textTertiary} />
        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No transactions found</Text>
        <Text style={[styles.emptySubtext, { color: theme.textTertiary }]}>
          {search ? 'Try a different search' : 'Add your first transaction'}
        </Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Transactions</Text>
        <View style={[styles.searchBar, { backgroundColor: theme.background, borderColor: theme.border }]}>
          <Ionicons name="search-outline" size={18} color={theme.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            value={search}
            onChangeText={setSearch}
            placeholder="Search transactions..."
            placeholderTextColor={theme.textTertiary}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={theme.textTertiary} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <View style={styles.filterRow}>
        {(['all', 'expense', 'income'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[
              styles.filterPill,
              filter === f && { backgroundColor: theme.primary },
            ]}
            onPress={() => setFilter(f)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.filterText,
                { color: filter === f ? theme.white : theme.textSecondary },
              ]}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          style={[styles.monthBadge, { backgroundColor: theme.surface, borderColor: theme.border }]}
        >
          <Ionicons name="calendar-outline" size={14} color={theme.textSecondary} />
          <Text style={[styles.monthText, { color: theme.textSecondary }]}>
            {new Date(selectedMonth + '-01').toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
          </Text>
        </TouchableOpacity>
      </View>

      {error ? (
        <View style={[styles.errorBanner, { backgroundColor: theme.expenseLight }]}>
          <Ionicons name="alert-circle" size={16} color={theme.expense} />
          <Text style={[styles.errorText, { color: theme.expense }]}>{error}</Text>
          <TouchableOpacity onPress={handleRefresh}>
            <Text style={[styles.retryText, { color: theme.expense }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {loading && transactions.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <FlatList
          data={transactions}
          renderItem={renderItem}
          keyExtractor={(item, index) => item.id || item._id || String(index)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.primary} />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={renderEmpty}
          ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: theme.borderLight }} />}
        />
      )}

      <TouchableOpacity
        onPress={() => setQuickCaptureVisible(true)}
        style={[styles.fab, { backgroundColor: theme.primary }]}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <QuickCaptureModal
        visible={quickCaptureVisible}
        onClose={() => setQuickCaptureVisible(false)}
        onSaved={() => { setPage(1); fetchTransactions(1, true); }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 56,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    height: '100%',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 6,
    alignItems: 'center',
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
  },
  monthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 4,
  },
  monthText: {
    fontSize: 12,
    fontWeight: '600',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    padding: 12,
    borderRadius: 12,
    gap: 8,
    marginBottom: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  retryText: {
    fontSize: 13,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingBottom: 20,
  },
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  txnIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  txnInfo: {
    flex: 1,
  },
  txnName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  txnMeta: {
    flexDirection: 'row',
    gap: 8,
  },
  txnCategory: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  txnDate: {
    fontSize: 12,
    fontWeight: '500',
  },
  txnRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  txnAmount: {
    fontSize: 15,
    fontWeight: '700',
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 8,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 13,
    fontWeight: '500',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
});
