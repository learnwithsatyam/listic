import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useResponsive } from '../../src/hooks/useResponsive';
import { useCreditsStore } from '../../src/stores/credits-store';
import { colors, spacing, radii, fontSize, fontWeight, layout } from '../../src/theme';

const PLATFORMS = [
  { name: 'Amazon', emoji: '🛒', color: colors.amazon },
  { name: 'Flipkart', emoji: '🛍️', color: colors.flipkart },
  { name: 'Meesho', emoji: '📦', color: colors.meesho },
  { name: 'AJIO', emoji: '👗', color: colors.ajio },
  { name: 'Gumroad', emoji: '🎨', color: colors.gumroad },
];

export default function HomeScreen() {
  const router = useRouter();
  const { isDesktop } = useResponsive();
  const { credits, error: creditsError, fetchCredits } = useCreditsStore();

  useEffect(() => { fetchCredits(); }, []);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          isDesktop && styles.contentDesktop,
        ]}
      >
        <View style={isDesktop ? styles.innerDesktop : undefined}>
          {/* Hero */}
          <View style={styles.hero}>
            <View style={styles.heroTop}>
              <Text style={[styles.greeting, isDesktop && styles.greetingDesktop]}>
                Hello
                <Text style={styles.greetingAccent}>{' '}there</Text>
              </Text>
              <Pressable style={styles.creditsChip} onPress={() => creditsError ? fetchCredits() : router.push('/purchase')}>
                <Ionicons name="diamond" size={14} color={creditsError ? colors.error : colors.accent} />
                <Text style={[styles.creditsChipText, creditsError && { color: colors.error }]}>
                  {creditsError ? 'Tap to retry' : `${credits ?? '—'} credits`}
                </Text>
              </Pressable>
            </View>
            <Text style={styles.subtitle}>
              What product would you like to photograph today?
            </Text>
          </View>

          {/* Quick Action Cards */}
          <View style={[styles.cardGrid, isDesktop && styles.cardGridDesktop]}>
            <Pressable
              style={[styles.card, styles.cardAccent, isDesktop && styles.cardDesktop]}
              onPress={() => router.push('/upload')}
            >
              <Ionicons name="add-circle-outline" size={28} color={colors.accent} />
              <Text style={styles.cardTitle}>New Project</Text>
              <Text style={styles.cardDesc}>Upload a product image</Text>
            </Pressable>

            <Pressable
              style={[styles.card, isDesktop && styles.cardDesktop]}
              onPress={() => router.push('/(tabs)/studio')}
            >
              <Ionicons name="restaurant-outline" size={28} color={colors.textSecondary} />
              <Text style={styles.cardTitle}>Food Studio</Text>
              <Text style={styles.cardDesc}>One background, every dish</Text>
            </Pressable>

            <Pressable
              style={[styles.card, isDesktop && styles.cardDesktop]}
              onPress={() => router.push('/(tabs)/projects')}
            >
              <Ionicons name="time-outline" size={28} color={colors.textSecondary} />
              <Text style={styles.cardTitle}>Recent</Text>
              <Text style={styles.cardDesc}>View past projects</Text>
            </Pressable>
          </View>

          {/* How it works + Platforms side by side on desktop */}
          <View style={isDesktop ? styles.twoCol : undefined}>
            <View style={isDesktop ? styles.twoColMain : undefined}>
              <Text style={styles.sectionTitle}>How it works</Text>
              <View style={styles.stepsContainer}>
                {[
                  { icon: 'cloud-upload-outline' as const, text: 'Upload your product image' },
                  { icon: 'layers-outline' as const, text: 'Select target platforms' },
                  { icon: 'sparkles' as const, text: 'AI generates 6 images' },
                  { icon: 'download-outline' as const, text: 'Download & list instantly' },
                ].map((s, i) => (
                  <View key={i} style={styles.stepRow}>
                    <View style={styles.stepIcon}>
                      <Ionicons name={s.icon} size={18} color={colors.accent} />
                    </View>
                    <Text style={styles.stepText}>{s.text}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={isDesktop ? styles.twoColSide : undefined}>
              <Text style={styles.sectionTitle}>Supported platforms</Text>
              <View style={styles.platformRow}>
                {PLATFORMS.map((p) => (
                  <View key={p.name} style={styles.platformChip}>
                    <Text style={styles.platformEmoji}>{p.emoji}</Text>
                    <Text style={styles.platformName}>{p.name}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Action — Gemini-style input bar */}
      <View style={[styles.bottomBar, isDesktop && styles.bottomBarDesktop]}>
        <Pressable
          style={[styles.promptBar, isDesktop && styles.promptBarDesktop]}
          onPress={() => router.push('/upload')}
        >
          <Ionicons name="image-outline" size={20} color={colors.textSecondary} />
          <Text style={styles.promptText}>Upload a product image...</Text>
          <Ionicons name="arrow-up-circle" size={28} color={colors.accent} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl, paddingBottom: 100 },
  contentDesktop: {
    alignItems: 'center',
    paddingHorizontal: spacing['3xl'],
  },
  innerDesktop: {
    maxWidth: layout.wideMaxWidth,
    width: '100%',
  },
  hero: { marginBottom: spacing['3xl'], marginTop: spacing.lg },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  creditsChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.accentSoft,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
  },
  creditsChipText: {
    fontSize: fontSize.sm,
    color: colors.accent,
    fontWeight: fontWeight.medium,
  },
  greeting: {
    fontSize: fontSize['4xl'],
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
  },
  greetingDesktop: {
    fontSize: 48,
  },
  greetingAccent: {
    color: colors.accent,
  },
  subtitle: {
    fontSize: fontSize.lg,
    color: colors.textTertiary,
    marginTop: spacing.sm,
  },
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing['3xl'],
  },
  cardGridDesktop: {
    gap: spacing.xl,
  },
  card: {
    flexGrow: 1,
    flexBasis: 150,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.xl,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  cardDesktop: {
    padding: spacing['2xl'],
  },
  cardAccent: {
    borderColor: colors.accentSoft,
    backgroundColor: 'rgba(138, 180, 248, 0.06)',
  },
  cardTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  cardDesc: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  /* Two-column layout for desktop */
  twoCol: {
    flexDirection: 'row',
    gap: spacing['2xl'],
  },
  twoColMain: {
    flex: 3,
  },
  twoColSide: {
    flex: 2,
  },
  sectionTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.lg,
  },
  stepsContainer: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.xl,
    gap: spacing.lg,
    marginBottom: spacing['3xl'],
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  stepIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accentSoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepText: {
    fontSize: fontSize.base,
    color: colors.textPrimary,
    flex: 1,
  },
  platformRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing['3xl'],
  },
  platformChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.full,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  platformEmoji: { fontSize: 16 },
  platformName: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    backgroundColor: colors.bg,
    alignItems: 'center',
  },
  bottomBarDesktop: {
    paddingHorizontal: spacing['3xl'],
  },
  promptBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgSecondary,
    borderRadius: radii.full,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    width: '100%',
  },
  promptBarDesktop: {
    maxWidth: layout.contentMaxWidth,
  },
  promptText: {
    flex: 1,
    fontSize: fontSize.base,
    color: colors.textTertiary,
  },
});
