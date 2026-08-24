import { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  studioApi,
  StudioBackground,
  FoodShoot,
} from '../../src/services/api';
import { showAlert } from '../../src/utils/alert';
import { downloadImage, toFileSlug } from '../../src/utils/download';
import { useResponsive } from '../../src/hooks/useResponsive';
import { colors, spacing, radii, fontSize, fontWeight, layout } from '../../src/theme';

const STATUS_COLOR: Record<string, string> = {
  completed: colors.success,
  processing: colors.warning,
  pending: colors.textTertiary,
  failed: colors.error,
};

export default function StudioScreen() {
  const router = useRouter();
  const { isDesktop } = useResponsive();

  const [backgrounds, setBackgrounds] = useState<StudioBackground[]>([]);
  const [shoots, setShoots] = useState<FoodShoot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [bg, sh] = await Promise.all([
        studioApi.getBackgrounds(),
        studioApi.getShoots(),
      ]);
      setBackgrounds(bg.data);
      setShoots(sh.data);
    } catch {
      setError('Could not load your studio');
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh on every visit so newly created backgrounds/shoots show up.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const downloadBackground = async (bg: StudioBackground) => {
    try {
      await downloadImage(
        `/studio/backgrounds/${bg.id}/download`,
        `listic_bg_${toFileSlug(bg.name)}.png`,
      );
    } catch {
      showAlert('Download failed', 'Could not download the background. Please try again.');
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, isDesktop && styles.contentDesktop]}
    >
      <View style={isDesktop ? styles.innerDesktop : undefined}>
        <Text style={styles.heroTitle}>Food Studio</Text>
        <Text style={styles.heroSubtitle}>
          One background, every dish. Put your cake, pizza, thali and maggi into the
          same scene so your Instagram grid looks like a single shoot.
        </Text>

        {error && (
          <Pressable style={styles.banner} onPress={load}>
            <Ionicons name="alert-circle" size={18} color={colors.error} />
            <Text style={styles.bannerText}>{error} — tap to retry</Text>
          </Pressable>
        )}

        {/* Actions */}
        <View style={styles.cardGrid}>
          <Pressable
            style={[styles.card, styles.cardAccent]}
            onPress={() => router.push('/backgrounds/new')}
          >
            <Ionicons name="color-palette-outline" size={28} color={colors.accent} />
            <Text style={styles.cardTitle}>New Background</Text>
            <Text style={styles.cardDesc}>Describe one, or upload your own</Text>
          </Pressable>

          <Pressable style={styles.card} onPress={() => router.push('/shoots/new')}>
            <Ionicons name="restaurant-outline" size={28} color={colors.textSecondary} />
            <Text style={styles.cardTitle}>New Shoot</Text>
            <Text style={styles.cardDesc}>Add dishes to a background</Text>
          </Pressable>
        </View>

        {/* Backgrounds */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your backgrounds</Text>
          {backgrounds.length > 0 && (
            <Pressable onPress={() => router.push('/backgrounds/new')}>
              <Text style={styles.linkText}>+ New</Text>
            </Pressable>
          )}
        </View>

        {backgrounds.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyBoxText}>
              No backgrounds yet. Create one and every dish you shoot will share it.
            </Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bgScroll}>
            {backgrounds.map((bg) => (
              <View key={bg.id} style={styles.bgCard}>
                <Image source={{ uri: bg.imageUrl }} style={styles.bgThumb} />
                <View style={styles.bgFooter}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.bgName} numberOfLines={1}>
                      {bg.name}
                    </Text>
                    <Text style={styles.bgMeta}>
                      {bg.source === 'generated' ? 'AI generated' : 'Uploaded'}
                    </Text>
                  </View>
                  <Pressable style={styles.iconBtn} onPress={() => downloadBackground(bg)}>
                    <Ionicons name="download-outline" size={16} color={colors.accent} />
                  </Pressable>
                </View>
              </View>
            ))}
          </ScrollView>
        )}

        {/* Shoots */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your shoots</Text>
        </View>

        {shoots.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyBoxText}>
              No shoots yet. Pick a background, add your food photos, and Listic places
              each dish into the scene.
            </Text>
          </View>
        ) : (
          <View style={styles.shootList}>
            {shoots.map((shoot) => {
              const done = shoot.shots.filter((s) => s.status === 'completed').length;
              const cover =
                shoot.shots.find((s) => s.resultImageUrl)?.resultImageUrl ||
                shoot.background.imageUrl;
              return (
                <Pressable
                  key={shoot.id}
                  style={styles.shootCard}
                  onPress={() => router.push(`/shoots/${shoot.id}`)}
                >
                  <Image source={{ uri: cover }} style={styles.shootThumb} />
                  <View style={styles.shootInfo}>
                    <Text style={styles.shootName} numberOfLines={1}>
                      {shoot.name}
                    </Text>
                    <Text style={styles.shootMeta} numberOfLines={1}>
                      {done}/{shoot.shots.length} photos · {shoot.background.name}
                    </Text>
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor:
                            (STATUS_COLOR[shoot.status] || colors.textSecondary) + '22',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          { color: STATUS_COLOR[shoot.status] || colors.textSecondary },
                        ]}
                      >
                        {shoot.status}
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
                </Pressable>
              );
            })}
          </View>
        )}

        {/* How it works */}
        <Text style={[styles.sectionTitle, { marginTop: spacing['3xl'] }]}>How it works</Text>
        <View style={styles.stepsContainer}>
          {[
            {
              icon: 'color-palette-outline' as const,
              text: 'Upload a background, or describe one and let AI make it',
            },
            {
              icon: 'restaurant-outline' as const,
              text: 'Add your food photos and name each dish',
            },
            {
              icon: 'sparkles' as const,
              text: 'Each dish is placed into the scene with matching light and shadow',
            },
            {
              icon: 'download-outline' as const,
              text: 'Download the photos — and the plain background on its own',
            },
          ].map((step, i) => (
            <View key={i} style={styles.stepRow}>
              <View style={styles.stepIcon}>
                <Ionicons name={step.icon} size={18} color={colors.accent} />
              </View>
              <Text style={styles.stepText}>{step.text}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl, paddingBottom: 48 },
  contentDesktop: { alignItems: 'center', paddingHorizontal: spacing['3xl'] },
  innerDesktop: { maxWidth: layout.wideMaxWidth, width: '100%' },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bg,
  },
  heroTitle: {
    fontSize: fontSize['3xl'],
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
    lineHeight: 22,
    marginTop: spacing.sm,
    marginBottom: spacing['2xl'],
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(242, 139, 130, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(242, 139, 130, 0.3)',
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  bannerText: { flex: 1, color: colors.error, fontSize: fontSize.sm },
  cardGrid: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.xl,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
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
  cardDesc: { fontSize: fontSize.sm, color: colors.textSecondary },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing['2xl'],
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  linkText: {
    fontSize: fontSize.sm,
    color: colors.accent,
    fontWeight: fontWeight.semibold,
  },
  emptyBox: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  emptyBoxText: { fontSize: fontSize.md, color: colors.textTertiary, lineHeight: 20 },
  bgScroll: { marginBottom: spacing.xs },
  bgCard: {
    width: 160,
    marginRight: spacing.md,
    borderRadius: radii.md,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  bgThumb: { width: '100%', height: 100, resizeMode: 'cover' },
  bgFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
  },
  bgName: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    fontWeight: fontWeight.medium,
  },
  bgMeta: { fontSize: fontSize.xs, color: colors.textTertiary, marginTop: 1 },
  iconBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.accentSoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shootList: { gap: spacing.md },
  shootCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  shootThumb: { width: 64, height: 64, borderRadius: radii.md, resizeMode: 'cover' },
  shootInfo: { flex: 1, gap: 2 },
  shootName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  shootMeta: { fontSize: fontSize.sm, color: colors.textSecondary },
  statusBadge: {
    alignSelf: 'flex-start',
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    marginTop: spacing.xs,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    textTransform: 'capitalize',
  },
  stepsContainer: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.xl,
    gap: spacing.lg,
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stepIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accentSoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepText: { fontSize: fontSize.base, color: colors.textPrimary, flex: 1 },
});
