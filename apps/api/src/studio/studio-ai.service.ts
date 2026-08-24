import { Injectable, Logger } from '@nestjs/common';
import { ImagenService, InlineImage } from '../images/imagen.service';
import { StudioFormat } from './studio-formats';

export interface ComposeRequest {
  /** The background plate, as a `data:` URI. */
  backgroundDataUri: string;
  /** The cafe's photo of the dish, as a `data:` URI. */
  dishDataUri: string;
  dishName: string;
  format: StudioFormat;
  /** Optional shoot-wide art direction, e.g. "top-down, warm tones". */
  stylePrompt?: string;
}

@Injectable()
export class StudioAiService {
  private readonly logger = new Logger(StudioAiService.name);

  constructor(private readonly imagenService: ImagenService) {}

  /**
   * Generate an empty background plate from a plain-language description.
   * Deliberately food-free: dishes get composed onto it afterwards, so anything
   * edible in the plate would fight with the real product photo.
   */
  async generateBackground(
    description: string,
    format: StudioFormat,
  ): Promise<string> {
    this.logger.log(`Generating background plate: "${description}"`);
    return this.imagenService.generateFromParts(this.buildBackgroundPrompt(description, format));
  }

  /** Place a real dish photo into a background plate as one seamless photograph. */
  async composeDishOnBackground(request: ComposeRequest): Promise<string> {
    this.logger.log(`Composing "${request.dishName}" onto background`);

    const images: InlineImage[] = [
      this.imagenService.toInlineImage(request.backgroundDataUri),
      this.imagenService.toInlineImage(request.dishDataUri),
    ];

    return this.imagenService.generateFromParts(this.buildComposePrompt(request), images);
  }

  buildBackgroundPrompt(description: string, format: StudioFormat): string {
    return [
      `Create a photorealistic, empty background plate for professional food photography.`,
      `Scene description: ${description}.`,
      `The scene must be completely EMPTY of food — no dishes, plates, bowls, cutlery with food,`,
      `no drinks, no people, no hands. Only the setting itself: the surface, the props and the light.`,
      `Leave a clean, uncluttered area in the middle of the frame where a dish will be placed later.`,
      `Soft, natural, even light with a single consistent direction. Gentle depth of field so the far`,
      `background falls off slightly while the surface stays sharp. Shot on a full-frame camera with a`,
      `50mm lens at a natural table-level perspective. Rich but true-to-life colours.`,
      `Compose it for ${format.framingHint}.`,
      `Photographic realism — not an illustration, render or painting.`,
    ].join(' ');
  }

  buildComposePrompt(request: ComposeRequest): string {
    const lines = [
      `You are given two images. IMAGE 1 is a background scene. IMAGE 2 is a photograph of a food`,
      `dish called "${request.dishName}".`,
      ``,
      `Place the dish from IMAGE 2 into the scene from IMAGE 1 so the result looks like a single real`,
      `photograph taken by a professional food photographer in that exact location.`,
      ``,
      `Preserve the dish exactly: the same food, the same garnish, the same colours, the same portion`,
      `size, and the same plate, bowl, tray or cup it is served in. Do not swap, restyle, re-plate,`,
      `re-garnish or "improve" the dish, and do not change how much food is on it.`,
      ``,
      `Preserve the background exactly: the same surface, props, colours, textures, camera angle and`,
      `lighting direction as IMAGE 1. Do not redecorate the scene, move the props, or replace it with`,
      `a different setting.`,
      ``,
      `Make the two match physically: correct the dish's perspective so it sits flat on the natural`,
      `resting surface at the scene's eye level, at a realistic real-world size. Add a soft contact`,
      `shadow where it meets the surface plus ambient occlusion underneath, and relight the dish to`,
      `the scene's colour temperature, intensity and highlight direction so nothing looks pasted in.`,
      ``,
      `Framing: ${request.format.framingHint}. The dish is fully inside the frame, fills roughly 55-70%`,
      `of it, and sits slightly off-centre for a natural composition. The background fills the frame`,
      `edge to edge with no empty margins, letterboxing or padding.`,
      ``,
      `Photorealistic result only: no cut-out edges, no halo or outline around the dish, no visible`,
      `seams, no collage look, no illustration or 3D-render styling.`,
    ];

    if (request.stylePrompt?.trim()) {
      lines.push('', `Additional art direction: ${request.stylePrompt.trim()}.`);
    }

    return lines.join('\n');
  }
}
