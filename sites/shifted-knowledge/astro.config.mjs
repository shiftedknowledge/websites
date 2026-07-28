// @ts-check
import { defineConfig, fontProviders, svgoOptimizer } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import siteConfig from './src/site.config';
import rehypeUnwrapImages from 'rehype-unwrap-images';
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import { rawFonts } from "./src/plugins/rawFonts";
import { unified } from '@astrojs/markdown-remark';
import remarkCallouts from './src/plugins/remark-callouts';
import { remarkImageProcessing } from './src/plugins/remark-image-processing';
import { remarkExternalLinks } from './src/plugins/remark-external-links.ts';
import { remarkObsidian } from './src/plugins/remark-obsidian.ts';


// https://astro.build/config
export default defineConfig({
  site: siteConfig.url,

  // `responsiveStyles` does nothing on its own: Astro only applies it when
  // `layout` is also set. Without it, a markdown image was re-encoded to WebP
  // at its original pixel size and shipped with an empty srcset, so a phone
  // downloaded a full-resolution photo to show it in a 700px column.
  //
  // `constrained` lets an image shrink but never render above its intrinsic
  // size, and the capped breakpoint list means the largest variant generated is
  // 1600px wide however big the source is.
  image: {
    layout: "constrained",
    responsiveStyles: true,
    // Top of the list is 1920: the prose column is 640px, so a 3x display asks
    // for ~1920 and must find a candidate there. Without it the browser jumps
    // to the untouched original, which is the whole problem being fixed.
    breakpoints: [320, 480, 640, 768, 1024, 1280, 1600, 1920],
  },

  experimental: {
    contentIntellisense: true,
    rustCompiler: true,
    queuedRendering: {
      enabled: true,
    },
    svgOptimizer: svgoOptimizer(),
  },

  // Shifted Knowledge fonts (both Google Fonts, via Fontsource, self-hosted).
  // IBM Plex Mono = body/UI/code; Space Mono = headings/display.
  // The --font-lipi-* variable names are kept so the theme mapping and the
  // <Font> preloads in Head.astro need no renaming.
  fonts: [
    {
      name: "IBM Plex Mono",
      cssVariable: "--font-lipi-sans",
      provider: fontProviders.fontsource(),
      weights: [400, 500, 600, 700],
      styles: ["normal", "italic"],
      fallbacks: ["ui-monospace", "SFMono-Regular", "monospace"],
      formats: ["woff", "ttf"],
    },
    {
      name: "Space Mono",
      cssVariable: "--font-lipi-serif",
      provider: fontProviders.fontsource(),
      weights: [400, 700],
      styles: ["normal", "italic"],
      fallbacks: ["ui-monospace", "monospace"],
      formats: ["woff", "ttf"],
    }
  ],
  
  vite: {
    // server: {
    //   watch: {
    //     ignored: ['**/.obsidian/**', '**/_bases/**', '**/bases/**', '**/_home/**', '**/home/**', '**/_base/**', '**/base/**']
    //   }
    // },
    // assetsInclude: ['**/*.base', '**/.obsidian/**', '**/_bases/**'],
    build: {
      // Per-page CSS splitting. Caches better than one giant bundle for
      // return visitors who navigate between pages.
      cssCodeSplit: true,
      // cssMinify: 'lightningcss',
      minify: 'esbuild',
    },
    css: {
      transformer: 'lightningcss',
      lightningcss: {
        // Modern targets — drops legacy prefixes.
        targets: {
          chrome: 110 << 16,
          firefox: 115 << 16,
          safari: 16 << 16,
        },
      },
    },
    optimizeDeps: {
			exclude: ["@resvg/resvg-js"],
		},
    plugins: [
      tailwindcss(),
      rawFonts([".ttf",".otf",]),
    ]
  },

  integrations: [sitemap()],

  build: {
    // Inline small stylesheets into the HTML (~4KB threshold), keep larger
    // ones as separate files so they're cacheable across pages.
    inlineStylesheets: 'auto',
    assets: '_astro',
  },

  markdown: {
    processor: unified({
      gfm: true,
      smartypants: true,
      remarkPlugins: [
        // remarkObsidianCore,
        // remarkGfm,
        remarkObsidian,
        remarkExternalLinks,
        remarkImageProcessing,
        remarkCallouts,
      ],
      rehypePlugins: [
        rehypeSlug,
        rehypeUnwrapImages,
        [
          rehypeAutolinkHeadings,
          {
            behavior: "append",
            properties: {
              className: [
                "heading-anchor",
              ],
              ariaLabel:
                "Copy heading link",
            },
            content: {
              type: "text",
              value: "↗",
            },
          },
        ],
      ],
    }),
  },
});
