import { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { studioApi, FoodShoot, FoodShot } from '../../src/services/api';
import { showAlert } from '../../src/utils/alert';
import { downloadImage, toFileSlug } from '../../src/utils/download';
import { useCreditsStore } from '../../src/stores/credits-store';
import { useResponsive } from '../../src/hooks/useResponsive';
import { colors, spacing, radii, fontSize, fontWeight, layout } from '../../src/theme';

const POLL_INTERVAL = 4000;

const STATUS_COLOR: Record<string, string> = {
  completed: colors.success,
  processing: colors.warning,
  pending: colors.textTertiary,
  failed: colors.error,
};

export default function ShootScreen() {
  const { id, autostart } = useLocalSearchParams<{ id: string; autostart?: string }>();
  const router = useRouter();
  const { isDesktop, width } = useResponsive();
  const fetchCredits = useCreditsStore((s) => s.fetchCredits);

  const [shoot, setShoot] = useState<FoodShoot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<FoodShot | null>(null);
  const [downloadingAll, setDownloadingAll] = useState(false);

  const composeStarted = useRef(false);
  const [starting, setStarting] = useState(false);

  const load = useCallback(async () => {
    const { data } = await studioApi.getShoot(id);
    setShoot(data);
    return data;
  }, [id]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    (async () => {
      try {
        const data = await load();
        if (cancelled) return;

        // Coming straight from the create screen — kick generation off once.
        if (autostart === '1' && data.status === 'pending' && !composeStarted.current) {
          composeStarted.current = true;
          try {
            await studioApi.composeShoot(id);
            if (!cancelled) await load();
          } catch (err: any) {
            if (!cancelled) {
              setError(err.response?.data?.message || 'Could not start generating');
            }
          }
        }
      } catch (err: any) {
        if (!cancelled) setError(err.response?.data?.message || 'Could not load this shoot');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, load]);

  // Poll only while the API is actually working, so a shoot that never started
  // (or has finished) doesn't sit there hitting the server every few seconds.
  useEffect(() => {
    if (shoot?.status !== 'processing') return;

    const timer = setInterval(() => {
      load()
        .then((data) => {
          if (data.status !== 'processing') fetchCredits();
        })
        .catch(() => {
          /* transient network hiccup — the next tick retries */
        });
    }, POLL_INTERVAL);

    return () => clearInterval(timer);
  }, [shoot?.status, load, fetchCredits]);

  /** Start generation, or pick up the dishes that haven't been done yet. */
  const handleStart = async () => {
    setError(null);
    setStarting(true);
    try {
      await studioApi.composeShoot(id);
      await load();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Could not start generation');
    } finally {
      setStarting(false);
    }
  };

  const downloadShot = async (shot: FoodShot) => {
    try {
      await downloadImage(
        `/studio/shots/${shot.id}/download`,
        `listic_${toFileSlug(shot.dishName)}.png`,
      );
    } catch {
      showAlert('Download failed', 'Could not download this image. Please try again.');
    }
  };

  const downloadBackground = async () => {
    if (!shoot) return;
    try {
      await downloadImage(
        `/studio/backgrounds/${shoot.background.id}/download`,
        `listic_bg_${toFileSlug(shoot.background.name)}.png`,
      );
    } catch {
      showAlert('Download failed', 'Could not download the background. Please try again.');
    }
  };

  const downloadAll = async () => {
    if (!shoot) return;
    setDownloadingAll(true);
    try {
      for (const shot of shoot.shots.filter((s) => s.status === 'completed')) {
        await downloadShot(shot);
        // Browsers throttle rapid successive downloads.
        if (Platform.OS === 'web') await new Promise((r) => setTimeout(r, 500));
      }
    } finally {
      setDownloadingAll(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (!shoot) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
        <Text style={styles.emptyText}>{error || 'Shoot not found'}</Text>
      </View>
    );
  }

  const done = shoot.shots.filter((s) => s.status === 'completed');
  const outstanding = shoot.shots.filter((s) => s.status !== 'completed');
  const processing = shoot.status === 'processing';
  const canStart = !processing && outstanding.length > 0;

  const cols = isDesktop ? 3 : 2;
  const containerWidth = isDesktop
    ? layout.wideMaxWidth - spacing.lg * 2
    : width - spacing.lg * 2;
  const itemSize = (containerWidth - spacing.sm * (cols - 1)) / cols;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, isDesktop && styles.contentDesktop]}
    >
      <Text style={styles.title}>{shoot.name}</Text>
      <Text style={styles.subtitle}>
        {done.length} of {shoot.shots.length} ready · {shoot.background.name}
      </Text>

      {error && (
        <View style={styles.banner}>
          <Ionicons name="alert-circle" size={18} color={colors.error} />
          <Text style={styles.bannerText}>{error}</Text>
        </View>
      )}

      {/* Progress */}
      {processing && (
        <View style={styles.progressCard}>
          <ActivityIndicator color={colors.accent} />
          <View style={{ flex: 1 }}>
            <Text style={styles.progressTitle}>Plating your dishes…</Text>
            <Text style={styles.progressText}>
              Each dish is placed into your background one at a time. This takes about
              20–30 seconds per photo.
            </Text>
          </View>
        </View>
      )}

      {shoot.status === 'failed' && (
        <View style={styles.failedCard}>
          <Ionicons name="alert-circle-outline" size={20} color={colors.error} />
          <View style={{ flex: 1 }}>
            <Text style={styles.failedTitle}>Generation failed</Text>
            <Text style={styles.failedText}>
              {shoot.errorMessage || 'Something went wrong. Your credits were refunded.'}
            </Text>
          </View>
        </View>
      )}

      {/* Background strip — downloadable on its own */}
      <View style={styles.bgCard}>
        <Image source={{ uri: shoot.background.imageUrl }} style={styles.bgThumb} />
        <View style={{ flex: 1 }}>
          <Text style={styles.bgName} numberOfLines={1}>
            {shoot.background.name}
          </Text>
          <Text style={styles.bgMeta}>
            Background · {shoot.background.source === 'generated' ? 'AI generated' : 'Uploaded'}
          </Text>
        </View>
        <Pressable style={styles.iconBtn} onPress={downloadBackground}>
          <Ionicons name="download-outline" size={20} color={colors.accent} />
        </Pressable>
      </View>

      {/* Selected preview */}
      {selected?.resultImageUrl && (
        <View style={styles.preview}>
          <Image
            source={{ uri: selected.resultImageUrl }}
            style={styles.previewImage}
            resizeMode="contain"
          />
          <View style={styles.previewMeta}>
            <Text style={styles.previewLabel} numberOfLines={1}>
              {selected.dishName}
            </Text>
            <Pressable style={styles.downloadBtn} onPress={() => downloadShot(selected)}>
              <Ionicons name="download-outline" size={18} color={colors.textOnAccent} />
              <Text style={styles.downloadBtnText}>Download</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Grid */}
      <View style={styles.grid}>
        {shoot.shots.map((shot) => {
          const ready = shot.status === 'completed' && !!shot.resultImageUrl;
          return (
            <Pressable
              key={shot.id}
              style={[
                styles.gridItem,
                { width: itemSize, height: itemSize },
                selected?.id === shot.id && styles.gridItemActive,
              ]}
              onPress={() => ready && setSelected(shot)}
            >
              <Image
                source={{ uri: ready ? shot.resultImageUrl : shot.sourceImageUrl }}
                style={[styles.gridImage, !ready && styles.gridImagePending]}
                resizeMode="cover"
              />
              {!ready && (
                <View style={styles.gridOverlay}>
                  {shot.status === 'failed' ? (
                    <Ionicons name="close-circle" size={24} color={colors.error} />
                  ) : (
                    <ActivityIndicator color={colors.accent} />
                  )}
                </View>
              )}
              <View style={styles.gridCaption}>
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: STATUS_COLOR[shot.status] || colors.textTertiary },
                  ]}
                />
                <Text style={styles.gridCaptionText} numberOfLines={1}>
                  {shot.dishName}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {canStart && (
        <Pressable
          style={[styles.secondaryBtn, starting && styles.btnDisabled]}
          onPress={handleStart}
          disabled={starting}
        >
          {starting ? (
            <ActivityIndicator color={colors.accent} />
          ) : (
            <>
              <Ionicons
                name={done.length > 0 ? 'refresh' : 'sparkles'}
                size={20}
                color={colors.accent}
              />
              <Text style={styles.secondaryBtnText}>
                {done.length > 0 ? 'Retry' : 'Generate'} {outstanding.length} dish
                {outstanding.length === 1 ? '' : 'es'} · {outstanding.length} credit
                {outstanding.length === 1 ? '' : 's'}
              </Text>
            </>
          )}
        </Pressable>
      )}

      {done.length > 0 && (
        <Pressable
          style={[styles.primaryBtn, downloadingAll && styles.btnDisabled]}
          onPress={downloadAll}
          disabled={downloadingAll}
        >
          {downloadingAll ? (
            <ActivityIndicator color={colors.textOnAccent} />
          ) : (
            <>
              <Ionicons name="cloud-download-outline" size={20} color={colors.textOnAccent} />
              <Text style={styles.primaryBtnText}>
                Download all {done.length} photo{done.length === 1 ? '' : 's'}
              </Text>
            </>
          )}
        </Pressable>
      )}

      <Pressable style={styles.ghostBtn} onPress={() => router.push('/shoots/new')}>
        <Text style={styles.ghostBtnText}>Start another shoot</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: 48 },
  contentDesktop: {
    maxWidth: layout.wideMaxWidth,
    alignSelf: 'center',
    width: '100%',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bg,
    padding: spacing.xl,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: fontSize.base,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  title: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
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
  progressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    backgroundColor: colors.accentSoft,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  progressTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  progressText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },
  failedCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: 'rgba(242, 139, 130, 0.10)',
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  failedTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.error,
  },
  failedText: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  bgCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radii.md,
    padding: spacing.sm,
    marginBottom: spacing.xl,
  },
  bgThumb: { width: 56, height: 56, borderRadius: radii.sm, resizeMode: 'cover' },
  bgName: {
    fontSize: fontSize.base,
    color: colors.textPrimary,
    fontWeight: fontWeight.medium,
  },
  bgMeta: { fontSize: fontSize.xs, color: colors.textTertiary, marginTop: 2 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accentSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.xs,
  },
  preview: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    overflow: 'hidden',
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  previewImage: { width: '100%', height: 320 },
  previewMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  previewLabel: {
    flex: 1,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.full,
    gap: spacing.xs,
  },
  downloadBtnText: {
    color: colors.textOnAccent,
    fontWeight: fontWeight.semibold,
    fontSize: fontSize.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  gridItem: {
    borderRadius: radii.md,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.transparent,
  },
  gridItemActive: { borderColor: colors.accent },
  gridImage: { width: '100%', height: '100%' },
  gridImagePending: { opacity: 0.35 },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridCaption: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  gridCaptionText: { flex: 1, color: colors.white, fontSize: fontSize.xs },
  primaryBtn: {
    flexDirection: 'row',
    backgroundColor: colors.accent,
    paddingVertical: spacing.lg,
    borderRadius: radii.full,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  primaryBtnText: {
    color: colors.textOnAccent,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  secondaryBtn: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.accent,
    paddingVertical: spacing.lg,
    borderRadius: radii.full,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  secondaryBtnText: {
    color: colors.accent,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  ghostBtn: { alignItems: 'center', paddingVertical: spacing.lg, marginTop: spacing.xs },
  ghostBtnText: { color: colors.textSecondary, fontSize: fontSize.md },
  btnDisabled: { opacity: 0.5 },
});
