import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { paymentsApi } from '../src/services/api';
import { useCreditsStore } from '../src/stores/credits-store';
import { showAlert } from '../src/utils/alert';
import { useResponsive } from '../src/hooks/useResponsive';
import { colors, spacing, radii, fontSize, fontWeight, layout } from '../src/theme';

interface Tier {
  slug: string;
  name: string;
  credits: number;
  priceInr: number;
}

const POPULAR_SLUG = 'popular';

/** Load Razorpay checkout script (web only) */
function loadRazorpayScript(): Promise<boolean> {
  if (typeof document === 'undefined') return Promise.resolve(false);
  if ((window as any).Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export default function PurchaseScreen() {
  const { isDesktop } = useResponsive();
  const { credits, fetchCredits } = useCreditsStore();

  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchCredits();
    paymentsApi.getTiers().then(({ data }) => {
      setTiers(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleBuy = async (tierSlug: string) => {
    setSuccessMsg(null);
    setErrorMsg(null);
    setPurchasing(tierSlug);

    try {
      // 1. Create order on backend
      const { data: order } = await paymentsApi.createOrder(tierSlug);

      if (Platform.OS === 'web') {
        // 2. Load Razorpay script
        const loaded = await loadRazorpayScript();
        if (!loaded) {
          setErrorMsg('Failed to load payment gateway. Please try again.');
          setPurchasing(null);
          return;
        }

        // 3. Open Razorpay Checkout
        const options = {
          key: order.keyId,
          amount: order.amount,
          currency: order.currency,
          name: 'Listic',
          description: `Credit purchase`,
          order_id: order.orderId,
          handler: async (response: any) => {
            try {
              // 4. Verify on backend
              await paymentsApi.verifyPayment({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              });
              setSuccessMsg('Payment successful! Credits have been added.');
              fetchCredits();
            } catch {
              setErrorMsg('Payment verification failed. Contact support if charged.');
            }
            setPurchasing(null);
          },
          modal: {
            ondismiss: () => setPurchasing(null),
          },
          theme: { color: '#8AB4F8' },
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      } else {
        // Native: not yet supported
        showAlert('Info', 'Payments are currently available on web only.');
        setPurchasing(null);
      }
    } catch {
      setErrorMsg('Could not initiate payment. Please try again.');
      setPurchasing(null);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, isDesktop && styles.contentDesktop]}>
      {/* Success banner */}
      {successMsg && (
        <View style={styles.banner}>
          <Ionicons name="checkmark-circle" size={20} color={colors.success} />
          <Text style={styles.bannerText}>{successMsg}</Text>
        </View>
      )}
      {errorMsg && (
        <View style={[styles.banner, styles.bannerWarn]}>
          <Ionicons name="close-circle" size={20} color={colors.warning} />
          <Text style={styles.bannerText}>{errorMsg}</Text>
        </View>
      )}

      {/* Current credits */}
      <View style={styles.creditsBanner}>
        <Ionicons name="diamond" size={24} color={colors.accent} />
        <View>
          <Text style={styles.creditsLabel}>Your credits</Text>
          <Text style={styles.creditsValue}>{credits ?? '—'}</Text>
        </View>
      </View>

      <Text style={styles.heading}>Purchase Credits</Text>
      <Text style={styles.subheading}>
        Each credit generates 6 professional product images.
      </Text>

      {/* Tier cards */}
      <View style={[styles.tierGrid, isDesktop && styles.tierGridDesktop]}>
        {tiers.map((tier) => {
          const isPopular = tier.slug === POPULAR_SLUG;
          const perCredit = (tier.priceInr / tier.credits).toFixed(0);
          const perImage = (tier.priceInr / (tier.credits * 6)).toFixed(1);
          const isBuying = purchasing === tier.slug;

          return (
            <View
              key={tier.slug}
              style={[
                styles.tierCard,
                isPopular && styles.tierCardPopular,
              ]}
            >
              {isPopular && (
                <View style={styles.popularBadge}>
                  <Text style={styles.popularBadgeText}>BEST VALUE</Text>
                </View>
              )}
              <Text style={styles.tierName}>{tier.name}</Text>
              <Text style={styles.tierCredits}>{tier.credits} credits</Text>
              <Text style={styles.tierImages}>{tier.credits * 6} images</Text>

              <View style={styles.priceRow}>
                <Text style={styles.priceSymbol}>₹</Text>
                <Text style={styles.priceAmount}>{tier.priceInr}</Text>
              </View>

              <Text style={styles.tierMeta}>
                ₹{perCredit}/credit · ₹{perImage}/image
              </Text>

              <Pressable
                style={[styles.buyBtn, isPopular && styles.buyBtnPopular]}
                onPress={() => handleBuy(tier.slug)}
                disabled={isBuying}
                role="button"
              >
                {isBuying ? (
                  <ActivityIndicator size="small" color={isPopular ? colors.textOnAccent : colors.accent} />
                ) : (
                  <Text style={[styles.buyBtnText, isPopular && styles.buyBtnTextPopular]}>
                    Buy {tier.name}
                  </Text>
                )}
              </Pressable>
            </View>
          );
        })}
      </View>

      <Text style={styles.footer}>
        Payments processed securely by Razorpay. Supports UPI, cards, net banking & wallets.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { justifyContent: 'center', alignItems: 'center' },
  content: { padding: spacing.lg, paddingBottom: 60 },
  contentDesktop: {
    maxWidth: layout.wideMaxWidth,
    alignSelf: 'center',
    width: '100%',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(129, 201, 149, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(129, 201, 149, 0.3)',
    borderRadius: radii.md,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  bannerWarn: {
    backgroundColor: 'rgba(253, 214, 99, 0.12)',
    borderColor: 'rgba(253, 214, 99, 0.3)',
  },
  bannerText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
  },
  creditsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.xl,
    marginBottom: spacing['2xl'],
  },
  creditsLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  creditsValue: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  heading: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subheading: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
    marginBottom: spacing['2xl'],
  },
  tierGrid: {
    gap: spacing.lg,
    marginBottom: spacing['2xl'],
  },
  tierGridDesktop: {
    flexDirection: 'row',
  },
  tierCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.xs,
  },
  tierCardPopular: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(138, 180, 248, 0.06)',
  },
  popularBadge: {
    backgroundColor: colors.accent,
    paddingVertical: 2,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    marginBottom: spacing.sm,
  },
  popularBadgeText: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    color: colors.textOnAccent,
    letterSpacing: 1,
  },
  tierName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  tierCredits: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  tierImages: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: spacing.md,
  },
  priceSymbol: {
    fontSize: fontSize.lg,
    color: colors.textPrimary,
    fontWeight: fontWeight.semibold,
    marginTop: 4,
  },
  priceAmount: {
    fontSize: fontSize['4xl'],
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  tierMeta: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    marginBottom: spacing.md,
  },
  buyBtn: {
    width: '100%',
    paddingVertical: spacing.md,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.accent,
    alignItems: 'center',
  },
  buyBtnPopular: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  buyBtnText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.accent,
  },
  buyBtnTextPopular: {
    color: colors.textOnAccent,
  },
  footer: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    textAlign: 'center',
  },
});
