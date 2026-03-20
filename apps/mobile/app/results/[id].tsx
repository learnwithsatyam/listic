import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Share,
  Platform,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import * as FileSystem from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';
import { imagesApi } from '../../src/services/api';
import { useResponsive } from '../../src/hooks/useResponsive';
import { colors, spacing, radii, fontSize, fontWeight, layout } from '../../src/theme';

const IMAGE_TYPE_LABELS: Record<string, string> = {
  main: 'Main Shot',
  lifestyle: 'Lifestyle',
  closeup: 'Close-up',
  scale: 'Size Ref',
  angle: 'Alt Angle',
  model: 'Model',
};

const IMAGE_TYPE_ICONS: Record<string, string> = {
  main: '📸',
  lifestyle: '🏡',
  closeup: '🔍',
  scale: '📏',
  angle: '📐',
  model: '👤',
};

interface GeneratedImage {
  id: string;
  imageUrl: string;
  imageType: string;
  platform: string;
  width: number;
  height: number;
}

interface Project {
  id: string;
  productName: string;
  status: string;
  targetPlatforms: string[];
  generatedImages: GeneratedImage[];
}

export default function ResultsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(
    null,
  );
  const { isDesktop, width } = useResponsive();

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      try {
        const { data } = await imagesApi.getProject(id);
        setProject(data);
      } catch {
        // handled
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleDownload = async (img: GeneratedImage) => {
    if (Platform.OS === 'web') {
      window.open(img.imageUrl, '_blank');
      return;
    }

    const filename = `listic_${img.imageType}_${img.id}.png`;
    const fileUri = `${FileSystem.documentDirectory}${filename}`;
    await FileSystem.downloadAsync(img.imageUrl, fileUri);
    await Share.share({ url: fileUri });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (!project) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>Project not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, isDesktop && styles.contentDesktop]}>
      <Text style={styles.title}>{project.productName}</Text>
      <Text style={styles.subtitle}>
        {project.generatedImages.length} images ·{' '}
        {project.targetPlatforms.join(', ')}
      </Text>

      {/* Full-size selected preview */}
      {selectedImage && (
        <View style={styles.preview}>
          <Image
            source={{ uri: selectedImage.imageUrl }}
            style={styles.previewImage}
            resizeMode="contain"
          />
          <View style={styles.previewMeta}>
            <Text style={styles.previewLabel}>
              {IMAGE_TYPE_ICONS[selectedImage.imageType] || '📷'}{' '}
              {IMAGE_TYPE_LABELS[selectedImage.imageType] ||
                selectedImage.imageType}
            </Text>
            <Pressable
              style={styles.downloadBtn}
              onPress={() => handleDownload(selectedImage)}
            >
              <Ionicons name="download-outline" size={18} color={colors.textOnAccent} />
              <Text style={styles.downloadBtnText}>Download</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Image Grid */}
      <View style={styles.grid}>
        {project.generatedImages.map((img) => {
          const cols = isDesktop ? 3 : 2;
          const gap = spacing.sm;
          const containerWidth = isDesktop ? layout.wideMaxWidth - spacing.lg * 2 : width - spacing.lg * 2;
          const itemSize = (containerWidth - gap * (cols - 1)) / cols;
          return (
            <Pressable
              key={img.id}
              style={[
                styles.gridItem,
                { width: itemSize, height: itemSize },
                selectedImage?.id === img.id && styles.gridItemActive,
              ]}
              onPress={() => setSelectedImage(img)}
            >
              <Image
                source={{ uri: img.imageUrl }}
                style={styles.gridImage}
                resizeMode="cover"
              />
              <View style={styles.gridBadge}>
                <Text style={styles.gridBadgeText}>
                  {IMAGE_TYPE_ICONS[img.imageType] || '📷'}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* Download All */}
      <Pressable
        style={styles.downloadAllBtn}
        onPress={() => {
          project.generatedImages.forEach((img) => handleDownload(img));
        }}
      >
        <Ionicons name="cloud-download-outline" size={20} color={colors.textOnAccent} />
        <Text style={styles.downloadAllText}>Download All</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bg,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: fontSize.base,
  },
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: 40 },
  contentDesktop: {
    maxWidth: layout.wideMaxWidth,
    alignSelf: 'center',
    width: '100%',
  },
  title: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
    marginTop: spacing.xs,
  },
  preview: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    overflow: 'hidden',
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  previewImage: {
    width: '100%',
    height: 300,
  },
  previewMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
  },
  previewLabel: {
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
    marginBottom: spacing['2xl'],
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
  gridBadge: {
    position: 'absolute',
    bottom: spacing.sm,
    left: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  gridBadgeText: {
    fontSize: 14,
  },
  downloadAllBtn: {
    flexDirection: 'row',
    backgroundColor: colors.accent,
    paddingVertical: spacing.lg,
    borderRadius: radii.full,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  downloadAllText: {
    color: colors.textOnAccent,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
});
