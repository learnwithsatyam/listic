// ---- Platform Types ----
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

// ---- Image Types ----
export type ImageType =
  | 'main'
  | 'lifestyle'
  | 'closeup'
  | 'scale'
  | 'angle'
  | 'model';

export type ProjectStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface GeneratedImage {
  id: string;
  imageUrl: string;
  imageType: ImageType;
  platform: string;
  width: number;
  height: number;
  createdAt: string;
}

export interface ImageProject {
  id: string;
  userId: string;
  originalImageUrl: string;
  productName: string;
  productCategory: string;
  isWearable: boolean;
  targetPlatforms: string[];
  status: ProjectStatus;
  errorMessage?: string;
  generatedImages: GeneratedImage[];
  createdAt: string;
  updatedAt: string;
}

// ---- Food Studio Types ----
export type StudioFormatSlug = 'square' | 'portrait' | 'story' | 'landscape';

export interface StudioFormat {
  slug: StudioFormatSlug;
  name: string;
  aspect: string;
  width: number;
  height: number;
  description: string;
}

export type BackgroundSource = 'uploaded' | 'generated';

export interface StudioBackground {
  id: string;
  userId: string;
  name: string;
  source: BackgroundSource;
  prompt?: string;
  imageUrl: string;
  width: number;
  height: number;
  createdAt: string;
}

export interface FoodShot {
  id: string;
  shootId: string;
  dishName: string;
  sourceImageUrl: string;
  resultImageUrl?: string;
  status: ProjectStatus;
  errorMessage?: string;
  width: number;
  height: number;
  createdAt: string;
}

export interface FoodShoot {
  id: string;
  userId: string;
  name: string;
  format: StudioFormatSlug;
  stylePrompt?: string;
  status: ProjectStatus;
  errorMessage?: string;
  background: StudioBackground;
  shots: FoodShot[];
  createdAt: string;
  updatedAt: string;
}

export interface GenerateBackgroundRequest {
  prompt: string;
  name?: string;
  format?: StudioFormatSlug;
}

export interface CreateShootRequest {
  backgroundId: string;
  name: string;
  format?: StudioFormatSlug;
  stylePrompt?: string;
  dishNames: string[];
}

// ---- Auth Types ----
export interface AuthResponse {
  accessToken: string;
  userId: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

// ---- API Types ----
export interface CreateProjectRequest {
  productName: string;
  productCategory: string;
  isWearable: boolean;
  targetPlatforms: string[];
}

export interface GenerateImagesRequest {
  projectId: string;
  additionalPrompt?: string;
}
