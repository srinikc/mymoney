import { useState, useEffect, useRef } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, useColorScheme, Animated, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';

interface TransactionConfirmProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  amount?: number;
  actionLabel?: string;
  onConfirm: () => Promise<void> | void;
  delay?: number;
}

export default function TransactionConfirm({
  open, onOpenChange, title, description, amount, actionLabel = 'Confirm', onConfirm, delay = 1500,
}: TransactionConfirmProps) {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const [countdown, setCountdown] = useState(delay);
  const [executing, setExecuting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!open) {
      setCountdown(delay);
      setConfirmed(false);
      setExecuting(false);
      progressAnim.setValue(0);
    }
  }, [open, delay, progressAnim]);

  useEffect(() => {
    if (!confirmed || executing) return;
    setExecuting(true);

    Animated.timing(progressAnim, {
      toValue: 1,
      duration: delay,
      useNativeDriver: false,
    }).start();

    const startTime = Date.now();
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, delay - elapsed);
      setCountdown(remaining);
      if (remaining <= 0) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        onConfirm();
      }
    }, 50);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [confirmed, executing, onConfirm, delay, progressAnim]);

  const handleConfirm = () => {
    setConfirmed(true);
  };

  const progress = countdown / delay;

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => onOpenChange(false)}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => !executing && onOpenChange(false)}>
        <View style={[styles.dialog, { backgroundColor: theme.surface }]}>
          <View style={styles.header}>
            <View style={[styles.iconCircle, { backgroundColor: theme.warningLight }]}>
              <Ionicons name="alert-circle" size={24} color={theme.warning} />
            </View>
            <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
            <Text style={[styles.description, { color: theme.textSecondary }]}>{description}</Text>
          </View>

          {amount !== undefined && (
            <Text style={[styles.amount, { color: theme.text }]}>
              ₹{amount.toLocaleString('en-IN')}
            </Text>
          )}

          {executing ? (
            <View style={styles.progressSection}>
              <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
                <Animated.View style={[styles.progressBar, { backgroundColor: theme.primary, width: `${(1 - progress) * 100}%` }]} />
              </View>
              <View style={styles.processingRow}>
                <ActivityIndicator size="small" color={theme.primary} />
                <Text style={[styles.processingText, { color: theme.textSecondary }]}>
                  Processing in {(countdown / 1000).toFixed(1)}s...
                </Text>
              </View>
            </View>
          ) : !confirmed ? (
            <Text style={[styles.reviewText, { color: theme.textTertiary }]}>
              Please review the details above before confirming.
            </Text>
          ) : null}

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.cancelBtn, { borderColor: theme.border }]}
              onPress={() => onOpenChange(false)}
              disabled={executing}
            >
              <Text style={[styles.cancelText, { color: theme.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            {!confirmed && !executing && (
              <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: theme.primary }]} onPress={handleConfirm}>
                <Text style={styles.confirmText}>{actionLabel}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dialog: {
    width: '100%',
    borderRadius: 20,
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  amount: {
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 20,
  },
  progressSection: {
    marginBottom: 20,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
  },
  processingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  processingText: {
    fontSize: 13,
    fontWeight: '500',
  },
  reviewText: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 20,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  confirmText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
