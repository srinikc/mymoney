import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, useColorScheme,
  RefreshControl, ActivityIndicator, Modal, TextInput, Alert, Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { formatDate } from '../../utils/format';
import api from '../../api/client';

interface AdminUser {
  id: number;
  email: string;
  name: string | null;
  image: string | null;
  role: string;
  tier: string;
  createdAt: string;
  updatedAt: string;
  profileCount: number;
  profiles: { id: number; name: string; isDefault: boolean; createdAt: string }[];
}

const ROLES = ['user', 'admin', 'manager', 'viewer'];
const TIERS = ['free', 'pro', 'premium'];

export default function AdminUsersScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const router = useRouter();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create user modal
  const [showCreate, setShowCreate] = useState(false);
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formConfirm, setFormConfirm] = useState('');
  const [formRole, setFormRole] = useState('user');
  const [formProfile, setFormProfile] = useState('Default');
  const [formGoogleLinked, setFormGoogleLinked] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [creating, setCreating] = useState(false);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);

  // Detail modal
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  const fetch = useCallback(async () => {
    setError(null);
    try {
      const res = await api.get('/api/admin/users');
      const data = res.data;
      setUsers(Array.isArray(data) ? data : []);
    } catch (err: any) {
      if (err.response?.status === 403) setError('Admin access required');
      else setError('Failed to load users');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const updateRole = async (userId: number, role: string) => {
    try {
      await api.patch(`/api/admin/users/${userId}`, { role });
      fetch();
    } catch { /* silently fail */ }
  };

  const updateTier = async (userId: number, tier: string) => {
    try {
      await api.put('/api/admin/tier', { userId, tier });
      fetch();
    } catch { /* silently fail */ }
  };

  const deleteUser = (userId: number) => {
    Alert.alert('Delete User', 'Are you sure? This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await api.delete(`/api/admin/users/${userId}`); fetch(); if (selectedUser?.id === userId) setSelectedUser(null); }
        catch { Alert.alert('Error', 'Failed to delete'); }
      }},
    ]);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formName.trim()) errors.name = 'Name is required';
    if (!formEmail.trim()) errors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formEmail)) errors.email = 'Invalid email format';
    if (!formGoogleLinked) {
      if (!formPassword) errors.password = 'Password is required';
      else if (formPassword.length < 8) errors.password = 'At least 8 characters';
      if (!formConfirm) errors.confirm = 'Please confirm password';
      else if (formPassword !== formConfirm) errors.confirm = 'Passwords do not match';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreate = async () => {
    if (!validateForm()) return;
    setCreating(true);
    setFormErrors({});
    try {
      await api.post('/api/admin/users', {
        name: formName.trim(),
        email: formEmail.trim(),
        isGoogleLinked: formGoogleLinked,
        password: formGoogleLinked ? undefined : formPassword,
        role: formRole,
        profileName: formProfile.trim() || 'Default',
      });
      setCreateSuccess(`User ${formName} created!`);
      setTimeout(() => { setShowCreate(false); setCreateSuccess(null); resetForm(); fetch(); }, 1500);
    } catch (err: any) {
      setFormErrors({ general: err.response?.data?.error || 'Failed to create user' });
    } finally { setCreating(false); }
  };

  const resetForm = () => {
    setFormName(''); setFormEmail(''); setFormPassword(''); setFormConfirm('');
    setFormRole('user'); setFormProfile('Default'); setFormGoogleLinked(false);
    setFormErrors({}); setCreateSuccess(null);
  };

  const renderUserItem = ({ item }: { item: AdminUser }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: theme.surface }]}
      onPress={() => setSelectedUser(item)}
      onLongPress={() => deleteUser(item.id)}
    >
      <View style={styles.cardRow}>
        <View style={[styles.cardIcon, { backgroundColor: theme.primaryLight }]}>
          <Ionicons name="person" size={18} color={theme.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>{item.name || 'Unnamed'}</Text>
          <Text style={[styles.cardSubtext, { color: theme.textTertiary }]}>{item.email}</Text>
        </View>
        <View style={styles.cardBadges}>
          <View style={[styles.badge, { backgroundColor: item.role === 'admin' ? theme.primaryLight : theme.surfaceSecondary }]}>
            <Text style={[styles.badgeText, { color: item.role === 'admin' ? theme.primary : theme.textSecondary }]}>{item.role}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: theme.surfaceSecondary }]}>
            <Text style={[styles.badgeText, { color: theme.textSecondary }]}>{item.tier}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderRolePicker = (value: string, onChange: (v: string) => void) => (
    <View style={styles.pickerRow}>
      {ROLES.map((r) => (
        <TouchableOpacity
          key={r}
          style={[styles.pickerChip, { backgroundColor: value === r ? theme.primary : 'transparent', borderColor: value === r ? theme.primary : theme.border }]}
          onPress={() => onChange(r)}
        >
          <Text style={[styles.pickerChipText, { color: value === r ? 'white' : theme.textSecondary }]}>{r}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderTierPicker = (value: string, onChange: (v: string) => void) => (
    <View style={styles.pickerRow}>
      {TIERS.map((t) => (
        <TouchableOpacity
          key={t}
          style={[styles.pickerChip, { backgroundColor: value === t ? theme.primary : 'transparent', borderColor: value === t ? theme.primary : theme.border }]}
          onPress={() => onChange(t)}
        >
          <Text style={[styles.pickerChipText, { color: value === t ? 'white' : theme.textSecondary }]}>{t}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Admin — Users</Text>
          <Text style={[styles.headerSub, { color: theme.textSecondary }]}>Manage all users and their roles</Text>
        </View>
        <TouchableOpacity onPress={() => { resetForm(); setShowCreate(true); }} style={[styles.addBtn, { backgroundColor: theme.primaryLight }]}>
          <Ionicons name="add" size={22} color={theme.primary} />
        </TouchableOpacity>
      </View>

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
          data={users}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderUserItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetch(); }} tintColor={theme.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={48} color={theme.textTertiary} />
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No users found</Text>
            </View>
          }
        />
      )}

      {/* Create User Modal */}
      <Modal visible={showCreate} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Create User</Text>
              <TouchableOpacity onPress={() => setShowCreate(false)}><Ionicons name="close" size={24} color={theme.textTertiary} /></TouchableOpacity>
            </View>

            {createSuccess ? (
              <View style={styles.successWrap}>
                <View style={[styles.successIcon, { backgroundColor: theme.incomeLight }]}>
                  <Ionicons name="checkmark-circle" size={32} color={theme.income} />
                </View>
                <Text style={[styles.successText, { color: theme.text }]}>{createSuccess}</Text>
              </View>
            ) : (
              <FlatList
                data={[]} renderItem={() => null}
                ListHeaderComponent={
                  <>
                    {formErrors.general && (
                      <View style={[styles.formError, { backgroundColor: theme.expenseLight }]}>
                        <Text style={{ color: theme.expense, fontSize: 13 }}>{formErrors.general}</Text>
                      </View>
                    )}

                    <Text style={[styles.label, { color: theme.textSecondary }]}>Name *</Text>
                    <TextInput style={[styles.input, { color: theme.text, borderColor: theme.border }]} value={formName} onChangeText={setFormName} placeholder="John Doe" placeholderTextColor={theme.textTertiary} />
                    {formErrors.name && <Text style={[styles.errorMsg, { color: theme.expense }]}>{formErrors.name}</Text>}

                    <Text style={[styles.label, { color: theme.textSecondary }]}>Email *</Text>
                    <TextInput style={[styles.input, { color: theme.text, borderColor: theme.border }]} value={formEmail} onChangeText={setFormEmail} placeholder="john@example.com" placeholderTextColor={theme.textTertiary} keyboardType="email-address" autoCapitalize="none" />
                    {formErrors.email && <Text style={[styles.errorMsg, { color: theme.expense }]}>{formErrors.email}</Text>}

                    <View style={styles.switchRow}>
                      <Text style={[styles.switchLabel, { color: theme.textSecondary }]}>Google-linked user</Text>
                      <Switch value={formGoogleLinked} onValueChange={setFormGoogleLinked} trackColor={{ false: theme.border, true: theme.primaryLight }} thumbColor={formGoogleLinked ? theme.primary : theme.textTertiary} />
                    </View>

                    {!formGoogleLinked && (
                      <>
                        <Text style={[styles.label, { color: theme.textSecondary }]}>Password *</Text>
                        <TextInput style={[styles.input, { color: theme.text, borderColor: theme.border }]} value={formPassword} onChangeText={setFormPassword} placeholder="At least 8 characters" placeholderTextColor={theme.textTertiary} secureTextEntry />
                        {formErrors.password && <Text style={[styles.errorMsg, { color: theme.expense }]}>{formErrors.password}</Text>}

                        <Text style={[styles.label, { color: theme.textSecondary }]}>Confirm Password *</Text>
                        <TextInput style={[styles.input, { color: theme.text, borderColor: theme.border }]} value={formConfirm} onChangeText={setFormConfirm} placeholder="Re-enter password" placeholderTextColor={theme.textTertiary} secureTextEntry />
                        {formErrors.confirm && <Text style={[styles.errorMsg, { color: theme.expense }]}>{formErrors.confirm}</Text>}
                      </>
                    )}

                    <Text style={[styles.label, { color: theme.textSecondary }]}>Role</Text>
                    {renderRolePicker(formRole, setFormRole)}

                    <Text style={[styles.label, { color: theme.textSecondary }]}>Profile Name</Text>
                    <TextInput style={[styles.input, { color: theme.text, borderColor: theme.border }]} value={formProfile} onChangeText={setFormProfile} placeholder="Default" placeholderTextColor={theme.textTertiary} />
                  </>
                }
              />
            )}

            {!createSuccess && (
              <View style={styles.modalFooter}>
                <TouchableOpacity onPress={() => setShowCreate(false)} style={[styles.cancelBtn, { borderColor: theme.border }]}>
                  <Text style={[styles.cancelBtnText, { color: theme.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleCreate} disabled={creating} style={[styles.saveBtn, { backgroundColor: theme.primary, opacity: creating ? 0.6 : 1 }]}>
                  {creating ? <ActivityIndicator size="small" color="white" /> : <Text style={styles.saveBtnText}>Create User</Text>}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* User Detail Modal */}
      <Modal visible={!!selectedUser} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>{selectedUser?.name || selectedUser?.email}</Text>
              <TouchableOpacity onPress={() => setSelectedUser(null)}><Ionicons name="close" size={24} color={theme.textTertiary} /></TouchableOpacity>
            </View>
            {selectedUser && (
              <>
                <Text style={[styles.detailId, { color: theme.textTertiary }]}>User ID: {selectedUser.id} &middot; Joined {formatDate(selectedUser.createdAt)}</Text>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: theme.textTertiary }]}>Email</Text>
                  <Text style={[styles.detailValue, { color: theme.text }]}>{selectedUser.email}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: theme.textTertiary }]}>Role</Text>
                  {renderRolePicker(selectedUser.role, (v) => updateRole(selectedUser.id, v))}
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: theme.textTertiary }]}>Tier</Text>
                  {renderTierPicker(selectedUser.tier, (v) => updateTier(selectedUser.id, v))}
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: theme.textTertiary }]}>Profiles</Text>
                  <Text style={[styles.detailValue, { color: theme.text }]}>{selectedUser.profileCount}</Text>
                </View>

                {selectedUser.profiles.length > 0 && (
                  <View style={{ marginTop: 16 }}>
                    <Text style={[styles.detailLabel, { color: theme.textTertiary }]}>Profiles</Text>
                    {selectedUser.profiles.map((p) => (
                      <View key={p.id} style={[styles.profileRow, { borderColor: theme.border }]}>
                        <Text style={[styles.profileName, { color: theme.text }]}>{p.name}</Text>
                        {p.isDefault && (
                          <View style={[styles.defaultBadge, { backgroundColor: theme.primaryLight }]}>
                            <Text style={[styles.defaultBadgeText, { color: theme.primary }]}>Default</Text>
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                )}

                <TouchableOpacity onPress={() => deleteUser(selectedUser.id)} style={[styles.deleteBtn, { borderColor: theme.expense }]}>
                  <Ionicons name="trash" size={16} color={theme.expense} />
                  <Text style={[styles.deleteBtnText, { color: theme.expense }]}>Delete User</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: 12, padding: 4 },
  headerTitle: { fontSize: 22, fontWeight: '700' },
  headerSub: { fontSize: 13, marginTop: 2 },
  addBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  errorText: { fontSize: 14, fontWeight: '500' },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  retryBtnText: { color: '#FFFFFF', fontWeight: '600' },
  listContent: { padding: 16 },
  card: { borderRadius: 14, padding: 16, marginBottom: 10 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '600' },
  cardSubtext: { fontSize: 12, marginTop: 2 },
  cardBadges: { flexDirection: 'row', gap: 6 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, fontWeight: '500' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalFooter: { flexDirection: 'row', gap: 10, marginTop: 20 },
  formError: { padding: 10, borderRadius: 8, marginBottom: 12 },
  successWrap: { alignItems: 'center', paddingVertical: 32, gap: 12 },
  successIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  successText: { fontSize: 16, fontWeight: '600' },
  label: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, marginTop: 14 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  errorMsg: { fontSize: 12, marginTop: 4 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 },
  switchLabel: { fontSize: 14, fontWeight: '500' },
  pickerRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  pickerChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  pickerChipText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  cancelBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
  cancelBtnText: { fontSize: 15, fontWeight: '600' },
  saveBtn: { flex: 2, alignItems: 'center', paddingVertical: 12, borderRadius: 12 },
  saveBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  detailId: { fontSize: 12, marginBottom: 16 },
  detailRow: { marginBottom: 14 },
  detailLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  detailValue: { fontSize: 15, fontWeight: '500' },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 8, padding: 10, marginTop: 6 },
  profileName: { fontSize: 14, fontWeight: '500', flex: 1 },
  defaultBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  defaultBadgeText: { fontSize: 10, fontWeight: '700' },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderRadius: 12, paddingVertical: 12, marginTop: 24 },
  deleteBtnText: { fontSize: 14, fontWeight: '600' },
});
