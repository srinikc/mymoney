
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
  Modal,
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
  const [netWorth, setNetWorth] = useState<{ netWorth: number; totalAssets: number; totalLoans: number; totalPF: 
number; subscriptionsTotal: number; insurancePremiumTotal: number; activeGoals: number; goalProgress: number; 
breakdown: { userAssets: number; investments: number; bankBalance: number; fixedDeposits: number; cash: number } } | 
null>(null);
  const [totalPF, setTotalPF] = useState(0);
  const [accounts, setAccounts] = useState<{ id: number; bankName: string; name: string; accountNumber?: string | 
null; balance: number }[]>([]);
  const [cashBalance, setCashBalance] = useState<{ amount: number; notes?: string | null } | null>(null);
  const [periodLabel, setPeriodLabel] = useState('All Years');
  const [overall, setOverall] = useState<{ expense: number; income: number }>({ expense: 0, income: 0 });
  const [years, setYears] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedQuarter, setSelectedQuarter] = useState('');
  const [showYearPicker, setShowYearPicker] = useState(false);
  const balanceScaleAnim = useRef(new Animated.Value(0)).current;

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const [insightsRes, healthRes, expensesRes] = await Promise.allSettled([
        api.get('/api/insights'),
      const params = new URLSearchParams();
      if (selectedYear !== 'all') params.set('year', selectedYear);
      if (selectedMonth) params.set('month', selectedMonth);
      if (selectedQuarter) params.set('quarter', selectedQuarter);
      const qs = params.toString();

      const [insightsRes, healthRes, expensesRes, netWorthRes, bankRes, cashRes] = await Promise.allSettled([
        api.get(`/api/insights${qs ? `?${qs}` : ''}`),
        api.get('/api/health-score'),
        api.get('/api/expenses', { params: { limit: 5 } }),
      ]);

      if (insightsRes.status === 'fulfilled') {
        const d = insightsRes.value.data;
        setPeriodLabel(d.periodLabel || 'All Years');
        setTotalIncome(d.periodIncome || d.totalIncome || 0);
        setTotalExpenses(d.periodExpense || d.totalExpenses || 0);
        setBalance((d.periodIncome || 0) - (d.periodExpense || 0));
        setOverall({ expense: d.overallExpense || 0, income: d.overallIncome || 0 });
        setQuickStats([
          { label: 'Period Income', amount: d.periodIncome || 0, type: 'income' },
          { label: 'Period Expense', amount: d.periodExpense || 0, type: 'expense' },
          { label: 'Net Savings', amount: (d.periodIncome || 0) - (d.periodExpense || 0), type: 'saved' },
        ]);
        const budget = d.currentMonthBudget || 0;
        const spent = d.currentMonthSpent || 0;
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
        setNetWorth({
          netWorth: nw.netWorth || 0,
          totalAssets: nw.totalAssets || 0,
          totalLoans: nw.totalLoans || 0,
          totalPF: nw.totalPF || 0,
          subscriptionsTotal: nw.subscriptionsTotal || 0,
          insurancePremiumTotal: nw.insurancePremiumTotal || 0,
          activeGoals: nw.activeGoals || 0,
          goalProgress: nw.goalProgress || 0,
          breakdown: nw.breakdown || { userAssets: 0, investments: 0, bankBalance: 0, fixedDeposits: 0, cash: 0 },
        });
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
  }, [error, selectedYear, selectedMonth, selectedQuarter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    api.get('/api/expenses/years').then((r) => {
      const yrs = Array.isArray(r?.data?.years) ? r.data.years : [];
      setYears(yrs);
    }).catch(() => setYears([]));
  }, []);

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
        <View style={[styles.periodBar, { backgroundColor: theme.surface }]}>
          <TouchableOpacity onPress={() => setShowYearPicker(true)} style={[styles.periodChip, { backgroundColor: 
theme.primaryLight }]}>
            <Ionicons name="calendar-outline" size={14} color={theme.primary} />
            <Text style={[styles.periodChipText, { color: theme.primary }]}>{selectedYear === 'all' ? 'All Years' : 
selectedYear}</Text>
          </TouchableOpacity>
          {selectedYear !== 'all' && (
            <>
              {!selectedQuarter && (
                <View style={styles.periodChips}>
                  <TouchableOpacity style={[styles.periodChip2, selectedMonth === '' && { borderColor: theme.primary 
}]} onPress={() => { setSelectedMonth(''); setSelectedQuarter(''); }}>
                    <Text style={[styles.periodChipText2, { color: selectedMonth === '' ? theme.primary : 
theme.textSecondary }]}>All</Text>
                  </TouchableOpacity>
                  {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m, i) => (
                    <TouchableOpacity key={m} style={[styles.periodChip2, selectedMonth === String(i + 1) && { 
borderColor: theme.primary }]} onPress={() => { setSelectedMonth(String(i + 1)); setSelectedQuarter(''); }}>
                      <Text style={[styles.periodChipText2, { color: selectedMonth === String(i + 1) ? theme.primary : 
theme.textSecondary }]}>{m}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {!selectedMonth && (
                <View style={styles.periodChips}>
                  <TouchableOpacity style={[styles.periodChip2, selectedQuarter === '' && { borderColor: theme.primary 
}]} onPress={() => { setSelectedQuarter(''); setSelectedMonth(''); }}>
                    <Text style={[styles.periodChipText2, { color: selectedQuarter === '' ? theme.primary : 
theme.textSecondary }]}>All</Text>
                  </TouchableOpacity>
                  {[1, 2, 3, 4].map((q) => (
                    <TouchableOpacity key={q} style={[styles.periodChip2, selectedQuarter === String(q) && { 
borderColor: theme.primary }]} onPress={() => { setSelectedQuarter(String(q)); setSelectedMonth(''); }}>
                      <Text style={[styles.periodChipText2, { color: selectedQuarter === String(q) ? theme.primary : 
theme.textSecondary }]}>Q{q}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </>
          )}
        </View>

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
              <Text style={styles.balanceLabel}>Balance ┬╖ {periodLabel}</Text>
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
                  {formatCurrency(budgetInfo.spent)} of {formatCurrency(budgetInfo.budget)} ┬╖ 
{Math.round(budgetInfo.pct)}%
                </Text>
              </TouchableOpacity>
            )}

            <View style={[styles.overallCard, { backgroundColor: theme.surface }]}>
              <View style={styles.overallHeader}>
                <Text style={[styles.overallTitle, { color: theme.textSecondary }]}>Overall (All Time)</Text>
                <Text style={[styles.overallHint, { color: theme.textTertiary }]}>Not affected by filter</Text>
              </View>
              <View style={styles.overallRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.overallLabel, { color: theme.textTertiary }]}>Total Expense</Text>
                  <Text style={[styles.overallValue, { color: theme.text }]}>{formatCurrency(overall.expense)}</Text>
                </View>
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <Text style={[styles.overallLabel, { color: theme.textTertiary }]}>Total Income</Text>
                  <Text style={[styles.overallValue, { color: theme.text }]}>{formatCurrency(overall.income)}</Text>
                </View>
              </View>
            </View>

            <View style={styles.wealthRow}>
              <TouchableOpacity style={[styles.wealthCard, { backgroundColor: theme.surface }]} onPress={() => 
router.push('/net-worth')}>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Net Worth</Text>
                <Text style={[styles.wealthValue, { color: theme.income }]}>{formatCurrency(netWorth?.netWorth || 
0)}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.wealthCard, { backgroundColor: theme.surface }]} onPress={() => 
router.push('/assets')}>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Assets</Text>
                <Text style={[styles.wealthValue, { color: theme.primary }]}>{formatCurrency(netWorth?.totalAssets || 
0)}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.wealthCard, { backgroundColor: theme.surface }]} onPress={() => 
router.push('/investments')}>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Investments</Text>
                <Text style={[styles.wealthValue, { color: theme.primary 
}]}>{formatCurrency(netWorth?.breakdown?.investments || 0)}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.wealthCard, { backgroundColor: theme.surface }]} onPress={() => 
router.push('/investments')}>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>PF</Text>
                <Text style={[styles.wealthValue, { color: theme.warning }]}>{formatCurrency(netWorth?.totalPF || 
totalPF || 0)}</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.goalsCard, { backgroundColor: theme.surface }]}>
              <TouchableOpacity onPress={() => router.push('/goals')} style={{ flex: 1, flexDirection: 'row', 
alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={[styles.qlIcon, { backgroundColor: theme.primaryLight }]}>
                    <Ionicons name="flag-outline" size={18} color={theme.primary} />
                  </View>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>Goals</Text>
                </View>
                <Text style={[styles.bankBalance, { color: theme.text }]}>
                  {netWorth?.activeGoals || 0} active ┬╖ {Math.round(netWorth?.goalProgress || 0)}% avg
                </Text>
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
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.bankName, { color: theme.text }]} numberOfLines={1}>{acc.bankName}</Text>
                      <Text style={[styles.bankSub, { color: theme.textTertiary }]} numberOfLines={1}>
                        {acc.name}{acc.accountNumber ? ` ┬╖ ${acc.accountNumber}` : ''}
                      </Text>
                    </View>
                    <Text style={[styles.bankBalance, { color: theme.text }]}>{formatCurrency(acc.balance)}</Text>
                  </View>
                ))}
                {cashBalance && (
                  <View style={styles.bankRow}>
                    <Text style={[styles.bankName, { color: theme.income }]} numberOfLines={1}>
                      Cash{cashBalance.notes ? ` ┬╖ ${cashBalance.notes}` : ''}
                    </Text>
                    <Text style={[styles.bankBalance, { color: theme.income 
}]}>{formatCurrency(cashBalance.amount)}</Text>
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

            <View style={styles.obligationsRow}>
              <TouchableOpacity style={[styles.wealthCard, { backgroundColor: theme.surface }]} onPress={() => 
router.push('/loans')}>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Loans</Text>
                <Text style={[styles.wealthValue, { color: theme.expense }]}>{formatCurrency(netWorth?.totalLoans || 
0)}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.wealthCard, { backgroundColor: theme.surface }]} onPress={() => 
router.push('/subscriptions')}>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Subscriptions</Text>
                <Text style={[styles.wealthValue, { color: theme.text }]}>{formatCurrency(netWorth?.subscriptionsTotal 
|| 0)}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.wealthCard, { backgroundColor: theme.surface }]} onPress={() => 
router.push('/insurance')}>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Insurance</Text>
                <Text style={[styles.wealthValue, { color: theme.text 
}]}>{formatCurrency(netWorth?.insurancePremiumTotal || 0)}</Text>
              </TouchableOpacity>
            </View>

            {healthScore !== null && (
              <View style={[styles.healthCard, { backgroundColor: theme.surface }]}>
                <View style={styles.healthHeader}>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>Financial Health</Text>
                  <View
                    style={[
                      styles.healthBadge,
                      {
                        backgroundColor:
                          healthScore >= 70 ? theme.incomeLight : healthScore >= 40 ? theme.warningLight : 
theme.expenseLight,
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
              <TouchableOpacity style={[styles.quickLinkCard, { backgroundColor: theme.surface }]} onPress={() => 
router.push('/health')}>
                <View style={[styles.qlIcon, { backgroundColor: theme.incomeLight }]}>
                  <Ionicons name="heart-outline" size={18} color={theme.income} />
                </View>
                <Text style={[styles.qlText, { color: theme.textSecondary }]}>Health</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.quickLinkCard, { backgroundColor: theme.surface }]} onPress={() => 
router.push('/what-if')}>
                <View style={[styles.qlIcon, { backgroundColor: theme.warningLight }]}>
                  <Ionicons name="trending-up-outline" size={18} color={theme.warning} />
                </View>
                <Text style={[styles.qlText, { color: theme.textSecondary }]}>What-If</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.quickLinkCard, { backgroundColor: theme.surface }]} onPress={() => 
router.push('/risk-profile')}>
                <View style={[styles.qlIcon, { backgroundColor: theme.primaryLight }]}>
                  <Ionicons name="shield-checkmark-outline" size={18} color={theme.primary} />
                </View>
                <Text style={[styles.qlText, { color: theme.textSecondary }]}>Risk</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.quickLinkCard, { backgroundColor: theme.surface }]} onPress={() => 
router.push('/deals')}>
                <View style={[styles.qlIcon, { backgroundColor: '#F3E8FF' }]}>
                  <Ionicons name="pricetag-outline" size={18} color="#8B5CF6" />
                </View>
                <Text style={[styles.qlText, { color: theme.textSecondary }]}>Deals</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.quickLinkCard, { backgroundColor: theme.surface }]} onPress={() => 
router.push('/expenses')}>
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

      <Modal
        visible={showYearPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowYearPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Select Year</Text>
              <TouchableOpacity onPress={() => setShowYearPicker(false)}>
                <Ionicons name="close" size={24} color={theme.textTertiary} />
              </TouchableOpacity>
            </View>
            <View style={styles.yearGrid}>
              <TouchableOpacity
                style={[styles.yearCell, selectedYear === 'all' && { backgroundColor: theme.primary }]}
                onPress={() => { setSelectedYear('all'); setSelectedMonth(''); setSelectedQuarter(''); 
setShowYearPicker(false); }}
              >
                <Text style={[styles.yearCellText, { color: selectedYear === 'all' ? '#fff' : theme.text }]}>All 
Years</Text>
              </TouchableOpacity>
              {years.map((y) => (
                <TouchableOpacity
                  key={y}
                  style={[styles.yearCell, selectedYear === String(y) && { backgroundColor: theme.primary }]}
                  onPress={() => { setSelectedYear(String(y)); setSelectedMonth(''); setSelectedQuarter(''); 
setShowYearPicker(false); }}
                >
                  <Text style={[styles.yearCellText, { color: selectedYear === String(y) ? '#fff' : theme.text 
}]}>{y}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
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
  periodBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 14,
    marginBottom: 16,
  },
  periodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  periodChipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  periodChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  periodChip2: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  periodChipText2: {
    fontSize: 12,
    fontWeight: '600',
  },
  overallCard: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  overallHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  overallTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  overallHint: {
    fontSize: 10,
  },
  overallRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  overallLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },
  overallValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  obligationsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  goalsCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  bankSub: {
    fontSize: 10,
    marginTop: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  yearGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  yearCell: {
    width: '30%',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  yearCellText: {
    fontSize: 14,
    fontWeight: '600',
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


