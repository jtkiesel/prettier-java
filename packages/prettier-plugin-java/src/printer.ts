import type { CstElement, IToken } from "java-parser";
import type { AstPath, Printer } from "prettier";
import { handleLineComment, handleRemainingComment } from "./comments.js";
import {
  isEmptyStatement,
  isNode,
  isToken,
  printComment,
  printIgnored
} from "./printers/helpers.js";
import { printerForNodeType } from "./printers/index.js";

export default {
  print(path: DistributedAstPath<CstElement>, options, print, args) {
    if (hasToken(path)) {
      return path.node.image;
    }
    const { node } = path;
    return node.ignore
      ? printIgnored(node, options)
      : printerForNodeType(node.name)(path, print, options, args);
  },
  hasPrettierIgnore(path) {
    return (
      path.node.comments?.some(({ image }) =>
        /^(\/\/\s*prettier-ignore|\/\*\s*prettier-ignore\s*\*\/)$/.test(image)
      ) === true
    );
  },
  canAttachComment(node) {
    if (isToken(node)) {
      const { name, CATEGORIES } = node.tokenType;
      return (
        name === "Identifier" ||
        CATEGORIES?.find(({ name }) => name === "BinaryOperator") !== undefined
      );
    }
    const { children, name } = node;
    switch (name) {
      case "argumentList":
      case "blockStatements":
      case "emptyStatement":
      case "enumBodyDeclarations":
        return false;
      case "annotationInterfaceMemberDeclaration":
      case "classMemberDeclaration":
      case "interfaceMemberDeclaration":
      case "methodBody":
        return !children.Semicolon;
      case "blockStatement":
        return !children.statement || !isEmptyStatement(children.statement[0]);
      case "classBodyDeclaration":
        return !children.classMemberDeclaration?.[0].children.Semicolon;
      case "recordBodyDeclaration":
        return !children.classBodyDeclaration?.[0].children
          .classMemberDeclaration?.[0].children.Semicolon;
      case "statement":
        return !isEmptyStatement(node);
      case "statementWithoutTrailingSubstatement":
        return !children.emptyStatement;
      default:
        return true;
    }
  },
  isBlockComment(node) {
    return isToken(node) && node.tokenType.name === "TraditionalComment";
  },
  printComment(commentPath) {
    const { node } = commentPath;
    if (isNode(node) || node.tokenType.GROUP !== "comments") {
      throw new Error(`Not a comment: ${JSON.stringify(node)}`);
    }
    return printComment(node);
  },
  getCommentChildNodes(node) {
    return isNode(node)
      ? Object.values(node.children).flatMap(child => child)
      : [];
  },
  handleComments: {
    ownLine: handleLineComment,
    endOfLine: handleLineComment,
    remaining: handleRemainingComment
  }
} satisfies Printer<CstElement>;

function hasToken(path: AstPath<CstElement>): path is AstPath<IToken> {
  return isToken(path.node);
}

type DistributedAstPath<T> = T extends any ? AstPath<T> : never;
