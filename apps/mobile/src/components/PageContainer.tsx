import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useResponsive } from '../hooks/useResponsive';
import { colors, layout } from '../theme';

interface Props {
  children: React.ReactNode;
  wide?: boolean;
  style?: ViewStyle;
  noPadding?: boolean;
}

/**
 * Centers content with a max-width on desktop screens.
 * On mobile, renders full-width.
 */
export function PageContainer({ children, wide, style, noPadding }: Props) {
  const { isDesktop } = useResponsive();
  const maxWidth = wide ? layout.wideMaxWidth : layout.contentMaxWidth;

  return (
    <View style={[styles.outer, style]}>
      <View
        style={[
          styles.inner,
          isDesktop && { maxWidth, width: '100%' },
          noPadding && { paddingHorizontal: 0 },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.bg,
  },
  inner: {
    flex: 1,
    width: '100%',
  },
});
