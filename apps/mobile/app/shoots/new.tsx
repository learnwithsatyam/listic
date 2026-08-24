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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  studioApi,
  StudioBackground,
  StudioFormat,
} from '../../src/services/api';
import { showAlert } from '../../src/utils/alert';
import { useCreditsStore } from '../../src/stores/credits-store';
import { useResponsive } from '../../src/hooks/useResponsive';
import { colors, spacing, radii, fontSize, fontWeight, layout } from '../../src/theme';

/** Matches MAX_DISHES_PER_SHOOT on the API. */
const MAX_DISHES = 12;

interface Dish {
  asset: ImagePicker.ImagePickerAsset;
  name: string;
}

export default function NewShootScreen() {
  const router = useRouter();
  const { isDesktop } = useResponsive();
  const params = useLocalSearchParams<{ backgroundId?: string }>();
  const { credits, fetchCredits } = useCreditsStore();

  const [backgrounds, setBackgrounds] = useState<StudioBackground[]>([]);
  const [formats, setFormats] = useState<StudioFormat[]>([]);
  const [loading, setLoading] = useState(true);

  const [backgroundId, setBackgroundId] = useState<string | undefined>(params.backgroundId);
  const [shootName, setShootName] = useState('');
  const [format, setFormat] = useState('square');
  const [stylePrompt, setStylePrompt] = useState('');
  const [dishes, setDishes] = useState<Dish[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([studioApi.getBackgrounds(), studioApi.getFormats()])
      .then(([bg, fmt]) => {
        setBackgrounds(bg.data);
        setFormats(fmt.data);
        if (!params.backgroundId && bg.data.length > 0) {
          setBackgroundId(bg.data[0].id);
        }
      })
      .catch(() => setError('Could not load your backgrounds'))
      .finally(() => setLoading(false));
    fetchCredits();
  }, []);

  const addDishes = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showAlert('Permission needed', 'Please allow photo library access');
      return;
    }

    const remaining = MAX_DISHES - dishes.length;
    if (remaining <= 0) {
      setError(`A shoot can hold at most ${MAX_DISHES} dishes`);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 1,
    });

    if (result.canceled) return;

    const oversized = result.assets.filter(
      (a) => a.fileSize && a.fileSize > 10 * 1024 * 1024,
    );
    if (oversized.length) {
      setError('Each photo must be under 10MB');
    } else {
      setError(null);
    }

    const accepted = result.assets
      .filter((a) => !a.fileSize || a.fileSize <= 10 * 1024 * 1024)
      .slice(0, remaining)
      .map((asset) => ({ asset, name: '' }));

    setDishes((prev) => [...prev, ...accepted]);
  };

  const renameDish = (index: number, name: string) => {
    setDishes((prev) => prev.map((d, i) => (i === index ? { ...d, name } : d)));
  };

  const removeDish = (index: number) => {
    setDishes((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!backgroundId) {
      setError('Choose a background first');
      return;
    }
    if (dishes.length === 0) {
      setError('Add at least one dish photo');
      return;
    }
    const unnamed = dishes.findIndex((d) => !d.name.trim());
    if (unnamed !== -1) {
      setError(`Name dish ${unnamed + 1} — the AI uses it to keep the food accurate`);
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('backgroundId', backgroundId);
      formData.append('name', shootName.trim() || 'Menu shoot');
      formData.append('format', format);
      if (stylePrompt.trim()) formData.append('stylePrompt', stylePrompt.trim());
      formData.append('dishNames', JSON.stringify(dishes.map((d) => d.name.trim())));

      for (const dish of dishes) {
        const uri = dish.asset.uri;
        const filename = uri.split('/').pop() || 'dish.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';

        if (Platform.OS === 'web') {
          const response = await fetch(uri);
          const blob = await response.blob();
          formData.append('images', blob, filename);
        } else {
          formData.append('images', { uri, name: filename, type } as any);
        }
      }

      const { data: shoot } = await studioApi.createShoot(formData);
      router.replace(`/shoots/${shoot.id}?autostart=1`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Could not start the shoot');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (backgrounds.length === 0) {
    return (
      <View style={styles.center}>
        <Ionicons name="image-outline" size={48} color={colors.textSecondary} />
        <Text style={styles.emptyTitle}>No backgrounds yet</Text>
        <Text style={styles.emptyText}>
          Create the background first — every dish gets composed onto it.
        </Text>
        <Pressable style={styles.emptyBtn} onPress={() => router.replace('/backgrounds/new')}>
          <Ionicons name="add" size={20} color={colors.textOnAccent} />
          <Text style={styles.primaryBtnText}>Create a background</Text>
        </Pressable>
      </View>
    );
  }

  const notEnoughCredits = credits !== null && credits < dishes.length;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, isDesktop && styles.contentDesktop]}
    >
      {error && (
        <View style={styles.banner}>
          <Ionicons name="alert-circle" size={18} color={colors.error} />
          <Text style={styles.bannerText}>{error}</Text>
        </View>
      )}

      {/* Background picker */}
      <View style={styles.labelRow}>
        <Text style={styles.label}>Background</Text>
        <Pressable onPress={() => router.push('/backgrounds/new')}>
          <Text style={styles.linkText}>+ New</Text>
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bgScroll}>
        {backgrounds.map((bg) => (
          <Pressable
            key={bg.id}
            style={[styles.bgCard, backgroundId === bg.id && styles.bgCardActive]}
            onPress={() => {
              setBackgroundId(bg.id);
              setError(null);
            }}
          >
            <Image source={{ uri: bg.imageUrl }} style={styles.bgThumb} />
            <Text style={styles.bgName} numberOfLines={1}>
              {bg.name}
            </Text>
            {backgroundId === bg.id && (
              <View style={styles.bgCheck}>
                <Ionicons name="checkmark-circle" size={20} color={colors.accent} />
              </View>
            )}
          </Pressable>
        ))}
      </ScrollView>

      {/* Dishes */}
      <View style={styles.labelRow}>
        <Text style={styles.label}>
          Dishes {dishes.length > 0 ? `(${dishes.length}/${MAX_DISHES})` : ''}
        </Text>
        {dishes.length > 0 && dishes.length < MAX_DISHES && (
          <Pressable onPress={addDishes}>
            <Text style={styles.linkText}>+ Add more</Text>
          </Pressable>
        )}
      </View>

      {dishes.length === 0 ? (
        <Pressable style={styles.dishPicker} onPress={addDishes}>
          <View style={styles.placeholderIcon}>
            <Ionicons name="restaurant-outline" size={30} color={colors.accent} />
          </View>
          <Text style={styles.placeholderText}>Add your food photos</Text>
          <Text style={styles.placeholderHint}>
            Cake, pizza, thali, maggi — pick several at once
          </Text>
        </Pressable>
      ) : (
        <View style={styles.dishList}>
          {dishes.map((dish, index) => (
            <View key={`${dish.asset.uri}-${index}`} style={styles.dishRow}>
              <Image source={{ uri: dish.asset.uri }} style={styles.dishThumb} />
              <TextInput
                style={styles.dishInput}
                placeholder={`Dish ${index + 1} name — e.g. Veg Thali`}
                placeholderTextColor={colors.textTertiary}
                value={dish.name}
                onChangeText={(t) => {
                  renameDish(index, t);
                  setError(null);
                }}
                maxLength={80}
              />
              <Pressable style={styles.removeBtn} onPress={() => removeDish(index)}>
                <Ionicons name="close" size={18} color={colors.textSecondary} />
              </Pressable>
            </View>
          ))}
        </View>
      )}

      {/* Format */}
      <Text style={styles.label}>Post format</Text>
      <View style={styles.formatRow}>
        {formats.map((f) => (
          <Pressable
            key={f.slug}
            style={[styles.formatChip, format === f.slug && styles.formatChipActive]}
            onPress={() => setFormat(f.slug)}
          >
            <Text style={[styles.formatName, format === f.slug && styles.formatNameActive]}>
              {f.name}
            </Text>
            <Text style={styles.formatAspect}>{f.aspect}</Text>
          </Pressable>
        ))}
      </View>

      {/* Shoot details */}
      <Text style={styles.label}>Shoot name (optional)</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Monsoon menu"
        placeholderTextColor={colors.textTertiary}
        value={shootName}
        onChangeText={setShootName}
        maxLength={80}
      />

      <Text style={styles.label}>Extra art direction (optional)</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="e.g. shot from directly above, warm golden light, a sprig of coriander beside the plate"
        placeholderTextColor={colors.textTertiary}
        value={stylePrompt}
        onChangeText={setStylePrompt}
        multiline
        numberOfLines={3}
        maxLength={600}
      />
      <Text style={styles.hint}>Applied to every dish, so the whole set stays consistent.</Text>

      {notEnoughCredits && (
        <Pressable style={styles.creditWarning} onPress={() => router.push('/purchase')}>
          <Ionicons name="diamond-outline" size={18} color={colors.warning} />
          <Text style={styles.creditWarningText}>
            {dishes.length} credits needed, you have {credits}. Tap to top up.
          </Text>
        </Pressable>
      )}

      <Pressable
        style={[styles.primaryBtn, submitting && styles.btnDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color={colors.textOnAccent} />
        ) : (
          <>
            <Ionicons name="sparkles" size={20} color={colors.textOnAccent} />
            <Text style={styles.primaryBtnText}>
              {dishes.length > 0
                ? `Generate ${dishes.length} photo${dishes.length === 1 ? '' : 's'} · ${dishes.length} credit${dishes.length === 1 ? '' : 's'}`
                : 'Generate photos'}
            </Text>
          </>
        )}
      </Pressable>
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
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bg,
    padding: spacing.xl,
  },
  emptyTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    marginTop: spacing.lg,
  },
  emptyText: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  emptyBtn: {
    flexDirection: 'row',
    backgroundColor: colors.accent,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing['2xl'],
    borderRadius: radii.full,
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  linkText: {
    fontSize: fontSize.sm,
    color: colors.accent,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.sm,
  },
  bgScroll: { marginBottom: spacing.xs },
  bgCard: {
    width: 130,
    marginRight: spacing.md,
    borderRadius: radii.md,
    borderWidth: 2,
    borderColor: colors.transparent,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  bgCardActive: { borderColor: colors.accent },
  bgThumb: { width: '100%', height: 88, resizeMode: 'cover' },
  bgName: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  bgCheck: { position: 'absolute', top: spacing.xs, right: spacing.xs },
  dishPicker: {
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    paddingVertical: spacing['3xl'],
    alignItems: 'center',
    gap: spacing.sm,
  },
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
  dishList: { gap: spacing.sm },
  dishRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.bgSecondary,
    borderRadius: radii.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  dishThumb: { width: 48, height: 48, borderRadius: radii.sm, resizeMode: 'cover' },
  dishInput: {
    flex: 1,
    fontSize: fontSize.base,
    color: colors.textPrimary,
    paddingVertical: spacing.sm,
  },
  removeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bgTertiary,
  },
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
  input: {
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.lg,
    fontSize: fontSize.lg,
    color: colors.textPrimary,
  },
  textArea: { minHeight: 90, textAlignVertical: 'top' },
  hint: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    marginTop: spacing.sm,
    marginLeft: spacing.xs,
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
    marginBottom: spacing.sm,
  },
  bannerText: { flex: 1, color: colors.error, fontSize: fontSize.sm },
  creditWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(253, 214, 99, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(253, 214, 99, 0.3)',
    borderRadius: radii.md,
    padding: spacing.md,
    marginTop: spacing.xl,
  },
  creditWarningText: { flex: 1, color: colors.warning, fontSize: fontSize.sm },
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
  btnDisabled: { opacity: 0.5 },
});
