import type Prettier from "prettier";
import Parser from "tree-sitter";
import Java from "tree-sitter-java";
import { JavaComment } from "./comments.js";
import { JavaNode } from "./printers/helpers.js";
import { SyntaxType } from "./tree-sitter-java.js";

export default {
  parse(text) {
    const start = performance.now();
    const parser = new Parser();
    parser.setLanguage(Java);
    const tree = parser.parse(text).rootNode as JavaNode;
    console.log("parse time: " + (performance.now() - start) + "ms");
    const comments = tree.descendantsOfType([
      SyntaxType.BlockComment,
      SyntaxType.LineComment
    ]) as JavaComment[];
    comments.forEach(comment => {
      comment.value = comment.text;
    });
    tree.comments = comments;
    return tree;

    /*const cst = parse(text, options.entrypoint) as JavaNonTerminal;
    cst.comments?.forEach(comment => {
      comment.value = comment.image;
    });
    determinePrettierIgnoreRanges(cst);
    return cst;*/
  },
  astFormat: "java",
  hasPragma(text) {
    return /^\/\*\*\n\s+\*\s@(format|prettier)\n\s+\*\//.test(text);
  },
  locStart(node) {
    //node.children.find(child => !isComment(child))?.startIndex ??
    return node.startIndex;
  },
  locEnd(node) {
    //node.children.findLast(child => !isComment(child))?.endIndex ??
    return node.endIndex;
  }
} satisfies Prettier.Parser<JavaNode>;
