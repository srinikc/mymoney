import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useColorScheme, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { formatCurrency, formatDate } from '../../utils/format';
import api from '../../api/client';

type Tab = 'kc' | 'gpay';

export default function ImportScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const router = useRouter();

  const [tab, setTab] = useState<Tab>('kc');
  const [uploading, setUploading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [autoMapping, setAutoMapping] = useState(true);

  const handleUpload = async () => {
    setUploading(true);
    setError(null);
    setResult(null);
    try {
      const payload = tab === 'kc' ? { source: 'kc' } : { source: 'gpay' };
      const res = await api.post('/api/expenses/import/preview', payload);
      setPreview(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleImport = async () => {
    setImporting(true);
    setError(null);
    try {
      const payload: any = { source: tab === 'kc' ? 'kc' : 'gpay', autoMapping };
      if (tab === 'kc' && preview?.sheetName) payload.sheetName = preview.sheetName;
      const res = await api.post('/api/expenses/import', payload);
      setResult(res.data);
      setPreview(null);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const handleReset = () => {
    setPreview(null);
    setResult(null);
    setError(null);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Import Expenses</Text>
      </View>

      <View style={styles.tabRow}>
        {[{ key: 'kc', label: 'KC Expenses', icon: 'document-text' as const }, { key: 'gpay', label: 'GPay', icon: 'phone-portrait' as const }].map((t) => (
          <TouchableOpacity
            key={t.key}
            onPress={() => { setTab(t.key as Tab); handleReset(); }}
            style={[styles.tab, { backgroundColor: tab === t.key ? theme.primary : theme.surface, borderColor: tab === t.key ? theme.primary : theme.border }]}
          >
            <Ionicons name={t.icon} size={16} color={tab === t.key ? '#fff' : theme.text} />
            <Text style={{ color: tab === t.key ? '#fff' : theme.text, fontSize: 13, fontWeight: '600' }}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {!preview && !result && !error && (
          <View style={styles.uploadSection}>
            <TouchableOpacity onPress={handleUpload} disabled={uploading} style={[styles.uploadBtn, { backgroundColor: theme.primaryLight, borderColor: theme.primary }]}>
              {uploading ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : (
                <>
                  <Ionicons name="cloud-upload-outline" size={28} color={theme.primary} />
                  <Text style={[styles.uploadBtnText, { color: theme.primary }]}>
                    {tab === 'kc' ? 'Upload .xlsx File' : 'Import from GPay'}
                  </Text>
                  <Text style={[styles.uploadHint, { color: theme.textTertiary }]}>
                    {tab === 'kc' ? 'Select KC Expenses Excel file' : 'Fetch Google Pay transactions'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {error && (
          <View style={[styles.errorCard, { backgroundColor: theme.expenseLight }]}>
            <Ionicons name="alert-circle" size={20} color={theme.expense} />
            <Text style={[styles.errorText, { color: theme.expense }]}>{error}</Text>
            <TouchableOpacity onPress={handleReset}>
              <Text style={{ color: theme.primary, fontWeight: '600', fontSize: 13 }}>Try again</Text>
            </TouchableOpacity>
          </View>
        )}

        {preview && (
          <View style={[styles.previewCard, { backgroundColor: theme.surface }]}>
            <Text style={[styles.previewTitle, { color: theme.text }]}>Preview</Text>
            {preview.sheetName && (
              <View style={styles.previewRow}>
                <Text style={[styles.previewLabel, { color: theme.textSecondary }]}>Sheet</Text>
                <Text style={[styles.previewValue, { color: theme.text }]}>{preview.sheetName}</Text>
              </View>
            )}
            {preview.totalRows !== undefined && (
              <View style={styles.previewRow}>
                <Text style={[styles.previewLabel, { color: theme.textSecondary }]}>Total Rows</Text>
                <Text style={[styles.previewValue, { color: theme.text }]}>{preview.totalRows}</Text>
              </View>
            )}
            {preview.dateRange && (
              <View style={styles.previewRow}>
                <Text style={[styles.previewLabel, { color: theme.textSecondary }]}>Date Range</Text>
                <Text style={[styles.previewValue, { color: theme.text }]}>{preview.dateRange}</Text>
              </View>
            )}
            {preview.totalAmount !== undefined && (
              <View style={styles.previewRow}>
                <Text style={[styles.previewLabel, { color: theme.textSecondary }]}>Total Amount</Text>
                <Text style={[styles.previewValue, { color: theme.expense }]}>{formatCurrency(preview.totalAmount)}</Text>
              </View>
            )}

            {preview.willImport !== undefined && (
              <View style={styles.previewRow}>
                <Text style={[styles.previewLabel, { color: theme.textSecondary }]}>Will Import</Text>
                <Text style={[styles.previewValue, { color: theme.income }]}>{preview.willImport} rows</Text>
              </View>
            )}
            {preview.willSkip !== undefined && (
              <View style={styles.previewRow}>
                <Text style={[styles.previewLabel, { color: theme.textSecondary }]}>Will Skip</Text>
                <Text style={[styles.previewValue, { color: theme.warning }]}>{preview.willSkip} rows</Text>
              </View>
            )}

            {preview.sampleRows && preview.sampleRows.length > 0 && (
              <>
                <Text style={[styles.sampleTitle, { color: theme.textSecondary }]}>Sample Rows</Text>
                {preview.sampleRows.slice(0, 5).map((row: any, idx: number) => (
                  <View key={idx} style={[styles.sampleRow, { backgroundColor: theme.background }]}>
                    <Text style={[styles.sampleCell, { color: theme.textTertiary }]}>{row.date || ''}</Text>
                    <Text style={[styles.sampleCell, { color: theme.text, flex: 1 }]}>{row.vendor || row.description || ''}</Text>
                    <Text style={[styles.sampleCell, { color: theme.expense }]}>{row.amount ? formatCurrency(row.amount) : ''}</Text>
                  </View>
                ))}
              </>
            )}

            {tab === 'kc' && (
              <TouchableOpacity
                onPress={() => setAutoMapping(!autoMapping)}
                style={[styles.toggleRow, { backgroundColor: theme.background }]}
              >
                <Ionicons name={autoMapping ? 'checkbox' : 'square-outline'} size={20} color={autoMapping ? theme.primary : theme.textTertiary} />
                <Text style={[styles.toggleLabel, { color: theme.text }]}>Create auto-mappings for new merchants</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity onPress={handleImport} disabled={importing} style={[styles.importBtn, { backgroundColor: theme.primary }]}>
              {importing ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.importBtnText}>Import</Text>}
            </TouchableOpacity>
          </View>
        )}

        {result && (
          <View style={[styles.resultCard, { backgroundColor: theme.surface }]}>
            <Ionicons name="checkmark-circle" size={40} color={theme.income} />
            <Text style={[styles.resultTitle, { color: theme.text }]}>Import Complete</Text>
            {result.imported !== undefined && (
              <View style={styles.resultRow}>
                <Text style={[styles.resultLabel, { color: theme.textSecondary }]}>Imported</Text>
                <Text style={[styles.resultValue, { color: theme.income }]}>{result.imported}</Text>
              </View>
            )}
            {result.skipped !== undefined && (
              <View style={styles.resultRow}>
                <Text style={[styles.resultLabel, { color: theme.textSecondary }]}>Skipped</Text>
                <Text style={[styles.resultValue, { color: theme.warning }]}>{result.skipped}</Text>
              </View>
            )}
            {result.newMappings !== undefined && (
              <View style={styles.resultRow}>
                <Text style={[styles.resultLabel, { color: theme.textSecondary }]}>New Mappings</Text>
                <Text style={[styles.resultValue, { color: theme.primary }]}>{result.newMappings}</Text>
              </View>
            )}
            <TouchableOpacity onPress={() => router.back()} style={[styles.doneBtn, { backgroundColor: theme.primary }]}>
              <Text style={styles.doneBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: 12, padding: 4 },
  headerTitle: { fontSize: 22, fontWeight: '700', flex: 1 },
  tabRow: { flexDirection: 'row', gap: 8, marginHorizontal: 16, marginTop: 12, marginBottom: 8 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1, flex: 1, justifyContent: 'center' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  uploadSection: { paddingTop: 40, alignItems: 'center' },
  uploadBtn: { width: '100%', borderRadius: 14, borderWidth: 2, borderStyle: 'dashed', padding: 32, alignItems: 'center', gap: 8 },
  uploadBtnText: { fontSize: 16, fontWeight: '700' },
  uploadHint: { fontSize: 12, fontWeight: '500' },
  errorCard: { borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
  errorText: { fontSize: 13, fontWeight: '500', flex: 1 },
  previewCard: { borderRadius: 14, padding: 16, gap: 10 },
  previewTitle: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  previewRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  previewLabel: { fontSize: 13, fontWeight: '500' },
  previewValue: { fontSize: 13, fontWeight: '600' },
  sampleTitle: { fontSize: 13, fontWeight: '600', marginTop: 8, marginBottom: 4 },
  sampleRow: { flexDirection: 'row', gap: 8, padding: 8, borderRadius: 8, marginBottom: 4 },
  sampleCell: { fontSize: 12, fontWeight: '500' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 10, marginTop: 4 },
  toggleLabel: { fontSize: 13, fontWeight: '500', flex: 1 },
  importBtn: { height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  importBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  resultCard: { borderRadius: 14, padding: 24, alignItems: 'center', gap: 12 },
  resultTitle: { fontSize: 18, fontWeight: '700' },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', paddingHorizontal: 8 },
  resultLabel: { fontSize: 14, fontWeight: '500' },
  resultValue: { fontSize: 14, fontWeight: '700' },
  doneBtn: { height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', width: '100%', marginTop: 8 },
  doneBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
