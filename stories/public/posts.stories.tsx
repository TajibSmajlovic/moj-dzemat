import { useLocation } from "react-router";

import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";

import { FeaturedHeroCard } from "#app/features/posts/components/featured-hero-card";
import { PostDetailArticle } from "#app/features/posts/components/post-detail-article";
import { PostFilter } from "#app/features/posts/components/post-filter";
import { PostTypeBadge } from "#app/features/posts/components/post-type-badge";
import { YouTubeFacade } from "#app/features/posts/components/youtube-facade";
import { POST_TYPES, isPostType } from "#app/features/posts/post-type";

import { post } from "../fixtures/content";
const meta = { title: "Public/Posts" } satisfies Meta;
export default meta;
export const Types: StoryObj = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      {POST_TYPES.map((type) => (
        <PostTypeBadge key={type} type={type} />
      ))}
    </div>
  ),
};
export const OverlayBadges: StoryObj = {
  render: () => (
    <div className="bg-featured-background flex flex-wrap gap-3 rounded-xl p-8">
      {POST_TYPES.map((type) => (
        <PostTypeBadge key={type} type={type} variant="overlay" />
      ))}
    </div>
  ),
};
export const Featured: StoryObj = {
  render: () => (
    <div className="max-w-3xl">
      <FeaturedHeroCard post={post} />
    </div>
  ),
};
function FiltersDemo() {
  const location = useLocation();
  const value = new URLSearchParams(location.search).get("vrsta");
  return (
    <>
      <PostFilter active={isPostType(value) ? value : "all"} destination="archive" />
      <output className="sr-only">{location.search}</output>
    </>
  );
}
export const Filters: StoryObj = {
  render: () => <FiltersDemo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("link", { name: "Hutbe" }));
    await waitFor(() =>
      expect(canvas.getByRole("link", { name: "Hutbe" })).toHaveAttribute("aria-current", "page"),
    );
  },
};
export const Article: StoryObj = {
  render: () => (
    <div className="mx-auto max-w-3xl">
      <PostDetailArticle post={post} siteName="Moj Džemat - Primjer" />
    </div>
  ),
};
export const ArticleWithoutMedia: StoryObj = {
  render: () => (
    <div className="max-w-3xl">
      <PostDetailArticle post={{ ...post, images: [] }} siteName="Moj Džemat - Primjer" />
    </div>
  ),
};
export const Video: StoryObj = {
  render: () => (
    <div className="max-w-2xl">
      <YouTubeFacade videoId="fictional-video" title="Susret zajednice" />
    </div>
  ),
  play: async ({ canvasElement }) => {
    await userEvent.click(
      within(canvasElement).getByRole("button", { name: "Reprodukuj video: Susret zajednice" }),
    );
    await expect(canvasElement.querySelector("iframe")).toHaveAttribute(
      "title",
      "Susret zajednice",
    );
  },
};

export const Lightbox: StoryObj = {
  ...Article,
  play: async ({ canvasElement }) => {
    const opener = within(canvasElement).getByRole("button", { name: /Otvori sliku 1/ });
    await userEvent.click(opener);
    await waitFor(() => expect(within(document.body).getByRole("dialog")).toBeVisible());
    await userEvent.keyboard("{Escape}");
    await waitFor(() =>
      expect(within(document.body).queryByRole("dialog")).not.toBeInTheDocument(),
    );
    await expect(opener).toHaveFocus();
  },
};

export const PinnedArticle: StoryObj = {
  render: () => (
    <div className="mx-auto max-w-3xl">
      <PostDetailArticle
        post={{ ...post, pinned: true }}
        siteName="Moj Džemat - Primjer"
        showPinnedBadge
      />
    </div>
  ),
};
