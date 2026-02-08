import type { AstPath, Printer } from "prettier";
import {
  canAttachComment,
  handleLineComment,
  handleRemainingComment,
  isFullyBetweenPrettierIgnore
} from "./comments.js";
import { printComment, type JavaNode } from "./printers/helpers.js";
import { printerForNodeType } from "./printers/index.js";
import { SyntaxType, type NamedNode } from "./tree-sitter-java.js";

export default {
  print(path, options, print, args) {
    return hasNamedNode(path)
      ? printerForNodeType(path.node.type)(path, print, options, args)
      : path.node.text;
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

function hasNamedNode(
  path: AstPath<JavaNode>
): path is AstPath<JavaNode<NamedNode>> {
  return path.node.isNamed;
}
