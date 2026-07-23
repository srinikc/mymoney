import { useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  Animated, Dimensions, useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import type { HelpSection } from './help-content';

interface HelpDrawerProps {
  section: HelpSection;
  path: string;
  onClose: () => void;
}

const SCREEN_WIDTH = Dimensions.get('window').width;

export function HelpDrawer({ section, onClose }: HelpDrawerProps) {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const slideAnim = useRef(new Animated.Value(SCREEN_WIDTH)).current;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [slideAnim]);

  const handleClose = () => {
    Animated.timing(slideAnim, {
      toValue: SCREEN_WIDTH,
      duration: 250,
      useNativeDriver: true,
    }).start(() => onClose());
  };

  return (
    <View style={styles.overlay}>
      <TouchableOpacity style={styles.backdrop} onPress={handleClose} activeOpacity={1} />
      <Animated.View
        style={[
          styles.drawer,
          { backgroundColor: theme.surface, transform: [{ translateX: slideAnim }] },
        ]}
      >
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <View style={styles.headerLeft}>
            <Text style={[styles.title, { color: theme.text }]}>{section.title}</Text>
            <View style={[styles.badge, { backgroundColor: theme.primaryLight }]}>
              <Text style={[styles.badgeText, { color: theme.primary }]}>Help</Text>
            </View>
          </View>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={22} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
          <Text style={[styles.summary, { color: theme.textSecondary }]}>
            {section.summary}
          </Text>

          <Text style={[styles.sectionLabel, { color: theme.textTertiary }]}>Overview</Text>
          <Text style={[styles.details, { color: theme.text }]}>{section.details}</Text>

          {section.workflow && (
            <>
              <Text style={[styles.sectionLabel, { color: theme.textTertiary }]}>How to Use</Text>
              {section.workflow.map((step, i) => (
                <View key={i} style={[styles.stepRow, { borderBottomColor: theme.borderLight }]}>
                  <View style={[styles.stepNumber, { backgroundColor: theme.primaryLight }]}>
                    <Text style={[styles.stepNumberText, { color: theme.primary }]}>{i + 1}</Text>
                  </View>
                  <View style={styles.stepContent}>
                    <Text style={[styles.stepTitle, { color: theme.text }]}>{step.step}</Text>
                    <Text style={[styles.stepDesc, { color: theme.textSecondary }]}>
                      {step.description}
                    </Text>
                  </View>
                </View>
              ))}
            </>
          )}

          {section.relatedFeatures && (
            <>
              <Text style={[styles.sectionLabel, { color: theme.textTertiary }]}>Related Features</Text>
              {section.relatedFeatures.map((rel, i) => (
                <View key={i} style={[styles.relatedCard, { backgroundColor: theme.background, borderColor: theme.border }]}>
                  <Ionicons name="arrow-forward" size={14} color={theme.primary} style={styles.relatedIcon} />
                  <View>
                    <Text style={[styles.relatedName, { color: theme.text }]}>{rel.name}</Text>
                    <Text style={[styles.relatedDesc, { color: theme.textSecondary }]}>{rel.description}</Text>
                  </View>
                </View>
              ))}
            </>
          )}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 200,
    flexDirection: 'row',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  drawer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: Math.min(SCREEN_WIDTH - 40, 380),
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: 20,
    paddingBottom: 40,
  },
  summary: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
    marginTop: 16,
  },
  details: {
    fontSize: 14,
    lineHeight: 21,
  },
  stepRow: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepNumberText: {
    fontSize: 12,
    fontWeight: '700',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  stepDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  relatedCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
  },
  relatedIcon: {
    marginTop: 3,
  },
  relatedName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 1,
  },
  relatedDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
});
