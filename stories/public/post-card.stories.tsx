import type { Meta, StoryObj } from "@storybook/react-vite";

import { PostCard } from "#app/features/posts/components/post-card";

const meta = {
  title: "Public/Post Card",
  component: PostCard,
  decorators: [
    (Story) => (
      <div className="max-w-xl">
        <Story />
      </div>
    ),
  ],
  args: {
    post: {
      slug: "susret-zajednice",
      title: "Poziv na zajedničko druženje",
      excerpt:
        "U subotu se okupljamo uz razgovor, čaj i aktivnosti za najmlađe. Svi su dobrodošli.",
      type: "obavijest",
      publishedAt: "2026-09-01T12:00:00Z",
      thumbnailId: "fictional-image",
    },
  },
} satisfies Meta<typeof PostCard>;
export default meta;
type Story = StoryObj<typeof meta>;
export const WithImage: Story = {};
export const WithoutImage: Story = { args: { post: { ...meta.args.post, thumbnailId: null } } };
export const Pinned: Story = { args: { post: { ...meta.args.post, pinned: true } } };
