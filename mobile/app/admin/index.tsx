import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useColorScheme, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { Colors } from '../../constants/Colors';

interface AdminTile {
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  color: string;
}

const TILES: AdminTile[] = [
  {
    title: 'Users',
    description: 'Manage all users and their roles',
    icon: 'people',
    route: '/admin/users',
    color: '#4F46E5',
  },
  {
    title: 'Features',
    description: 'Manage feature flags and toggles',
    icon: 'flag',
    route: '/admin/features',
    color: '#F59E0B',
  },
  {
    title: 'Profiles',
    description: 'Manage all user profiles',
    icon: 'person-circle',
    route: '/admin/profiles',
    color: '#10B981',
  },
  {
    title: 'Audit Log',
    description: 'View all audit log entries',
    icon: 'document-text',
    route: '/admin/audit-log',
    color: '#EF4444',
  },
];

export default function AdminLandingScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const router = useRouter();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>Admin Panel</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Manage your application settings
          </Text>
        </View>

        <View style={styles.grid}>
          {TILES.map((tile) => (
            <TouchableOpacity
              key={tile.route}
              style={[styles.tile, { backgroundColor: theme.surface, borderColor: theme.border }]}
              onPress={() => router.push(tile.route)}
              activeOpacity={0.7}
            >
              <View style={[styles.tileIcon, { backgroundColor: tile.color + '20' }]}>
                <Ionicons name={tile.icon} size={28} color={tile.color} />
              </View>
              <Text style={[styles.tileTitle, { color: theme.text }]}>{tile.title}</Text>
              <Text style={[styles.tileDesc, { color: theme.textSecondary }]}>
                {tile.description}
              </Text>
              <View style={styles.tileFooter}>
                <Text style={[styles.tileLink, { color: tile.color }]}>Open</Text>
                <Ionicons name="arrow-forward" size={14} color={tile.color} />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20 },
  header: { marginBottom: 24, paddingTop: 40 },
  title: { fontSize: 28, fontWeight: '800' },
  subtitle: { fontSize: 14, marginTop: 4 },
  grid: { gap: 16 },
  tile: { borderRadius: 18, borderWidth: 1, padding: 20 },
  tileIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  tileTitle: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  tileDesc: { fontSize: 13, lineHeight: 18, marginBottom: 14 },
  tileFooter: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tileLink: { fontSize: 13, fontWeight: '600' },
});
