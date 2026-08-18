import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, useColorScheme, RefreshControl, ActivityIndicator, TextInput, Alert, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { formatCurrency, formatDate } from '../../utils/format';
import api from '../../api/client';

interface UnmappedVendor {
  key: string;
  count: number;
  totalAmount: number;
}

interface VendorItem {
  id: number;
  vendorKey: string;
  description?: string;
  category?: string;
  subCategory?: string;
  person?: string;
  source?: string;
  updatedAt?: string;
}

interface CatItem {
  id?: number;
  name: string;
  color?: string;
}

interface DistinctValues {
  subCategories: string[];
  persons: string[];
}

type Tab = 'unmapped' | 'mappings';

export default function VendorsScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const router = useRouter();

  const [tab, setTab] = useState<Tab>('unmapped');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Unmapped
  const [unmapped, setUnmapped] = useState<UnmappedVendor[]>([]);
  const [totalUnmapped, setTotalUnmapped] = useState(0);
  const [unmappedPage, setUnmappedPage] = useState(1);
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const [assignments, setAssignments] = useState<Record<string, { categoryId?: string; subCategory?: string; person?: string }>>({});

  // Mappings
  const [mappings, setMappings] = useState<VendorItem[]>([]);
  const [totalMappings, setTotalMappings] = useState(0);
  const [mappingsPage, setMappingsPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [selectAllMode, setSelectAllMode] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const PAGE_SIZE = 50;

  // Pickers
  const [categories, setCategories] = useState<CatItem[]>([]);
  const [distinctValues, setDistinctValues] = useState<DistinctValues>({ subCategories: [], persons: [] });

  // Edit modal
  const [editModal, setEditModal] = useState(false);
  const [editMapping, setEditMapping] = useState<VendorItem | null>(null);
  const [editCategory, setEditCategory] = useState('');
  const [editSubCategory, setEditSubCategory] = useState('');
  const [editPerson, setEditPerson] = useState('');

  const [saveLoading, setSaveLoading] = useState(false);
  const [applying, setApplying] = useState(false);

  const fetchUnmapped = useCallback(async (page = 1, append = false, term = '') => {
    try {
      const params: Record<string, string | number> = { page, pageSize: PAGE_SIZE };
      if (term) params.search = term;
      const res = await api.get('/api/vendors/unmapped', { params });
      const list = res.data?.merchants || res.data?.unmapped || [];
      setTotalUnmapped(res.data?.total || list.length);
      setUnmappedPage(page);
      setUnmapped((prev) => (append ? [...prev, ...list.map((m: { key: string; count?: number; total?: number }) => ({ key: m.key, count: m.count || 0, totalAmount: m.total || 0 }))] : list.map((m: { key: string; count?: number; total?: number }) => ({ key: m.key, count: m.count || 0, totalAmount: m.total || 0 }))));
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, []);

  const fetchMappings = useCallback(async (page = 1, append = false, term = search) => {
    try {
      const params: Record<string, string | number> = { page, pageSize: PAGE_SIZE };
      if (term) params.search = term;
      const res = await api.get('/api/vendors/all', { params });
      const items = res.data?.vendors || [];
      setTotalMappings(res.data?.total || items.length);
      setMappingsPage(page);
      const mapped = items.map((m: { id: number; vendorKey: string; description?: string; category?: string; subCategory?: string; person?: string; source?: string; sourceLabel?: string; updatedAt?: string }) => ({
        id: m.id,
        vendorKey: m.vendorKey,
        description: m.description,
        category: m.category,
        subCategory: m.subCategory,
        person: m.person,
        source: m.sourceLabel || m.source,
        updatedAt: m.updatedAt,
      }));
      setMappings((prev) => (append ? [...prev, ...mapped] : mapped));
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [search]);

  const fetchPickers = useCallback(async () => {
    try {
      const catRes = await api.get('/api/categories');
      setCategories(Array.isArray(catRes.data) ? catRes.data : []);
      const expRes = await api.get('/api/expenses', { params: { pageSize: '1' } }).catch(() => ({ data: {} }));
      setDistinctValues({
        subCategories: expRes.data?.distinctSubCategories || [],
        persons: expRes.data?.distinctPersons || [],
      });
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchPickers();
  }, [fetchPickers]);

  useEffect(() => {
    setLoading(true);
    if (tab === 'unmapped') {
      fetchUnmapped(1, false, search);
    } else {
      fetchMappings(1, false, search);
    }
  }, [tab, fetchUnmapped, fetchMappings]);

  // Debounced search (reset to page 1 on change) for whichever tab is active.
  useEffect(() => {
    const t = setTimeout(() => {
      if (tab === 'unmapped') {
        setUnmappedPage(1);
        fetchUnmapped(1, false, search);
      } else {
        setMappingsPage(1);
        fetchMappings(1, false, search);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [search, tab, fetchUnmapped, fetchMappings]);

  const toggleExpand = (key: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleAssignChange = (key: string, field: string, value: string) => {
    setAssignments((prev) => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
  };

  const handleSaveAll = async () => {
    const entries = Object.entries(assignments).filter(([, v]) => v.categoryId || v.subCategory || v.person);
    if (entries.length === 0) {
      Alert.alert('Info', 'No assignments to save');
      return;
    }
    setSaveLoading(true);
    try {
      await api.post('/api/vendors/batch', {
        mappings: entries.map(([key, val]) => ({
          merchantKey: key,
          expenseType: val.categoryId || '',
          subCategory: val.subCategory || '',
          person: val.person || '',
        })),
      });
      setAssignments({});
      setExpandedKeys(new Set());
      fetchUnmapped(1, false, search);
      Alert.alert('Success', `${entries.length} mapping(s) saved`);
    } catch {
      Alert.alert('Error', 'Failed to save assignments');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleApplyMappings = async () => {
    setApplying(true);
    try {
      await api.post('/api/vendors/apply-mappings');
      Alert.alert('Update Expense Page', 'Vendor mappings applied to existing expenses.');
    } catch {
      Alert.alert('Error', 'Failed to apply mappings');
    } finally {
      setApplying(false);
    }
  };

  const handleDismiss = async (keys: string[]) => {
    if (keys.length === 0) return;
    setSaveLoading(true);
    try {
      await api.delete('/api/vendors/batch', { data: { keys } });
      setUnmapped((prev) => prev.filter((u) => !keys.includes(u.key)));
    } catch {
      Alert.alert('Error', 'Failed to dismiss');
    } finally {
      setSaveLoading(false);
    }
  };

  const openEditModal = (mapping: VendorItem) => {
    setEditMapping(mapping);
    setEditCategory(mapping.category || '');
    setEditSubCategory(mapping.subCategory || '');
    setEditPerson(mapping.person || '');
    setEditModal(true);
  };

  const handleEditMapping = async () => {
    if (!editMapping) return;
    setSaveLoading(true);
    try {
      await api.put(`/api/vendors/${editMapping.id}`, {
        expenseType: editCategory,
        subCategory: editSubCategory,
        person: editPerson,
      });
      setEditModal(false);
      setEditMapping(null);
      fetchMappings();
    } catch {
      Alert.alert('Error', 'Failed to update mapping');
    } finally {
      setSaveLoading(false);
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectAllMode) {
      setSelectAllMode(false);
      setSelectedIds(new Set());
    } else {
      setSelectAllMode(true);
      setSelectedIds(new Set(filteredMappings.map((m) => m.id)));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    Alert.alert('Delete vendors', `Permanently delete ${selectedIds.size} vendor mapping(s)?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          setSaveLoading(true);
          try {
            const res = await api.post('/api/vendors/bulk-delete', { ids: [...selectedIds] });
            Alert.alert('Done', `Deleted ${res.data?.count ?? 0} vendor mapping(s)`);
            setSelectedIds(new Set());
            setSelectAllMode(false);
            fetchMappings();
          } catch {
            Alert.alert('Error', 'Delete failed');
          } finally {
            setSaveLoading(false);
          }
        },
      },
    ]);
  };

  const handleDeleteAll = () => {
    if (mappings.length === 0) return;
    Alert.alert('Delete all vendors', 'Permanently delete ALL vendor mappings for your account?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete All', style: 'destructive',
        onPress: async () => {
          setSaveLoading(true);
          try {
            const res = await api.post('/api/vendors/bulk-delete', { scope: 'all' });
            Alert.alert('Done', `Deleted ${res.data?.count ?? 0} vendor mapping(s)`);
            setSelectedIds(new Set());
            setSelectAllMode(false);
            fetchMappings();
          } catch {
            Alert.alert('Error', 'Delete failed');
          } finally {
            setSaveLoading(false);
          }
        },
      },
    ]);
  };

  // Search is server-side now (both tabs); the list already reflects it.
  const filteredMappings = mappings;

  const renderUnmapped = ({ item }: { item: UnmappedVendor }) => {
    const key = item.key;
    const expanded = expandedKeys.has(key);
    const assign = assignments[key] || {};
    return (
      <View style={[styles.card, { backgroundColor: theme.surface }]}>
        <TouchableOpacity onPress={() => toggleExpand(key)} style={styles.unmappedHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>{key}</Text>
            <Text style={[styles.cardSubtext, { color: theme.textTertiary }]}>
              {item.count || 0} expense(s) · {formatCurrency(item.totalAmount || 0)}
            </Text>
          </View>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={theme.textTertiary} />
        </TouchableOpacity>
        {expanded && (
          <View style={styles.assignSection}>
            <Text style={[styles.assignLabel, { color: theme.textSecondary }]}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerScroll}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id || cat.name}
                  onPress={() => handleAssignChange(key, 'categoryId', String(cat.id || cat.name))}
                  style={[styles.pickerBtn, { backgroundColor: assign.categoryId === String(cat.id || cat.name) ? theme.primary : theme.background }]}
                >
                  <Text style={{ color: assign.categoryId === String(cat.id || cat.name) ? '#fff' : theme.text, fontSize: 12, fontWeight: '500' }}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={[styles.assignLabel, { color: theme.textSecondary }]}>Sub-Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerScroll}>
              {distinctValues.subCategories.map((v: string) => (
                <TouchableOpacity
                  key={v}
                  onPress={() => handleAssignChange(key, 'subCategory', v)}
                  style={[styles.pickerBtn, { backgroundColor: assign.subCategory === v ? theme.primary : theme.background }]}
                >
                  <Text style={{ color: assign.subCategory === v ? '#fff' : theme.text, fontSize: 12, fontWeight: '500' }}>{v}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={[styles.assignLabel, { color: theme.textSecondary }]}>Person</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerScroll}>
              {distinctValues.persons.map((v: string) => (
                <TouchableOpacity
                  key={v}
                  onPress={() => handleAssignChange(key, 'person', v)}
                  style={[styles.pickerBtn, { backgroundColor: assign.person === v ? theme.primary : theme.background }]}
                >
                  <Text style={{ color: assign.person === v ? '#fff' : theme.text, fontSize: 12, fontWeight: '500' }}>{v}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              onPress={() => handleDismiss([key])}
              style={[styles.dismissBtn, { borderColor: theme.border }]}
            >
              <Text style={{ color: theme.textTertiary, fontSize: 12, fontWeight: '500' }}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const renderMapping = ({ item }: { item: VendorItem }) => {
    const selected = selectedIds.has(item.id);
    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: theme.surface }]}
        onPress={() => openEditModal(item)}
        activeOpacity={0.7}
      >
        <View style={styles.mappingRow}>
          <TouchableOpacity onPress={() => toggleSelect(item.id)} style={{ padding: 2 }}>
            <Ionicons
              name={selected ? 'checkbox' : 'square-outline'}
              size={20}
              color={selected ? theme.primary : theme.textTertiary}
            />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>{item.description || item.vendorKey}</Text>
            {item.description ? <Text style={[styles.cardSubtext, { color: theme.textTertiary }]}>{item.vendorKey}</Text> : null}
            <View style={styles.mappingTags}>
              {item.category && (
                <View style={[styles.tag, { backgroundColor: theme.primaryLight }]}>
                  <Text style={[styles.tagText, { color: theme.primary }]}>{item.category}</Text>
                </View>
              )}
              {item.subCategory && (
                <View style={[styles.tag, { backgroundColor: theme.background }]}>
                  <Text style={[styles.tagText, { color: theme.textSecondary }]}>{item.subCategory}</Text>
                </View>
              )}
              {item.person && (
                <View style={[styles.tag, { backgroundColor: theme.background }]}>
                  <Text style={[styles.tagText, { color: theme.textSecondary }]}>{item.person}</Text>
                </View>
              )}
            </View>
          </View>
          <Text style={[styles.mappingSource, { color: theme.textTertiary }]}>{item.source || ''}</Text>
        </View>
        {item.updatedAt && <Text style={[styles.cardSubtext, { color: theme.textTertiary, marginTop: 4 }]}>Updated {formatDate(item.updatedAt)}</Text>}
      </TouchableOpacity>
    );
  };

  const hasAssignments = Object.keys(assignments).length > 0;

  const loadMoreUnmapped = () => {
    if (loadingMore || unmapped.length >= totalUnmapped) return;
    setLoadingMore(true);
    fetchUnmapped(unmappedPage + 1, true, search);
  };

  const loadMoreMappings = () => {
    if (loadingMore || mappings.length >= totalMappings) return;
    setLoadingMore(true);
    fetchMappings(mappingsPage + 1, true, search);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Vendors</Text>
      </View>

      <View style={styles.tabRow}>
        {[{ key: 'unmapped', label: 'Unmapped' }, { key: 'mappings', label: 'All Mappings' }].map((t) => (
          <TouchableOpacity
            key={t.key}
            onPress={() => { setTab(t.key as Tab); setSearch(''); }}
            style={[styles.tab, { backgroundColor: tab === t.key ? theme.primary : theme.surface, borderColor: tab === t.key ? theme.primary : theme.border }]}
          >
            <Text style={{ color: tab === t.key ? '#fff' : theme.text, fontSize: 13, fontWeight: '600' }}>
              {t.label}
              {tab === 'unmapped' && totalUnmapped > 0 ? ` (${totalUnmapped})` : ''}
              {tab === 'mappings' && totalMappings > 0 ? ` (${totalMappings})` : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={[styles.searchRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Ionicons name="search" size={18} color={theme.textTertiary} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          value={search}
          onChangeText={setSearch}
          placeholder="Search vendors..."
          placeholderTextColor={theme.textTertiary}
        />
      </View>

      <TouchableOpacity
        onPress={handleApplyMappings}
        disabled={applying}
        style={[styles.applyBtn, { backgroundColor: theme.primaryLight, borderColor: theme.primary }]}
      >
        {applying ? <ActivityIndicator size="small" color={theme.primary} /> : <Ionicons name="refresh" size={16} color={theme.primary} />}
        <Text style={[styles.applyBtnText, { color: theme.primary }]}>Update Expense Page</Text>
      </TouchableOpacity>

      {tab === 'unmapped' && hasAssignments && (
        <View style={[styles.batchBar, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <TouchableOpacity onPress={handleSaveAll} disabled={saveLoading} style={[styles.batchBtn, { backgroundColor: theme.primary }]}>
            {saveLoading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>Save All</Text>}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleDismiss(Object.keys(assignments))}
            disabled={saveLoading}
            style={[styles.batchBtn, { backgroundColor: theme.expenseLight }]}
          >
            <Text style={{ color: theme.expense, fontWeight: '600', fontSize: 13 }}>Dismiss Selected</Text>
          </TouchableOpacity>
        </View>
      )}

      {tab === 'mappings' && mappings.length > 0 && (
        <View style={[styles.batchBar, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <TouchableOpacity onPress={toggleSelectAll} style={[styles.batchBtn, { backgroundColor: theme.primaryLight }]}>
            <Text style={{ color: theme.primary, fontWeight: '600', fontSize: 13 }}>
              {selectAllMode ? 'Deselect All' : `Select All (${filteredMappings.length})`}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDeleteSelected} disabled={saveLoading || selectedIds.size === 0} style={[styles.batchBtn, { backgroundColor: theme.expenseLight }]}>
            <Text style={{ color: theme.expense, fontWeight: '600', fontSize: 13 }}>Delete ({selectedIds.size})</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDeleteAll} disabled={saveLoading} style={[styles.batchBtn, { backgroundColor: theme.expenseLight }]}>
            <Text style={{ color: theme.expense, fontWeight: '600', fontSize: 13 }}>Delete All</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={theme.primary} /></View>
      ) : tab === 'unmapped' ? (
        <FlatList
          data={unmapped}
          keyExtractor={(item) => item.key}
          renderItem={renderUnmapped}
          contentContainerStyle={[styles.listContent, unmapped.length === 0 && styles.listEmpty]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchUnmapped(1, false, search); }} tintColor={theme.primary} />}
          onEndReached={loadMoreUnmapped}
          onEndReachedThreshold={0.3}
          ListFooterComponent={loadingMore ? <ActivityIndicator style={{ padding: 16 }} color={theme.primary} /> : null}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="checkmark-circle" size={48} color={theme.income} />
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>All vendors mapped</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={filteredMappings}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderMapping}
          contentContainerStyle={[styles.listContent, filteredMappings.length === 0 && styles.listEmpty]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchMappings(1, false, search); }} tintColor={theme.primary} />}
          onEndReached={loadMoreMappings}
          onEndReachedThreshold={0.3}
          ListFooterComponent={loadingMore ? <ActivityIndicator style={{ padding: 16 }} color={theme.primary} /> : null}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="storefront-outline" size={48} color={theme.textTertiary} />
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No vendors found</Text>
            </View>
          }
        />
      )}

      <Modal visible={editModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Edit Mapping</Text>
            {editMapping && (
              <Text style={[styles.modalSubtitle, { color: theme.textTertiary }]}>{editMapping.vendorKey}</Text>
            )}
            <Text style={[styles.assignLabel, { color: theme.textSecondary }]}>Category</Text>
            <View style={styles.pickerGrid}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id || cat.name}
                  onPress={() => setEditCategory(cat.name)}
                  style={[styles.gridBtn, { backgroundColor: editCategory === cat.name ? theme.primary : theme.background }]}
                >
                  <Text style={{ color: editCategory === cat.name ? '#fff' : theme.text, fontSize: 12, fontWeight: '500' }}>{cat.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.assignLabel, { color: theme.textSecondary }]}>Sub-Category</Text>
            <View style={styles.pickerGrid}>
              {distinctValues.subCategories.map((v: string) => (
                <TouchableOpacity
                  key={v}
                  onPress={() => setEditSubCategory(v)}
                  style={[styles.gridBtn, { backgroundColor: editSubCategory === v ? theme.primary : theme.background }]}
                >
                  <Text style={{ color: editSubCategory === v ? '#fff' : theme.text, fontSize: 12, fontWeight: '500' }}>{v}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.assignLabel, { color: theme.textSecondary }]}>Person</Text>
            <View style={styles.pickerGrid}>
              {distinctValues.persons.map((v: string) => (
                <TouchableOpacity
                  key={v}
                  onPress={() => setEditPerson(v)}
                  style={[styles.gridBtn, { backgroundColor: editPerson === v ? theme.primary : theme.background }]}
                >
                  <Text style={{ color: editPerson === v ? '#fff' : theme.text, fontSize: 12, fontWeight: '500' }}>{v}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setEditModal(false)} style={[styles.cancelBtn, { borderColor: theme.border }]}>
                <Text style={{ color: theme.textSecondary, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleEditMapping} disabled={saveLoading} style={[styles.saveBtn, { backgroundColor: theme.primary }]}>
                {saveLoading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700' }}>Save</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: 12, padding: 4 },
  headerTitle: { fontSize: 22, fontWeight: '700', flex: 1 },
  tabRow: { flexDirection: 'row', gap: 8, marginHorizontal: 16, marginTop: 12, marginBottom: 8 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, paddingHorizontal: 12, height: 42, borderWidth: 1, marginHorizontal: 16, marginBottom: 8 },
  searchInput: { flex: 1, fontSize: 14, height: '100%' },
  applyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 10, borderWidth: 1, marginHorizontal: 16, marginBottom: 8, paddingVertical: 10 },
  applyBtnText: { fontSize: 14, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  batchBar: { flexDirection: 'row', gap: 8, marginHorizontal: 16, marginBottom: 8, padding: 8, borderRadius: 12, borderWidth: 1 },
  batchBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  listContent: { padding: 16, paddingBottom: 40 },
  listEmpty: { flex: 1 },
  card: { borderRadius: 14, padding: 14, marginBottom: 8 },
  cardTitle: { fontSize: 14, fontWeight: '600' },
  cardSubtext: { fontSize: 12, fontWeight: '500' },
  unmappedHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  assignSection: { marginTop: 12, gap: 8 },
  assignLabel: { fontSize: 12, fontWeight: '600' },
  pickerScroll: { flexDirection: 'row' },
  pickerBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginRight: 6, marginBottom: 4 },
  pickerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  gridBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  dismissBtn: { padding: 8, borderRadius: 8, borderWidth: 1, alignItems: 'center', marginTop: 4 },
  mappingRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  mappingTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  tag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  tagText: { fontSize: 10, fontWeight: '600' },
  mappingSource: { fontSize: 11, fontWeight: '500' },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, fontWeight: '500' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '90%' },
  modalTitle: { fontSize: 20, fontWeight: '700' },
  modalSubtitle: { fontSize: 14, marginBottom: 16 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  cancelBtn: { flex: 1, alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1 },
  saveBtn: { flex: 1, alignItems: 'center', padding: 14, borderRadius: 12 },
});
