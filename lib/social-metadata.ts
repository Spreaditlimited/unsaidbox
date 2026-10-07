import type { Metadata } from "next";

export const siteOrigin = "https://unsaidbox.com";
export const siteDescription = "A thoughtful home for anonymous questions, honest feedback, and stories. Collect privately. Share with intention.";
export const websiteSocialImage = {
  url: `${siteOrigin}/social/unsaidbox-v1.png`, width: 1200, height: 630,
  alt: "UnsaidBox — A place for the unsaid. Anonymous questions. Honest feedback.",
};
export const blogSocialImage = {
  url: `${siteOrigin}/social/unsaidbox-blog-v1.png`, width: 1200, height: 630,
  alt: "The UnsaidBox journal — Better questions. More honest answers.",
};

export function socialMetadata({ title, description, url, image = websiteSocialImage }: {
  title: string; description: string; url?: string;
  image?: { url: string; width: number; height: number; alt: string };
}): Pick<Metadata, "openGraph" | "twitter"> {
  return {
    openGraph: { type: "website", siteName: "UnsaidBox", locale: "en_GB", title, description, ...(url ? { url } : {}), images: [image] },
    twitter: { card: "summary_large_image", title, description, images: [{ url: image.url, alt: image.alt }] },
  };
}

// Accept only the image belonging to the already publication-checked blog post.
export function articleSocialImage(image: string | null, alt: string) {
  return image ? { url: siteOrigin + image, width: 1600, height: 900, alt } : blogSocialImage;
}
