import {
  BasicBlocksPlugin,
  BasicMarksPlugin,
  BoldPlugin,
  ItalicPlugin,
} from "@platejs/basic-nodes/react";
import { ListPlugin } from "@platejs/list/react";
import { IndentPlugin } from "@platejs/indent/react";
import { CalloutPlugin } from "@platejs/callout/react";
import { SlashPlugin, SlashInputPlugin } from "@platejs/slash-command/react";
import { MarkdownPlugin } from "@platejs/markdown";
import { createPlatePlugin } from "platejs/react";
import {
  BIBLE_PASSAGE_TYPE,
  BiblePassageElement,
} from "./bible-passage-element";

// Custom plugin for the Bible passage void element
const BiblePassagePlugin = createPlatePlugin({
  key: BIBLE_PASSAGE_TYPE,
  node: {
    isElement: true,
    isVoid: true,
    type: BIBLE_PASSAGE_TYPE,
  },
}).withComponent(BiblePassageElement);

// Slash menu item definitions
export interface SlashMenuItem {
  key: string;
  label: string;
  description: string;
  icon: string;
  onSelect: (editor: any) => void;
}

export const slashMenuItems: SlashMenuItem[] = [
  {
    key: "h1",
    label: "Heading 1",
    description: "Large section heading",
    icon: "H1",
    onSelect: (editor) => {
      editor.tf.h1.toggle();
    },
  },
  {
    key: "h2",
    label: "Heading 2",
    description: "Medium section heading",
    icon: "H2",
    onSelect: (editor) => {
      editor.tf.h2.toggle();
    },
  },
  {
    key: "h3",
    label: "Heading 3",
    description: "Small section heading",
    icon: "H3",
    onSelect: (editor) => {
      editor.tf.h3.toggle();
    },
  },
  {
    key: "bullet-list",
    label: "Bullet List",
    description: "Unordered bullet list",
    icon: "List",
    onSelect: (editor) => {
      editor.tf.toggleBlock({ type: "p" });
      editor.tf.setNodes({ listStyleType: "disc", indent: 1 });
    },
  },
  {
    key: "numbered-list",
    label: "Numbered List",
    description: "Ordered numbered list",
    icon: "ListOrdered",
    onSelect: (editor) => {
      editor.tf.toggleBlock({ type: "p" });
      editor.tf.setNodes({ listStyleType: "decimal", indent: 1 });
    },
  },
  {
    key: "callout",
    label: "Callout",
    description: "Highlighted callout block",
    icon: "MessageSquare",
    onSelect: (editor) => {
      editor.tf.toggleBlock({ type: "callout" });
    },
  },
  {
    key: "bible-passage",
    label: "Bible Passage",
    description: "Embed a Bible passage reference",
    icon: "BookOpen",
    onSelect: (editor) => {
      editor.insertNodes({
        type: BIBLE_PASSAGE_TYPE,
        book: "John",
        chapter: 3,
        verse: "16",
        version: "ESV",
        children: [{ text: "" }],
      });
    },
  },
];

// All editor plugins in order
export const editorPlugins = [
  BasicBlocksPlugin,
  BasicMarksPlugin.configurePlugin(BoldPlugin, {
    shortcuts: { toggleBold: { keys: "mod+b" } },
  }).configurePlugin(ItalicPlugin, {
    shortcuts: { toggleItalic: { keys: "mod+i" } },
  }),
  IndentPlugin,
  ListPlugin,
  CalloutPlugin,
  SlashPlugin,
  SlashInputPlugin,
  MarkdownPlugin,
  BiblePassagePlugin,
];
