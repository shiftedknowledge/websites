// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeUnwrapImages from "rehype-unwrap-images";
import { unified } from "@astrojs/markdown-remark";
import siteConfig from "./src/site.config";
import { remarkImageProcessing } from "./src/plugins/remark-image-processing";

// Moment Hill — bespoke Astro app on the websites platform (npm, light theme only).
// Kept deliberately lean: no dark theme, no search, static output, no dynamic OG.
export default defineConfig({
  site: siteConfig.url,

  // `responsiveStyles` does nothing on its own: Astro only applies it when
  // `layout` is also set. Without it, a markdown image was re-encoded to WebP
  // at its original pixel size and shipped with an empty srcset, so a phone
  // downloaded a full-resolution photo to show it in a 632px column.
  //
  // `constrained` lets an image shrink but never render above its intrinsic
  // size. The list tops out at 1920 because the prose column is 632px, so a 3x
  // display asks for ~1900 and must find a candidate there; without one the
  // browser jumps to the untouched original.
  image: {
    layout: "constrained",
    responsiveStyles: true,
    breakpoints: [320, 480, 640, 768, 1024, 1280, 1600, 1920],
  },

  vite: {
    plugins: [tailwindcss()],
  },

  integrations: [sitemap()],

  build: {
    // Inline small stylesheets, keep larger ones cacheable across pages.
    inlineStylesheets: "auto",
    assets: "_astro",
  },

  markdown: {
    processor: unified({
      gfm: true,
      smartypants: true,
      remarkPlugins: [remarkImageProcessing],
      rehypePlugins: [
        rehypeSlug,
        rehypeUnwrapImages,
        [
          rehypeAutolinkHeadings,
          {
            behavior: "append",
            properties: { className: ["heading-anchor"], ariaLabel: "Link to this heading" },
            content: { type: "text", value: "#" },
          },
        ],
      ],
    }),
  },
});
