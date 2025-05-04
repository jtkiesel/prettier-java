import type { CstElement, IToken } from "java-parser";
import { util } from "prettier";
import { isNode, isToken, type JavaParserOptions } from "./printers/helpers.js";

type JavaComment = IToken & {
  enclosingNode?: CstElement;
  precedingNode?: CstElement;
  followingNode?: CstElement;
};

export function handleLineComment(
  commentNode: JavaComment,
  _: string,
  options: JavaParserOptions
) {
  return [
    handleBinaryExpressionComments,
    handleFqnOrRefTypeComments,
    handleIfStatementComments,
    handleJumpStatementComments,
    handleLabeledStatementComments,
    handleNameComments
  ].some(fn => fn(commentNode, options));
}

export function handleRemainingComment(commentNode: JavaComment) {
  return [
    handleFqnOrRefTypeComments,
    handleMethodDeclaratorComments,
    handleNameComments,
    handleJumpStatementComments
  ].some(fn => fn(commentNode));
}

function handleBinaryExpressionComments(
  commentNode: JavaComment,
  options: JavaParserOptions
) {
  const { enclosingNode, precedingNode, followingNode } = commentNode;
  if (
    enclosingNode &&
    isNode(enclosingNode) &&
    enclosingNode.name === "binaryExpression"
  ) {
    if (isBinaryOperator(followingNode)) {
      if (options.experimentalOperatorPosition === "start") {
        util.addLeadingComment(followingNode, commentNode);
      } else {
        util.addTrailingComment(followingNode, commentNode);
      }
      return true;
    } else if (
      options.experimentalOperatorPosition === "start" &&
      isBinaryOperator(precedingNode)
    ) {
      util.addLeadingComment(precedingNode, commentNode);
      return true;
    }
  }
  return false;
}

function handleFqnOrRefTypeComments(commentNode: JavaComment) {
  const { enclosingNode, followingNode } = commentNode;
  if (
    enclosingNode &&
    isNode(enclosingNode) &&
    enclosingNode.name === "fqnOrRefType" &&
    followingNode
  ) {
    util.addLeadingComment(followingNode, commentNode);
    return true;
  }
  return false;
}

function handleIfStatementComments(commentNode: JavaComment) {
  const { enclosingNode, precedingNode } = commentNode;
  if (
    enclosingNode &&
    isNode(enclosingNode) &&
    enclosingNode.name === "ifStatement" &&
    precedingNode &&
    isNode(precedingNode) &&
    precedingNode.name === "statement"
  ) {
    util.addDanglingComment(enclosingNode, commentNode, undefined);
    return true;
  }
  return false;
}

function handleJumpStatementComments(commentNode: JavaComment) {
  const { enclosingNode, precedingNode, followingNode } = commentNode;
  if (
    enclosingNode &&
    !precedingNode &&
    !followingNode &&
    isNode(enclosingNode) &&
    ["breakStatement", "continueStatement", "returnStatement"].includes(
      enclosingNode.name
    )
  ) {
    util.addTrailingComment(enclosingNode, commentNode);
    return true;
  }
  return false;
}

function handleLabeledStatementComments(commentNode: JavaComment) {
  const { enclosingNode, precedingNode } = commentNode;
  if (
    enclosingNode &&
    precedingNode &&
    isNode(enclosingNode) &&
    enclosingNode.name === "labeledStatement" &&
    isToken(precedingNode) &&
    precedingNode.tokenType.name === "Identifier"
  ) {
    util.addLeadingComment(precedingNode, commentNode);
    return true;
  }
  return false;
}

function handleMethodDeclaratorComments(commentNode: JavaComment) {
  const { enclosingNode } = commentNode;
  if (
    enclosingNode &&
    isNode(enclosingNode) &&
    enclosingNode.name === "methodDeclarator" &&
    !enclosingNode.children.receiverParameter &&
    !enclosingNode.children.formalParameterList &&
    enclosingNode.children.LBrace[0].startOffset < commentNode.startOffset &&
    commentNode.startOffset < enclosingNode.children.RBrace[0].startOffset
  ) {
    util.addDanglingComment(enclosingNode, commentNode, undefined);
    return true;
  }
  return false;
}

function handleNameComments(commentNode: JavaComment) {
  const { enclosingNode, precedingNode } = commentNode;
  if (
    enclosingNode &&
    precedingNode &&
    isNode(enclosingNode) &&
    isToken(precedingNode) &&
    precedingNode.tokenType.name === "Identifier" &&
    [
      "ambiguousName",
      "classOrInterfaceTypeToInstantiate",
      "expressionName",
      "moduleDeclaration",
      "moduleName",
      "packageDeclaration",
      "packageName",
      "packageOrTypeName",
      "typeName"
    ].includes(enclosingNode.name)
  ) {
    util.addTrailingComment(precedingNode, commentNode);
    return true;
  }
  return false;
}

function isBinaryOperator(node?: CstElement) {
  return (
    node !== undefined &&
    (isNode(node)
      ? node.name === "shiftOperator"
      : node.tokenType.CATEGORIES?.some(
          ({ name }) => name === "BinaryOperator"
        ))
  );
}
