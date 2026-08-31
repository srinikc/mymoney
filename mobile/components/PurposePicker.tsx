import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

const PURPOSE_OPTIONS = [
  'Marriage - kid1',
  'Marriage - kid2',
  'Education - kid1',
  'Education - kid2',
  'House',
  'FarmLand-House',
  'Travel - Local',
  'Travel - Abroad',
  'Spiritual',
  'Giving',
  'Pooja',
  'Donation',
  'Jewellery - Gold',
  'Jewellery - Silver',
  'Renovation',
];

export default function PurposePicker({
  value,
  onChange,
  theme,
}: {
  value: string;
  onChange: (v: string) => void;
  theme: { primary: string; background: string; text: string; textTertiary: string; border: string };
}) {
  const isCustom = value !== '' && !PURPOSE_OPTIONS.includes(value);
  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {PURPOSE_OPTIONS.map((p) => {
          const selected = value === p;
          return (
            <TouchableOpacity key={p} onPress={() => onChange(selected ? '' : p)} style={[styles.chip, { backgroundColor: selected ? theme.primary : theme.background, borderColor: selected ? theme.primary : theme.border }]}>
              <Text style={{ color: selected ? '#fff' : theme.text, fontSize: 11, fontWeight: '600' }}>{p}</Text>
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity onPress={() => { if (value !== '' && !PURPOSE_OPTIONS.includes(value)) onChange(''); }} style={[styles.chip, { backgroundColor: theme.background, borderColor: theme.border }]}>
          <Text style={{ color: theme.text, fontSize: 11, fontWeight: '600' }}>Clear</Text>
        </TouchableOpacity>
      </ScrollView>
      <TextInput
        style={[styles.customInput, { backgroundColor: theme.background, color: theme.text }]}
        value={isCustom ? value : ''}
        onChangeText={(t) => { if (t.trim() !== '' || value === '') onChange(t); }}
        placeholder="Or type a custom purpose..."
        placeholderTextColor={theme.textTertiary}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  chipRow: { gap: 6, paddingVertical: 4 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, borderWidth: 1 },
  customInput: { borderRadius: 10, padding: 12, fontSize: 14, marginTop: 8, borderWidth: 1, borderColor: '#e5e7eb' },
});