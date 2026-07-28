// src/pages/og.png.ts
//
// The site-wide share card, used by any page without one of its own.

import type {
  APIRoute,
} from "astro";

import siteConfig from "@/site.config";

import {
  generateOgImage,
} from "@/utils/og";

export const GET: APIRoute =
  async () => {
    const png =
      await generateOgImage(
        {
          title: siteConfig.title,

          description:
            siteConfig.description,
        }
      );

    return new Response(png, {
      headers: {
        "Content-Type":
          "image/png",
      },
    });
  };
