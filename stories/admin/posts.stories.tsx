import { useNavigation } from "react-router";

import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";

import { PostForm } from "#app/features/posts/admin/components/post-form";
import { PostsAdminTable } from "#app/features/posts/admin/components/posts-admin-table";

import { post, pagination } from "../fixtures/content";
const meta = {
  title: "Admin/Posts",
  parameters: {
    demo: { path: "/admin/objave/nova" },
    docs: {
      description: {
        component:
          "The real post list and Conform/Tiptap form. Create validates in the browser and submits to a local action. Edit uses fixed record/media fixtures; Saving demonstrates a pending route. No database, upload endpoint or notification is contacted.",
      },
    },
  },
} satisfies Meta;
export default meta;
export const List: StoryObj = {
  render: () => (
    <PostsAdminTable
      posts={[
        post,
        {
          ...post,
          id: "second",
          title: "Radionica za djecu",
          status: "draft",
          pinned: true,
          featured: true,
          images: [],
        },
      ]}
      pagination={pagination}
      deletingId={null}
      getPageHref={(page) => "/admin/objave?page=" + page}
    />
  ),
};
export const Empty: StoryObj = {
  render: () => (
    <PostsAdminTable
      posts={[]}
      pagination={{ ...pagination, totalItems: 0, totalPages: 0 }}
      deletingId={null}
      getPageHref={(page) => "/admin/objave?page=" + page}
    />
  ),
};
function CreateDemo() {
  const navigation = useNavigation();
  return (
    <PostForm webPushEnabled submitting={navigation.state !== "idle"} cancelTo="/admin/objave" />
  );
}
export const Create: StoryObj = { render: () => <CreateDemo /> };
export const Edit: StoryObj = {
  render: () => <PostForm post={post} webPushEnabled cancelTo="/admin/objave" />,
};
export const Saving: StoryObj = {
  render: () => <PostForm post={post} webPushEnabled submitting cancelTo="/admin/objave" />,
};

export const Validation: StoryObj = {
  ...Create,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Sačuvaj" }));
    await expect(canvas.getByRole("textbox", { name: "Naslov" })).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    await userEvent.type(canvas.getByRole("textbox", { name: "Naslov" }), "Susret zajednice");
    await expect(canvas.getByRole("textbox", { name: "Naslov" })).not.toHaveAttribute(
      "aria-invalid",
      "true",
    );
  },
};
