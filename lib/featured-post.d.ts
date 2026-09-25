export const featuredPost: Readonly<{
  rank: number;
  username: string;
  shortcode: string;
  url: string;
  bid: number;
  embedAvailable: boolean;
}>;

export function instagramEmbedUrl(shortcode: string): string;
export function instagramPreviewUrl(shortcode: string): string;
