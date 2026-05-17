import { useEffect, useState } from "react";
import { Form, Link, useFetcher } from "react-router";

import {
  getFormProps,
  getInputProps,
  getSelectProps,
  useForm,
  type SubmissionResult,
} from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod/v4";
import { Eye, ImagePlus, Pin, Star, Trash2 } from "lucide-react";

import { Field } from "#app/components/forms/field";
import { FormActions } from "#app/components/forms/form-actions";
import { SelectField } from "#app/components/forms/select-field";
import { Button } from "#app/components/ui/button";
import { Checkbox } from "#app/components/ui/checkbox";
import { ConfirmAction } from "#app/components/ui/confirm-action";
import { Label } from "#app/components/ui/label";
import { Textarea } from "#app/components/ui/textarea";
import { RichEditor } from "#app/features/posts/admin/components/rich-editor";
import { PostAdminIntents } from "#app/features/posts/admin/post-intents";
import {
  MAX_IMAGES_PER_POST,
  MAX_IMAGE_ALT_TEXT_LENGTH,
  PostFormSchema,
} from "#app/features/posts/post-schema";
import type { PostStatusValue } from "#app/features/posts/post-status";
import { POST_TYPES, POST_TYPE_LABEL } from "#app/features/posts/post-type";
import { IntentInput } from "#app/lib/intent";
import { adminPostPreviewHref, postImageHref } from "#app/lib/routes";
import { useFetcherToast } from "#app/lib/toast";

type PostFormImage = { id: string; altText: string | null };

type PostFormProps = {
  /**
     When present, the form is in "edit" mode: defaults prefill, the
     intent switches to `update`, and the existing image row is shown
     with per-image delete buttons.
   */
  post?: {
    id: string;
    title: string;
    slug: string;
    type: string;
    body: string;
    status: PostStatusValue;
    featured: boolean;
    pinned: boolean;
    images: PostFormImage[];
  };
  lastResult?: SubmissionResult<string[]> | null;
  submitting?: boolean;
  /** When set, 'Odustani' navigates here (post list). */
  cancelTo?: string;
};

/**
   Multipart admin form for create/update on `/admin/objave/nova` and
   `/admin/objave/:id`. New files ride in `images`; per-image deletes
   use `useFetcher` so they do not reset the rest of the form.
 */
export function PostForm({ post, lastResult, submitting, cancelTo }: PostFormProps) {
  const isEdit = Boolean(post);
  const [form, fields] = useForm({
    id: "post-form",
    lastResult,
    defaultValue: post
      ? { title: post.title, slug: post.slug, type: post.type, body: post.body }
      : undefined,
    shouldValidate: "onBlur",
    shouldRevalidate: "onInput",
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: PostFormSchema });
    },
  });

  const existingCount = post?.images.length ?? 0;
  const remainingSlots = Math.max(0, MAX_IMAGES_PER_POST - existingCount);

  const [bodyHtml, setBodyHtml] = useState(post?.body ?? "");

  return (
    <Form
      method="post"
      {...getFormProps(form)}
      encType="multipart/form-data"
      className="flex flex-col"
    >
      <IntentInput intent={isEdit ? PostAdminIntents.Update : PostAdminIntents.Create} />
      {isEdit ? <input type="hidden" name="id" value={post!.id} /> : null}

      <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
        <Field
          label="Naslov"
          errors={fields.title.errors}
          inputProps={{
            ...getInputProps(fields.title, { type: "text" }),
            autoComplete: "off",
            maxLength: 200,
            placeholder: "Unesite naslov…",
          }}
        />

        <Field
          label="URL slug"
          hint="Pojavljuje se u adresi stranice, npr. /objave/hutba-petak."
          errors={fields.slug.errors}
          inputProps={{
            ...getInputProps(fields.slug, { type: "text" }),
            autoComplete: "off",
            maxLength: 80,
          }}
        />

        <SelectField
          label="Vrsta"
          errors={fields.type.errors}
          selectProps={getSelectProps(fields.type)}
        >
          <option value="">— Odaberite —</option>
          {POST_TYPES.map((value) => (
            <option key={value} value={value}>
              {POST_TYPE_LABEL[value]}
            </option>
          ))}
        </SelectField>

        <div className="flex flex-wrap gap-5 pt-1">
          <FlagToggle
            id="post-publish"
            name="publish"
            defaultChecked={post?.status === "published"}
            icon={<Eye className="text-primary h-4 w-4" aria-hidden="true" />}
            label="Objavi odmah"
          />
          <FlagToggle
            id="post-featured"
            name="featured"
            defaultChecked={post?.featured ?? false}
            icon={<Star className="text-secondary h-4 w-4" aria-hidden="true" />}
            label="Istaknuto"
          />
          <FlagToggle
            id="post-pinned"
            name="pinned"
            defaultChecked={post?.pinned ?? false}
            icon={<Pin className="text-primary h-4 w-4" aria-hidden="true" />}
            label="Na vrhu"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={fields.body.id}>Tekst</Label>
          <input type="hidden" name={fields.body.name} value={bodyHtml} />
          <RichEditor
            id={fields.body.id}
            value={bodyHtml}
            onChange={setBodyHtml}
            placeholder="Počnite pisati tekst objave…"
          />
          {fields.body.errors?.length ? (
            <p className="text-destructive text-xs">{fields.body.errors[0]}</p>
          ) : null}
        </div>

        <ImagesSection post={post} remainingSlots={remainingSlots} />
      </div>

      <FormActions>
        {cancelTo ? (
          <Button type="button" variant="ghost" asChild>
            <Link to={cancelTo}>Odustani</Link>
          </Button>
        ) : null}
        {isEdit ? (
          <Button type="button" variant="outline" className="gap-2" asChild>
            <Link to={adminPostPreviewHref(post!.id)}>
              <Eye className="h-4 w-4" aria-hidden="true" />
              Pregled
            </Link>
          </Button>
        ) : null}
        <Button type="submit" disabled={submitting}>
          {submitting ? "Spremanje…" : isEdit ? "Spremi izmjene" : "Sačuvaj"}
        </Button>
      </FormActions>
    </Form>
  );
}

type FlagToggleProps = {
  id: string;
  name: string;
  defaultChecked: boolean;
  icon: React.ReactNode;
  label: string;
};

function FlagToggle({ id, name, defaultChecked, icon, label }: FlagToggleProps) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-center gap-2 text-sm font-medium">
      <Checkbox id={id} name={name} defaultChecked={defaultChecked} />
      {icon}
      <span>{label}</span>
    </label>
  );
}

type ImagesSectionProps = {
  post: PostFormProps["post"];
  remainingSlots: number;
};

type PendingImagePreview = {
  file: File;
  previewUrl: string;
};

/**
   Image row rendered inside the main post form. Newly attached files
   ride along with the main `<form>` submission as `name="images"`; the
   per-image delete action goes through a `useFetcher` so the admin
   doesn't lose unsaved body text when they prune an existing image.
 */
function ImagesSection({ post, remainingSlots }: ImagesSectionProps) {
  const [pending, setPending] = useState<PendingImagePreview[]>([]);

  useEffect(() => {
    return () => {
      for (const image of pending) {
        URL.revokeObjectURL(image.previewUrl);
      }
    };
  }, [pending]);

  const handleFiles = (list: FileList | null) => {
    const files = list ? [...list].slice(0, remainingSlots) : [];

    setPending((current) => {
      for (const image of current) {
        URL.revokeObjectURL(image.previewUrl);
      }

      return files.map((file) => ({
        file,
        previewUrl: URL.createObjectURL(file),
      }));
    });
  };

  const canAddMore = remainingSlots > 0;

  return (
    <section aria-label="Slike" className="border-border space-y-3 rounded-md border p-4">
      <header className="flex items-center justify-between">
        <h3 className="font-display text-sm font-semibold">Slike</h3>
        <span className="text-muted-foreground text-xs">
          {post ? post.images.length : 0}/{MAX_IMAGES_PER_POST} · opcionalno
        </span>
      </header>

      {post && post.images.length > 0 ? (
        <ul className="grid gap-3 sm:grid-cols-3">
          {post.images.map((image) => (
            <ExistingImage key={image.id} postId={post.id} image={image} />
          ))}
        </ul>
      ) : null}

      {canAddMore ? (
        <div className="space-y-2">
          <input
            type="file"
            name="images"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={(event) => handleFiles(event.currentTarget.files)}
            className="file:bg-muted file:text-foreground hover:file:bg-accent block w-full cursor-pointer text-sm file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:px-3 file:py-1.5 file:text-sm file:font-medium"
          />
          <p className="text-muted-foreground flex items-center gap-1 text-xs">
            <ImagePlus className="h-3.5 w-3.5" aria-hidden="true" />
            {pending.length === 0
              ? `Možete dodati do ${remainingSlots} ${remainingSlots === 1 ? "sliku" : "slike"} (JPEG, PNG, WebP).`
              : `${pending.length} ${pending.length === 1 ? "slika odabrana" : "slike odabrane"}.`}
          </p>

          {pending.length > 0 ? (
            <div className="space-y-3 pt-1">
              <div className="bg-muted/50 border-border flex items-center justify-between rounded-xl border border-dashed px-3 py-2">
                <p className="text-foreground text-sm font-medium">Pregled prije uploada</p>
                <span className="text-muted-foreground text-xs">
                  {pending.length}/{remainingSlots} za upload
                </span>
              </div>

              <ul className="grid gap-3 sm:grid-cols-3">
                {pending.map((image, index) => (
                  <li
                    key={`${image.file.name}-${image.file.lastModified}-${image.file.size}`}
                    className="border-border bg-card overflow-hidden rounded-xl border shadow-sm"
                  >
                    <div className="bg-muted relative aspect-video overflow-hidden">
                      <img
                        src={image.previewUrl}
                        alt={`Pregled slike ${image.file.name}`}
                        className="h-full w-full object-cover"
                      />
                      <div className="bg-primary/90 text-primary-foreground absolute top-2 left-2 rounded-full px-2 py-0.5 text-[11px] font-medium">
                        Nova slika
                      </div>
                    </div>
                    <div className="border-border space-y-1 border-t px-3 py-2">
                      <p className="text-foreground truncate text-sm font-medium">
                        {image.file.name}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {formatFileSize(image.file.size)}
                      </p>
                      <div className="space-y-1 pt-1 text-left">
                        <Label htmlFor={`new-image-alt-${index}`} className="text-xs">
                          Opis slike
                        </Label>
                        <ImageAltTextarea id={`new-image-alt-${index}`} name="newImageAltText" />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="text-muted-foreground text-xs">
          Dosegli ste maksimum od {MAX_IMAGES_PER_POST} slika. Obrišite jednu prije dodavanja nove.
        </p>
      )}
    </section>
  );
}

function formatFileSize(bytes: number) {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function ImageAltTextarea({
  defaultValue,
  id,
  name,
}: {
  defaultValue?: string | null;
  id: string;
  name: string;
}) {
  return (
    <Textarea
      id={id}
      name={name}
      defaultValue={defaultValue ?? ""}
      maxLength={MAX_IMAGE_ALT_TEXT_LENGTH}
      rows={2}
      placeholder="Kratak opis slike"
      className="resize-none px-2 py-1.5 text-xs leading-relaxed"
    />
  );
}

type ExistingImageProps = {
  postId: string;
  image: PostFormImage;
};

function ExistingImage({ postId, image }: ExistingImageProps) {
  const fetcher = useFetcher();

  useFetcherToast(fetcher);

  const pending = fetcher.state !== "idle";
  const imageId = image.id;
  const altInputId = `image-alt-${imageId}`;

  const requestDelete = () => {
    const body = new FormData();
    body.append("intent", PostAdminIntents.DeleteImage);
    body.append("id", postId);
    body.append("imageId", imageId);
    void fetcher.submit(body, { method: "post" });
  };

  return (
    <li className="border-border bg-background overflow-hidden rounded-md border">
      <img
        src={postImageHref(imageId)}
        alt={image.altText ?? ""}
        loading="lazy"
        className="aspect-video w-full object-cover"
      />
      <div className="border-border space-y-2 border-t p-2">
        <div className="space-y-1 text-left">
          <Label htmlFor={altInputId} className="text-xs">
            Opis slike
          </Label>
          <ImageAltTextarea
            id={altInputId}
            name={`imageAltText:${imageId}`}
            defaultValue={image.altText ?? ""}
          />
        </div>
        <div className="text-right">
          <ConfirmAction
            onConfirm={requestDelete}
            title="Obrisati sliku?"
            description="Slika će biti trajno uklonjena iz ove objave. Ako se predomislite, moraćete je ponovo dodati."
            confirmLabel="Obriši sliku"
          >
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pending}
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              {pending ? "Brisanje…" : "Obriši"}
            </Button>
          </ConfirmAction>
        </div>
      </div>
    </li>
  );
}
