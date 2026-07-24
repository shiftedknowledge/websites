import userConfig from "../configs/user.config";

export interface NavItem {
  title: string;
  url: string;
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
  relatedPosts?: number;
}

const siteConfig = {
  ...userConfig,
  relatedPosts: userConfig.relatedPosts ?? 3,
  // Static, site-wide default OG image (generated at build; branded Tyne Bridge).
  ogImage: "/og.png",
};

export default siteConfig;
