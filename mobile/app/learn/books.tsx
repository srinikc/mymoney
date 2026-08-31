import { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
  ActivityIndicator,
  Linking,
  Modal,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { Colors } from '../../constants/Colors';
import api from '../../api/client';

interface Book {
  id: string;
  title: string;
  author: string;
  yearPublished: number;
  pages: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  category: string;
  rating: number;
  description: string;
  keyTakeaway: string;
  amazonLink: string;
  ageRecommendation: string;
}

interface BooksResponse {
  total: number;
  results: Book[];
}

const CATEGORY_LABELS: Record<string, string> = {
  'general': 'General',
  'investing': 'Investing',
  'mindset': 'Mindset',
  'retirement': 'Retirement',
};

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: '#10B981',
  intermediate: '#F59E0B',
  advanced: '#EF4444',
};

export default function BooksScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<BooksResponse | null>(null);
  const [category, setCategory] = useState('all');
  const [activeBook, setActiveBook] = useState<Book | null>(null);

  useEffect(() => {
    void load();
  }, [category]);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (category !== 'all') params.set('category', category);
      const res = await api.get<BooksResponse>(`/api/books?${params}`);
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
        <Stack.Screen options={{ title: 'Books', headerStyle: { backgroundColor: theme.card } }} />
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <Stack.Screen
        options={{
          title: 'Books',
          headerStyle: { backgroundColor: theme.card },
          headerTintColor: theme.text,
        }}
      />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 60 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={theme.primary} />}
      >
        <View style={{ padding: 16 }}>
          <View style={[styles.hero, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Ionicons name="book" size={20} color={theme.primary} />
            <Text style={{ color: theme.text, fontSize: 14, fontWeight: '600', marginLeft: 8, flex: 1 }}>
              Top 10 Indian Finance Books
            </Text>
          </View>
          <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 8, lineHeight: 18 }}>
            Start with one beginner book. Finish it. Apply one idea. Then move to the next. Total reading time: ~60 hours.
          </Text>
        </View>

        <View style={styles.chipRow}>
          <CategoryChip label="All" active={category === 'all'} onPress={() => setCategory('all')} theme={theme} />
          {Object.keys(CATEGORY_LABELS).map((k) => (
            <CategoryChip key={k} label={CATEGORY_LABELS[k]} active={category === k} onPress={() => setCategory(k)} theme={theme} />
          ))}
        </View>

        {data?.results.map((b) => (
          <TouchableOpacity
            key={b.id}
            onPress={() => setActiveBook(b)}
            style={[styles.bookCard, { backgroundColor: theme.card, borderColor: theme.border }]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
              <View style={[styles.iconBox, { backgroundColor: theme.primaryLight }]}>
                <Ionicons name="book-outline" size={18} color={theme.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.text, fontSize: 14, fontWeight: '600' }} numberOfLines={2}>
                  {b.title}
                </Text>
                <Text style={{ color: theme.textTertiary, fontSize: 11, marginTop: 2 }}>
                  by {b.author}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                  <Text style={{ color: '#F59E0B', fontSize: 12 }}>★</Text>
                  <Text style={{ color: theme.textTertiary, fontSize: 11 }}>{b.rating}/5</Text>
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                  <View style={[styles.tag, { backgroundColor: theme.primaryLight }]}>
                    <Text style={{ color: theme.primary, fontSize: 9, fontWeight: '600', textTransform: 'capitalize' }}>{CATEGORY_LABELS[b.category] || b.category}</Text>
                  </View>
                  <View style={[styles.tag, { backgroundColor: DIFFICULTY_COLORS[b.difficulty] + '20' }]}>
                    <Text style={{ color: DIFFICULTY_COLORS[b.difficulty], fontSize: 9, fontWeight: '600', textTransform: 'capitalize' }}>{b.difficulty}</Text>
                  </View>
                  <Text style={{ color: theme.textTertiary, fontSize: 10, alignSelf: 'center' }}>
                    {b.yearPublished} · {b.pages}p
                  </Text>
                </View>
                <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 6, lineHeight: 17 }} numberOfLines={3}>
                  {b.description}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Modal visible={!!activeBook} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setActiveBook(null)}>
        {activeBook && (
          <View style={{ flex: 1, backgroundColor: theme.background }}>
            <View style={[styles.modalHeader, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
              <TouchableOpacity onPress={() => setActiveBook(null)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
              <Text style={{ flex: 1, marginLeft: 8, fontSize: 15, fontWeight: '600', color: theme.text }} numberOfLines={2}>
                {activeBook.title}
              </Text>
            </View>
            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
              <Text style={{ color: theme.text, fontSize: 14, fontWeight: '500' }}>by {activeBook.author}</Text>
              <Text style={{ color: theme.textTertiary, fontSize: 12, marginTop: 4 }}>
                {activeBook.yearPublished} · {activeBook.pages} pages · {activeBook.difficulty}
              </Text>
              <Text style={{ color: '#F59E0B', fontSize: 14, marginTop: 8 }}>
                {"★".repeat(Math.round(activeBook.rating))} {activeBook.rating}/5
              </Text>
              <Text style={{ color: theme.text, fontSize: 14, marginTop: 12, lineHeight: 22 }}>
                {activeBook.description}
              </Text>

              <View style={[styles.takeawayCard, { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }]}>
                <Ionicons name="bulb-outline" size={16} color="#92400E" />
                <Text style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={{ color: '#92400E', fontSize: 12, fontWeight: '700' }}>Key takeaway{'\n'}</Text>
                  <Text style={{ color: '#92400E', fontSize: 13, lineHeight: 19 }}>{activeBook.keyTakeaway}</Text>
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => Linking.openURL(activeBook.amazonLink)}
                style={[styles.amazonBtn, { backgroundColor: theme.primary }]}
              >
                <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>Buy on Amazon</Text>
                <Ionicons name="open-outline" size={16} color="#fff" style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            </ScrollView>
          </View>
        )}
      </Modal>
    </View>
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

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 16, marginBottom: 8 },
  bookCard: { padding: 12, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, marginBottom: 10, marginHorizontal: 16 },
  iconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  tag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  takeawayCard: { flexDirection: 'row', alignItems: 'flex-start', padding: 12, borderRadius: 10, borderWidth: 1, marginTop: 16 },
  amazonBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 10, marginTop: 16 },
});
