import rss from "@astrojs/rss";
import type { APIContext } from "astro";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { render } from "astro:content";
import sanitizeHtml from "sanitize-html";
import siteConfig from "@/site.config";
import {
  getAllPosts,
  getPostUrl,
} from "@/utils/content";

// Guides are deliberately absent. They are revised rather than published, so a
// feed of them would either go stale or re-announce the same piece each time it
// changed. The feed is the timeline, and the timeline is posts.

/**
 * Make root-relative URLs absolute.
 *
 * A feed reader shows the item outside the site, so `/_astro/…` (what Astro's
 * image optimisation emits) and internal links resolve against the reader's own
 * origin and break. Protocol-relative and fully-qualified URLs are left alone.
 */
function absolutiseUrls(html: string, origin: string): string {
  return html.replace(
    /(\s(?:href|src|poster)=")\/(?!\/)/g,
    `$1${origin}/`,
  );
}

/**
 * `srcset` holds a comma-separated candidate list, so it needs its own pass.
 */
function absolutiseSrcset(html: string, origin: string): string {
  return html.replace(
    /(\ssrcset=")([^"]+)(")/g,
    (_match, open: string, value: string, close: string) => {
      const rewritten = value
        .split(",")
        .map((candidate) => {
          const trimmed = candidate.trim();

          return trimmed.startsWith("/") && !trimmed.startsWith("//")
            ? `${origin}${trimmed}`
            : trimmed;
        })
        .join(", ");

      return `${open}${rewritten}${close}`;
    },
  );
}

export async function GET(context: APIContext) {
  const posts = await getAllPosts();
  const site = (context.site ?? new URL(siteConfig.url)).toString();
  const origin = site.replace(/\/$/, "");

  // Render through the real pipeline rather than a standalone markdown parser,
  // so the remark plugins (obsidian links, callouts, image processing) and
  // Astro's image optimisation apply exactly as they do on the page.
  //
  // No renderers are registered: the content contract accepts plain markdown
  // only, whose Content is an ordinary Astro component.
  const container = await AstroContainer.create();

  const items = await Promise.all(
    posts.map(async (post) => {
      const { Content } = await render(post);
      const rendered = await container.renderToString(Content);

      const content = sanitizeHtml(
        absolutiseSrcset(absolutiseUrls(rendered, origin), origin),
        {
          allowedTags: sanitizeHtml.defaults.allowedTags.concat([
            "img",
            "picture",
            "source",
            "figure",
            "figcaption",
            "video",
            "audio",
          ]),
          allowedAttributes: {
            ...sanitizeHtml.defaults.allowedAttributes,
            // `rel` is not in the defaults, and dropping it would leave the
            // target="_blank" that remark-external-links adds without its
            // noopener pair.
            a: ["href", "name", "target", "rel"],
            img: ["src", "srcset", "sizes", "alt", "width", "height", "loading"],
            source: ["src", "srcset", "sizes", "type", "media"],
            video: ["src", "poster", "width", "height", "controls"],
            audio: ["src", "controls"],
            "*": ["id"],
          },
        },
      );

      return {
        title: post.data.title,
        description: post.data.description,
        // The publication date, not the revision date: fixing a typo in an old
        // post should not make it resurface as new in someone's reader.
        pubDate: post.data.published,
        link: getPostUrl(post.id, post.filePath),
        categories: post.data.tags,
        content,
      };
    }),
  );

  return rss({
    title: siteConfig.title,
    description: siteConfig.description,
    site,
    items,
    // The channel image. NetNewsWire reads this first and only falls back to
    // downloading the home page and hunting for apple-touch-icon, twitter:image
    // or og:image if it is missing — which is guesswork, and this site's
    // og:image is a 1200x630 share card, not a square mark. Point it at the
    // favicon, which is square and is the logo.
    customData: [
      "<image>",
      `<url>${origin}/favicon.png</url>`,
      `<title>${siteConfig.title}</title>`,
      `<link>${origin}/</link>`,
      "</image>",
    ].join(""),
  });
}
