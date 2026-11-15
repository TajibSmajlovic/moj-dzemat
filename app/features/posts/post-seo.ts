import { plainExcerpt } from "#app/features/posts/post-excerpt";
import { postHref, postImageHref } from "#app/features/posts/post-routes";
import { formatPageTitle } from "#app/lib/branding";
import { buildPublicPageMeta, DEFAULT_SOCIAL_IMAGE, getDefaultSocialImageUrl } from "#app/lib/seo";
import { absoluteUrl } from "#app/lib/url";

type PostPageMetaPost = {
  slug: string;
  title: string;
  body: string;
  images: {
    id: string;
    altText: string | null;
    width: number | null;
    height: number | null;
  }[];
};

type BuildPostPageMetaArgs = {
  post: PostPageMetaPost;
  siteUrl: string;
};

export function buildPostPageMeta({ post, siteUrl }: BuildPostPageMetaArgs) {
  const description = plainExcerpt(post.body);
  const canonical = absoluteUrl(siteUrl, postHref(post.slug));
  const primaryImage = post.images[0];
  const imageUrl = primaryImage
    ? absoluteUrl(siteUrl, postImageHref(primaryImage.id))
    : getDefaultSocialImageUrl(siteUrl);
  const imageAlt = primaryImage?.altText ?? (primaryImage ? post.title : DEFAULT_SOCIAL_IMAGE.alt);

  return buildPublicPageMeta({
    title: formatPageTitle(post.title),
    socialTitle: post.title,
    description,
    canonical,
    imageUrl,
    imageAlt,
    imageWidth: primaryImage?.width,
    imageHeight: primaryImage?.height,
    ogType: "article",
  });
}
