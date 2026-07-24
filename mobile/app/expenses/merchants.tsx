import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, useColorScheme, RefreshControl, ActivityIndicator, TextInput, Alert, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { formatCurrency, formatDate } from '../../utils/format';
import api from '../../api/client';

type Tab = 'unmapped' | 'mappings';

export default function MerchantsScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const router = useRouter();

  const [tab, setTab] = useState<Tab>('unmapped');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Unmapped
  const [unmapped, setUnmapped] = useState<any[]>([]);
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const [assignments, setAssignments] = useState<Record<string, any>>({});
  const [dismissedKeys, setDismissedKeys] = useState<Set<string>>(new Set());

  // Mappings
  const [mappings, setMappings] = useState<any[]>([]);
  const [mapPage, setMapPage] = useState(1);
  const [mapTotalPages, setMapTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  // Pickers
  const [categories, setCategories] = useState<any[]>([]);
  const [distinctValues, setDistinctValues] = useState<any>({ subCategories: [], persons: [] });

  // Edit modal
  const [editModal, setEditModal] = useState(false);
  const [editMapping, setEditMapping] = useState<any>(null);
  const [editCategory, setEditCategory] = useState('');
  const [editSubCategory, setEditSubCategory] = useState('');
  const [editPerson, setEditPerson] = useState('');

  const [saveLoading, setSaveLoading] = useState(false);

  const fetchUnmapped = useCallback(async () => {
    try {
      const res = await api.get('/api/merchants/unmapped');
      setUnmapped(res.data?.unmapped || res.data || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchMappings = useCallback(async (targetPage = 1, append = false) => {
    try {
      const params: any = { page: String(targetPage), pageSize: '50' };
      if (search) params.search = search;
      const res = await api.get('/api/merchants/mappings', { params });
      const d = res.data;
      const items = d.data || d.mappings || [];
      if (append) {
        setMappings((prev) => [...prev, ...items]);
      } else {
        setMappings(items);
      }
      setMapTotalPages(d.totalPages || 1);
      setMapPage(targetPage);
    } catch {
      // ignore
    } finally {
      setLoadingMore(false);
    }
  }, [search]);

  const fetchPickers = useCallback(async () => {
    try {
      const [catRes, valRes] = await Promise.all([
        api.get('/api/categories'),
        api.get('/api/merchants/distinct-values'),
      ]);
      setCategories(Array.isArray(catRes.data) ? catRes.data : []);
      const vals = valRes.data || {};
      setDistinctValues({
        subCategories: vals.subCategories || vals.subCategory || [],
        persons: vals.persons || vals.person || [],
      });
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchPickers();
  }, [fetchPickers]);

  useEffect(() => {
    if (tab === 'unmapped') {
      fetchUnmapped();
    } else {
      fetchMappings(1);
    }
  }, [tab, fetchUnmapped, fetchMappings]);

  const loadMore = () => {
    if (mapPage < mapTotalPages && !loadingMore) {
      setLoadingMore(true);
      fetchMappings(mapPage + 1, true);
    }
  };

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
    const entries = Object.entries(assignments).filter(([_, v]: any) => v.category);
    if (entries.length === 0) {
      Alert.alert('Info', 'No assignments to save');
      return;
    }
    setSaveLoading(true);
    try {
      await api.post('/api/merchants/assign', {
        assignments: entries.map(([key, val]: any) => ({ merchantKey: key, ...val })),
      });
      setAssignments({});
      setExpandedKeys(new Set());
      fetchUnmapped();
      Alert.alert('Success', `${entries.length} mapping(s) saved`);
    } catch {
      Alert.alert('Error', 'Failed to save assignments');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDismiss = async (keys: string[]) => {
    setSaveLoading(true);
    try {
      await api.post('/api/merchants/dismiss', { merchantKeys: keys });
      setUnmapped((prev) => prev.filter((u) => !keys.includes(u.merchantKey)));
    } catch {
      Alert.alert('Error', 'Failed to dismiss');
    } finally {
      setSaveLoading(false);
    }
  };

  const openEditModal = (mapping: any) => {
    setEditMapping(mapping);
    setEditCategory(mapping.category?.id || mapping.categoryId || '');
    setEditSubCategory(mapping.subCategory || '');
    setEditPerson(mapping.person || '');
    setEditModal(true);
  };

  const handleEditMapping = async () => {
    if (!editMapping) return;
    setSaveLoading(true);
    try {
      await api.put(`/api/merchants/mappings/${editMapping.id}`, {
        categoryId: editCategory,
        subCategory: editSubCategory,
        person: editPerson,
      });
      setEditModal(false);
      setEditMapping(null);
      fetchMappings(1);
    } catch {
      Alert.alert('Error', 'Failed to update mapping');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDeleteMapping = (mapping: any) => {
    Alert.alert('Delete Mapping', `Delete mapping for "${mapping.merchantKey}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/api/merchants/mappings/${mapping.id}`);
            setMappings((prev) => prev.filter((m) => m.id !== mapping.id));
          } catch {
            Alert.alert('Error', 'Failed to delete mapping');
          }
        },
      },
    ]);
  };

  const renderUnmapped = ({ item }: { item: any }) => {
    const key = item.merchantKey;
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
              {categories.map((cat: any) => (
                <TouchableOpacity
                  key={cat.id || cat.name}
                  onPress={() => handleAssignChange(key, 'categoryId', cat.id || cat.name)}
                  style={[styles.pickerBtn, { backgroundColor: assign.categoryId === (cat.id || cat.name) ? theme.primary : theme.background }]}
                >
                  <Text style={{ color: assign.categoryId === (cat.id || cat.name) ? '#fff' : theme.text, fontSize: 12, fontWeight: '500' }}>
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

  const renderMapping = ({ item }: { item: any }) => (
    <TouchableOpacity onPress={() => openEditModal(item)} onLongPress={() => handleDeleteMapping(item)} activeOpacity={0.7}>
      <View style={[styles.card, { backgroundColor: theme.surface }]}>
        <View style={styles.mappingRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>{item.merchantKey}</Text>
            {item.description ? <Text style={[styles.cardSubtext, { color: theme.textTertiary }]}>{item.description}</Text> : null}
            <View style={styles.mappingTags}>
              {item.category && (
                <View style={[styles.tag, { backgroundColor: theme.primaryLight }]}>
                  <Text style={[styles.tagText, { color: theme.primary }]}>{item.category.name || item.category}</Text>
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
      </View>
    </TouchableOpacity>
  );

  const unmappedKeys = unmapped.filter((u) => !dismissedKeys.has(u.merchantKey));
  const hasAssignments = Object.keys(assignments).length > 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Merchant Mapping</Text>
      </View>

      <View style={styles.tabRow}>
        {[{ key: 'unmapped', label: 'Unmapped' }, { key: 'mappings', label: 'All Mappings' }].map((t) => (
          <TouchableOpacity
            key={t.key}
            onPress={() => { setTab(t.key as Tab); setSearch(''); }}
            style={[styles.tab, { backgroundColor: tab === t.key ? theme.primary : theme.surface, borderColor: tab === t.key ? theme.primary : theme.border }]}
          >
            <Text style={{ color: tab === t.key ? '#fff' : theme.text, fontSize: 13, fontWeight: '600' }}>
              {t.label}{tab === 'unmapped' && unmappedKeys.length > 0 ? ` (${unmappedKeys.length})` : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={[styles.searchRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Ionicons name="search" size={18} color={theme.textTertiary} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          value={search}
          onChangeText={(v) => { setSearch(v); if (tab === 'mappings') { setMapPage(1); } }}
          placeholder="Search merchants..."
          placeholderTextColor={theme.textTertiary}
        />
      </View>

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

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={theme.primary} /></View>
      ) : tab === 'unmapped' ? (
        <FlatList
          data={unmappedKeys}
          keyExtractor={(item) => item.merchantKey}
          renderItem={renderUnmapped}
          contentContainerStyle={[styles.listContent, unmappedKeys.length === 0 && styles.listEmpty]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchUnmapped(); }} tintColor={theme.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="checkmark-circle" size={48} color={theme.income} />
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>All merchants mapped</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={mappings}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderMapping}
          contentContainerStyle={[styles.listContent, mappings.length === 0 && styles.listEmpty]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchMappings(1); }} tintColor={theme.primary} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={loadingMore ? <ActivityIndicator style={{ padding: 16 }} color={theme.primary} /> : null}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="map-outline" size={48} color={theme.textTertiary} />
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No mappings found</Text>
            </View>
          }
        />
      )}

      <Modal visible={editModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Edit Mapping</Text>
            {editMapping && (
              <Text style={[styles.modalSubtitle, { color: theme.textTertiary }]}>{editMapping.merchantKey}</Text>
            )}
            <Text style={[styles.assignLabel, { color: theme.textSecondary }]}>Category</Text>
            <View style={styles.pickerGrid}>
              {categories.map((cat: any) => (
                <TouchableOpacity
                  key={cat.id || cat.name}
                  onPress={() => setEditCategory(cat.id || cat.name)}
                  style={[styles.gridBtn, { backgroundColor: editCategory === (cat.id || cat.name) ? theme.primary : theme.background }]}
                >
                  <Text style={{ color: editCategory === (cat.id || cat.name) ? '#fff' : theme.text, fontSize: 12, fontWeight: '500' }}>{cat.name}</Text>
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
