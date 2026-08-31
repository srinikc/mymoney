import { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  useColorScheme,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { Colors } from '../../constants/Colors';
import api from '../../api/client';

interface Commodity {
  symbol: string;
  ticker: string;
  name: string;
  category: 'gold' | 'silver' | 'broad-etf' | 'sector-etf' | 'debt-etf' | 'international-etf';
  unit: string;
  pricePerUnit: number;
  pricePerGram?: number;
  changePct: number;
  changeAbsolute: number;
  lastUpdated: string;
  aumCr?: number;
  expenseRatio: number;
  description: string;
  history30d: number[];
}

interface CommoditiesResponse {
  summary: { total: number; gainers: number; losers: number; unchanged: number };
  results: Commodity[];
}

const CATEGORY_ICONS: Record<string, any> = {
  'gold': 'diamond',
  'silver': 'ellipse',
  'broad-etf': 'layers',
  'sector-etf': 'bar-chart',
  'international-etf': 'globe',
  'debt-etf': 'cash',
};

const CATEGORY_LABELS: Record<string, string> = {
  'gold': 'Gold',
  'silver': 'Silver',
  'broad-etf': 'Broad',
  'sector-etf': 'Sector',
  'international-etf': 'International',
  'debt-etf': 'Debt',
};

export default function CommoditiesScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const router = useRouter();

  const [tab, setTab] = useState<'prices' | 'calc'>('prices');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<CommoditiesResponse | null>(null);
  const [category, setCategory] = useState('all');
  const [quantity, setQuantity] = useState('10');
  const [unit, setUnit] = useState<'grams' | 'kg' | 'units'>('grams');

  useEffect(() => {
    void load();
  }, [category]);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (category !== 'all') params.set('category', category);
      const res = await api.get<CommoditiesResponse>(`/api/commodities?${params}`);
      setData(res.data);
    } catch (e) {
      // noop
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  if (loading && !data) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }}>
        <Stack.Screen options={{ title: 'Commodities', headerStyle: { backgroundColor: theme.card } }} />
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <Stack.Screen
        options={{
          title: 'Commodities & ETFs',
          headerStyle: { backgroundColor: theme.card },
          headerTintColor: theme.text,
        }}
      />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 60 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={theme.primary} />}
      >
        <View style={styles.tabBar}>
          <TabButton active={tab === 'prices'} label="Live Prices" onPress={() => setTab('prices')} color={theme.primary} />
          <TabButton active={tab === 'calc'} label="Value Calc" onPress={() => setTab('calc')} color={theme.primary} />
        </View>

        {tab === 'prices' && (
          <View style={{ padding: 16 }}>
            <View style={styles.chipRow}>
              <CategoryChip label="All" active={category === 'all'} onPress={() => setCategory('all')} theme={theme} />
              {Object.keys(CATEGORY_LABELS).map((k) => (
                <CategoryChip key={k} label={CATEGORY_LABELS[k]} active={category === k} onPress={() => setCategory(k)} theme={theme} />
              ))}
            </View>

            {data && (
              <View style={styles.statRow}>
                <MiniStat label="Tracked" value={String(data.summary.total)} color={theme.primary} theme={theme} />
                <MiniStat label="Gainers" value={String(data.summary.gainers)} color="#10B981" theme={theme} />
                <MiniStat label="Losers" value={String(data.summary.losers)} color="#EF4444" theme={theme} />
              </View>
            )}

            {data?.results.map((c) => (
              <CommodityCard key={c.symbol} commodity={c} theme={theme} />
            ))}
          </View>
        )}

        {tab === 'calc' && (
          <View style={{ padding: 16 }}>
            <View style={[styles.calcCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={{ color: theme.text, fontSize: 14, fontWeight: '600', marginBottom: 8 }}>What is your holding worth?</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.textTertiary, fontSize: 11, marginBottom: 4 }}>Quantity</Text>
                  <TextInput
                    value={quantity}
                    onChangeText={setQuantity}
                    keyboardType="numeric"
                    style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.textTertiary, fontSize: 11, marginBottom: 4 }}>Unit</Text>
                  <View style={{ flexDirection: 'row', gap: 4 }}>
                    {(['grams', 'kg', 'units'] as const).map((u) => (
                      <TouchableOpacity
                        key={u}
                        onPress={() => setUnit(u)}
                        style={{
                          flex: 1,
                          paddingVertical: 8,
                          borderRadius: 6,
                          backgroundColor: unit === u ? theme.primary : theme.background,
                          borderWidth: 1,
                          borderColor: theme.border,
                          alignItems: 'center',
                        }}
                      >
                        <Text style={{ fontSize: 11, color: unit === u ? '#fff' : theme.text, fontWeight: '500' }}>{u}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            </View>

            {data?.results
              .filter((c) => {
                if (unit === 'units') return c.category.includes('etf');
                return c.pricePerGram != null;
              })
              .map((c) => {
                const qty = Number(quantity);
                let value = 0;
                if (unit === 'grams' && c.pricePerGram) value = qty * c.pricePerGram;
                else if (unit === 'kg' && c.pricePerGram) value = qty * 1000 * c.pricePerGram;
                else if (unit === 'units') value = qty * c.pricePerUnit;
                return (
                  <View key={c.symbol} style={[styles.calcResult, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: theme.text, fontSize: 14, fontWeight: '600' }}>{c.ticker}</Text>
                      <Text style={{ color: theme.textTertiary, fontSize: 11 }}>
                        {quantity} {unit} × ₹{(c.pricePerGram || c.pricePerUnit).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </Text>
                    </View>
                    <Text style={{ color: theme.primary, fontSize: 16, fontWeight: '700' }}>
                      ₹{Math.round(value).toLocaleString('en-IN')}
                    </Text>
                  </View>
                );
              })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function TabButton({ active, label, onPress, color }: { active: boolean; label: string; onPress: () => void; color: string }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 8,
        backgroundColor: active ? color : 'transparent',
      }}
    >
      <Text style={{ fontSize: 13, fontWeight: '600', color: active ? '#fff' : color }}>{label}</Text>
    </TouchableOpacity>
  );
}

function CategoryChip({ label, active, onPress, theme }: { label: string; active: boolean; onPress: () => void; theme: any }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 14,
        backgroundColor: active ? theme.primary : theme.card,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: active ? theme.primary : theme.border,
      }}
    >
      <Text style={{ fontSize: 12, color: active ? '#fff' : theme.text, fontWeight: '500' }}>{label}</Text>
    </TouchableOpacity>
  );
}

function MiniStat({ label, value, color, theme }: { label: string; value: string; color: string; theme: any }) {
  return (
    <View style={[styles.miniStat, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Text style={{ color: theme.textTertiary, fontSize: 11, fontWeight: '600' }}>{label}</Text>
      <Text style={{ color, fontSize: 18, fontWeight: '700' }}>{value}</Text>
    </View>
  );
}

function CommodityCard({ commodity: c, theme }: { commodity: Commodity; theme: any }) {
  const positive = c.changePct > 0;
  const negative = c.changePct < 0;
  const changeColor = positive ? '#10B981' : negative ? '#EF4444' : theme.textTertiary;
  const Icon = CATEGORY_ICONS[c.category] || 'ellipse';

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
        <View style={[styles.iconBox, { backgroundColor: theme.primaryLight }]}>
          <Ionicons name={Icon as any} size={18} color={theme.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.text, fontSize: 14, fontWeight: '600' }} numberOfLines={1}>{c.ticker}</Text>
              <Text style={{ color: theme.textTertiary, fontSize: 11, marginTop: 1 }} numberOfLines={1}>{c.name}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ color: theme.text, fontSize: 15, fontWeight: '700' }}>
                ₹{c.pricePerUnit.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </Text>
              <Text style={{ color: changeColor, fontSize: 11, fontWeight: '600' }}>
                {c.changePct >= 0 ? '+' : ''}{c.changePct.toFixed(2)}%
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
            <Text style={{ color: theme.textTertiary, fontSize: 10 }}>{c.unit}</Text>
            {c.expenseRatio > 0 && <Text style={{ color: theme.textTertiary, fontSize: 10 }}>· Exp {c.expenseRatio}%</Text>}
            {c.aumCr && <Text style={{ color: theme.textTertiary, fontSize: 10 }}>· AUM ₹{c.aumCr.toLocaleString('en-IN')}Cr</Text>}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: { flexDirection: 'row', gap: 4, margin: 16, marginBottom: 8, backgroundColor: 'rgba(0,0,0,0.04)', borderRadius: 10, padding: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  statRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  miniStat: { flex: 1, padding: 10, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center' },
  card: { padding: 12, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, marginBottom: 10 },
  iconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  calcCard: { padding: 14, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, marginBottom: 12 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14 },
  calcResult: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, marginBottom: 8 },
});
