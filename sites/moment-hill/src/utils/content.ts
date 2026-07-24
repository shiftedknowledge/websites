import { getCollection, type CollectionEntry } from "astro:content";
import { slugify } from "./text";

export type Post = CollectionEntry<"posts">;
export type Page = CollectionEntry<"pages">;
export type Framework = CollectionEntry<"frameworks">;
export type Tutorial = CollectionEntry<"tutorials">;

const isDev = import.meta.env.DEV;

// filename = slug (flat). The glob loader id is the filename without extension.
export const entrySlug = (id: string): string => slugify(id.split("/").at(-1) ?? id);

type Dated = { data: { draft?: boolean; published?: Date } };
function isVisible(entry: Dated): boolean {
  if (isDev) return true;
  if (entry.data.draft) return false;
  if (entry.data.published && entry.data.published.getTime() > Date.now()) return false;
  return true;
}

type Sortable = { data: { published: Date; updated?: Date } };
function byNewest(a: Sortable, b: Sortable): number {
  return (b.data.updated ?? b.data.published).getTime() - (a.data.updated ?? a.data.published).getTime();
}

export async function getAllPosts(): Promise<Post[]> {
  return (await getCollection("posts", isVisible)).sort(byNewest);
}

export async function getAllFrameworks(): Promise<Framework[]> {
  return (await getCollection("frameworks", isVisible)).sort(byNewest);
}

export async function getAllPages(): Promise<Page[]> {
  return getCollection("pages", (p) => isDev || !p.data.draft);
}

export function getRelatedPosts(current: Post, all: Post[], limit: number): Post[] {
  const tags = new Set(current.data.tags ?? []);
  if (tags.size === 0) return [];
  return all
    .filter((p) => p.id !== current.id)
    .map((p) => ({ p, score: (p.data.tags ?? []).filter((t) => tags.has(t)).length }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.p);
}

// Union of every framework's categories, alphabetical — powers the filter buttons.
export function allCategories(frameworks: Framework[]): string[] {
  return Array.from(new Set(frameworks.flatMap((f) => f.data.categories ?? []))).sort();
}

export async function getAllTutorials(): Promise<Tutorial[]> {
  return (await getCollection("tutorials", isVisible)).sort(byNewest);
}

// The difficulty levels actually present, kept in ascending order for the filter.
const LEVEL_ORDER = ["beginner", "intermediate", "advanced"] as const;
export function presentLevels(tutorials: Tutorial[]): string[] {
  const present = new Set(tutorials.map((t) => t.data.level));
  return LEVEL_ORDER.filter((l) => present.has(l));
}
