import { useCallback, useEffect } from "react";

import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import Typography from "@tiptap/extension-typography";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Heading2,
  Heading3,
  Italic,
  Link2,
  Link2Off,
  List,
  ListOrdered,
  Pilcrow,
  Quote,
  Redo2,
  Strikethrough,
  UnderlineIcon,
  Undo2,
} from "lucide-react";

import { cn } from "#app/lib/cn";

type RichEditorProps = {
  /** HTML value to initialise with (and kept in sync via onChange). */
  value: string;
  /** Fired on every content change with the current HTML string. */
  onChange: (html: string) => void;
  /** Maps to Tiptap's `editable`. */
  disabled?: boolean;
  /** Placeholder shown when the editor is empty. */
  placeholder?: string;
  /** Conform field id. */
  id?: string;
};

/**
 * Full-featured Tiptap rich-text editor styled to look native to the
 * admin panel. Outputs HTML stored in the post `body` field.
 */
export function RichEditor({
  value,
  onChange,
  disabled = false,
  placeholder = "Počnite pisati…",
  id,
}: RichEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-primary underline underline-offset-2" },
      }),
      Placeholder.configure({ placeholder }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Typography,
    ],
    content: value,
    editable: !disabled,
    onUpdate({ editor: e }) {
      onChange(e.getHTML());
    },
    editorProps: {
      attributes: {
        id: id ?? "",
        class:
          "prose prose-stone max-w-none min-h-[240px] px-4 py-3 focus:outline-none " +
          "[&_p.is-editor-empty:first-child]:before:content-[attr(data-placeholder)] " +
          "[&_p.is-editor-empty:first-child]:before:text-muted-foreground " +
          "[&_p.is-editor-empty:first-child]:before:pointer-events-none " +
          "[&_p.is-editor-empty:first-child]:before:float-left [&_p.is-editor-empty:first-child]:before:h-0",
      },
    },
  });

  // Sync external value changes (e.g. form reset).
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const setLink = useCallback(() => {
    if (!editor) return;

    const previousUrl = (editor.getAttributes("link") as { href?: string }).href ?? "";
    const url = globalThis.prompt("URL adresa:", previousUrl);

    if (url === null) return; // cancelled
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }
  }, [editor]);

  if (!editor) return null;

  return (
    <div
      className={cn(
        "border-input bg-background focus-within:ring-ring overflow-hidden rounded-lg border shadow-sm transition-shadow focus-within:ring-2 focus-within:ring-offset-2",
        disabled && "opacity-60",
      )}
    >
      <Toolbar editor={editor} onSetLink={setLink} />
      <EditorContent editor={editor} />
    </div>
  );
}

/* ---------- Toolbar ---------- */

type ToolbarProps = {
  editor: ReturnType<typeof useEditor> & {};
  onSetLink: () => void;
};

function Toolbar({ editor, onSetLink }: ToolbarProps) {
  return (
    <div
      role="toolbar"
      aria-label="Formatiranje teksta"
      className="border-border bg-muted/40 flex flex-wrap items-center gap-0.5 border-b px-2 py-1.5"
    >
      {/* Inline formatting */}
      <ToolbarGroup>
        <ToolbarButton
          label="Podebljano"
          icon={Bold}
          active={editor.isActive("bold")}
          onPress={() => editor.chain().focus().toggleBold().run()}
        />
        <ToolbarButton
          label="Kurziv"
          icon={Italic}
          active={editor.isActive("italic")}
          onPress={() => editor.chain().focus().toggleItalic().run()}
        />
        <ToolbarButton
          label="Podcrtano"
          icon={UnderlineIcon}
          active={editor.isActive("underline")}
          onPress={() => editor.chain().focus().toggleUnderline().run()}
        />
        <ToolbarButton
          label="Precrtano"
          icon={Strikethrough}
          active={editor.isActive("strike")}
          onPress={() => editor.chain().focus().toggleStrike().run()}
        />
      </ToolbarGroup>

      <Divider />

      {/* Block types */}
      <ToolbarGroup>
        <ToolbarButton
          label="Paragraf"
          icon={Pilcrow}
          active={!editor.isActive("heading")}
          onPress={() => editor.chain().focus().setParagraph().run()}
        />
        <ToolbarButton
          label="Naslov 2"
          icon={Heading2}
          active={editor.isActive("heading", { level: 2 })}
          onPress={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        />
        <ToolbarButton
          label="Naslov 3"
          icon={Heading3}
          active={editor.isActive("heading", { level: 3 })}
          onPress={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        />
      </ToolbarGroup>

      <Divider />

      {/* Lists */}
      <ToolbarGroup>
        <ToolbarButton
          label="Nabrajanje"
          icon={List}
          active={editor.isActive("bulletList")}
          onPress={() => editor.chain().focus().toggleBulletList().run()}
        />
        <ToolbarButton
          label="Numerirana lista"
          icon={ListOrdered}
          active={editor.isActive("orderedList")}
          onPress={() => editor.chain().focus().toggleOrderedList().run()}
        />
        <ToolbarButton
          label="Citat"
          icon={Quote}
          active={editor.isActive("blockquote")}
          onPress={() => editor.chain().focus().toggleBlockquote().run()}
        />
      </ToolbarGroup>

      <Divider />

      {/* Alignment */}
      <ToolbarGroup>
        <ToolbarButton
          label="Lijevo"
          icon={AlignLeft}
          active={editor.isActive({ textAlign: "left" })}
          onPress={() => editor.chain().focus().setTextAlign("left").run()}
        />
        <ToolbarButton
          label="Centar"
          icon={AlignCenter}
          active={editor.isActive({ textAlign: "center" })}
          onPress={() => editor.chain().focus().setTextAlign("center").run()}
        />
        <ToolbarButton
          label="Desno"
          icon={AlignRight}
          active={editor.isActive({ textAlign: "right" })}
          onPress={() => editor.chain().focus().setTextAlign("right").run()}
        />
      </ToolbarGroup>

      <Divider />

      {/* Links */}
      <ToolbarGroup>
        <ToolbarButton
          label="Link"
          icon={Link2}
          active={editor.isActive("link")}
          onPress={onSetLink}
        />
        {editor.isActive("link") ? (
          <ToolbarButton
            label="Ukloni link"
            icon={Link2Off}
            onPress={() => editor.chain().focus().unsetLink().run()}
          />
        ) : null}
      </ToolbarGroup>

      <div className="ml-auto" />

      {/* Undo/Redo */}
      <ToolbarGroup>
        <ToolbarButton
          label="Poništi"
          icon={Undo2}
          onPress={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
        />
        <ToolbarButton
          label="Ponovi"
          icon={Redo2}
          onPress={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
        />
      </ToolbarGroup>
    </div>
  );
}

/* ---------- Primitives ---------- */

function ToolbarGroup({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-0.5">{children}</div>;
}

function Divider() {
  return <div className="bg-border mx-1 h-5 w-px" />;
}

type ToolbarButtonProps = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onPress: () => void;
  active?: boolean;
  disabled?: boolean;
};

function ToolbarButton({ label, icon: Icon, onPress, active, disabled }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onPress}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-md text-sm transition-colors",
        "hover:bg-accent hover:text-accent-foreground",
        "disabled:pointer-events-none disabled:opacity-40",
        active && "bg-accent text-accent-foreground",
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
