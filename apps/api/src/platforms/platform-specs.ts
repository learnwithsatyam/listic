export interface PlatformSpec {
  name: string;
  slug: string;
  dimensions: { width: number; height: number };
  maxFileSizeKB: number;
  formats: string[];
  requirements: string[];
  backgroundRequirement: 'white' | 'any' | 'transparent';
  minProductFillPercent: number;
}

export const PLATFORM_SPECS: Record<string, PlatformSpec> = {
  amazon: {
    name: 'Amazon',
    slug: 'amazon',
    dimensions: { width: 2000, height: 2000 },
    maxFileSizeKB: 10000,
    formats: ['JPEG', 'PNG', 'TIFF'],
    requirements: [
      'Pure white background (RGB 255,255,255)',
      'Product must fill at least 85% of the image',
      'No watermarks, logos, or text overlays',
      'No borders or color blocks',
      'Main image must show actual product (no illustrations)',
      'Product must not be on a mannequin (for apparel)',
    ],
    backgroundRequirement: 'white',
    minProductFillPercent: 85,
  },
  flipkart: {
    name: 'Flipkart',
    slug: 'flipkart',
    dimensions: { width: 1024, height: 1024 },
    maxFileSizeKB: 5000,
    formats: ['JPEG', 'PNG'],
    requirements: [
      'White or light background recommended',
      'Minimum 500x500 pixels',
      'Product must be clearly visible',
      'No promotional text on main image',
      'High resolution and sharp focus',
    ],
    backgroundRequirement: 'white',
    minProductFillPercent: 75,
  },
  meesho: {
    name: 'Meesho',
    slug: 'meesho',
    dimensions: { width: 1024, height: 1024 },
    maxFileSizeKB: 5000,
    formats: ['JPEG', 'PNG'],
    requirements: [
      'White or single color background',
      'Minimum 450x450 pixels',
      'Well-lit, clear product image',
      'No distracting elements',
      'Show true product colors',
    ],
    backgroundRequirement: 'white',
    minProductFillPercent: 70,
  },
  ajio: {
    name: 'AJIO',
    slug: 'ajio',
    dimensions: { width: 1080, height: 1440 },
    maxFileSizeKB: 5000,
    formats: ['JPEG', 'PNG'],
    requirements: [
      'Light or grey background for apparel',
      'Model shots preferred for clothing',
      'Minimum 1080x1440 for vertical product images',
      'Clean, professional styling',
      'No heavy post-processing filters',
    ],
    backgroundRequirement: 'any',
    minProductFillPercent: 70,
  },
  gumroad: {
    name: 'Gumroad',
    slug: 'gumroad',
    dimensions: { width: 1280, height: 720 },
    maxFileSizeKB: 8000,
    formats: ['JPEG', 'PNG', 'GIF'],
    requirements: [
      'Landscape orientation recommended (1280x720 or 16:9)',
      'Clear product representation',
      'Lifestyle and context images work well',
      'Branding is allowed',
      'Higher creative flexibility than marketplace platforms',
    ],
    backgroundRequirement: 'any',
    minProductFillPercent: 50,
  },
};
