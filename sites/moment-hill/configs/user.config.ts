import type { UserConfig } from "../src/site.config";

// Moment Hill — site identity and navigation.
// This is the ONE place for site-wide identity, nav, and contact addresses.
// Brand styling (palette, fonts) lives in src/styles/theme.css + fonts.css.

const userConfig: UserConfig = {
  title: "Moment Hill",
  tagline: "The bridge between knowing and delivering.",
  description:
    "Moment Hill is the bridge between knowing and delivering: proven frameworks, carried through with AI leverage, delivered to whatever depth you need.",

  // The deployed origin. Drives canonical URLs, RSS, sitemap, and OG images, so
  // it must match the address people visit.
  url: "https://momenthill.com",
  author: "Jochen Spalink",

  navigation: [
    { title: "Consulting", url: "/consulting" },
    { title: "Frameworks", url: "/frameworks" },
    { title: "Tutorials", url: "/tutorials" },
    { title: "Posts", url: "/posts" },
    { title: "About", url: "/about" },
  ],

  linkedin: "https://www.linkedin.com/in/jspalink/",

  // Kept separate on purpose: consultancy@ appears only on /consulting,
  // hello@ only on /about (both written into the content markdown, not here).
  email: {
    general: "hello@momenthill.com",
    consulting: "consultancy@momenthill.com",
  },

  relatedPosts: 3,
};

export default userConfig;
