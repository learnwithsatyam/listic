import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  Pressable,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  studioApi,
  StudioBackground,
  StudioFormat,
} from '../../src/services/api';
import { showAlert } from '../../src/utils/alert';
import { downloadImage, toFileSlug } from '../../src/utils/download';
import { useCreditsStore } from '../../src/stores/credits-store';
import { useResponsive } from '../../src/hooks/useResponsive';
import { colors, spacing, radii, fontSize, fontWeight, layout } from '../../src/theme';

type Mode = 'describe' | 'upload';

const PROMPT_IDEAS = [
  'Rustic dark wooden cafe table by a sunlit window, soft morning light',
  'White marble countertop with a few coffee beans and a linen napkin',
  'Warm terracotta table with brass cutlery and dried flowers, Indian cafe',
  'Moody charcoal slate surface with soft side light and steam in the air',
];

export default function NewBackgroundScreen() {
  const router = useRouter();
  const { isDesktop } = useResponsive();
  const fetchCredits = useCreditsStore((s) => s.fetchCredits);

  const [mode, setMode] = useState<Mode>('describe');
  const [formats, setFormats] = useState<StudioFormat[]>([]);
  const [format, setFormat] = useState('square');

  const [prompt, setPrompt] = useState('');
  const [name, setName] = useState('');
  const [image, setImage] = useState<ImagePicker.ImagePickerAsset | null>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<StudioBackground | null>(null);

  useEffect(() => {
    studioApi
      .getFormats()
      .then(({ data }) => setFormats(data))
      .catch(() => setFormats([]));
  }, []);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showAlert('Permission needed', 'Please allow photo library access');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      if (asset.fileSize && asset.fileSize > 10 * 1024 * 1024) {
        setError('Image must be under 10MB');
        return;
      }
      setError(null);
      setImage(asset);
    }
  };

  const handleGenerate = async () => {
    if (prompt.trim().length < 4) {
      setError('Describe the background you want in a few words');
      return;
    }

    setError(null);
    setBusy(true);
    try {
      const { data } = await studioApi.generateBackground({
        prompt: prompt.trim(),
        name: name.trim() || undefined,
        format,
      });
      setCreated(data);
      fetchCredits();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Could not generate the background');
    } finally {
      setBusy(false);
    }
  };

  const handleUpload = async () => {
    if (!image) {
      setError('Pick a background image first');
      return;
    }
    if (!name.trim()) {
      setError('Give this background a name');
      return;
    }

    setError(null);
    setBusy(true);
    try {
      const formData = new FormData();
      formData.append('name', name.trim());

      const uri = image.uri;
      const filename = uri.split('/').pop() || 'background.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      if (Platform.OS === 'web') {
        const response = await fetch(uri);
        const blob = await response.blob();
        formData.append('image', blob, filename);
      } else {
        formData.append('image', { uri, name: filename, type } as any);
      }

      const { data } = await studioApi.uploadBackground(formData);
      setCreated(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Could not save the background');
    } finally {
      setBusy(false);
    }
  };

  const handleDownload = async () => {
    if (!created) return;
    try {
      await downloadImage(
        `/studio/backgrounds/${created.id}/download`,
        `listic_bg_${toFileSlug(created.name)}.png`,
      );
    } catch {
      showAlert('Download failed', 'Could not download the background. Please try again.');
    }
  };

  const startOver = () => {
    setCreated(null);
    setPrompt('');
    setName('');
    setImage(null);
  };

  // ── Result view ──────────────────────────────────────────────
  if (created) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, isDesktop && styles.contentDesktop]}
      >
        <View style={styles.successRow}>
          <Ionicons name="checkmark-circle" size={22} color={colors.success} />
          <Text style={styles.successText}>Background ready</Text>
        </View>

        <Image source={{ uri: created.imageUrl }} style={styles.resultImage} />

        <Text style={styles.resultName}>{created.name}</Text>
        <Text style={styles.resultMeta}>
          {created.source === 'generated' ? 'AI generated' : 'Uploaded'}
          {created.width ? ` · ${created.width}×${created.height}` : ''}
        </Text>

        <Pressable style={styles.primaryBtn} onPress={() => router.replace(`/shoots/new?backgroundId=${created.id}`)}>
          <Ionicons name="restaurant-outline" size={20} color={colors.textOnAccent} />
          <Text style={styles.primaryBtnText}>Add dishes to this background</Text>
        </Pressable>

        <Pressable style={styles.secondaryBtn} onPress={handleDownload}>
          <Ionicons name="download-outline" size={20} color={colors.accent} />
          <Text style={styles.secondaryBtnText}>Download background only</Text>
        </Pressable>

        <Pressable style={styles.ghostBtn} onPress={startOver}>
          <Text style={styles.ghostBtnText}>Create another background</Text>
        </Pressable>
      </ScrollView>
    );
  }

  // ── Create view ──────────────────────────────────────────────
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, isDesktop && styles.contentDesktop]}
    >
      <Text style={styles.intro}>
        Pick one background and reuse it for every dish — that's what makes a feed
        look like one shoot instead of ten.
      </Text>

      {/* Mode switch */}
      <View style={styles.segment}>
        {(
          [
            { key: 'describe', label: 'Describe it', icon: 'sparkles' as const },
            { key: 'upload', label: 'Upload my own', icon: 'cloud-upload-outline' as const },
          ] as const
        ).map((option) => (
          <Pressable
            key={option.key}
            style={[styles.segmentItem, mode === option.key && styles.segmentItemActive]}
            onPress={() => {
              setMode(option.key);
              setError(null);
            }}
          >
            <Ionicons
              name={option.icon}
              size={16}
              color={mode === option.key ? colors.accent : colors.textSecondary}
            />
            <Text
              style={[
                styles.segmentText,
                mode === option.key && styles.segmentTextActive,
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {error && (
        <View style={styles.banner}>
          <Ionicons name="alert-circle" size={18} color={colors.error} />
          <Text style={styles.bannerText}>{error}</Text>
        </View>
      )}

      {mode === 'describe' ? (
        <>
          <Text style={styles.label}>Describe the background</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="e.g. rustic dark wooden cafe table by a sunlit window"
            placeholderTextColor={colors.textTertiary}
            value={prompt}
            onChangeText={(t) => {
              setPrompt(t);
              setError(null);
            }}
            multiline
            numberOfLines={4}
            maxLength={600}
          />

          <Text style={styles.label}>Need an idea?</Text>
          <View style={styles.ideaWrap}>
            {PROMPT_IDEAS.map((idea) => (
              <Pressable key={idea} style={styles.idea} onPress={() => setPrompt(idea)}>
                <Text style={styles.ideaText} numberOfLines={2}>
                  {idea}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>Shape</Text>
          <View style={styles.formatRow}>
            {formats.map((f) => (
              <Pressable
                key={f.slug}
                style={[styles.formatChip, format === f.slug && styles.formatChipActive]}
                onPress={() => setFormat(f.slug)}
              >
                <Text
                  style={[
                    styles.formatName,
                    format === f.slug && styles.formatNameActive,
                  ]}
                >
                  {f.name}
                </Text>
                <Text style={styles.formatAspect}>{f.aspect}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>Name (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Window table"
            placeholderTextColor={colors.textTertiary}
            value={name}
            onChangeText={setName}
            maxLength={80}
          />

          <Pressable
            style={[styles.primaryBtn, busy && styles.btnDisabled]}
            onPress={handleGenerate}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator color={colors.textOnAccent} />
            ) : (
              <>
                <Ionicons name="sparkles" size={20} color={colors.textOnAccent} />
                <Text style={styles.primaryBtnText}>Generate background · 1 credit</Text>
              </>
            )}
          </Pressable>
        </>
      ) : (
        <>
          <Pressable style={styles.imagePicker} onPress={pickImage}>
            {image ? (
              <Image source={{ uri: image.uri }} style={styles.previewImage} />
            ) : (
              <View style={styles.placeholder}>
                <View style={styles.placeholderIcon}>
                  <Ionicons name="image-outline" size={32} color={colors.accent} />
                </View>
                <Text style={styles.placeholderText}>Tap to select a background</Text>
                <Text style={styles.placeholderHint}>JPG, PNG up to 10MB</Text>
              </View>
            )}
          </Pressable>

          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Our corner table"
            placeholderTextColor={colors.textTertiary}
            value={name}
            onChangeText={(t) => {
              setName(t);
              setError(null);
            }}
            maxLength={80}
          />

          <Pressable
            style={[styles.primaryBtn, busy && styles.btnDisabled]}
            onPress={handleUpload}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator color={colors.textOnAccent} />
            ) : (
              <>
                <Ionicons name="save-outline" size={20} color={colors.textOnAccent} />
                <Text style={styles.primaryBtnText}>Save background · free</Text>
              </>
            )}
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl, paddingBottom: 48 },
  contentDesktop: {
    maxWidth: layout.contentMaxWidth,
    alignSelf: 'center',
    width: '100%',
  },
  intro: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.bgSecondary,
    borderRadius: radii.full,
    padding: spacing.xs,
    gap: spacing.xs,
    marginBottom: spacing.xl,
  },
  segmentItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radii.full,
  },
  segmentItemActive: { backgroundColor: colors.accentSoft },
  segmentText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  segmentTextActive: { color: colors.accent, fontWeight: fontWeight.semibold },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.lg,
    fontSize: fontSize.lg,
    color: colors.textPrimary,
  },
  textArea: {
    minHeight: 110,
    textAlignVertical: 'top',
  },
  ideaWrap: { gap: spacing.sm },
  idea: {
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  ideaText: { color: colors.textSecondary, fontSize: fontSize.md, lineHeight: 20 },
  formatRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  formatChip: {
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    gap: 2,
  },
  formatChipActive: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  formatName: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  formatNameActive: { color: colors.accent, fontWeight: fontWeight.semibold },
  formatAspect: { fontSize: fontSize.xs, color: colors.textTertiary },
  imagePicker: {
    height: 220,
    borderRadius: radii.lg,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  previewImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  placeholder: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.sm },
  placeholderIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.accentSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  placeholderText: {
    color: colors.textPrimary,
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  placeholderHint: { color: colors.textTertiary, fontSize: fontSize.xs },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(242, 139, 130, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(242, 139, 130, 0.3)',
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  bannerText: { flex: 1, color: colors.error, fontSize: fontSize.sm },
  primaryBtn: {
    flexDirection: 'row',
    backgroundColor: colors.accent,
    paddingVertical: spacing.lg,
    borderRadius: radii.full,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing['2xl'],
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
    marginTop: spacing.md,
  },
  secondaryBtnText: {
    color: colors.accent,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  ghostBtn: { alignItems: 'center', paddingVertical: spacing.lg, marginTop: spacing.xs },
  ghostBtnText: { color: colors.textSecondary, fontSize: fontSize.md },
  btnDisabled: { opacity: 0.5 },
  successRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  successText: {
    color: colors.success,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  resultImage: {
    width: '100%',
    height: 280,
    borderRadius: radii.lg,
    resizeMode: 'cover',
    backgroundColor: colors.surface,
  },
  resultName: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    marginTop: spacing.lg,
  },
  resultMeta: { fontSize: fontSize.sm, color: colors.textTertiary, marginTop: 2 },
});
