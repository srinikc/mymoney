import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  useColorScheme,
  RefreshControl,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/auth';
import { Colors } from '../../constants/Colors';
import { formatCurrency, formatDate, EXPENSE_CATEGORIES } from '../../utils/format';
import api from '../../api/client';
import QuickCaptureModal from '../../components/QuickCaptureModal';

interface RecentExpense {
  id?: string;
  _id?: string;
  type?: 'income' | 'expense';
  category: string;
  name?: string;
  description?: string;
  amount: number;
  date?: string;
  createdAt?: string;
}

interface QuickStat {
  label: string;
  amount: number;
  type: 'income' | 'expense' | 'saved';
}

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const router = useRouter();
  const { user } = useAuthStore();

  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [balance, setBalance] = useState(0);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [recentExpenses, setRecentExpenses] = useState<RecentExpense[]>([]);
  const [healthScore, setHealthScore] = useState<number | null>(null);
  const [quickStats, setQuickStats] = useState<QuickStat[]>([]);
  const [budgetInfo, setBudgetInfo] = useState<{ budget: number; spent: number; pct: number } | null>(null);
  const [netWorth, setNetWorth] = useState<{ netWorth: number; totalAssets: number; totalLoans: number } | null>(null);
  const [totalPF, setTotalPF] = useState(0);
  const [accounts, setAccounts] = useState<{ id: number; bankName: string; name: string; balance: number }[]>([]);
  const [cashBalance, setCashBalance] = useState<{ amount: number; notes?: string | null } | null>(null);
  const balanceScaleAnim = useRef(new Animated.Value(0)).current;

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const [insightsRes, healthRes, expensesRes, netWorthRes, bankRes, cashRes] = await Promise.allSettled([
        api.get('/api/insights'),
        api.get('/api/health-score'),
        api.get('/api/expenses', { params: { limit: 5 } }),
        api.get('/api/net-worth'),
        api.get('/api/bank-accounts'),
        api.get('/api/cash-balance'),
      ]);

      if (insightsRes.status === 'fulfilled') {
        const d = insightsRes.value.data;
        setTotalIncome(d.totalIncome || d.income || 0);
        setTotalExpenses(d.totalExpenses || d.expenses || 0);
        setBalance((d.totalIncome || d.income || 0) - (d.totalExpenses || d.expenses || 0));
        setQuickStats([
          { label: 'Spent Today', amount: d.spentToday || d.todayExpense || 0, type: 'expense' },
          { label: 'Income MTD', amount: d.incomeMTD || d.totalIncome || 0, type: 'income' },
          { label: 'Saved', amount: (d.totalIncome || d.income || 0) - (d.totalExpenses || d.expenses || 0), type: 'saved' },
        ]);
        const budget = d.monthlyBudget || 0;
        const spent = d.monthlyExpense || 0;
        setBudgetInfo({ budget, spent, pct: budget > 0 ? (spent / budget) * 100 : 0 });
        setTotalPF(d.totalPF || 0);
      }
      if (insightsRes.status === 'rejected' && !error) setError('Failed to load dashboard data');

      if (healthRes.status === 'fulfilled') {
        const h = healthRes.value.data;
        setHealthScore(h.score || h.healthScore || null);
      }

      if (expensesRes.status === 'fulfilled') {
        const e = expensesRes.value.data;
        const list = Array.isArray(e?.expenses) ? e.expenses : Array.isArray(e) ? e : [];
        setRecentExpenses(list.slice(0, 5));
      }

      if (netWorthRes.status === 'fulfilled') {
        const nw = netWorthRes.value.data;
        setNetWorth({ netWorth: nw.netWorth || 0, totalAssets: nw.totalAssets || 0, totalLoans: nw.totalLoans || 0 });
      }

      if (bankRes.status === 'fulfilled') {
        const b = bankRes.value.data;
        setAccounts(Array.isArray(b?.accounts) ? b.accounts : []);
      }

      if (cashRes.status === 'fulfilled') {
        const c = cashRes.value.data;
        setCashBalance(c?.cash || null);
      }
    } catch {
      setError('Something went wrong');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [error]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    Animated.spring(balanceScaleAnim, {
      toValue: 1,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, [balance, balanceScaleAnim]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const [quickCaptureVisible, setQuickCaptureVisible] = useState(false);

  const getCategoryIcon = (cat: string) => {
    const category = EXPENSE_CATEGORIES.find((c) => c.value === cat?.toLowerCase());
    return category?.icon || 'ellipsis-horizontal';
  };

  const getName = () => {
    if (user?.name) return user.name;
    if (user?.email) return user.email.split('@')[0];
    return 'User';
  };

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={[styles.greeting, { color: theme.textSecondary }]}>{getGreeting()}</Text>
            <Text style={[styles.userName, { color: theme.text }]}>{getName()}</Text>
          </View>
          <TouchableOpacity
            style={[styles.avatar, { backgroundColor: theme.primaryLight }]}
            onPress={() => router.push('/more')}
          >
            <Ionicons name="person" size={22} color={theme.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
        }
      >
        {error ? (
          <View style={[styles.errorCard, { backgroundColor: theme.expenseLight }]}>
            <Ionicons name="alert-circle" size={22} color={theme.expense} />
            <Text style={[styles.errorText, { color: theme.expense }]}>{error}</Text>
            <TouchableOpacity onPress={fetchData} style={styles.retryBtn}>
              <Text style={[styles.retryText, { color: theme.expense }]}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {loading && !error ? (
          <View style={styles.loadingContainer}>
            {[1, 2, 3].map((i) => (
              <View key={i} style={[styles.skeleton, { backgroundColor: theme.borderLight }]} />
            ))}
          </View>
        ) : (
          <>
            <Animated.View
              style={[
                styles.balanceCard,
                {
                  backgroundColor: theme.primary,
                  transform: [{ scale: balanceScaleAnim }],
                },
              ]}
            >
              <Text style={styles.balanceLabel}>Total Balance</Text>
              <Text style={styles.balanceAmount}>{formatCurrency(balance)}</Text>
              <View style={styles.balanceRow}>
                <View style={styles.balanceItem}>
                  <Ionicons name="arrow-down-circle" size={14} color="rgba(255,255,255,0.7)" />
                  <Text style={styles.balanceItemLabel}>Income</Text>
                  <Text style={styles.balanceItemValue}>{formatCurrency(totalIncome)}</Text>
                </View>
                <View style={styles.balanceDivider} />
                <View style={styles.balanceItem}>
                  <Ionicons name="arrow-up-circle" size={14} color="rgba(255,255,255,0.7)" />
                  <Text style={styles.balanceItemLabel}>Expenses</Text>
                  <Text style={styles.balanceItemValue}>{formatCurrency(totalExpenses)}</Text>
                </View>
              </View>
            </Animated.View>

            <View style={styles.statsRow}>
              {quickStats.map((stat, i) => (
                <View key={i} style={[styles.statCard, { backgroundColor: theme.surface }]}>
                  <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{stat.label}</Text>
                  <Text
                    style={[
                      styles.statValue,
                      {
                        color:
                          stat.type === 'income'
                            ? theme.income
                            : stat.type === 'expense'
                            ? theme.expense
                            : theme.text,
                      },
                    ]}
                  >
                    {formatCurrency(stat.amount)}
                  </Text>
                </View>
              ))}
            </View>

            {budgetInfo && budgetInfo.budget > 0 && (
              <TouchableOpacity
                style={[styles.budgetCard, { backgroundColor: theme.surface }]}
                onPress={() => router.push('/budgets')}
              >
                <View style={styles.budgetHeader}>
                  <Text style={[styles.budgetTitle, { color: theme.text }]}>Monthly Budget</Text>
                  <Text
                    style={[
                      styles.budgetStatus,
                      {
                        color:
                          budgetInfo.pct > 100 ? theme.expense : budgetInfo.pct >= 80 ? theme.warning : theme.income,
                      },
                    ]}
                  >
                    {budgetInfo.pct > 100
                      ? `Over by ${formatCurrency(budgetInfo.spent - budgetInfo.budget)}`
                      : `${formatCurrency(budgetInfo.budget - budgetInfo.spent)} left`}
                  </Text>
                </View>
                <View style={[styles.budgetBarBg, { backgroundColor: theme.borderLight }]}>
                  <View
                    style={[
                      styles.budgetBarFill,
                      {
                        width: `${Math.min(100, budgetInfo.pct)}%`,
                        backgroundColor:
                          budgetInfo.pct > 100 ? theme.expense : budgetInfo.pct >= 80 ? theme.warning : theme.income,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.budgetSub, { color: theme.textTertiary }]}>
                  {formatCurrency(budgetInfo.spent)} of {formatCurrency(budgetInfo.budget)} · {Math.round(budgetInfo.pct)}%
                </Text>
              </TouchableOpacity>
            )}

            <View style={styles.wealthRow}>
              <TouchableOpacity style={[styles.wealthCard, { backgroundColor: theme.surface }]} onPress={() => router.push('/net-worth')}>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Net Worth</Text>
                <Text style={[styles.wealthValue, { color: theme.income }]}>{formatCurrency(netWorth?.netWorth || 0)}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.wealthCard, { backgroundColor: theme.surface }]} onPress={() => router.push('/assets')}>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Assets</Text>
                <Text style={[styles.wealthValue, { color: theme.primary }]}>{formatCurrency(netWorth?.totalAssets || 0)}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.wealthCard, { backgroundColor: theme.surface }]} onPress={() => router.push('/loans')}>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Loans</Text>
                <Text style={[styles.wealthValue, { color: theme.expense }]}>{formatCurrency(netWorth?.totalLoans || 0)}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.wealthCard, { backgroundColor: theme.surface }]} onPress={() => router.push('/investments')}>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>PF</Text>
                <Text style={[styles.wealthValue, { color: theme.warning }]}>{formatCurrency(totalPF)}</Text>
              </TouchableOpacity>
            </View>

            {(accounts.length > 0 || cashBalance) && (
              <TouchableOpacity
                style={[styles.bankCard, { backgroundColor: theme.surface }]}
                onPress={() => router.push('/bank-accounts')}
                activeOpacity={0.7}
              >
                <View style={styles.bankHeader}>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>Bank Accounts</Text>
                  <Text style={[styles.seeAll, { color: theme.primary }]}>Manage</Text>
                </View>
                {accounts.slice(0, 4).map((acc) => (
                  <View key={acc.id} style={styles.bankRow}>
                    <Text style={[styles.bankName, { color: theme.text }]} numberOfLines={1}>{acc.bankName}</Text>
                    <Text style={[styles.bankBalance, { color: theme.text }]}>{formatCurrency(acc.balance)}</Text>
                  </View>
                ))}
                {cashBalance && (
                  <View style={styles.bankRow}>
                    <Text style={[styles.bankName, { color: theme.income }]} numberOfLines={1}>
                      Cash{cashBalance.notes ? ` · ${cashBalance.notes}` : ''}
                    </Text>
                    <Text style={[styles.bankBalance, { color: theme.income }]}>{formatCurrency(cashBalance.amount)}</Text>
                  </View>
                )}
                <View style={[styles.bankRow, styles.bankTotalRow, { borderTopColor: theme.borderLight }]}>
                  <Text style={[styles.bankName, { color: theme.text, fontWeight: '700' }]}>Total</Text>
                  <Text style={[styles.bankBalance, { color: theme.text, fontWeight: '800' }]}>
                    {formatCurrency(accounts.reduce((s, a) => s + a.balance, 0) + (cashBalance?.amount || 0))}
                  </Text>
                </View>
              </TouchableOpacity>
            )}

            {healthScore !== null && (
              <View style={[styles.healthCard, { backgroundColor: theme.surface }]}>
                <View style={styles.healthHeader}>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>Financial Health</Text>
                  <View
                    style={[
                      styles.healthBadge,
                      {
                        backgroundColor:
                          healthScore >= 70 ? theme.incomeLight : healthScore >= 40 ? theme.warningLight : theme.expenseLight,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.healthScore,
                        {
                          color:
                            healthScore >= 70 ? theme.income : healthScore >= 40 ? theme.warning : theme.expense,
                        },
                      ]}
                    >
                      {healthScore}/100
                    </Text>
                  </View>
                </View>
                <View style={styles.healthBarBg}>
                  <View
                    style={[
                      styles.healthBarFill,
                      {
                        width: `${Math.min(100, Math.max(0, healthScore))}%`,
                        backgroundColor:
                          healthScore >= 70 ? theme.income : healthScore >= 40 ? theme.warning : theme.expense,
                      },
                    ]}
                  />
                </View>
              </View>
            )}

            <View style={styles.quickLinksRow}>
              <TouchableOpacity style={[styles.quickLinkCard, { backgroundColor: theme.surface }]} onPress={() => router.push('/health')}>
                <View style={[styles.qlIcon, { backgroundColor: theme.incomeLight }]}>
                  <Ionicons name="heart-outline" size={18} color={theme.income} />
                </View>
                <Text style={[styles.qlText, { color: theme.textSecondary }]}>Health</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.quickLinkCard, { backgroundColor: theme.surface }]} onPress={() => router.push('/what-if')}>
                <View style={[styles.qlIcon, { backgroundColor: theme.warningLight }]}>
                  <Ionicons name="trending-up-outline" size={18} color={theme.warning} />
                </View>
                <Text style={[styles.qlText, { color: theme.textSecondary }]}>What-If</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.quickLinkCard, { backgroundColor: theme.surface }]} onPress={() => router.push('/risk-profile')}>
                <View style={[styles.qlIcon, { backgroundColor: theme.primaryLight }]}>
                  <Ionicons name="shield-checkmark-outline" size={18} color={theme.primary} />
                </View>
                <Text style={[styles.qlText, { color: theme.textSecondary }]}>Risk</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.quickLinkCard, { backgroundColor: theme.surface }]} onPress={() => router.push('/deals')}>
                <View style={[styles.qlIcon, { backgroundColor: '#F3E8FF' }]}>
                  <Ionicons name="pricetag-outline" size={18} color="#8B5CF6" />
                </View>
                <Text style={[styles.qlText, { color: theme.textSecondary }]}>Deals</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.quickLinkCard, { backgroundColor: theme.surface }]} onPress={() => router.push('/expenses')}>
                <View style={[styles.qlIcon, { backgroundColor: '#FEE2E2' }]}>
                  <Ionicons name="receipt-outline" size={18} color="#EF4444" />
                </View>
                <Text style={[styles.qlText, { color: theme.textSecondary }]}>Expenses</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Recent Transactions</Text>
              <TouchableOpacity onPress={() => router.push('/list')}>
                <Text style={[styles.seeAll, { color: theme.primary }]}>See All</Text>
              </TouchableOpacity>
            </View>

            {recentExpenses.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: theme.surface }]}>
                <Ionicons name="receipt-outline" size={40} color={theme.textTertiary} />
                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                  No recent transactions
                </Text>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recentScroll}>
                {recentExpenses.map((item, index) => (
                  <TouchableOpacity
                    key={item.id || index}
                    style={[styles.recentCard, { backgroundColor: theme.surface }]}
                    onPress={() => router.push('/list')}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.recentIcon,
                        {
                          backgroundColor:
                            item.type === 'income' || item.amount > 0
                              ? theme.incomeLight
                              : theme.expenseLight,
                        },
                      ]}
                    >
                      <Ionicons
                        name={getCategoryIcon(item.category)}
                        size={18}
                        color={item.type === 'income' || item.amount > 0 ? theme.income : theme.expense}
                      />
                    </View>
                    <Text style={[styles.recentName, { color: theme.text }]} numberOfLines={1}>
                      {item.name || item.description || item.category || 'Transaction'}
                    </Text>
                    <Text
                      style={[
                        styles.recentAmount,
                        {
                          color:
                            item.type === 'income' || item.amount > 0 ? theme.income : theme.expense,
                        },
                      ]}
                    >
                      {item.type === 'income' || item.amount > 0 ? '+' : ''}
                      {formatCurrency(Math.abs(item.amount || 0))}
                    </Text>
                    <Text style={[styles.recentDate, { color: theme.textTertiary }]}>
                      {formatDate(item.date || item.createdAt)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </>
        )}
      </ScrollView>

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
        onSaved={() => fetchData()}
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
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 14,
    fontWeight: '500',
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 2,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    marginBottom: 16,
    gap: 10,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  retryBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  retryText: {
    fontSize: 13,
    fontWeight: '700',
  },
  loadingContainer: {
    gap: 12,
  },
  skeleton: {
    height: 80,
    borderRadius: 14,
  },
  balanceCard: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
  },
  balanceLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  balanceAmount: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  balanceRow: {
    flexDirection: 'row',
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.15)',
    paddingTop: 16,
  },
  balanceItem: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 4,
  },
  balanceDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginHorizontal: 16,
  },
  balanceItemLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    fontWeight: '500',
  },
  balanceItemValue: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    width: '100%',
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  budgetCard: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  budgetTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  budgetStatus: {
    fontSize: 13,
    fontWeight: '700',
  },
  budgetBarBg: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  budgetBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  budgetSub: {
    fontSize: 12,
    marginTop: 8,
  },
  wealthRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  wealthCard: {
    flex: 1,
    borderRadius: 14,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  wealthValue: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 4,
  },
  bankCard: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  bankHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  bankRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  bankTotalRow: {
    marginTop: 6,
    borderTopWidth: 1,
    paddingTop: 10,
  },
  bankName: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  bankBalance: {
    fontSize: 13,
    fontWeight: '600',
  },
  healthCard: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  healthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  healthBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  healthScore: {
    fontSize: 13,
    fontWeight: '700',
  },
  healthBarBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.06)',
    overflow: 'hidden',
  },
  healthBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  seeAll: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyCard: {
    borderRadius: 14,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '500',
  },
  recentScroll: {
    marginBottom: 8,
  },
  recentCard: {
    width: 160,
    borderRadius: 14,
    padding: 14,
    marginRight: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  recentIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  recentName: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  recentAmount: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  recentDate: {
    fontSize: 11,
    fontWeight: '500',
  },
  quickLinksRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  quickLinkCard: {
    flex: 1,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  qlIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qlText: {
    fontSize: 11,
    fontWeight: '600',
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
