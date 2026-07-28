import type {
  APIRoute,
} from "astro";

import {
  getAllGuides,
  getGuideSlug,
} from "@/utils/content";

import {
  generateOgImage,
} from "@/utils/og";

export async function getStaticPaths() {
  const guides = await getAllGuides();

  return guides.map((guide) => ({
    params: {
      slug: getGuideSlug(
        guide.id,
        guide.filePath
      ),
    },

    props: {
      guide,
    },
  }));
}

export const GET: APIRoute =
  async ({ props }) => {
    const { guide } = props;

    const png =
      await generateOgImage({
        title: guide.data.title,

        description:
          guide.data.description,

        eyebrow: "Guide",

        published:
          guide.data.updated ??
          guide.data.published,
      });

    return new Response(png, {
      headers: {
        "Content-Type":
          "image/png",
      },
    });
  };
