import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  Pressable,
  StyleSheet,
  TextInput,
  Switch,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { imagesApi } from '../src/services/api';
import { useResponsive } from '../src/hooks/useResponsive';
import { colors, spacing, radii, fontSize, fontWeight, layout } from '../src/theme';

const PLATFORMS = [
  { slug: 'amazon', name: 'Amazon' },
  { slug: 'flipkart', name: 'Flipkart' },
  { slug: 'meesho', name: 'Meesho' },
  { slug: 'ajio', name: 'AJIO' },
  { slug: 'gumroad', name: 'Gumroad' },
];

const CATEGORIES = [
  'T-Shirt',
  'Shirt',
  'Dress',
  'Pants',
  'Jeans',
  'Jacket',
  'Shoes',
  'Bag',
  'Jewelry',
  'Watch',
  'Electronics',
  'Home Decor',
  'Beauty',
  'Other',
];

export default function UploadScreen() {
  const router = useRouter();
  const [image, setImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [productName, setProductName] = useState('');
  const [category, setCategory] = useState('');
  const [isWearable, setIsWearable] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([
    'amazon',
  ]);
  const [loading, setLoading] = useState(false);
  const { isDesktop } = useResponsive();

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow photo library access');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      setImage(result.assets[0]);
    }
  };

  const togglePlatform = (slug: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(slug) ? prev.filter((p) => p !== slug) : [...prev, slug],
    );
  };

  const handleSubmit = async () => {
    if (!image) {
      Alert.alert('Error', 'Please select a product image');
      return;
    }
    if (!productName.trim()) {
      Alert.alert('Error', 'Please enter a product name');
      return;
    }
    if (!category) {
      Alert.alert('Error', 'Please select a category');
      return;
    }
    if (selectedPlatforms.length === 0) {
      Alert.alert('Error', 'Please select at least one platform');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('productName', productName.trim());
      formData.append('productCategory', category);
      formData.append('isWearable', String(isWearable));
      formData.append(
        'targetPlatforms',
        JSON.stringify(selectedPlatforms),
      );

      const uri = image.uri;
      const filename = uri.split('/').pop() || 'photo.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      if (Platform.OS === 'web') {
        // On web, fetch the blob URI / data URI and append as a real File
        const response = await fetch(uri);
        const blob = await response.blob();
        formData.append('image', blob, filename);
      } else {
        formData.append('image', {
          uri,
          name: filename,
          type,
        } as any);
      }

      const { data: project } = await imagesApi.createProject(formData);
      router.push(`/generate/${project.id}`);
    } catch (err: any) {
      Alert.alert(
        'Error',
        err.response?.data?.message || 'Failed to create project',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, isDesktop && styles.contentDesktop]}>
      {/* Image Picker */}
      <Pressable style={styles.imagePicker} onPress={pickImage}>
        {image ? (
          <Image source={{ uri: image.uri }} style={styles.previewImage} />
        ) : (
          <View style={styles.placeholder}>
            <View style={styles.placeholderIcon}>
              <Ionicons name="image-outline" size={36} color={colors.accent} />
            </View>
            <Text style={styles.placeholderText}>Tap to select image</Text>
            <Text style={styles.placeholderHint}>JPG, PNG up to 10MB</Text>
          </View>
        )}
      </Pressable>

      {/* Product Name */}
      <Text style={styles.label}>Product Name</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Blue Cotton T-Shirt"
        placeholderTextColor={colors.textTertiary}
        value={productName}
        onChangeText={setProductName}
      />

      {/* Category */}
      <Text style={styles.label}>Category</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipScroll}
      >
        {CATEGORIES.map((cat) => (
          <Pressable
            key={cat}
            style={[styles.chip, category === cat && styles.chipActive]}
            onPress={() => {
              setCategory(cat);
              const wearables = [
                'T-Shirt',
                'Shirt',
                'Dress',
                'Pants',
                'Jeans',
                'Jacket',
                'Shoes',
              ];
              setIsWearable(wearables.includes(cat));
            }}
          >
            <Text
              style={[
                styles.chipText,
                category === cat && styles.chipTextActive,
              ]}
            >
              {cat}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Wearable Toggle */}
      <View style={styles.switchRow}>
        <Text style={styles.label}>Wearable product?</Text>
        <Switch
          value={isWearable}
          onValueChange={setIsWearable}
          trackColor={{ true: colors.accent, false: colors.bgTertiary }}
          thumbColor={isWearable ? colors.white : colors.textSecondary}
        />
      </View>
      {isWearable && (
        <Text style={styles.hint}>
          One image will feature a model wearing your product
        </Text>
      )}

      {/* Platform Selection */}
      <Text style={styles.label}>Target Platforms</Text>
      <View style={styles.platformGrid}>
        {PLATFORMS.map((p) => (
          <Pressable
            key={p.slug}
            style={[
              styles.platformChip,
              selectedPlatforms.includes(p.slug) &&
                styles.platformChipActive,
            ]}
            onPress={() => togglePlatform(p.slug)}
          >
            <Text
              style={[
                styles.platformChipText,
                selectedPlatforms.includes(p.slug) &&
                  styles.platformChipTextActive,
              ]}
            >
              {p.name}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Submit */}
      <Pressable
        style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={colors.textOnAccent} />
        ) : (
          <View style={styles.submitInner}>
            <Ionicons name="sparkles" size={20} color={colors.textOnAccent} />
            <Text style={styles.submitBtnText}>Generate Images</Text>
          </View>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl, paddingBottom: 40 },
  contentDesktop: {
    maxWidth: layout.contentMaxWidth,
    alignSelf: 'center',
    width: '100%',
  },
  imagePicker: {
    height: 220,
    borderRadius: radii.lg,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    marginBottom: spacing['2xl'],
  },
  previewImage: { width: '100%', height: '100%', resizeMode: 'contain' },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  placeholderIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
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
  placeholderHint: {
    color: colors.textTertiary,
    fontSize: fontSize.xs,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
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
    marginBottom: spacing.lg,
  },
  chipScroll: { marginBottom: spacing.lg },
  chip: {
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.full,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginRight: spacing.sm,
  },
  chipActive: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  chipText: { color: colors.textSecondary, fontSize: fontSize.md },
  chipTextActive: { color: colors.accent, fontWeight: fontWeight.semibold },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  hint: {
    fontSize: fontSize.sm,
    color: colors.accent,
    marginBottom: spacing.lg,
    opacity: 0.8,
  },
  platformGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing['3xl'],
  },
  platformChip: {
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  platformChipActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  platformChipText: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  platformChipTextActive: {
    color: colors.accent,
    fontWeight: fontWeight.semibold,
  },
  submitBtn: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.lg,
    borderRadius: radii.full,
    alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  submitBtnText: {
    color: colors.textOnAccent,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
});
