import { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { imagesApi } from '../../src/services/api';
import { useResponsive } from '../../src/hooks/useResponsive';
import { colors, spacing, radii, fontSize, fontWeight, layout } from '../../src/theme';

interface Project {
  id: string;
  productName: string;
  status: string;
  originalImageUrl: string;
  targetPlatforms: string[];
  createdAt: string;
  generatedImages: { id: string; imageUrl: string }[];
}

const STATUS_COLORS: Record<string, string> = {
  completed: '#34A853',
  processing: '#FBBC04',
  failed: '#EA4335',
};

export default function ProjectsScreen() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isDesktop } = useResponsive();

  const loadProjects = async () => {
    setError(null);
    setLoading(true);
    try {
      const { data } = await imagesApi.getUserProjects();
      setProjects(data);
    } catch {
      setError('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Ionicons name="cloud-offline-outline" size={48} color={colors.error} />
        <Text style={styles.emptyTitle}>{error}</Text>
        <Text style={styles.emptyText}>
          Check your connection and try again
        </Text>
        <Pressable style={styles.btn} onPress={loadProjects}>
          <Ionicons name="refresh" size={20} color={colors.textOnAccent} />
          <Text style={styles.btnText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  if (projects.length === 0) {
    return (
      <View style={styles.center}>
        <Ionicons name="folder-open-outline" size={48} color={colors.textSecondary} />
        <Text style={styles.emptyTitle}>No projects yet</Text>
        <Text style={styles.emptyText}>
          Upload your first product image to get started
        </Text>
        <Pressable style={styles.btn} onPress={() => router.push('/upload')}>
          <Ionicons name="add" size={20} color={colors.textOnAccent} />
          <Text style={styles.btnText}>Create Project</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={[styles.listContent, isDesktop && styles.listContentDesktop]}
      data={projects}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <Pressable
          style={styles.card}
          onPress={() => router.push(`/results/${item.id}`)}
        >
          <Image
            source={{ uri: item.originalImageUrl }}
            style={styles.thumb}
          />
          <View style={styles.cardInfo}>
            <Text style={styles.cardTitle}>{item.productName}</Text>
            <Text style={styles.cardPlatforms}>
              {item.targetPlatforms.join(' · ')}
            </Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: (STATUS_COLORS[item.status] || colors.textSecondary) + '22' },
              ]}
            >
              <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[item.status] || colors.textSecondary }]} />
              <Text style={[styles.statusText, { color: STATUS_COLORS[item.status] || colors.textSecondary }]}>
                {item.status}
              </Text>
            </View>
          </View>
          <View style={styles.imageCountBadge}>
            <Text style={styles.imageCountNum}>
              {item.generatedImages?.length || 0}
            </Text>
            <Text style={styles.imageCountLabel}>imgs</Text>
          </View>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bg,
    padding: spacing['2xl'],
  },
  emptyTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    marginTop: spacing.lg,
  },
  emptyText: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.full,
    gap: spacing.xs,
  },
  btnText: { color: colors.textOnAccent, fontWeight: fontWeight.semibold, fontSize: fontSize.lg },
  list: { flex: 1, backgroundColor: colors.bg },
  listContent: { padding: spacing.lg, gap: spacing.sm },
  listContentDesktop: {
    maxWidth: layout.wideMaxWidth,
    alignSelf: 'center',
    width: '100%',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: radii.md,
    backgroundColor: colors.bgSecondary,
  },
  cardInfo: { flex: 1, marginLeft: spacing.md },
  cardTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  cardPlatforms: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    marginTop: spacing.xs,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: fontWeight.semibold,
    textTransform: 'capitalize',
  },
  imageCountBadge: {
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  imageCountNum: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.accent,
  },
  imageCountLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
