// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import mdx from "@astrojs/mdx";
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

  image: {
    responsiveStyles: true,
  },

  vite: {
    plugins: [tailwindcss()],
  },

  integrations: [mdx(), sitemap()],

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
