import { ParserRuleContext, TerminalNode } from "antlr4ng";
import { parse } from "java-parser";
import type { Parser } from "prettier";
import type { JavaNode } from "./printers/helpers.js";

export default {
  parse(text) {
    return parse(text) as JavaNode;

    /*const parser = new Parser();
    parser.setLanguage(Java);
    const tree = parser.parse(text).rootNode as JavaNode;
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
    if (node instanceof ParserRuleContext) {
      return node.start?.tokenIndex ?? -1;
    } else if (node instanceof TerminalNode) {
      return node.symbol.start;
    } else {
      throw new Error(`Unexpected ParseTree implementation: ${typeof node}`);
    }
  },
  locEnd(node) {
    if (node instanceof ParserRuleContext) {
      return node.stop?.tokenIndex ?? -1;
    } else if (node instanceof TerminalNode) {
      return node.symbol.stop;
    } else {
      throw new Error(`Unexpected ParseTree implementation: ${typeof node}`);
    }
  }
} satisfies Parser<JavaNode>;
