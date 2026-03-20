import { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../src/stores/auth-store';
import { useResponsive } from '../src/hooks/useResponsive';
import { colors, spacing, radii, fontSize, fontWeight, layout } from '../src/theme';

export default function LandingScreen() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();
  const { isDesktop } = useResponsive();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/(tabs)/home');
    }
  }, [isLoading, isAuthenticated]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={[styles.container, isDesktop && styles.containerDesktop]}>
      <View style={[styles.heroWrapper, isDesktop && styles.heroWrapperDesktop]}>
        <View style={styles.hero}>
          <View style={styles.logoRow}>
            <View style={styles.logoDot} />
            <Text style={[styles.logo, isDesktop && styles.logoDesktop]}>Listic</Text>
          </View>
          <Text style={[styles.tagline, isDesktop && styles.taglineDesktop]}>
            Create marketplace-ready{'\n'}product images with AI
          </Text>
          <Text style={[styles.sub, isDesktop && styles.subDesktop]}>
            Upload a product photo, get 6 platform-compliant images for Amazon,
            Flipkart, Meesho, AJIO & Gumroad — instantly.
          </Text>

          <View style={styles.pillRow}>
            {['Amazon', 'Flipkart', 'Meesho', 'AJIO', 'Gumroad'].map((p) => (
              <View key={p} style={styles.pill}>
                <Text style={styles.pillText}>{p}</Text>
              </View>
            ))}
          </View>

          <View style={[styles.actions, isDesktop && styles.actionsDesktop]}>
            <Pressable
              style={[styles.primaryBtn, isDesktop && styles.primaryBtnDesktop]}
              onPress={() => router.push('/(auth)/register')}
            >
              <Text style={styles.primaryBtnText}>Get Started</Text>
            </Pressable>
            <Pressable
              style={[styles.secondaryBtn, isDesktop && styles.secondaryBtnDesktop]}
              onPress={() => router.push('/(auth)/login')}
            >
              <Text style={styles.secondaryBtnText}>Sign In</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: 'center',
    padding: spacing['2xl'],
  },
  containerDesktop: {
    alignItems: 'center',
    padding: spacing['4xl'],
  },
  heroWrapper: {
    width: '100%',
  },
  heroWrapperDesktop: {
    maxWidth: layout.contentMaxWidth,
  },
  hero: { alignItems: 'center', marginBottom: spacing['4xl'] },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing['3xl'],
    gap: spacing.sm,
  },
  logoDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accent,
  },
  logo: {
    fontSize: fontSize['5xl'],
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    letterSpacing: -1,
  },
  logoDesktop: {
    fontSize: 56,
  },
  tagline: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.medium,
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: 30,
    marginBottom: spacing.lg,
  },
  taglineDesktop: {
    fontSize: 36,
    lineHeight: 46,
  },
  sub: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: spacing.lg,
  },
  subDesktop: {
    fontSize: fontSize.lg,
    lineHeight: 28,
    maxWidth: 540,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing['3xl'],
    marginBottom: spacing['4xl'],
  },
  pill: {
    backgroundColor: colors.bgTertiary,
    borderRadius: radii.full,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.lg,
  },
  pillText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  actions: { gap: spacing.md, width: '100%' },
  actionsDesktop: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    width: 'auto',
  },
  primaryBtn: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.lg,
    borderRadius: radii.full,
    alignItems: 'center',
  },
  primaryBtnDesktop: {
    paddingHorizontal: spacing['4xl'],
  },
  primaryBtnText: {
    color: colors.textOnAccent,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.lg,
    borderRadius: radii.full,
    alignItems: 'center',
  },
  secondaryBtnDesktop: {
    paddingHorizontal: spacing['4xl'],
  },
  secondaryBtnText: {
    color: colors.accent,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.medium,
  },
});
