import rss from "@astrojs/rss";
import type { APIContext } from "astro";
import { getAllPosts, entrySlug } from "@/utils/content";
import siteConfig from "@/site.config";

export async function GET(context: APIContext) {
  const posts = await getAllPosts();
  return rss({
    title: `${siteConfig.title} · Posts`,
    description: siteConfig.description,
    site: context.site ?? siteConfig.url,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.published,
      link: `/posts/${entrySlug(post.id)}`,
    })),
  });
}
