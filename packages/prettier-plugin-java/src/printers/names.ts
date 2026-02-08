import type { Doc } from "prettier";
import { builders } from "prettier/doc";
import { SyntaxType } from "../tree-sitter-java.js";
import { printName, printSingle, type JavaNodePrinters } from "./helpers.js";

const { hardline, join } = builders;

export default {
  identifier(path) {
    return path.node.text;
  },

  scoped_identifier(path, print) {
    return [path.call(print, "scopeNode"), ".", path.call(print, "nameNode")];
  },

  scoped_type_identifier(path, print) {
    const annotations: Doc[] = [];
    const identifier: Doc[] = [];
    path.each(child => {
      switch (child.node.type) {
        case SyntaxType.Annotation:
        case SyntaxType.MarkerAnnotation:
          annotations.push(print(child));
          break;
        case SyntaxType.GenericType:
        case SyntaxType.ScopedTypeIdentifier:
        case SyntaxType.TypeIdentifier:
          identifier.push(print(child));
          break;
      }
    }, "namedChildren");
    return join(hardline, [...annotations, ...identifier]);
  },

  moduleName: printName,
  packageName: printName,
  typeName: printName,
  expressionName: printName,
  methodName: printSingle,
  packageOrTypeName: printName,
  ambiguousName: printName
} satisfies Partial<JavaNodePrinters>;
