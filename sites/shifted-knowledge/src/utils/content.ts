import { getCollection, type CollectionEntry, } from "astro:content";
import { getAssetPath } from "./url";
import { slugify } from "./text";
import {POSTS_PATH, PAGES_PATH, GUIDES_PATH} from "@/content.config";

export type Post = CollectionEntry<"posts">;
export type Page = CollectionEntry<"pages">;
export type Guide = CollectionEntry<"guides">;

let postsCache: Post[] | null = null;
let pagesCache: Page[] | null = null;
let guidesCache: Guide[] | null = null;

// Posts and guides share the same draft and publish-date rules.
type Dated = Post | Guide;

function isVisibleEntry(entry: Dated): boolean {
  // Show everything in development
  if (import.meta.env.DEV) {
    return true;
  }

  const isDraft = entry.data.draft;

  const isFuture =
    new Date(entry.data.published).getTime() >
    Date.now();

  return !isDraft && !isFuture;
}

function isVisiblePage(page: Page): boolean {
  // Show drafts in development
  if (import.meta.env.DEV) {
    return true;
  }

  return !page.data.draft;
}

function isPublicPage(page: Page): boolean {
  return page.id !== "home-intro";
}

function sortByDate<T extends Dated>(entries: T[]): T[] {
  return entries.sort((a, b) => {
    const aDate = new Date(
      a.data.updated ?? a.data.published
    ).getTime();

    const bDate = new Date(
      b.data.updated ?? b.data.published
    ).getTime();

    return bDate - aDate;
  });
}

export async function getAllPosts(): Promise<Post[]> {
  if (postsCache) {
    return postsCache;
  }

  const posts = await getCollection(
    "posts",
    isVisibleEntry
  );

  postsCache = sortByDate(posts);

  return postsCache;
}

/**
 * Guides, most recently revised first. Deliberately not part of the timeline:
 * they are excluded from /posts, the home page, and the RSS feed.
 */
export async function getAllGuides(): Promise<Guide[]> {
  if (guidesCache) {
    return guidesCache;
  }

  const guides = await getCollection(
    "guides",
    isVisibleEntry
  );

  guidesCache = sortByDate(guides);

  return guidesCache;
}

export async function getAllPages(): Promise<Page[]> {
  if (pagesCache) {
    return pagesCache;
  }

  const pages = await getCollection(
    "pages",
    (page) =>
      isVisiblePage(page) &&
      isPublicPage(page)
  );

  pagesCache = pages;

  return pagesCache;
}

/**
 * Every tag in use across the given entries, alphabetically. Drives the filter
 * bar on /posts, which is the only place tags are browsable.
 */
export function collectTags(entries: Dated[]): string[] {
  return [
    ...new Set(
      entries.flatMap(
        (entry) => entry.data.tags ?? []
      )
    ),
  ].sort();
}

/**
 * Remove hidden folders and normalize directory segments.
 *
 * Example:
 * posts/_2026/Japan Beyond Places.md
 * -> []
 *
 * posts/travel/Japan/Tokyo.md
 * -> ["travel", "japan"]
 */
export function getPostPathSegments(
  filePath?: string
): string[] {
  if (!filePath) {
    return [];
  }

  return filePath
    .replace(POSTS_PATH, "")
    .split("/")
    .filter(Boolean)
    .filter((segment) => !segment.startsWith("_"))
    .slice(0, -1)
    .map(slugify);
}

/**
 * Get the final slug segment from Astro content entry ID.
 *
 * Example:
 * "travel/tokyo-beyond-places"
 * -> "tokyo-beyond-places"
 */
export function getPostSlugSegment(id: string): string {
  const segments = id.split("/");

  return segments.at(-1) ?? id;
}

/**
 * Generate nested slug path from file structure.
 *
 * Example:
 * travel/japan/tokyo.md
 * -> "travel/japan/tokyo"
 */
export function getPostSlugPath(
  id: string,
  filePath?: string
): string {
  const segments = getPostPathSegments(filePath);

  const slug =
    slugify(getPostSlugSegment(id));

  return segments.length > 0
    ? [...segments, slug].join("/")
    : slug;
}

/**
 * Route param slug used in getStaticPaths().
 *
 * Example:
 * "/travel/japan/tokyo"
 */
export function getPostSlug(
  id: string,
  filePath?: string
): string {
  return `/${getPostSlugPath(id, filePath)}`;
}

export function getPagePathSegments(
  filePath?: string
): string[] {
  if (!filePath) {
    return [];
  }

  return filePath
    .replace(PAGES_PATH, "")
    .split("/")
    .filter(Boolean)
    .filter((segment) => !segment.startsWith("_"))
    .slice(0, -1)
    .map(slugify);
}

export function getPageSlugPath(
  id: string,
  filePath?: string
): string {
  const segments = getPagePathSegments(filePath);
  const slug = slugify(getPostSlugSegment(id));

  return segments.length > 0
    ? [...segments, slug].join("/")
    : slug;
}

export function getPageSlug(
  id: string,
  filePath?: string
): string {
  return `/${getPageSlugPath(id, filePath)}`;
}

export function getGuidePathSegments(
  filePath?: string
): string[] {
  if (!filePath) {
    return [];
  }

  return filePath
    .replace(GUIDES_PATH, "")
    .split("/")
    .filter(Boolean)
    .filter((segment) => !segment.startsWith("_"))
    .slice(0, -1)
    .map(slugify);
}

export function getGuideSlugPath(
  id: string,
  filePath?: string
): string {
  const segments = getGuidePathSegments(filePath);
  const slug = slugify(getPostSlugSegment(id));

  return segments.length > 0
    ? [...segments, slug].join("/")
    : slug;
}

export function getGuideSlug(
  id: string,
  filePath?: string
): string {
  return `/${getGuideSlugPath(id, filePath)}`;
}

/**
 * Full guide URL.
 *
 * Example:
 * "/guides/markdown-and-ai"
 */
export function getGuideUrl(
  id: string,
  filePath?: string
): string {
  return getAssetPath(
    `guides/${getGuideSlugPath(id, filePath)}`
  );
}

/**
 * Full post URL.
 *
 * Example:
 * "/posts/travel/japan/tokyo"
 */
export function getPostUrl(
  id: string,
  filePath?: string
): string {
  return getAssetPath(
    `posts/${getPostSlugPath(id, filePath)}`
  );
}

/**
 * Get adjacent posts.
 */
export function getAdjacentPosts<
  T extends Post
>(
  posts: T[],
  currentPost: T
) {
  const index = posts.findIndex(
    (post) => post.id === currentPost.id
  );

  return {
    prevPost:
      index < posts.length - 1
        ? posts[index + 1]
        : null,

    nextPost:
      index > 0
        ? posts[index - 1]
        : null,
  };
}

function scorePostSimilarity(
  currentPost: Post,
  candidatePost: Post
): number {
  let score = 0;

  const currentTags =
    currentPost.data.tags ?? [];

  const candidateTags =
    candidatePost.data.tags ?? [];

  // Shared tags
  const sharedTags = currentTags.filter(
    (tag) =>
      candidateTags.includes(tag)
  );

  score += sharedTags.length * 10;

  // Same top-level directory
  const currentPath =
    currentPost.filePath
      ?.split("/")
      .slice(0, -1)
      .join("/") ?? "";

  const candidatePath =
    candidatePost.filePath
      ?.split("/")
      .slice(0, -1)
      .join("/") ?? "";

  if (
    currentPath &&
    candidatePath &&
    currentPath === candidatePath
  ) {
    score += 5;
  }

  // Slight recency boost
  const currentDate =
    currentPost.data.updated ??
    currentPost.data.published;

  const candidateDate =
    candidatePost.data.updated ??
    candidatePost.data.published;

  const diffInDays = Math.abs(
    currentDate.getTime() -
      candidateDate.getTime()
  ) /
    (1000 * 60 * 60 * 24);

  if (diffInDays < 30) {
    score += 2;
  }

  return score;
}

export function getRelatedPosts(
  currentPost: Post,
  posts: Post[],
  limit: number
): Post[] {

  return posts
    .filter(
      (post) =>
        post.id !== currentPost.id
    )
    .map((post) => ({
      post,
      score: scorePostSimilarity(
        currentPost,
        post
      ),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.post);
}

