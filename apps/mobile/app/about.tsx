import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useResponsive } from '../src/hooks/useResponsive';
import { colors, spacing, radii, fontSize, fontWeight, layout } from '../src/theme';

const VERSION = '1.0.0';

export default function AboutScreen() {
  const { isDesktop } = useResponsive();

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, isDesktop && styles.contentDesktop]}>
      {/* Hero */}
      <View style={styles.hero}>
        <View style={styles.iconWrap}>
          <Ionicons name="sparkles" size={32} color={colors.accent} />
        </View>
        <Text style={styles.brand}>Listic</Text>
        <Text style={styles.version}>Version {VERSION}</Text>
      </View>

      {/* Story */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Why Listic?</Text>
        <Text style={styles.cardBody}>
          Listic was born from a simple need — my mom wanted to sell her products online on marketplaces like Amazon, Flipkart, Meesho, and AJIO, but getting professional-quality product photos was expensive and time-consuming.
        </Text>
        <Text style={styles.cardBody}>
          So I built Listic: an AI-powered tool that takes a single product photo and generates 6 marketplace-ready images — with the right backgrounds, angles, and compliance specs — in under two minutes.
        </Text>
        <Text style={styles.cardBody}>
          No studio. No photographer. Just upload and go.
        </Text>
      </View>

      {/* What it does */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>What Listic does</Text>
        <View style={styles.featureList}>
          <Feature icon="camera-outline" text="Generates 6 professional product images from one photo" />
          <Feature icon="storefront-outline" text="Optimized for Amazon, Flipkart, Meesho, AJIO & Gumroad" />
          <Feature icon="resize-outline" text="Auto-sized to each platform's requirements" />
          <Feature icon="images-outline" text="Main shot, lifestyle, close-up, scale, angle & model views" />
          <Feature icon="flash-outline" text="Powered by Google Gemini AI" />
        </View>
      </View>

      {/* Built by */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Built with</Text>
        <View style={styles.techRow}>
          <TechBadge label="React Native" />
          <TechBadge label="Expo" />
          <TechBadge label="NestJS" />
          <TechBadge label="Google Gemini" />
          <TechBadge label="TypeScript" />
          <TechBadge label="Neon Postgres" />
        </View>
      </View>

      <Text style={styles.footer}>Made with ❤️ for small sellers everywhere</Text>
    </ScrollView>
  );
}

function Feature({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.featureRow}>
      <Ionicons name={icon} size={18} color={colors.accent} />
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

function TechBadge({ label }: { label: string }) {
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: 60 },
  contentDesktop: {
    maxWidth: layout.contentMaxWidth,
    alignSelf: 'center',
    width: '100%',
  },
  hero: {
    alignItems: 'center',
    paddingVertical: spacing['3xl'],
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.accentSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  brand: {
    fontSize: fontSize['3xl'],
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  version: {
    fontSize: fontSize.sm,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.xl,
    marginBottom: spacing.lg,
  },
  cardTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  cardBody: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  featureList: {
    gap: spacing.md,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  featureText: {
    flex: 1,
    fontSize: fontSize.base,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  techRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  badge: {
    backgroundColor: colors.accentSoft,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
  },
  badgeText: {
    fontSize: fontSize.sm,
    color: colors.accent,
    fontWeight: fontWeight.medium,
  },
  footer: {
    fontSize: fontSize.sm,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing['3xl'],
  },
});
