import userConfig from "../configs/user.config";

export interface NavItem {
  title: string;
  url: string;
}

export interface NewsletterConfig {
  /**
   * Buttondown newsletter username — the slug in buttondown.com/<username>,
   * NOT the account login email. Found under Settings > Basic. It is the path
   * segment the embed-subscribe endpoint posts to, so a wrong value 404s
   * silently. Confirm with `GET /v1/newsletters` before trusting it.
   */
  username: string;
}

export interface UserConfig {
  title: string;
  tagline: string;
  description: string;
  url: string;
  author: string;
  navigation: NavItem[];
  linkedin: string;
  email: {
    general: string;
    consulting: string;
  };
  /**
   * Omit entirely and the signup form renders in its inert "coming soon" state.
   * Nothing else in the app depends on it, so a site without a newsletter costs
   * nothing.
   */
  newsletter?: NewsletterConfig;
  relatedPosts?: number;
}

const siteConfig = {
  ...userConfig,
  relatedPosts: userConfig.relatedPosts ?? 3,
  // Static, site-wide default OG image (generated at build; branded Tyne Bridge).
  ogImage: "/og.png",
};

export default siteConfig;
