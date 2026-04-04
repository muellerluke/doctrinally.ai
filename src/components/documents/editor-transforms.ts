"use client";

import type { PlateEditor } from "platejs/react";
import { KEYS, PathApi, type TElement, type NodeEntry } from "platejs";
import { insertCallout } from "@platejs/callout";
import { insertCodeBlock } from "@platejs/code-block";
import { BIBLE_PASSAGE_TYPE } from "./bible-passage-element";

const insertList = (editor: PlateEditor, type: string) => {
  editor.tf.insertNodes(
    editor.api.create.block({
      indent: 1,
      listStyleType: type,
    }),
    { select: true }
  );
};

const insertBlockMap: Record<
  string,
  (editor: PlateEditor, type: string) => void
> = {
  [KEYS.ul]: insertList,
  [KEYS.ol]: insertList,
  [KEYS.callout]: (editor) => insertCallout(editor, { select: true }),
  [KEYS.codeBlock]: (editor) => insertCodeBlock(editor, { select: true }),
  [BIBLE_PASSAGE_TYPE]: (editor) => {
    editor.tf.insertNodes(
      {
        type: BIBLE_PASSAGE_TYPE,
        book: "John",
        chapter: 3,
        verse: "16",
        version: "",
        children: [{ text: "" }],
      } as any,
      { select: true }
    );
  },
};

export const insertBlock = (
  editor: PlateEditor,
  type: string,
  options: { upsert?: boolean } = {}
) => {
  editor.tf.withoutNormalizing(() => {
    const block = editor.api.block();
    if (!block) return;

    const [currentNode, path] = block;

    if (type in insertBlockMap) {
      insertBlockMap[type](editor, type);
    } else {
      editor.tf.insertNodes(editor.api.create.block({ type }), {
        at: PathApi.next(path),
        select: true,
      });
    }

    // Clean up empty previous block
    editor.tf.removeNodes({ previousEmptyBlock: true });
  });
};
