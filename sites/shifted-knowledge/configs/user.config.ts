import type { UserConfig } from "../src/site.config";

// Shifted Knowledge — site identity.
// This file is the ONE place for site-wide identity and navigation.
// Styling (colours, fonts) is deliberately left at Lipi defaults for now —
// see AGENTS.md → "Deferred: SK brand theming" for the planned changes.

const userConfig: UserConfig = {
  title: "Shifted Knowledge",
  description:
    "Field notes and essays from building Shifted Knowledge — an ongoing, in-the-open record of the work.",

  // TODO: set to the final domain once Cloudflare Pages is connected.
  // Must match the deployed origin (drives canonical URLs, RSS, sitemap, OG images).
  url: "https://shiftedknowledge-site.pages.dev",
  author: "Jochen Spalink",

  logo: "/shifted-knowledge-logo.png",

  navigation: [
    { title: "Writing", url: "/posts" },
    { title: "Archive", url: "/archive" },
    { title: "About", url: "/about" },
  ],

  footerLinks: [
    { title: "RSS", url: "/rss.xml" },
    { title: "Archive", url: "/archive" },
  ],

  social: [
    {
      title: "GitHub",
      url: "https://github.com/shiftedknowledge",
      icon: "github",
    },
    // TODO: add real Shifted Knowledge socials (X, LinkedIn, …) when they exist.
  ],

  footerCredits: "Exploring emergent behaviour in complex systems.",

  postsPerPage: 8,
  recentPosts: 6,
  relatedPosts: 4,

  showLogo: true,
  showThemeToggle: false, // dark-only brand; no light/dark switch
  showReadingTime: true,

  heroVariant: "studio",

  annotation: "Notes from building in the open.",
};

export default userConfig;
