import type { Printer } from "prettier";
import {
  canAttachComment,
  handleLineComment,
  handleRemainingComment,
  isFullyBetweenPrettierIgnore,
  willPrintOwnComments
} from "./comments.js";
import {
  printComment,
  type JavaComment,
  type JavaNode,
  type JavaNodeType,
  type JavaPath
} from "./printers/helpers.js";
import { printerForNodeType } from "./printers/index.js";
import { SyntaxType } from "./tree-sitter-java.js";

export default {
  print(path, options, print, args) {
    return hasJavaNode(path)
      ? printerForNodeType(path.node.type)(path, print, options, args)
      : path.node.value;
  },
  hasPrettierIgnore(path) {
    return (
      path.node.comments?.some(({ value }) =>
        /^(\/\/\s*prettier-ignore|\/\*\s*prettier-ignore\s*\*\/)$/.test(value)
      ) === true ||
      (canAttachComment(path.node) && isFullyBetweenPrettierIgnore(path))
    );
  },
  canAttachComment,
  isBlockComment(node) {
    return node.type === SyntaxType.BlockComment;
  },
  willPrintOwnComments,
  printComment(commentPath) {
    return printComment(commentPath.node as unknown as JavaComment);
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

function hasJavaNode(path: JavaPath): path is JavaPath<JavaNodeType> {
  return path.node.isNamed;
}
