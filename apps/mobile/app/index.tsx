import { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Animated,
  Easing,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../src/stores/auth-store';
import { useResponsive } from '../src/hooks/useResponsive';
import { colors, spacing, radii, fontSize, fontWeight, layout } from '../src/theme';

// Enable LayoutAnimation on Android
if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/* ─────────────────── Data ─────────────────── */

const LANDING_MAX_WIDTH = 1240;

/* ── Currency localisation ── */
const INR_TO_USD = 85; // approximate conversion rate

function detectIsIndia(): boolean {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    return tz.startsWith('Asia/Kolkata') || tz.startsWith('Asia/Calcutta');
  } catch {
    return true; // default to INR
  }
}

function useCurrency() {
  const isIndia = detectIsIndia();
  const symbol = isIndia ? '₹' : '$';

  const fmt = (inr: number) => {
    if (isIndia) return `${symbol}${inr.toLocaleString('en-IN')}`;
    const usd = Math.round(inr / INR_TO_USD);
    return `${symbol}${usd}`;
  };

  const fmtRange = (inr: number, suffix?: string) => {
    const s = suffix || '';
    if (isIndia) return `${symbol}${inr.toLocaleString('en-IN')}${s}`;
    const usd = Math.round(inr / INR_TO_USD);
    return `${symbol}${usd}${s}`;
  };

  const price = (inr: number) => isIndia ? inr : Math.round(inr / INR_TO_USD);

  return { symbol, fmt, fmtRange, price, isIndia };
}

/*
 * Backgrounds inspired by bholuma.in / textbehindtheimage.com:
 *   - Fine line-grid (graph-paper)
 *   - Large radial-gradient mesh blobs layered behind the grid
 *   - Subtle noise grain via SVG data-URI
 * All web-only; graceful no-op on native.
 */
const NOISE_URI =
  "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.55' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.025'/%3E%3C/svg%3E\")";

const LINE_COLOR = 'rgba(138, 180, 248, 0.045)';
const GRID_SIZE = '48px 48px';

const mkBg = (...layers: string[]) =>
  Platform.OS === 'web'
    ? ({
        backgroundImage: [
          ...layers,
          `linear-gradient(${LINE_COLOR} 1px, transparent 1px)`,
          `linear-gradient(90deg, ${LINE_COLOR} 1px, transparent 1px)`,
          NOISE_URI,
        ].join(', '),
        backgroundSize: [
          ...layers.map(() => '100% 100%'),
          GRID_SIZE,
          GRID_SIZE,
          '256px 256px',
        ].join(', '),
      } as any)
    : {};

// Hero: vivid blue top-left + purple bottom-right mesh
const BG_HERO = mkBg(
  'radial-gradient(ellipse 70% 55% at 10% 25%, rgba(138,180,248,0.22) 0%, transparent 65%)',
  'radial-gradient(ellipse 60% 65% at 90% 75%, rgba(197,138,249,0.18) 0%, transparent 65%)',
  'radial-gradient(circle at 50% 50%, rgba(138,180,248,0.04) 0%, transparent 40%)',
);

// Standard sections: blue wash from top + faint purple bottom
const BG_SECTION = mkBg(
  'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(138,180,248,0.14) 0%, transparent 55%)',
  'radial-gradient(ellipse 40% 40% at 90% 90%, rgba(197,138,249,0.06) 0%, transparent 50%)',
);

// Tinted/surface sections: rich purple + blue accents
const BG_TINTED = mkBg(
  'radial-gradient(ellipse 65% 65% at 25% 80%, rgba(197,138,249,0.16) 0%, transparent 55%)',
  'radial-gradient(ellipse 55% 55% at 80% 15%, rgba(138,180,248,0.12) 0%, transparent 55%)',
);

// CTA: intense saturated dual mesh
const BG_CTA = mkBg(
  'radial-gradient(ellipse 60% 60% at 20% 35%, rgba(138,180,248,0.26) 0%, transparent 55%)',
  'radial-gradient(ellipse 60% 60% at 80% 65%, rgba(197,138,249,0.22) 0%, transparent 55%)',
  'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.02) 0%, transparent 30%)',
);

// Platforms / stats: centered glow
const BG_CENTERED = mkBg(
  'radial-gradient(circle at 50% 50%, rgba(138,180,248,0.10) 0%, transparent 45%)',
  'radial-gradient(ellipse 40% 40% at 20% 60%, rgba(197,138,249,0.06) 0%, transparent 50%)',
);

// Shared card elevation for web
const CARD_SHADOW = Platform.OS === 'web' ? {
  boxShadow: '0 4px 24px rgba(0,0,0,0.5), 0 0 40px rgba(138,180,248,0.10), inset 0 1px 0 rgba(255,255,255,0.04)',
} as any : {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.4,
  shadowRadius: 16,
  elevation: 8,
};

const CARD_SHADOW_ACCENT = Platform.OS === 'web' ? {
  boxShadow: '0 8px 40px rgba(0,0,0,0.5), 0 0 60px rgba(138,180,248,0.18), inset 0 1px 0 rgba(255,255,255,0.06)',
} as any : {
  shadowColor: '#8AB4F8',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.3,
  shadowRadius: 24,
  elevation: 12,
};

const CARD_SHADOW_POPULAR = Platform.OS === 'web' ? {
  boxShadow: '0 8px 40px rgba(0,0,0,0.5), 0 0 80px rgba(138,180,248,0.25), 0 0 120px rgba(197,138,249,0.10), inset 0 1px 0 rgba(255,255,255,0.08)',
} as any : {
  shadowColor: '#8AB4F8',
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 0.4,
  shadowRadius: 30,
  elevation: 16,
};

const BTN_GLOW = Platform.OS === 'web' ? {
  boxShadow: '0 0 30px rgba(138,180,248,0.5), 0 0 60px rgba(138,180,248,0.2), 0 4px 16px rgba(0,0,0,0.3)',
} as any : {
  shadowColor: '#8AB4F8',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.5,
  shadowRadius: 20,
  elevation: 12,
};

const PLATFORMS = [
  { name: 'Amazon', emoji: '🛒', color: colors.amazon },
  { name: 'Flipkart', emoji: '🛍️', color: colors.flipkart },
  { name: 'Meesho', emoji: '📦', color: colors.meesho },
  { name: 'AJIO', emoji: '👗', color: colors.ajio },
  { name: 'Gumroad', emoji: '🎨', color: colors.gumroad },
];

const STATS = [
  { value: '6', label: 'Image types\nper product', icon: 'images' as const },
  { value: '5', label: 'Marketplace\nplatforms', icon: 'storefront' as const },
  { value: '<2m', label: 'Average\ngeneration time', icon: 'timer' as const },
  { value: '100%', label: 'Platform\ncompliant', icon: 'checkmark-circle' as const },
];

const STEPS = [
  {
    icon: 'cloud-upload-outline' as const,
    title: 'Upload',
    desc: 'Drop your product photo — any angle, any lighting.',
  },
  {
    icon: 'sparkles' as const,
    title: 'AI Generates',
    desc: '6 studio-quality images created by Gemini in seconds.',
  },
  {
    icon: 'resize-outline' as const,
    title: 'Auto-Resize',
    desc: 'Each image sized to your chosen platform\'s exact specs.',
  },
  {
    icon: 'rocket-outline' as const,
    title: 'List & Sell',
    desc: 'Download and publish across marketplaces instantly.',
  },
];

const FEATURES = [
  {
    icon: 'images-outline' as const,
    title: '6 Image Types',
    desc: 'Main shot, lifestyle, close-up, scale, angle & model views — all from one photo.',
  },
  {
    icon: 'color-palette-outline' as const,
    title: 'White Background',
    desc: 'Pure white studio backgrounds that meet Amazon & Flipkart listing requirements.',
  },
  {
    icon: 'phone-portrait-outline' as const,
    title: 'Platform Compliant',
    desc: 'Exact dimensions, file sizes & formats for each marketplace. No manual resizing.',
  },
  {
    icon: 'flash-outline' as const,
    title: 'Instant Results',
    desc: 'No photographer, no studio, no editing software. Results in under 2 minutes.',
  },
  {
    icon: 'shirt-outline' as const,
    title: 'AI Model Shots',
    desc: 'For wearable products, AI generates on-model images — no model needed.',
  },
  {
    icon: 'shield-checkmark-outline' as const,
    title: 'Secure & Private',
    desc: 'Encrypted storage, secure payments, and strict privacy. Your images are never shared.',
  },
];

const COMPARISONS_INR = [
  {
    aspect: 'Cost',
    traditional: 'Hire photographer — ₹2,000+/product',
    listic: 'AI generates — from ₹30/product',
  },
  {
    aspect: 'Speed',
    traditional: 'Schedule studio, wait days',
    listic: 'Upload, generate in under 2 min',
  },
  {
    aspect: 'Platforms',
    traditional: 'Manual resizing per platform',
    listic: 'Auto-sized for 5 platforms',
  },
  {
    aspect: 'Variety',
    traditional: '1-2 image styles per shoot',
    listic: '6 professional image types',
  },
  {
    aspect: 'Scale',
    traditional: 'Reshoot for every new product',
    listic: 'Unlimited products, one workflow',
  },
];

const COMPARISONS_USD = [
  {
    aspect: 'Cost',
    traditional: 'Hire photographer — $25+/product',
    listic: 'AI generates — from $0.35/product',
  },
  {
    aspect: 'Speed',
    traditional: 'Schedule studio, wait days',
    listic: 'Upload, generate in under 2 min',
  },
  {
    aspect: 'Platforms',
    traditional: 'Manual resizing per platform',
    listic: 'Auto-sized for 5 platforms',
  },
  {
    aspect: 'Variety',
    traditional: '1-2 image styles per shoot',
    listic: '6 professional image types',
  },
  {
    aspect: 'Scale',
    traditional: 'Reshoot for every new product',
    listic: 'Unlimited products, one workflow',
  },
];

const FAQS_INR = [
  {
    q: 'What kind of product images does Listic generate?',
    a: 'Listic generates 6 types: main product shot (white background), lifestyle/context shot, close-up detail, scale reference, alternate angle, and model/usage shot. Each is optimized for e-commerce listings.',
  },
  {
    q: 'Which platforms are supported?',
    a: 'Currently Amazon, Flipkart, Meesho, AJIO, and Gumroad. Each platform has specific image dimension and format requirements — Listic handles all of them automatically.',
  },
  {
    q: 'How many credits do I need per product?',
    a: '1 credit = 1 product = 6 images. You get 3 free credits when you sign up. Additional credits start at ₹199 for 5 credits.',
  },
  {
    q: 'What image quality should I upload?',
    a: 'Any decent smartphone photo works. The AI handles background removal, lighting correction, and professional composition. Better input = better output, but even casual photos produce great results.',
  },
  {
    q: 'Is my data secure?',
    a: 'Absolutely. All images are encrypted in transit and at rest. Payments are handled by a PCI-compliant gateway. We never share, sell, or use your product images for anything other than your generations.',
  },
];

const FAQS_USD = [
  {
    q: 'What kind of product images does Listic generate?',
    a: 'Listic generates 6 types: main product shot (white background), lifestyle/context shot, close-up detail, scale reference, alternate angle, and model/usage shot. Each is optimized for e-commerce listings.',
  },
  {
    q: 'Which platforms are supported?',
    a: 'Currently Amazon, Flipkart, Meesho, AJIO, and Gumroad. Each platform has specific image dimension and format requirements — Listic handles all of them automatically.',
  },
  {
    q: 'How many credits do I need per product?',
    a: '1 credit = 1 product = 6 images. You get 3 free credits when you sign up. Additional credits start at $2 for 5 credits.',
  },
  {
    q: 'What image quality should I upload?',
    a: 'Any decent smartphone photo works. The AI handles background removal, lighting correction, and professional composition. Better input = better output, but even casual photos produce great results.',
  },
  {
    q: 'Is my data secure?',
    a: 'Absolutely. All images are encrypted in transit and at rest. Payments are handled by a PCI-compliant gateway. We never share, sell, or use your product images for anything other than your generations.',
  },
];

/* ─────────────────── Animated Counter Hook ─────────────────── */

function useAnimatedCounter(target: string, duration = 1200) {
  const anim = useRef(new Animated.Value(0)).current;
  const [display, setDisplay] = useState(target);
  const numericPart = parseInt(target.replace(/[^0-9]/g, ''), 10);
  const isNumeric = !isNaN(numericPart) && target !== '<2m';

  const start = useCallback(() => {
    if (!isNumeric) {
      setDisplay(target);
      return;
    }
    anim.setValue(0);
    const listener = anim.addListener(({ value }) => {
      const current = Math.round(value * numericPart);
      const suffix = target.replace(/[0-9]/g, '');
      setDisplay(`${current}${suffix}`);
    });
    Animated.timing(anim, {
      toValue: 1,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start(() => {
      anim.removeListener(listener);
      setDisplay(target);
    });
  }, [target]);

  return { display, start };
}

/* ─────────────────── FAQ Item ─────────────────── */

function FAQItem({ q, a, isDesktop }: { q: string; a: string; isDesktop: boolean }) {
  const [open, setOpen] = useState(false);
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Animated.timing(rotateAnim, {
      toValue: open ? 0 : 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
    setOpen((prev) => !prev);
  };

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <Pressable
      onPress={toggle}
      style={[styles.faqItem, isDesktop && styles.faqItemDesktop]}
    >
      <View style={styles.faqHeader}>
        <Text style={styles.faqQ}>{q}</Text>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
        </Animated.View>
      </View>
      {open && <Text style={styles.faqA}>{a}</Text>}
    </Pressable>
  );
}

/* ─────────────────── Stat Card ─────────────────── */

function StatCard({
  stat,
  delay,
  isDesktop,
}: {
  stat: (typeof STATS)[number];
  delay: number;
  isDesktop: boolean;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const counter = useAnimatedCounter(stat.value);

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();
      counter.start();
    }, delay);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View
      style={[styles.statCard, isDesktop && styles.statCardDesktop, CARD_SHADOW, { opacity: fadeAnim }]}
    >
      <Ionicons name={stat.icon} size={22} color={colors.accent} style={{ marginBottom: spacing.sm }} />
      <Text style={styles.statValue}>{counter.display}</Text>
      <Text style={styles.statLabel}>{stat.label}</Text>
    </Animated.View>
  );
}

/* ─────────────────── Main Component ─────────────────── */

export default function LandingScreen() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();
  const { isDesktop, isMobile } = useResponsive();
  const currency = useCurrency();
  const COMPARISONS = currency.isIndia ? COMPARISONS_INR : COMPARISONS_USD;
  const FAQS = currency.isIndia ? FAQS_INR : FAQS_USD;

  // Hero animation
  const heroFade = useRef(new Animated.Value(0)).current;
  const heroSlide = useRef(new Animated.Value(40)).current;

  // Badge pulse
  const badgePulse = useRef(new Animated.Value(1)).current;

  // Floating glow orbs
  const glow1Y = useRef(new Animated.Value(0)).current;
  const glow2Y = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/(tabs)/home');
    }
  }, [isLoading, isAuthenticated]);

  useEffect(() => {
    // Hero entrance
    Animated.parallel([
      Animated.timing(heroFade, {
        toValue: 1,
        duration: 900,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(heroSlide, {
        toValue: 0,
        duration: 900,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    // Badge pulse loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(badgePulse, {
          toValue: 1.04,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(badgePulse, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start();

    // Floating glow orbs
    const floatOrb = (anim: Animated.Value, range = 30, speed = 4200) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: -range,
            duration: speed,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: range,
            duration: speed,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      );
    floatOrb(glow1Y).start();
    setTimeout(() => floatOrb(glow2Y).start(), 1200);
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
      {/* ─── Hero + Nav (shared background) ─── */}
      <View style={[styles.heroSection, isDesktop && styles.heroSectionDesktop, BG_HERO]}>
        {/* Floating glow orbs */}
        <Animated.View
          style={[
            styles.heroGlowOrb1,
            { transform: [{ translateY: glow1Y }] },
          ]}
        />
        <Animated.View
          style={[
            styles.heroGlowOrb2,
            { transform: [{ translateY: glow2Y }] },
          ]}
        />

        {/* Navbar */}
        <View style={[styles.nav, isDesktop && styles.navDesktop]}>
        <View style={styles.navInner}>
          <View style={styles.logoRow}>
            <View style={styles.logoDot} />
            <Text style={styles.logoText}>Listic</Text>
          </View>
          <View style={styles.navActions}>
            <Pressable onPress={() => router.push('/(auth)/login')}>
              <Text style={styles.navLink}>Sign in</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.navCta, pressed && styles.btnPressed]}
              onPress={() => router.push('/(auth)/register')}
            >
              <Text style={styles.navCtaText}>Get Started</Text>
            </Pressable>
          </View>
        </View>
        </View>

        {/* Hero content */}
        <Animated.View
          style={[
            styles.heroInner,
            { opacity: heroFade, transform: [{ translateY: heroSlide }] },
          ]}
        >
          <Animated.View style={[styles.badge, { transform: [{ scale: badgePulse }] }]}>
            <Ionicons name="sparkles" size={14} color={colors.accent} />
            <Text style={styles.badgeText}>AI-Powered Product Photography</Text>
          </Animated.View>

          <Text style={[styles.heroTitle, isDesktop && styles.heroTitleDesktop]}>
            Product photos that{'\n'}
            <Text style={styles.heroAccent}>sell themselves</Text>
          </Text>

          <Text style={[styles.heroSub, isDesktop && styles.heroSubDesktop]}>
            Upload one photo. Get 6 marketplace-ready images — white background,
            lifestyle, close-up & more. Sized perfectly for Amazon, Flipkart,
            Meesho, AJIO & Gumroad.
          </Text>

          <View style={[styles.heroBtns, isDesktop && styles.heroBtnsDesktop]}>
            <Pressable
              style={({ pressed }) => [styles.primaryBtn, BTN_GLOW, pressed && styles.primaryBtnPressed]}
              onPress={() => router.push('/(auth)/register')}
            >
              <Text style={styles.primaryBtnText}>Start for free</Text>
              <Ionicons name="arrow-forward" size={18} color={colors.textOnAccent} />
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.ghostBtn, pressed && styles.ghostBtnPressed]}
              onPress={() => router.push('/(auth)/login')}
            >
              <Ionicons name="play-circle-outline" size={20} color={colors.accent} />
              <Text style={styles.ghostBtnText}>See it in action</Text>
            </Pressable>
          </View>

          <View style={styles.heroNoteRow}>
            <Ionicons name="gift-outline" size={14} color={colors.success} />
            <Text style={styles.heroNote}>
              3 free credits on sign up · No credit card required
            </Text>
          </View>
        </Animated.View>

        {/* Hero visual mockup */}
        <Animated.View
          style={[
            styles.heroVisual,
            isDesktop && styles.heroVisualDesktop,
            { opacity: heroFade },
          ]}
        >
          <View style={[styles.mockupCard, CARD_SHADOW_ACCENT]}>
            <View style={styles.mockupHeader}>
              <View style={[styles.mockupDot, { backgroundColor: '#F28B82' }]} />
              <View style={[styles.mockupDot, { backgroundColor: '#FDD663' }]} />
              <View style={[styles.mockupDot, { backgroundColor: '#81C995' }]} />
            </View>
            <View style={styles.mockupBody}>
              <View style={styles.mockupInput}>
                <Ionicons name="image-outline" size={16} color={colors.textTertiary} />
                <Text style={styles.mockupInputText}>product-photo.jpg</Text>
                <View style={styles.mockupUploadBtn}>
                  <Text style={styles.mockupUploadText}>Generate</Text>
                </View>
              </View>
              <View style={styles.mockupGrid}>
                {['Main', 'Lifestyle', 'Close-up', 'Scale', 'Angle', 'Model'].map(
                  (label, i) => (
                    <View key={label} style={styles.mockupThumb}>
                      <Ionicons
                        name={
                          ['camera', 'home', 'search', 'resize', 'sync', 'person'][i] as any
                        }
                        size={16}
                        color={colors.accent}
                      />
                      <Text style={styles.mockupThumbLabel}>{label}</Text>
                    </View>
                  ),
                )}
              </View>
            </View>
          </View>
        </Animated.View>
      </View>

      {/* ─── Platforms Strip ─── */}
      <View style={[styles.section, isDesktop && styles.sectionDesktop, BG_CENTERED]}>
        <Text style={styles.sectionEyebrow}>WORKS WITH</Text>
        <View style={styles.platformStrip}>
          {PLATFORMS.map((p) => (
            <View key={p.name} style={styles.platformBadge}>
              <Text style={styles.platformEmoji}>{p.emoji}</Text>
              <Text style={[styles.platformName, { color: p.color }]}>{p.name}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ─── Stats Section ─── */}
      <View style={[styles.statsSection, isDesktop && styles.statsSectionDesktop, BG_CENTERED]}>
        <View style={[styles.statsGrid, isDesktop && styles.statsGridDesktop]}>
          {STATS.map((stat, i) => (
            <StatCard key={stat.label} stat={stat} delay={i * 200} isDesktop={isDesktop} />
          ))}
        </View>
      </View>

      {/* ─── How It Works ─── */}
      <View style={[styles.section, isDesktop && styles.sectionDesktop, BG_SECTION]}>
        <Text style={styles.sectionEyebrow}>HOW IT WORKS</Text>
        <Text style={[styles.sectionTitle, isDesktop && styles.sectionTitleDesktop]}>
          Four steps to perfect listings
        </Text>

        <View style={[styles.stepsGrid, isDesktop && styles.stepsGridDesktop]}>
          {STEPS.map((step, i) => (
            <View key={step.title} style={{ flex: isDesktop ? 1 : undefined }}>
              <View style={[styles.stepCard, isDesktop && styles.stepCardDesktop, CARD_SHADOW]}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{i + 1}</Text>
                </View>
                <View style={styles.stepIconWrap}>
                  <Ionicons name={step.icon} size={28} color={colors.accent} />
                </View>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepDesc}>{step.desc}</Text>
              </View>
              {/* Connector arrow on desktop */}
              {isDesktop && i < STEPS.length - 1 && (
                <View style={styles.stepConnector}>
                  <Ionicons name="arrow-forward" size={16} color={colors.textTertiary} />
                </View>
              )}
            </View>
          ))}
        </View>
      </View>

      {/* ─── Comparison ─── */}
      <View style={[styles.section, styles.sectionTinted, isDesktop && styles.sectionDesktop, BG_TINTED]}>
        <Text style={styles.sectionEyebrow}>WHY LISTIC</Text>
        <Text style={[styles.sectionTitle, isDesktop && styles.sectionTitleDesktop]}>
          Traditional vs. AI-powered
        </Text>

        <View style={[styles.compGrid, isDesktop && styles.compGridDesktop]}>
          {COMPARISONS.map((row, i) => (
            <View key={i} style={[styles.compCard, isDesktop && styles.compCardDesktop]}>
              <Text style={styles.compAspect}>{row.aspect}</Text>
              <View style={styles.compLine}>
                <Ionicons name="close-circle" size={16} color={colors.error} />
                <Text style={styles.compTextOld}>{row.traditional}</Text>
              </View>
              <View style={styles.compLine}>
                <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                <Text style={styles.compTextNew}>{row.listic}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* ─── Features Grid ─── */}
      <View style={[styles.section, isDesktop && styles.sectionDesktop, BG_SECTION]}>
        <Text style={styles.sectionEyebrow}>FEATURES</Text>
        <Text style={[styles.sectionTitle, isDesktop && styles.sectionTitleDesktop]}>
          Everything you need to list faster
        </Text>

        <View style={[styles.featuresGrid, isDesktop && styles.featuresGridDesktop]}>
          {FEATURES.map((f) => (
            <View key={f.title} style={[styles.featureCard, isDesktop && styles.featureCardDesktop, CARD_SHADOW]}>
              <View style={styles.featureIconWrap}>
                <Ionicons name={f.icon} size={24} color={colors.accent} />
              </View>
              <Text style={styles.featureTitle}>{f.title}</Text>
              <Text style={styles.featureDesc}>{f.desc}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ─── Pricing Preview ─── */}
      <View style={[styles.section, styles.sectionTinted, isDesktop && styles.sectionDesktop, BG_TINTED]}>
        <Text style={styles.sectionEyebrow}>PRICING</Text>
        <Text style={[styles.sectionTitle, isDesktop && styles.sectionTitleDesktop]}>
          Simple, transparent pricing
        </Text>
        <Text style={styles.sectionSub}>
          1 credit = 1 product = 6 professional images. Start free.
        </Text>

        <View style={[styles.pricingRow, isDesktop && styles.pricingRowDesktop]}>
          {[
            { name: 'Starter', credits: 5, price: 199, features: ['5 product generations', '30 images total', 'All 5 platforms', 'HD downloads'] },
            { name: 'Growth', credits: 15, price: 499, popular: true, features: ['15 product generations', '90 images total', 'All 5 platforms', 'HD downloads', 'Priority processing'] },
            { name: 'Pro', credits: 50, price: 1499, features: ['50 product generations', '300 images total', 'All 5 platforms', 'HD downloads', 'Priority processing', 'Bulk upload'] },
          ].map((tier) => (
            <View
              key={tier.name}
              style={[
                styles.priceCard,
                isDesktop && styles.priceCardDesktop,
                tier.popular && styles.priceCardPopular,
                tier.popular ? CARD_SHADOW_POPULAR : CARD_SHADOW,
              ]}
            >
              {tier.popular && (
                <View style={styles.popularBadge}>
                  <Ionicons name="star" size={10} color={colors.accent} />
                  <Text style={styles.popularBadgeText}>Best Value</Text>
                </View>
              )}
              <Text style={styles.priceName}>{tier.name}</Text>
              <View style={styles.priceAmountRow}>
                <Text style={styles.priceCurrency}>{currency.symbol}</Text>
                <Text style={styles.priceAmount}>{currency.price(tier.price)}</Text>
              </View>
              <Text style={styles.pricePerUnit}>
                {currency.symbol}{Math.round(currency.price(tier.price) / tier.credits)}/product
              </Text>

              <View style={styles.priceDivider} />

              {tier.features.map((feat) => (
                <View key={feat} style={styles.priceFeatureRow}>
                  <Ionicons
                    name="checkmark"
                    size={14}
                    color={tier.popular ? colors.accent : colors.textTertiary}
                  />
                  <Text style={styles.priceFeatureText}>{feat}</Text>
                </View>
              ))}

              <Pressable
                style={({ pressed }) => [
                  styles.priceBtn,
                  tier.popular && styles.priceBtnPopular,
                  pressed && styles.btnPressed,
                ]}
                onPress={() => router.push('/(auth)/register')}
              >
                <Text
                  style={[
                    styles.priceBtnText,
                    tier.popular && styles.priceBtnTextPopular,
                  ]}
                >
                  Get Started
                </Text>
              </Pressable>
            </View>
          ))}
        </View>
      </View>

      {/* ─── FAQ ─── */}
      <View style={[styles.section, isDesktop && styles.sectionDesktop, BG_SECTION]}>
        <Text style={styles.sectionEyebrow}>FAQ</Text>
        <Text style={[styles.sectionTitle, isDesktop && styles.sectionTitleDesktop]}>
          Common questions
        </Text>

        <View style={[styles.faqList, isDesktop && styles.faqListDesktop]}>
          {FAQS.map((faq) => (
            <FAQItem key={faq.q} q={faq.q} a={faq.a} isDesktop={isDesktop} />
          ))}
        </View>
      </View>

      {/* ─── Final CTA ─── */}
      <View style={[styles.ctaSection, isDesktop && styles.ctaSectionDesktop, BG_CTA]}>
        <View style={styles.ctaGlow1} />
        <View style={styles.ctaGlow2} />

        <Text style={[styles.ctaTitle, isDesktop && styles.ctaTitleDesktop]}>
          Ready to transform your{'\n'}product photography?
        </Text>
        <Text style={styles.ctaSub}>
          Join sellers who are listing faster and selling more with AI-generated images.
        </Text>
        <Pressable
          style={({ pressed }) => [styles.ctaBtn, BTN_GLOW, pressed && styles.primaryBtnPressed]}
          onPress={() => router.push('/(auth)/register')}
        >
          <Text style={styles.ctaBtnText}>Create free account</Text>
          <Ionicons name="arrow-forward" size={18} color={colors.textOnAccent} />
        </Pressable>
        <Text style={styles.ctaNote}>No credit card required · 3 free credits</Text>
      </View>

      {/* ─── Footer ─── */}
      <View style={[styles.footer, isDesktop && styles.footerDesktop]}>
        <View style={styles.footerInner}>
          <View style={styles.footerBrand}>
            <View style={styles.logoRow}>
              <View style={styles.logoDot} />
              <Text style={styles.footerLogo}>Listic</Text>
            </View>
            <Text style={styles.footerTagline}>
              AI product photography for e-commerce sellers.
            </Text>
          </View>
          <View style={styles.footerLinks}>
            <Pressable onPress={() => router.push('/(auth)/login')}>
              <Text style={styles.footerLink}>Sign In</Text>
            </Pressable>
            <Pressable onPress={() => router.push('/(auth)/register')}>
              <Text style={styles.footerLink}>Register</Text>
            </Pressable>
          </View>
        </View>
        <Text style={styles.footerCopy}>
          © {new Date().getFullYear()} Listic. All rights reserved.
        </Text>
      </View>
    </ScrollView>
  );
}

/* ──────────────────────────────────────────────────
   Styles
   ────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { flexGrow: 1 },

  /* press feedback */
  btnPressed: { opacity: 0.85, transform: [{ scale: 0.97 }] },
  primaryBtnPressed: { opacity: 0.9, transform: [{ scale: 0.97 }] },
  ghostBtnPressed: { backgroundColor: colors.accentSoft },

  /* ── Nav ── */
  nav: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    zIndex: 2,
  },
  navDesktop: {
    paddingHorizontal: spacing['4xl'],
    paddingVertical: spacing.xl,
  },
  navInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    maxWidth: LANDING_MAX_WIDTH,
    alignSelf: 'center',
    width: '100%',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  logoDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accent,
  },
  logoText: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  navActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  navLink: {
    color: colors.textSecondary,
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  navCta: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.full,
    ...(Platform.OS === 'web' ? { boxShadow: '0 0 20px rgba(138,180,248,0.45), 0 2px 8px rgba(0,0,0,0.2)' } as any : {}),
  },
  navCtaText: {
    color: colors.textOnAccent,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },

  /* ── Hero ── */
  heroSection: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing['4xl'],
    paddingBottom: spacing['3xl'],
    position: 'relative',
    overflow: 'hidden',
  },
  heroSectionDesktop: {
    paddingTop: 80,
    paddingBottom: 64,
  },
  heroGlowOrb1: {
    position: 'absolute',
    width: 500,
    height: 500,
    borderRadius: 250,
    backgroundColor: 'rgba(138, 180, 248, 0.20)',
    top: -140,
    left: -160,
  },
  heroGlowOrb2: {
    position: 'absolute',
    width: 440,
    height: 440,
    borderRadius: 220,
    backgroundColor: 'rgba(197, 138, 249, 0.16)',
    bottom: -100,
    right: -120,
  },
  heroInner: {
    alignItems: 'center',
    maxWidth: LANDING_MAX_WIDTH,
    alignSelf: 'center',
    width: '100%',
    zIndex: 1,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(138, 180, 248, 0.18)',
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.full,
    marginBottom: spacing['3xl'],
    borderWidth: 1,
    borderColor: 'rgba(138, 180, 248, 0.30)',
  },
  badgeText: {
    color: colors.accent,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  heroTitle: {
    fontSize: fontSize['4xl'],
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: 44,
    letterSpacing: -1,
    marginBottom: spacing.xl,
  },
  heroTitleDesktop: {
    fontSize: 64,
    lineHeight: 76,
    letterSpacing: -2,
  },
  heroAccent: {
    color: colors.accent,
    textShadowColor: 'rgba(138, 180, 248, 0.7)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 40,
  },
  heroSub: {
    fontSize: fontSize.lg,
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 520,
    marginBottom: spacing['3xl'],
  },
  heroSubDesktop: {
    fontSize: fontSize.xl,
    lineHeight: 30,
    maxWidth: 700,
  },
  heroBtns: {
    flexDirection: 'column',
    gap: spacing.md,
    width: '100%',
    maxWidth: 340,
  },
  heroBtnsDesktop: {
    flexDirection: 'row',
    width: 'auto',
    maxWidth: undefined,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accent,
    paddingVertical: spacing.lg + 2,
    paddingHorizontal: spacing['3xl'],
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: 'rgba(138, 180, 248, 0.5)',
  },
  primaryBtnText: {
    color: colors.textOnAccent,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  ghostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg + 2,
    paddingHorizontal: spacing['3xl'],
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: 'rgba(138, 180, 248, 0.25)',
    backgroundColor: 'rgba(138, 180, 248, 0.06)',
  },
  ghostBtnText: {
    color: colors.textPrimary,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.medium,
  },
  heroNoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xl,
  },
  heroNote: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
  },

  /* ── Hero Visual Mockup ── */
  heroVisual: {
    marginTop: spacing['4xl'],
    alignSelf: 'center',
    width: '100%',
    maxWidth: 480,
    zIndex: 1,
  },
  heroVisualDesktop: {
    maxWidth: 600,
    marginTop: 48,
  },
  mockupCard: {
    backgroundColor: '#232425',
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: 'rgba(138, 180, 248, 0.18)',
    overflow: 'hidden',
  },
  mockupHeader: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  mockupDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  mockupBody: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  mockupInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.bg,
    borderRadius: radii.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  mockupInputText: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: fontSize.md,
  },
  mockupUploadBtn: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.sm,
  },
  mockupUploadText: {
    color: colors.textOnAccent,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  mockupGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  mockupThumb: {
    width: '30%',
    flexGrow: 1,
    aspectRatio: 1,
    backgroundColor: colors.bg,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  mockupThumbLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },

  /* ── Sections ── */
  section: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing['4xl'],
  },
  sectionTinted: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.borderLight,
  },
  sectionDesktop: {
    paddingHorizontal: spacing['4xl'],
    paddingVertical: 88,
    alignItems: 'center',
  },
  sectionEyebrow: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.accent,
    letterSpacing: 2.5,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.white,
    textAlign: 'center',
    marginBottom: spacing['3xl'],
    letterSpacing: -0.3,
  },
  sectionTitleDesktop: {
    fontSize: fontSize['4xl'],
    marginBottom: spacing['4xl'],
    letterSpacing: -0.5,
  },
  sectionSub: {
    fontSize: fontSize.lg,
    color: colors.textPrimary,
    textAlign: 'center',
    marginTop: -spacing.xl,
    marginBottom: spacing['3xl'],
  },

  /* ── Platform Strip ── */
  platformStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  platformBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#232425',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: 'rgba(138, 180, 248, 0.12)',
    ...(Platform.OS === 'web' ? { boxShadow: '0 2px 12px rgba(0,0,0,0.3)' } as any : {}),
  },
  platformEmoji: { fontSize: 18 },
  platformName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },

  /* ── Stats ── */
  statsSection: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing['3xl'],
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.borderLight,
  },
  statsSectionDesktop: {
    paddingHorizontal: spacing['4xl'],
    paddingVertical: spacing['4xl'],
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
    maxWidth: LANDING_MAX_WIDTH,
    alignSelf: 'center',
    width: '100%',
  },
  statsGridDesktop: {
    gap: spacing['3xl'],
    flexWrap: 'nowrap',
  },
  statCard: {
    flex: 1,
    minWidth: 140,
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
    backgroundColor: '#232425',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(138, 180, 248, 0.10)',
  },
  statCardDesktop: {
    minWidth: 0,
  },
  statValue: {
    fontSize: fontSize['4xl'],
    fontWeight: fontWeight.bold,
    color: colors.accent,
    letterSpacing: -1,
    marginBottom: spacing.xs,
    textShadowColor: 'rgba(138, 180, 248, 0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
  statLabel: {
    fontSize: fontSize.base,
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: 20,
  },

  /* ── Steps ── */
  stepsGrid: { gap: spacing.lg, width: '100%' },
  stepsGridDesktop: {
    flexDirection: 'row',
    maxWidth: LANDING_MAX_WIDTH,
    gap: spacing.sm,
  },
  stepCard: {
    backgroundColor: '#232425',
    borderRadius: radii.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(138, 180, 248, 0.15)',
    position: 'relative',
  },
  stepCardDesktop: {},
  stepConnector: {
    position: 'absolute',
    right: -14,
    top: '50%',
    zIndex: 2,
  },
  stepNumber: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(138, 180, 248, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(138, 180, 248, 0.30)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    color: colors.accent,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  stepIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(138, 180, 248, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(138, 180, 248, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  stepTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.white,
    marginBottom: spacing.sm,
  },
  stepDesc: {
    fontSize: fontSize.base,
    color: colors.textPrimary,
    lineHeight: 22,
  },

  /* ── Comparison ── */
  compGrid: {
    width: '100%',
    gap: spacing.lg,
  },
  compGridDesktop: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    maxWidth: LANDING_MAX_WIDTH,
    gap: spacing.xl,
  },
  compCard: {
    backgroundColor: '#232425',
    borderRadius: radii.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(138, 180, 248, 0.12)',
    gap: spacing.md,
    ...(Platform.OS === 'web' ? { boxShadow: '0 4px 24px rgba(0,0,0,0.5), 0 0 40px rgba(138,180,248,0.08)' } as any : {}),
  },
  compCardDesktop: {
    width: '47%',
    flexGrow: 1,
  },
  compAspect: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.accent,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  compLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  compTextOld: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
    lineHeight: 22,
    flex: 1,
  },
  compTextNew: {
    fontSize: fontSize.base,
    color: colors.textPrimary,
    lineHeight: 22,
    fontWeight: fontWeight.medium,
    flex: 1,
  },

  /* ── Features ── */
  featuresGrid: { gap: spacing.lg, width: '100%' },
  featuresGridDesktop: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    maxWidth: LANDING_MAX_WIDTH,
    gap: spacing.xl,
  },
  featureCard: {
    backgroundColor: '#232425',
    borderRadius: radii.lg,
    padding: spacing['2xl'],
    borderWidth: 1,
    borderColor: 'rgba(138, 180, 248, 0.15)',
  },
  featureCardDesktop: {
    width: '30%',
    flexGrow: 1,
  },
  featureIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(138, 180, 248, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(138, 180, 248, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  featureTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: colors.white,
    marginBottom: spacing.xs + 2,
  },
  featureDesc: {
    fontSize: fontSize.base,
    color: colors.textPrimary,
    lineHeight: 22,
  },

  /* ── Pricing ── */
  pricingRow: { gap: spacing.lg, width: '100%' },
  pricingRowDesktop: {
    flexDirection: 'row',
    maxWidth: LANDING_MAX_WIDTH,
    gap: spacing.xl,
  },
  priceCard: {
    backgroundColor: '#232425',
    borderRadius: radii.xl,
    padding: spacing['2xl'],
    borderWidth: 1,
    borderColor: 'rgba(138, 180, 248, 0.12)',
    alignItems: 'center',
  },
  priceCardDesktop: { flex: 1 },
  priceCardPopular: {
    borderColor: 'rgba(138, 180, 248, 0.6)',
    borderWidth: 2,
    backgroundColor: '#262830',
  },
  popularBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.accentSoft,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.full,
    marginBottom: spacing.lg,
  },
  popularBadgeText: {
    color: colors.accent,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    letterSpacing: 0.5,
  },
  priceName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  priceAmountRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  priceCurrency: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.medium,
    color: colors.textPrimary,
    marginTop: 6,
    marginRight: 2,
  },
  priceAmount: {
    fontSize: 48,
    fontWeight: fontWeight.bold,
    color: colors.white,
    letterSpacing: -1.5,
  },
  pricePerUnit: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  priceDivider: {
    width: '100%',
    height: 1,
    backgroundColor: colors.borderLight,
    marginBottom: spacing.lg,
  },
  priceFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    width: '100%',
    marginBottom: spacing.md,
  },
  priceFeatureText: {
    fontSize: fontSize.base,
    color: colors.textPrimary,
  },
  priceBtn: {
    width: '100%',
    paddingVertical: spacing.lg,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  priceBtnPopular: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
    ...(Platform.OS === 'web' ? { boxShadow: '0 0 24px rgba(138,180,248,0.4), 0 4px 12px rgba(0,0,0,0.2)' } as any : {}),
  },
  priceBtnText: {
    color: colors.textPrimary,
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
  },
  priceBtnTextPopular: {
    color: colors.textOnAccent,
  },

  /* ── FAQ ── */
  faqList: { width: '100%', gap: spacing.sm },
  faqListDesktop: {
    maxWidth: 720,
  },
  faqItem: {
    backgroundColor: '#232425',
    borderRadius: radii.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(138, 180, 248, 0.10)',
    ...(Platform.OS === 'web' ? { boxShadow: '0 2px 16px rgba(0,0,0,0.35), 0 0 24px rgba(138,180,248,0.05)' } as any : {}),
  },
  faqItemDesktop: {},
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.lg,
  },
  faqQ: {
    flex: 1,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    lineHeight: 22,
  },
  faqA: {
    marginTop: spacing.md,
    fontSize: fontSize.base,
    color: colors.textPrimary,
    lineHeight: 24,
    paddingRight: spacing['3xl'],
  },

  /* ── CTA ── */
  ctaSection: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing['4xl'] + 16,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.borderLight,
  },
  ctaSectionDesktop: {
    paddingVertical: 112,
  },
  ctaGlow1: {
    position: 'absolute',
    width: 520,
    height: 520,
    borderRadius: 260,
    backgroundColor: 'rgba(138, 180, 248, 0.22)',
    top: -160,
    left: '2%',
  },
  ctaGlow2: {
    position: 'absolute',
    width: 440,
    height: 440,
    borderRadius: 220,
    backgroundColor: 'rgba(197, 138, 249, 0.18)',
    bottom: -120,
    right: '2%',
  },
  ctaTitle: {
    fontSize: fontSize['3xl'],
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: 36,
    marginBottom: spacing.lg,
    zIndex: 1,
    letterSpacing: -0.5,
  },
  ctaTitleDesktop: {
    fontSize: fontSize['4xl'] + 4,
    lineHeight: 50,
  },
  ctaSub: {
    fontSize: fontSize.lg,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing['3xl'],
    maxWidth: 500,
    zIndex: 1,
    lineHeight: 24,
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accent,
    paddingVertical: spacing.lg + 2,
    paddingHorizontal: spacing['4xl'],
    borderRadius: radii.full,
    zIndex: 1,
  },
  ctaBtnText: {
    color: colors.textOnAccent,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  ctaNote: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    marginTop: spacing.lg,
    zIndex: 1,
  },

  /* ── Footer ── */
  footer: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing['3xl'],
  },
  footerDesktop: {
    paddingHorizontal: spacing['4xl'],
  },
  footerInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    maxWidth: LANDING_MAX_WIDTH,
    alignSelf: 'center',
    width: '100%',
    marginBottom: spacing.xl,
  },
  footerBrand: { gap: spacing.sm },
  footerLogo: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  footerTagline: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  footerLinks: {
    flexDirection: 'row',
    gap: spacing.xl,
  },
  footerLink: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  footerCopy: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
