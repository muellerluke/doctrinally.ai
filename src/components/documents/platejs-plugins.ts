import {
  BasicBlocksPlugin,
  BasicMarksPlugin,
  BoldPlugin,
  ItalicPlugin,
} from "@platejs/basic-nodes/react";
import { ListPlugin } from "@platejs/list/react";
import { IndentPlugin } from "@platejs/indent/react";
import { CalloutPlugin } from "@platejs/callout/react";
import { CodeBlockPlugin } from "@platejs/code-block/react";
import { SlashPlugin, SlashInputPlugin } from "@platejs/slash-command/react";
import {
  AutoformatPlugin,
  type AutoformatRule,
} from "@platejs/autoformat";
import { MarkdownPlugin } from "@platejs/markdown";
import { DndPlugin } from "@platejs/dnd";
import { createPlatePlugin } from "platejs/react";
import type { SlateEditor } from "platejs";
import { KEYS } from "platejs";
import { toggleList } from "@platejs/list";
import {
  BIBLE_PASSAGE_TYPE,
  BiblePassageElement,
} from "./bible-passage-element";
import { SlashInputElement } from "./slash-input-element";

// Custom plugin for the Bible passage void element
const BiblePassagePlugin = createPlatePlugin({
  key: BIBLE_PASSAGE_TYPE,
  node: {
    isElement: true,
    isVoid: true,
    type: BIBLE_PASSAGE_TYPE,
  },
}).withComponent(BiblePassageElement);

// ---- Autoformat rules ----

const autoformatBlocks: AutoformatRule[] = [
  { match: "# ", mode: "block", type: KEYS.h1 },
  { match: "## ", mode: "block", type: KEYS.h2 },
  { match: "### ", mode: "block", type: KEYS.h3 },
  { match: "> ", mode: "block", type: KEYS.blockquote },
];

const autoformatMarks: AutoformatRule[] = [
  { match: "**", mode: "mark", type: KEYS.bold },
  { match: "__", mode: "mark", type: KEYS.underline },
  { match: "*", mode: "mark", type: KEYS.italic },
  { match: "_", mode: "mark", type: KEYS.italic },
  { match: "`", mode: "mark", type: KEYS.code },
];

const autoformatLists: AutoformatRule[] = [
  {
    match: ["* ", "- "],
    mode: "block",
    type: "list",
    format: (editor) => {
      toggleList(editor as any, { listStyleType: KEYS.ul });
    },
  },
  {
    match: [String.raw`^\d+\.$ `, String.raw`^\d+\)$ `],
    matchByRegex: true,
    mode: "block",
    type: "list",
    format: (editor) => {
      toggleList(editor as any, { listStyleType: KEYS.ol });
    },
  },
];

// ---- All editor plugins ----

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
  CodeBlockPlugin,
  SlashPlugin.configure({
    options: {
      triggerPreviousCharPattern: /^\s?$/,
      triggerQuery: (editor: SlateEditor) =>
        !editor.api.some({
          match: { type: editor.getType(KEYS.codeBlock) },
        }),
    },
  }),
  SlashInputPlugin.withComponent(SlashInputElement),
  AutoformatPlugin.configure({
    options: {
      enableUndoOnDelete: true,
      rules: [...autoformatBlocks, ...autoformatMarks, ...autoformatLists],
    },
  }),
  DndPlugin.configure({
    options: {
      enableScroller: true,
    },
  }),
  MarkdownPlugin,
  BiblePassagePlugin,
];
