import { JsonLdScript } from "#app/components/seo/json-ld-script";
import { plainExcerpt } from "#app/features/posts/post-excerpt";
import { postHref, postImageHref } from "#app/features/posts/post-routes";
import { POST_TYPE_LABEL, type PostTypeValue } from "#app/features/posts/post-type";
import { toIsoDate } from "#app/lib/date";
import { absoluteUrl } from "#app/lib/routes";

type PostArticleJsonLdImage = {
  id: string;
  altText: string | null;
  width: number | null;
  height: number | null;
};

type PostArticleJsonLdPost = {
  slug: string;
  title: string;
  body: string;
  type: PostTypeValue;
  publishedAt: Date | string;
  updatedAt: Date | string;
  images: PostArticleJsonLdImage[];
};

type PostArticleJsonLdProps = {
  enabled?: boolean;
  post: PostArticleJsonLdPost;
  siteName: string;
  siteUrl?: string;
};

export function PostArticleJsonLd({
  enabled = true,
  post,
  siteName,
  siteUrl,
}: PostArticleJsonLdProps) {
  if (!enabled || !siteUrl) return null;

  const canonical = absoluteUrl(siteUrl, postHref(post.slug));
  const organizationId = `${siteUrl}/#organization`;
  const imageObjects = post.images.map((image) => ({
    "@type": "ImageObject",
    url: absoluteUrl(siteUrl, postImageHref(image.id)),
    width: image.width ?? undefined,
    height: image.height ?? undefined,
    caption: image.altText ?? undefined,
  }));

  return (
    <JsonLdScript
      value={{
        "@context": "https://schema.org",
        "@type": "Article",
        "@id": `${canonical}#article`,
        url: canonical,
        headline: post.title,
        description: plainExcerpt(post.body),
        datePublished: toIsoDate(post.publishedAt),
        dateModified: toIsoDate(post.updatedAt),
        inLanguage: "bs-BA",
        mainEntityOfPage: {
          "@type": "WebPage",
          "@id": canonical,
        },
        articleSection: POST_TYPE_LABEL[post.type],
        image: imageObjects.length > 0 ? imageObjects : undefined,
        author: {
          "@type": "Organization",
          "@id": organizationId,
          name: siteName,
          url: siteUrl,
        },
        publisher: {
          "@id": organizationId,
        },
      }}
    />
  );
}
