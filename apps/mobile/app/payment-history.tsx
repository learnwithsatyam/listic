import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { paymentsApi } from '../src/services/api';
import { useResponsive } from '../src/hooks/useResponsive';
import { colors, spacing, radii, fontSize, fontWeight, layout } from '../src/theme';

interface PaymentRecord {
  id: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  tierSlug: string;
  tierName: string;
  credits: number;
  amountPaise: number;
  currency: string;
  status: string;
  createdAt: string;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatAmount(paise: number, currency: string): string {
  if (currency === 'INR') return `₹${(paise / 100).toFixed(0)}`;
  return `${(paise / 100).toFixed(2)} ${currency}`;
}

export default function PaymentHistoryScreen() {
  const { isDesktop } = useResponsive();
  const router = useRouter();
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    paymentsApi
      .getHistory()
      .then(({ data }) => setPayments(data))
      .catch(() => setError('Failed to load payment history.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, isDesktop && styles.contentDesktop]}>
      <Text style={styles.heading}>Payment History</Text>
      <Text style={styles.subheading}>All your credit purchases</Text>

      {error && (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle" size={18} color={colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {!error && payments.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="receipt-outline" size={48} color={colors.textTertiary} />
          <Text style={styles.emptyTitle}>No payments yet</Text>
          <Text style={styles.emptyDesc}>
            Your purchases will appear here after you buy credits.
          </Text>
          <Pressable style={styles.buyBtn} onPress={() => router.push('/purchase')} role="button">
            <Text style={styles.buyBtnText}>Buy Credits</Text>
          </Pressable>
        </View>
      )}

      {payments.map((p) => (
        <View key={p.id} style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.tierBadge}>
              <Text style={styles.tierBadgeText}>{p.tierName}</Text>
            </View>
            <Text style={styles.amount}>{formatAmount(p.amountPaise, p.currency)}</Text>
          </View>

          <View style={styles.cardBody}>
            <View style={styles.detailRow}>
              <Ionicons name="diamond-outline" size={16} color={colors.accent} />
              <Text style={styles.detailLabel}>Credits received</Text>
              <Text style={styles.detailValue}>+{p.credits}</Text>
            </View>

            <View style={styles.detailRow}>
              <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.detailLabel}>Date</Text>
              <Text style={styles.detailValue}>{formatDate(p.createdAt)}</Text>
            </View>

            <View style={styles.detailRow}>
              <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.detailLabel}>Time</Text>
              <Text style={styles.detailValue}>{formatTime(p.createdAt)}</Text>
            </View>

            <View style={styles.detailRow}>
              <Ionicons name="checkmark-circle-outline" size={16} color={colors.success} />
              <Text style={styles.detailLabel}>Status</Text>
              <Text style={[styles.detailValue, styles.statusText]}>
                {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Ionicons name="receipt-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.detailLabel}>Payment ID</Text>
              <Text style={[styles.detailValue, styles.mono]} numberOfLines={1}>
                {p.razorpayPaymentId}
              </Text>
            </View>
          </View>
        </View>
      ))}

      {payments.length > 0 && (
        <Text style={styles.footer}>
          {payments.length} payment{payments.length !== 1 ? 's' : ''} · All amounts in INR
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { justifyContent: 'center', alignItems: 'center' },
  content: { padding: spacing.lg, paddingBottom: 60 },
  contentDesktop: {
    maxWidth: layout.contentMaxWidth,
    alignSelf: 'center',
    width: '100%',
  },
  heading: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subheading: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing['2xl'],
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(242, 139, 130, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(242, 139, 130, 0.3)',
    borderRadius: radii.md,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  errorText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing['4xl'],
    gap: spacing.md,
  },
  emptyTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  emptyDesc: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
  },
  buyBtn: {
    marginTop: spacing.lg,
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing['2xl'],
    borderRadius: radii.full,
  },
  buyBtnText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.textOnAccent,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  tierBadge: {
    backgroundColor: colors.accentSoft,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
  },
  tierBadgeText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.accent,
  },
  amount: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  cardBody: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  detailLabel: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textPrimary,
  },
  statusText: {
    color: colors.success,
  },
  mono: {
    fontFamily: 'monospace',
    fontSize: fontSize.xs,
  },
  footer: {
    textAlign: 'center',
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    marginTop: spacing.md,
  },
});
