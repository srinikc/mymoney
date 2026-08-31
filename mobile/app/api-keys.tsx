import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, useColorScheme,
  ActivityIndicator, TextInput, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { Colors } from '../constants/Colors';
import api from '../api/client';

const KEY_FIELDS = [
  { key: 'LLM_PROVIDER', label: 'LLM Provider', type: 'select' as const, description: 'Choose AI provider. Base URL + model suggestions auto-fill.' },
  { key: 'LLM_MODEL', label: 'LLM Model', type: 'text' as const, description: 'Pick a suggested model or type any model ID.' },
  { key: 'OPENAI_API_KEY', label: 'OpenAI-compatible API Key', type: 'password' as const, description: 'Used for OpenAI, Groq, Cerebras, OpenRouter, DeepSeek, Mistral, Gemini, Together, DeepInfra, xAI' },
  { key: 'ANTHROPIC_API_KEY', label: 'Anthropic API Key', type: 'password' as const, description: 'Required if using Claude' },
  { key: 'OPENCODE_API_KEY', label: 'OpenCode Zen API Key', type: 'password' as const, description: 'Required for the OpenCode Zen gateway. Get one at opencode.ai/auth' },
  { key: 'LLM_BASE_URL', label: 'LLM Base URL', type: 'text' as const, description: 'Auto-filled when you pick a provider. Leave empty for OpenAI.com or Claude native.' },
  { key: 'LOCAL_LLM_ENDPOINT', label: 'Local LLM Endpoint', type: 'text' as const, description: 'e.g. http://localhost:11434/v1 (Ollama)' },
  { key: 'AUTH_RESEND_KEY', label: 'Resend API Key', type: 'password' as const, description: 'For welcome emails via resend.com' },
];

interface LLMModelOption { value: string; label: string }
interface LLMProviderOption {
  value: string; label: string; apiKeyField: string; baseUrl: string; defaultModel: string;
  models: LLMModelOption[]; description: string;
}

export default function ApiKeysScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const router = useRouter();

  const [keys, setKeys] = useState<Record<string, string>>({});
  const [providers, setProviders] = useState<LLMProviderOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [visible, setVisible] = useState<Record<string, boolean>>({});

  useEffect(() => {
    api.get('/api/settings/api-keys')
      .then((r) => { setKeys(r.data?.keys || {}); setProviders(r.data?.catalog?.providers || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const setKey = (key: string, value: string) => setKeys({ ...keys, [key]: value });

  const handleProviderChange = (value: string) => {
    const prov = providers.find((p) => p.value === value);
    const next: Record<string, string> = { ...keys, LLM_PROVIDER: value };
    if (prov) {
      next.LLM_MODEL = prov.defaultModel;
      // Always set base URL (even empty) so switching providers clears
      // any stale URL from the previous provider.
      next.LLM_BASE_URL = prov.baseUrl;
    }
    setKeys(next);
  };

  const currentProvider = providers.find((p) => p.value === (keys.LLM_PROVIDER || 'openai'));
  const modelOptions = currentProvider?.models || [];

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/api/settings/api-keys', { keys });
      Alert.alert('Saved', 'API keys saved successfully');
    } catch {
      Alert.alert('Error', 'Failed to save API keys');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <View style={[styles.container, { backgroundColor: theme.background }]}><View style={styles.center}><ActivityIndicator size="large" color={theme.primary} /></View></View>;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>API Keys</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving} style={[styles.saveBtn, { backgroundColor: theme.primary }]}>
          {saving ? <ActivityIndicator color="white" size="small" /> : <Text style={styles.saveBtnText}>Save</Text>}
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.description, { color: theme.textTertiary }]}>Configure API keys for external services.</Text>
        {KEY_FIELDS.map((field) => (
          <View key={field.key} style={[styles.fieldCard, { backgroundColor: theme.surface }]}>
            <Text style={[styles.fieldLabel, { color: theme.text }]}>{field.label}</Text>
            <Text style={[styles.fieldDesc, { color: theme.textTertiary }]}>{field.description}</Text>
            {field.type === 'select' ? (
              <View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selectRow}>
                  {providers.map((p) => {
                    const active = (keys[field.key] || 'openai') === p.value;
                    return (
                      <TouchableOpacity
                        key={p.value}
                        style={[styles.selectOpt, { borderColor: active ? theme.primary : theme.border, backgroundColor: active ? theme.primaryLight : 'transparent' }]}
                        onPress={() => handleProviderChange(p.value)}
                      >
                        <Text style={[styles.selectOptText, { color: active ? theme.primary : theme.text }]}>{p.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
                {currentProvider && (
                  <Text style={[styles.fieldDesc, { color: theme.textTertiary }]}>{currentProvider.description}</Text>
                )}
              </View>
            ) : field.key === 'LLM_MODEL' ? (
              <View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selectRow}>
                  {modelOptions.map((m) => {
                    const active = (keys[field.key] || '') === m.value;
                    return (
                      <TouchableOpacity
                        key={m.value}
                        style={[styles.selectOpt, { borderColor: active ? theme.primary : theme.border, backgroundColor: active ? theme.primaryLight : 'transparent' }]}
                        onPress={() => setKey(field.key, m.value)}
                      >
                        <Text style={[styles.selectOptText, { color: active ? theme.primary : theme.text }]}>{m.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
                <View style={[styles.inputRow, { borderColor: theme.border, marginTop: 8 }]}>
                  <TextInput
                    style={[styles.input, { color: theme.text }]}
                    value={keys[field.key] || ''}
                    onChangeText={(v) => setKey(field.key, v)}
                    placeholder="Or type any model ID"
                    placeholderTextColor={theme.textTertiary}
                  />
                </View>
              </View>
            ) : (
              <View style={[styles.inputRow, { borderColor: theme.border }]}>
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  value={keys[field.key] || ''}
                  onChangeText={(v) => setKeys({ ...keys, [field.key]: v })}
                  placeholder="Not configured"
                  placeholderTextColor={theme.textTertiary}
                  secureTextEntry={field.type === 'password' && !visible[field.key]}
                />
                {field.type === 'password' && (
                  <TouchableOpacity onPress={() => setVisible({ ...visible, [field.key]: !visible[field.key] })} style={styles.eyeBtn}>
                    <Ionicons name={visible[field.key] ? 'eye-off-outline' : 'eye-outline'} size={18} color={theme.textTertiary} />
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: 12, padding: 4 },
  headerTitle: { fontSize: 22, fontWeight: '700', flex: 1 },
  saveBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  saveBtnText: { color: 'white', fontSize: 14, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 20, paddingBottom: 40 },
  description: { fontSize: 13, marginBottom: 16 },
  fieldCard: { borderRadius: 14, padding: 16, marginBottom: 12 },
  fieldLabel: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  fieldDesc: { fontSize: 12, marginBottom: 10 },
  selectRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  selectOpt: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  selectOptText: { fontSize: 14, fontWeight: '600' },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12 },
  input: { flex: 1, fontSize: 14, paddingHorizontal: 12, paddingVertical: 10 },
  eyeBtn: { padding: 10 },
});
