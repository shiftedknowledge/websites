/**
 * Image utilities.
 *
 * One job: resolve a post or guide's `cover:` frontmatter value to the actual
 * image file, so Astro can optimise it.
 *
 * Images live beside the entry that uses them, flat:
 *
 *   src/content/posts/my-post.md
 *   src/content/posts/my-post.hero.jpg   ->  cover: ./my-post.hero.jpg
 *
 * That is the layout the content repos document. An earlier version of this
 * file looked images up in a `<post>/attachments/` folder inherited from the
 * theme this site started as, which the flat layout never creates, so `cover:`
 * silently resolved to nothing on every entry.
 */

import type { ImageMetadata } from 'astro';

// Static, module-level: Vite requires a literal pattern.
const contentImages = import.meta.glob<{ default: ImageMetadata }>(
  '/src/content/**/*.{jpg,jpeg,png,webp,avif,gif,JPG,JPEG,PNG,WEBP}',
  { eager: true }
);

/**
 * Strip the wrappers a cover value might arrive in.
 *
 *   [[my-post.hero.jpg]]        Obsidian wiki-link
 *   [Label](my-post.hero.jpg)   markdown link
 *   ./my-post.hero.jpg          relative path
 */
function normaliseCoverValue(raw: string): string {
  const value = raw.trim();

  const obsidian = value.match(/^\[\[(.+?)\]\]$/);
  if (obsidian) return obsidian[1].trim();

  const markdown = value.match(/^\[.*?\]\((.+?)\)$/);
  if (markdown) return markdown[1].trim();

  return value;
}

/**
 * Resolve `cover:` to ImageMetadata, or undefined if it cannot be found.
 *
 * Undefined is not an error: an entry without a usable cover falls back to the
 * generated OG card, which is why `cover` is optional.
 *
 * @param raw       the frontmatter value
 * @param filePath  the entry's own path, e.g. "src/content/posts/my-post.md"
 */
export function getCoverImage(
  raw: string | undefined,
  filePath: string | undefined
): ImageMetadata | undefined {
  if (!raw || !filePath) return undefined;

  const value = normaliseCoverValue(raw);
  if (!value) return undefined;

  // A remote image is passed through untouched elsewhere; nothing to resolve.
  if (/^https?:\/\//.test(value)) return undefined;

  const relative = value.replace(/^\.\//, '');

  // The entry's own directory, as a glob key: "src/content/posts/x.md"
  // becomes "/src/content/posts".
  const entryDir = `/${filePath.replace(/^\/+/, '').replace(/\/[^/]+$/, '')}`;

  const candidates = [
    // Beside the entry — the documented layout.
    `${entryDir}/${relative}`,
    // Content-root-relative, e.g. "posts/my-post.hero.jpg".
    `/src/content/${relative}`,
    // Already a full glob key.
    relative.startsWith('/src/content/') ? relative : null,
  ].filter(Boolean) as string[];

  for (const key of candidates) {
    const mod = contentImages[key];
    if (mod) return mod.default;
  }

  return undefined;
}
