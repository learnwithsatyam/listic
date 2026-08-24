export type StudioFormatSlug = 'square' | 'portrait' | 'story' | 'landscape';

export interface StudioFormat {
  slug: StudioFormatSlug;
  name: string;
  /** Human-readable aspect, e.g. "4:5" */
  aspect: string;
  width: number;
  height: number;
  description: string;
  /** Phrasing fed to Gemini so the generated plate is framed the right way. */
  framingHint: string;
}

/** Instagram-native output sizes for the cafe photo studio. */
export const STUDIO_FORMATS: Record<StudioFormatSlug, StudioFormat> = {
  square: {
    slug: 'square',
    name: 'Square Post',
    aspect: '1:1',
    width: 1080,
    height: 1080,
    description: 'Classic Instagram feed post',
    framingHint: 'a square 1:1 frame',
  },
  portrait: {
    slug: 'portrait',
    name: 'Portrait Post',
    aspect: '4:5',
    width: 1080,
    height: 1350,
    description: 'Tallest feed post — takes the most screen space',
    framingHint: 'a tall vertical 4:5 portrait frame',
  },
  story: {
    slug: 'story',
    name: 'Story / Reel',
    aspect: '9:16',
    width: 1080,
    height: 1920,
    description: 'Full-screen Stories and Reels cover',
    framingHint: 'a full-screen vertical 9:16 frame',
  },
  landscape: {
    slug: 'landscape',
    name: 'Landscape',
    aspect: '1.91:1',
    width: 1080,
    height: 566,
    description: 'Wide banner-style post',
    framingHint: 'a wide horizontal 1.91:1 frame',
  },
};

export const DEFAULT_STUDIO_FORMAT: StudioFormatSlug = 'square';

export function getStudioFormat(slug?: string): StudioFormat {
  return STUDIO_FORMATS[slug as StudioFormatSlug] || STUDIO_FORMATS[DEFAULT_STUDIO_FORMAT];
}

export function listStudioFormats(): StudioFormat[] {
  return Object.values(STUDIO_FORMATS);
}
