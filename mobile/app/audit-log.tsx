import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, useColorScheme,
  RefreshControl, ActivityIndicator, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { Colors } from '../constants/Colors';
import { formatFullDate } from '../utils/format';
import api from '../api/client';

interface AuditEntry {
  id: number;
  profileId: number;
  action: string;
  entity: string;
  entityId: number | null;
  metadata: string | null;
  createdAt: string;
  profile: {
    id: number;
    name: string;
    userId: number;
    user: { id: number; email: string; name: string | null };
  };
}

const ACTIONS = ['', 'create', 'update', 'delete', 'view', 'export', 'import'];
const ENTITIES = ['', 'expense', 'budget', 'goal', 'investment', 'reminder', 'deal', 'asset', 'liability', 'profile', 'user'];

const ACTION_COLORS: Record<string, string> = {
  create: '#10B981',
  update: '#F59E0B',
  delete: '#EF4444',
  view: '#3B82F6',
  export: '#8B5CF6',
  import: '#8B5CF6',
};

const ACTION_LABELS: Record<string, string> = {
  '': 'All',
  create: 'Create',
  update: 'Update',
  delete: 'Delete',
  view: 'View',
  export: 'Export',
  import: 'Import',
};

const ENTITY_LABELS: Record<string, string> = {
  '': 'All',
  expense: 'Expense',
  budget: 'Budget',
  goal: 'Goal',
  investment: 'Investment',
  reminder: 'Reminder',
  deal: 'Deal',
  asset: 'Asset',
  liability: 'Liability',
  profile: 'Profile',
  user: 'User',
};

export default function AuditLogScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const router = useRouter();

  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [showFilters, setShowFilters] = useState(false);
  const [showActionPicker, setShowActionPicker] = useState(false);
  const [showEntityPicker, setShowEntityPicker] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('pageSize', '50');
      if (actionFilter) params.set('action', actionFilter);
      if (entityFilter) params.set('entity', entityFilter);
      if (search) params.set('search', search);
      if (fromDate) params.set('dateFrom', fromDate);
      if (toDate) params.set('dateTo', toDate);

      const res = await api.get(`/api/admin/audit-log?${params.toString()}`);
      const data = res.data;
      setLogs(data.entries || data.logs || []);
      setTotalPages(data.pagination?.totalPages || data.totalPages || 1);
      setTotal(data.pagination?.total || data.total || 0);
    } catch (err: any) {
      if (err.response?.status === 403) setError('Access denied. Admin or manager role required.');
      else if (err.response?.status === 429) setError('Rate limit exceeded. Please wait a moment.');
      else setError('Failed to load audit log');
      setLogs([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, actionFilter, entityFilter, search, fromDate, toDate]);

  useEffect(() => { fetch(); }, [fetch]);

  const resetFilters = () => {
    setActionFilter('');
    setEntityFilter('');
    setSearch('');
    setFromDate('');
    setToDate('');
    setPage(1);
  };

  const applyFilters = () => {
    setPage(1);
    setShowFilters(false);
  };

  const getActionColor = (action: string) => ACTION_COLORS[action] || theme.textTertiary;

  const renderPicker = (
    visible: boolean,
    setVisible: (v: boolean) => void,
    value: string,
    options: string[],
    onChange: (v: string) => void,
    labelMap: Record<string, string>
  ) => {
    if (!visible) return null;
    return (
      <View style={[styles.pickerOverlay, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt}
            style={[styles.pickerItem, { backgroundColor: value === opt ? theme.primaryLight : 'transparent' }]}
            onPress={() => { onChange(opt); setVisible(false); }}
          >
            <Text style={[styles.pickerItemText, { color: value === opt ? theme.primary : theme.text }]}>
              {labelMap[opt] || opt || 'All'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderLogItem = ({ item }: { item: AuditEntry }) => {
    const d = new Date(item.createdAt);
    const timeStr = formatFullDate(item.createdAt) + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const actionColor = getActionColor(item.action);

    let metaDisplay = item.metadata || null;
    if (metaDisplay) {
      try { const parsed = JSON.parse(metaDisplay); metaDisplay = JSON.stringify(parsed); } catch {}
    }

    return (
      <View style={[styles.card, { backgroundColor: theme.surface }]}>
        <View style={styles.cardTop}>
          <View style={[styles.actionBadge, { backgroundColor: actionColor + '20' }]}>
            <Text style={[styles.actionBadgeText, { color: actionColor }]}>{item.action}</Text>
          </View>
          <Text style={[styles.entityText, { color: theme.text }]}>{item.entity}</Text>
          {item.entityId !== null && item.entityId !== undefined && (
            <Text style={[styles.entityIdText, { color: theme.textTertiary }]}>#{item.entityId}</Text>
          )}
        </View>
        <View style={styles.cardMiddle}>
          <Ionicons name="person-outline" size={14} color={theme.textTertiary} />
          <Text style={[styles.userText, { color: theme.textSecondary }]}>
            {item.profile?.user?.name || item.profile?.name || item.profile?.user?.email || `Profile #${item.profileId}`}
          </Text>
        </View>
        {metaDisplay && (
          <Text style={[styles.metaText, { color: theme.textTertiary }]} numberOfLines={2}>
            {metaDisplay}
          </Text>
        )}
        <Text style={[styles.timeText, { color: theme.textTertiary }]}>{timeStr}</Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Audit Log</Text>
          <Text style={[styles.headerSub, { color: theme.textSecondary }]}>Track all changes across the system</Text>
        </View>
        <TouchableOpacity onPress={() => setShowFilters(!showFilters)} style={[styles.filterToggle, { backgroundColor: showFilters || actionFilter || entityFilter || search || fromDate || toDate ? theme.primaryLight : 'transparent' }]}>
          <Ionicons name="filter" size={20} color={showFilters || actionFilter || entityFilter || search || fromDate || toDate ? theme.primary : theme.textTertiary} />
        </TouchableOpacity>
      </View>

      {showFilters && (
        <View style={[styles.filtersCard, { backgroundColor: theme.surface }]}>
          <View style={styles.filterRow}>
            <View style={styles.pickerWrapper}>
              <TouchableOpacity
                style={[styles.filterBtn, { borderColor: actionFilter ? theme.primary : theme.border }]}
                onPress={() => { setShowActionPicker(!showActionPicker); setShowEntityPicker(false); }}
              >
                <Text style={[styles.filterBtnText, { color: actionFilter ? theme.primary : theme.textSecondary }]}>
                  {ACTION_LABELS[actionFilter] || 'Action'}
                </Text>
                <Ionicons name="chevron-down" size={14} color={actionFilter ? theme.primary : theme.textTertiary} />
              </TouchableOpacity>
              {renderPicker(showActionPicker, setShowActionPicker, actionFilter, ACTIONS, setActionFilter, ACTION_LABELS)}
            </View>
            <View style={styles.pickerWrapper}>
              <TouchableOpacity
                style={[styles.filterBtn, { borderColor: entityFilter ? theme.primary : theme.border }]}
                onPress={() => { setShowEntityPicker(!showEntityPicker); setShowActionPicker(false); }}
              >
                <Text style={[styles.filterBtnText, { color: entityFilter ? theme.primary : theme.textSecondary }]}>
                  {ENTITY_LABELS[entityFilter] || 'Entity'}
                </Text>
                <Ionicons name="chevron-down" size={14} color={entityFilter ? theme.primary : theme.textTertiary} />
              </TouchableOpacity>
              {renderPicker(showEntityPicker, setShowEntityPicker, entityFilter, ENTITIES, setEntityFilter, ENTITY_LABELS)}
            </View>
          </View>

          <View style={styles.filterRow}>
            <TextInput
              style={[styles.searchInput, { borderColor: theme.border, color: theme.text }]}
              value={search}
              onChangeText={setSearch}
              placeholder="Search name or metadata..."
              placeholderTextColor={theme.textTertiary}
            />
          </View>

          <View style={styles.filterRow}>
            <TextInput
              style={[styles.dateInput, { borderColor: theme.border, color: theme.text }]}
              value={fromDate}
              onChangeText={setFromDate}
              placeholder="From (YYYY-MM-DD)"
              placeholderTextColor={theme.textTertiary}
            />
            <TextInput
              style={[styles.dateInput, { borderColor: theme.border, color: theme.text }]}
              value={toDate}
              onChangeText={setToDate}
              placeholder="To (YYYY-MM-DD)"
              placeholderTextColor={theme.textTertiary}
            />
          </View>

          <View style={styles.filterActions}>
            <TouchableOpacity onPress={resetFilters} style={styles.resetBtn}>
              <Text style={[styles.resetBtnText, { color: theme.textSecondary }]}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={applyFilters} style={[styles.applyBtn, { backgroundColor: theme.primary }]}>
              <Text style={styles.applyBtnText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={theme.primary} /></View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="shield" size={40} color={theme.expense} />
          <Text style={[styles.errorText, { color: theme.expense }]}>{error}</Text>
          <TouchableOpacity onPress={fetch} style={[styles.retryBtn, { backgroundColor: theme.primary }]}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderLogItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetch(); }} tintColor={theme.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="document-text-outline" size={48} color={theme.textTertiary} />
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No audit entries found</Text>
            </View>
          }
          ListFooterComponent={
            totalPages > 1 ? (
              <View style={styles.paginationRow}>
                <TouchableOpacity
                  style={[styles.pageBtn, { borderColor: theme.border }]}
                  onPress={() => setPage(1)}
                  disabled={page <= 1}
                >
                  <Text style={[styles.pageBtnText, { color: page <= 1 ? theme.textTertiary : theme.text }]}>First</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.pageBtn, { borderColor: theme.border }]}
                  onPress={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  <Ionicons name="chevron-back" size={16} color={page <= 1 ? theme.textTertiary : theme.text} />
                </TouchableOpacity>
                <Text style={[styles.pageInfo, { color: theme.textSecondary }]}>
                  Page {page} of {totalPages}
                </Text>
                <TouchableOpacity
                  style={[styles.pageBtn, { borderColor: theme.border }]}
                  onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  <Ionicons name="chevron-forward" size={16} color={page >= totalPages ? theme.textTertiary : theme.text} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.pageBtn, { borderColor: theme.border }]}
                  onPress={() => setPage(totalPages)}
                  disabled={page >= totalPages}
                >
                  <Text style={[styles.pageBtnText, { color: page >= totalPages ? theme.textTertiary : theme.text }]}>Last</Text>
                </TouchableOpacity>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: 12, padding: 4 },
  headerTitle: { fontSize: 22, fontWeight: '700' },
  headerSub: { fontSize: 13, marginTop: 2 },
  filterToggle: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  errorText: { fontSize: 14, fontWeight: '500' },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  retryBtnText: { color: '#FFFFFF', fontWeight: '600' },

  filtersCard: { marginHorizontal: 16, marginTop: 8, borderRadius: 14, padding: 14, gap: 10 },
  filterRow: { flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  filterBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  filterBtnText: { fontSize: 12, fontWeight: '600' },
  searchInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, fontSize: 12, flex: 1 },
  dateInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, fontSize: 12, flex: 1 },
  filterActions: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end' },
  resetBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  resetBtnText: { fontSize: 13, fontWeight: '600' },
  applyBtn: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 8 },
  applyBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },

  pickerWrapper: { position: 'relative', zIndex: 10 },
  pickerOverlay: { position: 'absolute', top: '100%', left: 0, zIndex: 100, borderWidth: 1, borderRadius: 10, padding: 4, width: 140, elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
  pickerItem: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 6 },
  pickerItemText: { fontSize: 13, fontWeight: '500', textTransform: 'capitalize' },

  listContent: { padding: 16, paddingTop: 8 },
  card: { borderRadius: 14, padding: 14, marginBottom: 8 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actionBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  actionBadgeText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  entityText: { fontSize: 13, fontWeight: '600' },
  entityIdText: { fontSize: 11, fontFamily: 'monospace' },
  cardMiddle: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  userText: { fontSize: 12, flex: 1 },
  metaText: { fontSize: 11, marginTop: 6, lineHeight: 16 },
  timeText: { fontSize: 10, marginTop: 8, fontFamily: 'monospace' },

  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, fontWeight: '500' },

  paginationRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  pageBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  pageBtnText: { fontSize: 12, fontWeight: '600' },
  pageInfo: { fontSize: 13, fontWeight: '500' },
});
