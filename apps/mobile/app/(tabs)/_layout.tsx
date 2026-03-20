import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Tabs, usePathname, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useResponsive } from '../../src/hooks/useResponsive';
import { colors, spacing, radii, fontSize, fontWeight, layout } from '../../src/theme';

const TAB_ITEMS = [
  { name: 'home', label: 'Home', icon: 'sparkles' as const, iconOutline: 'sparkles-outline' as const },
  { name: 'projects', label: 'Projects', icon: 'grid' as const, iconOutline: 'grid-outline' as const },
  { name: 'settings', label: 'Settings', icon: 'settings' as const, iconOutline: 'settings-outline' as const },
];

function DesktopSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (name: string) => pathname === `/${name}` || pathname.startsWith(`/${name}/`);

  return (
    <View style={sidebarStyles.container}>
      {/* Brand */}
      <Pressable style={sidebarStyles.brand} onPress={() => router.push('/(tabs)/home')}>
        <View style={sidebarStyles.brandDot} />
        <Text style={sidebarStyles.brandText}>Listic</Text>
      </Pressable>

      {/* New Project button */}
      <Pressable
        style={sidebarStyles.newBtn}
        onPress={() => router.push('/upload')}
      >
        <Ionicons name="add" size={20} color={colors.textOnAccent} />
        <Text style={sidebarStyles.newBtnText}>New Project</Text>
      </Pressable>

      {/* Nav items */}
      <View style={sidebarStyles.nav}>
        {TAB_ITEMS.map((tab) => {
          const active = isActive(tab.name);
          return (
            <Pressable
              key={tab.name}
              style={[sidebarStyles.navItem, active && sidebarStyles.navItemActive]}
              onPress={() => router.push(`/(tabs)/${tab.name}` as any)}
            >
              <Ionicons
                name={active ? tab.icon : tab.iconOutline}
                size={20}
                color={active ? colors.accent : colors.textSecondary}
              />
              <Text style={[sidebarStyles.navLabel, active && sidebarStyles.navLabelActive]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  const { isDesktop } = useResponsive();

  if (isDesktop) {
    return (
      <View style={{ flex: 1, flexDirection: 'row', backgroundColor: colors.bg }}>
        <DesktopSidebar />
        <View style={{ flex: 1 }}>
          <Tabs
            screenOptions={{
              tabBarStyle: { display: 'none' },
              headerStyle: { backgroundColor: colors.bg },
              headerTintColor: colors.textPrimary,
              headerTitleStyle: { fontWeight: '600' },
              headerShadowVisible: false,
            }}
          >
            <Tabs.Screen name="home" options={{ title: 'Home' }} />
            <Tabs.Screen name="projects" options={{ title: 'Projects' }} />
            <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
          </Tabs>
        </View>
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textTertiary,
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.textPrimary,
        headerTitleStyle: { fontWeight: '600' },
        headerShadowVisible: false,
        tabBarStyle: {
          backgroundColor: colors.bgSecondary,
          borderTopWidth: 0,
          elevation: 0,
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="sparkles" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="projects"
        options={{
          title: 'Projects',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}

const sidebarStyles = StyleSheet.create({
  container: {
    width: layout.sidebarWidth,
    backgroundColor: colors.bgSecondary,
    borderRightWidth: 1,
    borderRightColor: colors.borderLight,
    paddingVertical: spacing['2xl'],
    paddingHorizontal: spacing.lg,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing['3xl'],
    paddingHorizontal: spacing.sm,
  },
  brandDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accent,
  },
  brandText: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    borderRadius: radii.full,
    gap: spacing.xs,
    marginBottom: spacing['2xl'],
  },
  newBtnText: {
    color: colors.textOnAccent,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  nav: {
    gap: spacing.xs,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
  },
  navItemActive: {
    backgroundColor: colors.accentSoft,
  },
  navLabel: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  navLabelActive: {
    color: colors.accent,
    fontWeight: fontWeight.semibold,
  },
});
