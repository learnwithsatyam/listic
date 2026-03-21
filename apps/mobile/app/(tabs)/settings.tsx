import { View, Text, ScrollView, StyleSheet, Pressable, Alert, Platform } from 'react-native';
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/stores/auth-store';
import { useCreditsStore } from '../../src/stores/credits-store';
import { showAlert } from '../../src/utils/alert';
import { useResponsive } from '../../src/hooks/useResponsive';
import { colors, spacing, radii, fontSize, fontWeight, layout } from '../../src/theme';

interface RowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
}

function SettingsRow({ icon, label, onPress }: RowProps) {
  return (
    <Pressable style={styles.row} onPress={onPress} role="button">
      <Ionicons name={icon} size={20} color={colors.textSecondary} />
      <Text style={styles.rowText}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
    </Pressable>
  );
}

const showComingSoon = (feature: string) => {
  showAlert('Coming Soon', `${feature} is not yet available.`);
};

export default function SettingsScreen() {
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);
  const { isDesktop } = useResponsive();
  const { credits, error: creditsError, fetchCredits } = useCreditsStore();

  useEffect(() => { fetchCredits(); }, []);

  const doLogout = async () => {
    await logout();
    router.replace('/');
  };

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to log out?')) {
        doLogout();
      }
      return;
    }
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: doLogout },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, isDesktop && styles.contentDesktop]}>
      {/* Credits Card */}
      <Pressable style={styles.creditsCard} onPress={() => creditsError ? fetchCredits() : router.push('/purchase')} role="button">
        <View style={styles.creditsLeft}>
          <Ionicons name="diamond" size={24} color={creditsError ? colors.error : colors.accent} />
          <View>
            <Text style={styles.creditsLabel}>
              {creditsError ? 'Failed to load credits' : 'Credits remaining'}
            </Text>
            <Text style={styles.creditsValue}>
              {creditsError ? 'Tap to retry' : (credits ?? '—')}
            </Text>
          </View>
        </View>
        <View style={styles.creditsBuyBtn}>
          <Text style={styles.creditsBuyText}>Buy more</Text>
        </View>
      </Pressable>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.sectionCard}>
          <SettingsRow icon="card-outline" label="Manage Subscription" onPress={() => showComingSoon('Manage Subscription')} />
          <View style={styles.divider} />
          <SettingsRow icon="diamond-outline" label="Purchase Credits" onPress={() => router.push('/purchase')} />
          <View style={styles.divider} />
          <SettingsRow icon="receipt-outline" label="Payment History" onPress={() => router.push('/payment-history')} />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>App</Text>
        <View style={styles.sectionCard}>
          <SettingsRow icon="information-circle-outline" label="About Listic" onPress={() => router.push('/about')} />
          <View style={styles.divider} />
          <SettingsRow icon="shield-checkmark-outline" label="Privacy Policy" onPress={() => router.push('/privacy')} />
        </View>
      </View>

      <Pressable style={styles.logoutBtn} onPress={handleLogout} role="button">
        <Ionicons name="log-out-outline" size={20} color="#EA4335" />
        <Text style={styles.logoutText}>Log Out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: 40 },
  contentDesktop: {
    maxWidth: layout.contentMaxWidth,
    alignSelf: 'center',
    width: '100%',
  },
  section: { marginBottom: spacing.xl },
  sectionTitle: {
    fontSize: 12,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  rowText: {
    flex: 1,
    fontSize: fontSize.base,
    color: colors.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginHorizontal: spacing.lg,
  },
  logoutBtn: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(234, 67, 53, 0.3)',
    paddingVertical: spacing.lg,
    borderRadius: radii.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  logoutText: { color: '#EA4335', fontWeight: fontWeight.semibold, fontSize: fontSize.base },
  creditsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.accent,
    padding: spacing.xl,
    marginBottom: spacing.xl,
  },
  creditsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  creditsLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  creditsValue: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  creditsBuyBtn: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.full,
  },
  creditsBuyText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textOnAccent,
  },
});
