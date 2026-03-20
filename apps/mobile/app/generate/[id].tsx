import { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { imagesApi } from '../../src/services/api';
import { useResponsive } from '../../src/hooks/useResponsive';
import { colors, spacing, radii, fontSize, fontWeight, layout } from '../../src/theme';

const IMAGE_TYPE_LABELS: Record<string, string> = {
  main: 'Main product shot',
  lifestyle: 'Lifestyle image',
  closeup: 'Close-up details',
  scale: 'Scale reference',
  angle: 'Angled view',
  model: 'Model shot',
};

const TOTAL_IMAGES = 6;
const POLL_INTERVAL = 4000;

export default function GenerateScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isDesktop } = useResponsive();

  const [completedCount, setCompletedCount] = useState(0);
  const [currentLabel, setCurrentLabel] = useState('Starting generation…');
  const [error, setError] = useState<string | null>(null);
  const generationStarted = useRef(false);

  const pulseAnim = useRef(new Animated.Value(0.4)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Pulsing glow
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 1200,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  // Fade text when label changes
  const animateLabel = useCallback(() => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim]);

  // Kick off generation + poll for progress
  useEffect(() => {
    if (!id || generationStarted.current) return;
    generationStarted.current = true;

    // Fire generation (returns immediately since backend is non-blocking)
    imagesApi.generateImages(id).catch((err: any) => {
      setError(err.response?.data?.message || 'Failed to start generation');
    });

    // Poll project status
    const interval = setInterval(async () => {
      try {
        const { data: project } = await imagesApi.getProject(id);
        const images = project.generatedImages || [];
        const count = images.length;

        if (count !== completedCount) {
          setCompletedCount(count);
        }

        // Determine current step label
        if (project.status === 'completed') {
          setCurrentLabel('All images ready!');
          clearInterval(interval);
          setTimeout(() => router.replace(`/results/${id}`), 800);
          return;
        }

        if (project.status === 'failed') {
          clearInterval(interval);
          setError(project.errorMessage || 'Image generation failed');
          return;
        }

        // Show which image types are done and what's next
        if (count > 0) {
          const lastType = images[count - 1].imageType;
          const lastLabel = IMAGE_TYPE_LABELS[lastType] || lastType;
          if (count < TOTAL_IMAGES) {
            setCurrentLabel(`✓ ${lastLabel} done — generating next…`);
          } else {
            setCurrentLabel('Finishing up…');
          }
          animateLabel();
        } else {
          setCurrentLabel('Analyzing your product image…');
        }
      } catch {
        // Silently retry on network hiccup
      }
    }, POLL_INTERVAL);

    return () => clearInterval(interval);
  }, [id]);

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.errorIcon}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
        </View>
        <Text style={styles.errorTitle}>Generation Failed</Text>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  const progress = completedCount / TOTAL_IMAGES;

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.glowOrb, { opacity: pulseAnim }]} />

      <View style={styles.iconWrap}>
        <Ionicons name="sparkles" size={32} color={colors.accent} />
      </View>

      <Text style={styles.title}>Creating your images</Text>
      <Animated.Text style={[styles.step, { opacity: fadeAnim }]}>
        {currentLabel}
      </Animated.Text>

      <Text style={styles.counter}>
        {completedCount} of {TOTAL_IMAGES} images generated
      </Text>

      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            { width: `${Math.max(progress * 100, 3)}%` },
          ]}
        />
      </View>

      <Text style={styles.hint}>
        This may take 1–2 minutes
      </Text>

      <View style={styles.dotsRow}>
        {Array.from({ length: TOTAL_IMAGES }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i < completedCount && styles.dotActive,
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing['3xl'],
  },
  glowOrb: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: colors.accentSoft,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.accentSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing['2xl'],
  },
  title: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  step: {
    fontSize: fontSize.base,
    color: colors.accent,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  counter: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing['2xl'],
  },
  progressBar: {
    width: '100%',
    maxWidth: layout.contentMaxWidth,
    height: 4,
    backgroundColor: colors.bgTertiary,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: spacing.xl,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 2,
  },
  hint: {
    fontSize: fontSize.sm,
    color: colors.textTertiary,
    textAlign: 'center',
    marginBottom: spacing['2xl'],
  },
  dotsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.bgTertiary,
  },
  dotActive: {
    backgroundColor: colors.accent,
  },
  errorIcon: {
    marginBottom: spacing.lg,
  },
  errorTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.error,
    marginBottom: spacing.sm,
  },
  errorText: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
