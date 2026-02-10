import { ParserRuleContext, TerminalNode } from "antlr4ng";
import type { Printer } from "prettier";
import { JavaParser } from "../../java-parser/dist/JavaParser.js";
import {
  canAttachComment,
  handleLineComment,
  handleRemainingComment,
  isFullyBetweenPrettierIgnore
} from "./comments.js";
import { printComment, type JavaNode } from "./printers/helpers.js";
import { printerForNodeType } from "./printers/index.js";

export default {
  print(path, options, print, args) {
    if (path.node instanceof ParserRuleContext) {
      return printerForNodeType(JavaParser.ruleNames[path.node.ruleIndex])(
        path,
        print,
        options,
        args
      );
    } else if (path.node instanceof TerminalNode) {
      return path.node.symbol.text ?? "";
    } else {
      throw new Error(
        `Unexpected ParseTree implementation: ${typeof path.node}`
      );
    }
  },
  hasPrettierIgnore(path) {
    return (
      path.node.comments?.some(({ text }) =>
        /^(\/\/\s*prettier-ignore|\/\*\s*prettier-ignore\s*\*\/)$/.test(text)
      ) === true ||
      (canAttachComment(path.node) && isFullyBetweenPrettierIgnore(path))
    );
  },
  canAttachComment,
  isBlockComment(node) {
    return node.type === SyntaxType.BlockComment;
  },
  printComment(commentPath) {
    return printComment(commentPath.node);
  },
  getCommentChildNodes(node) {
    return node.children;
  },
  handleComments: {
    ownLine: handleLineComment,
    endOfLine: handleLineComment,
    remaining: handleRemainingComment
  }
} satisfies Printer<JavaNode>;
