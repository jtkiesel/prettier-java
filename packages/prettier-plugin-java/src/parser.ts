import { parse, type CstElement, type IToken } from "java-parser";
import type { Parser } from "prettier";
import { isToken } from "./printers/helpers";

export default {
  parse(text, options) {
    const cst = parse(text, options.entrypoint as string | undefined);
    cst.comments?.forEach(comment => {
      (comment as IToken & { value: string }).value = comment.image;
    });
    return cst as CstElement;
  },
  astFormat: "java",
  hasPragma(text) {
    return /^\/\*\*\n\s+\*\s@(format|prettier)\n\s+\*\//.test(text);
  },
  locStart(node) {
    return isToken(node) ? node.startOffset : node.location.startOffset;
  },
  locEnd(node) {
    return (isToken(node) ? node.endOffset : node.location.endOffset) + 1;
  }
} satisfies Parser<CstElement>;
