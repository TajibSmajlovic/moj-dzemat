import { plainExcerpt } from "#app/features/posts/post-excerpt";
import { formatPageTitle } from "#app/lib/branding";
import { absoluteUrl, postHref, postImageHref } from "#app/lib/routes";
import {
  buildPublicPageMeta,
  formatDefaultSocialImageAlt,
  getDefaultSocialImageUrl,
} from "#app/lib/seo";

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
  siteName: string;
  siteUrl: string;
};

export function buildPostPageMeta({ post, siteName, siteUrl }: BuildPostPageMetaArgs) {
  const description = plainExcerpt(post.body);
  const canonical = absoluteUrl(siteUrl, postHref(post.slug));
  const primaryImage = post.images[0];
  const imageUrl = primaryImage
    ? absoluteUrl(siteUrl, postImageHref(primaryImage.id))
    : getDefaultSocialImageUrl(siteUrl);
  const imageAlt =
    primaryImage?.altText ?? (primaryImage ? post.title : formatDefaultSocialImageAlt(siteName));

  return buildPublicPageMeta({
    title: formatPageTitle(post.title, siteName),
    socialTitle: post.title,
    description,
    canonical,
    siteName,
    imageUrl,
    imageAlt,
    imageWidth: primaryImage?.width,
    imageHeight: primaryImage?.height,
    ogType: "article",
  });
}
