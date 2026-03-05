import { builders } from "prettier/doc";
import { SyntaxType } from "../tree-sitter-java.js";
import type { JavaNodePrinters } from "./helpers.js";

const { hardline, join } = builders;

export default {
  identifier(path) {
    return path.node.value;
  },

  scoped_identifier(path, print) {
    return [path.call(print, "scopeNode"), ".", path.call(print, "nameNode")];
  },

  scoped_type_identifier(path, print) {
    return path.map(
      child =>
        child.node.type === SyntaxType.Annotation ||
        child.node.type === SyntaxType.MarkerAnnotation
          ? [print(child), " "]
          : print(child),
      "children"
    );
  }
} satisfies Partial<JavaNodePrinters>;
