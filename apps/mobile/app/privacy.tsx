import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useResponsive } from '../src/hooks/useResponsive';
import { colors, spacing, radii, fontSize, fontWeight, layout } from '../src/theme';

const LAST_UPDATED = 'March 20, 2026';

export default function PrivacyPolicyScreen() {
  const { isDesktop } = useResponsive();

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, isDesktop && styles.contentDesktop]}>
      <Text style={styles.heading}>Privacy Policy</Text>
      <Text style={styles.updated}>Last updated: {LAST_UPDATED}</Text>

      <Section title="1. What we collect">
        <Paragraph>
          When you create an account, we store your email address, a securely hashed version of your password, and your name (if provided). We never store your password in plain text.
        </Paragraph>
        <Paragraph>
          When you upload a product image, we store the image file to generate AI-enhanced product photos on your behalf. Your uploaded images and generated images are stored securely and associated with your account.
        </Paragraph>
      </Section>

      <Section title="2. How we use your data">
        <Paragraph>
          Your data is used solely to provide the Listic service — generating professional product images for e-commerce marketplaces. Specifically:
        </Paragraph>
        <BulletList items={[
          'Your email is used for authentication and account recovery.',
          'Your product images are sent to Google Gemini AI to generate new product photos. No images are shared with any other third party.',
          'Credit usage is tracked to manage your generation allowance.',
        ]} />
      </Section>

      <Section title="3. Third-party services">
        <Paragraph>
          Listic uses the following third-party services to operate:
        </Paragraph>
        <BulletList items={[
          'Google Gemini API — for AI image generation. Images are processed by Google\'s servers. See Google\'s AI terms at ai.google.dev/terms.',
          'Neon (PostgreSQL) — for secure database hosting.',
          'Azure Blob Storage — for image file storage (when configured).',
        ]} />
      </Section>

      <Section title="4. Data retention">
        <Paragraph>
          Your account data and generated images are retained as long as your account is active. You may request deletion of your account and all associated data at any time by contacting us.
        </Paragraph>
      </Section>

      <Section title="5. Security">
        <Paragraph>
          Passwords are hashed using bcrypt with 12 salt rounds. All API communication uses HTTPS. Authentication tokens (JWT) expire after 7 days. Database connections use SSL encryption.
        </Paragraph>
      </Section>

      <Section title="6. Your rights">
        <Paragraph>
          You have the right to access, correct, or delete your personal data. You may also request a copy of your data or ask us to stop processing it. To exercise any of these rights, contact us at the email below.
        </Paragraph>
      </Section>

      <Section title="7. Children's privacy">
        <Paragraph>
          Listic is not intended for use by children under 13. We do not knowingly collect personal data from children.
        </Paragraph>
      </Section>

      <Section title="8. Changes to this policy">
        <Paragraph>
          We may update this Privacy Policy from time to time. Changes will be reflected on this page with an updated date. Continued use of Listic after changes constitutes acceptance.
        </Paragraph>
      </Section>

      <Section title="9. Contact">
        <Paragraph>
          If you have questions about this policy or your data, reach out at: mkssshivhare@gmail.com
        </Paragraph>
      </Section>

      <Text style={styles.footer}>Listic — Built for small sellers, with care.</Text>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Paragraph({ children }: { children: React.ReactNode }) {
  return <Text style={styles.paragraph}>{children}</Text>;
}

function BulletList({ items }: { items: string[] }) {
  return (
    <View style={styles.bulletList}>
      {items.map((item, idx) => (
        <View key={idx} style={styles.bulletRow}>
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.bulletText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: 60 },
  contentDesktop: {
    maxWidth: layout.contentMaxWidth,
    alignSelf: 'center',
    width: '100%',
  },
  heading: {
    fontSize: fontSize['3xl'],
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  updated: {
    fontSize: fontSize.sm,
    color: colors.textTertiary,
    marginBottom: spacing['3xl'],
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.xl,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  paragraph: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  bulletList: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  bulletRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingLeft: spacing.sm,
  },
  bullet: {
    fontSize: fontSize.base,
    color: colors.accent,
    lineHeight: 22,
  },
  bulletText: {
    flex: 1,
    fontSize: fontSize.base,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  footer: {
    fontSize: fontSize.sm,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing['3xl'],
  },
});
