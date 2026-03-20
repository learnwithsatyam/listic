import { useWindowDimensions } from 'react-native';
import { breakpoints } from '../theme';

export type ScreenSize = 'sm' | 'md' | 'lg' | 'xl';

export function useResponsive() {
  const { width, height } = useWindowDimensions();

  const size: ScreenSize =
    width >= breakpoints.xl
      ? 'xl'
      : width >= breakpoints.lg
        ? 'lg'
        : width >= breakpoints.md
          ? 'md'
          : 'sm';

  const isDesktop = width >= breakpoints.lg;
  const isTablet = width >= breakpoints.md && width < breakpoints.lg;
  const isMobile = width < breakpoints.md;

  return { width, height, size, isDesktop, isTablet, isMobile };
}
