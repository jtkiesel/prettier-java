import { util, type AstPath } from "prettier";
import parser from "./parser.js";
import { JavaNode, JavaParserOptions } from "./printers/helpers.js";
import { SyntaxType } from "./tree-sitter-java.js";

const prettierIgnoreRangesByTree = new WeakMap<
  JavaNode,
  PrettierIgnoreRange[]
>();

export function determinePrettierIgnoreRanges(tree: JavaNode) {
  const { comments } = tree;
  if (!comments) {
    return;
  }
  const ranges = comments
    .filter(({ text }) =>
      /^\/(?:\/\s*(?:prettier-ignore-(?:start|end)|@formatter:(?:off|on))\s*|\*\s*(?:prettier-ignore-(?:start|end)|@formatter:(?:off|on))\s*\*\/)$/.test(
        text
      )
    )
    .reduce((ranges, { text, startPosition }) => {
      const previous = ranges.at(-1);
      if (text.includes("start") || text.includes("off")) {
        if (previous?.end !== Infinity) {
          ranges.push({ start: startPosition.row, end: Infinity });
        }
      } else if (previous?.end === Infinity) {
        previous.end = startPosition.row;
      }
      return ranges;
    }, new Array<PrettierIgnoreRange>());
  prettierIgnoreRangesByTree.set(tree, ranges);
}

export function isFullyBetweenPrettierIgnore(path: AstPath<JavaNode>) {
  const { node, root } = path;
  const start = parser.locStart(node);
  const end = parser.locEnd(node);
  return (
    prettierIgnoreRangesByTree
      .get(root)
      ?.some(range => range.start < start && end < range.end) === true
  );
}

export function isComment(node: JavaNode) {
  return (
    node.type === SyntaxType.BlockComment ||
    node.type === SyntaxType.LineComment
  );
}

export function canAttachComment(node: JavaNode) {
  if (!node.isNamed) {
    return isBinaryOperator(node);
  }
  switch (node.type) {
    case SyntaxType.ArgumentList:
    case SyntaxType.BlockComment:
    case SyntaxType.EnumBodyDeclarations:
    case SyntaxType.LineComment:
    case SyntaxType.Program:
      return false;
    default:
      return true;
  }
  /*switch (name) {
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
  }*/
}

export function handleLineComment(
  commentNode: JavaComment,
  _: string,
  options: JavaParserOptions
) {
  return [
    handleBinaryExpressionComments,
    handleTernaryExpressionComments,
    handleFqnOrRefTypeComments,
    handleIfStatementComments,
    handleJumpStatementComments,
    handleLabeledStatementComments,
    handleNameComments
    //handleTryStatementComments
  ].some(fn => fn(commentNode, options));
}

export function handleRemainingComment(commentNode: JavaComment) {
  return [
    handleFqnOrRefTypeComments,
    //handleMethodDeclaratorComments,
    handleNameComments,
    handleJumpStatementComments
  ].some(fn => fn(commentNode));
}

function handleBinaryExpressionComments(
  commentNode: JavaComment,
  options: JavaParserOptions
) {
  const { enclosingNode, precedingNode, followingNode } = commentNode;
  if (enclosingNode?.type === SyntaxType.BinaryExpression) {
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

function handleTernaryExpressionComments(commentNode: JavaComment) {
  const { enclosingNode, precedingNode, followingNode } = commentNode;
  if (
    enclosingNode?.type === SyntaxType.TernaryExpression &&
    precedingNode?.isNamed &&
    followingNode?.isNamed &&
    precedingNode.endPosition.row < commentNode.startPosition.row &&
    commentNode.endPosition.row < followingNode.startPosition.row
  ) {
    util.addLeadingComment(followingNode, commentNode);
    return true;
  }
  return false;
}

function handleFqnOrRefTypeComments(commentNode: JavaComment) {
  const { enclosingNode, followingNode } = commentNode;
  if (
    enclosingNode?.type === SyntaxType.ScopedTypeIdentifier &&
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
    enclosingNode?.type === SyntaxType.IfStatement &&
    precedingNode?.grammarType === "statement"
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
    (enclosingNode.type === SyntaxType.BreakStatement ||
      enclosingNode.type === SyntaxType.ContinueStatement ||
      enclosingNode.type === SyntaxType.ReturnStatement)
  ) {
    util.addTrailingComment(enclosingNode, commentNode);
    return true;
  }
  return false;
}

function handleLabeledStatementComments(commentNode: JavaComment) {
  const { enclosingNode, precedingNode } = commentNode;
  if (
    enclosingNode?.type === SyntaxType.LabeledStatement &&
    precedingNode?.type === SyntaxType.Identifier
  ) {
    util.addLeadingComment(precedingNode, commentNode);
    return true;
  }
  return false;
}

/*function handleMethodDeclaratorComments(commentNode: JavaComment) {
  const { enclosingNode } = commentNode;
  if (
    enclosingNode?.name === "methodDeclarator" &&
    !enclosingNode.children.receiverParameter &&
    !enclosingNode.children.formalParameterList &&
    enclosingNode.children.LBrace[0].startOffset < commentNode.startOffset &&
    commentNode.startOffset < enclosingNode.children.RBrace[0].startOffset
  ) {
    util.addDanglingComment(enclosingNode, commentNode, undefined);
    return true;
  }
  return false;
}*/

function handleNameComments(commentNode: JavaComment) {
  const { enclosingNode, precedingNode } = commentNode;
  if (
    enclosingNode &&
    precedingNode?.type === SyntaxType.Identifier &&
    (enclosingNode.type === SyntaxType.ScopedIdentifier ||
      enclosingNode.type === SyntaxType.ModuleDeclaration ||
      enclosingNode.type === SyntaxType.PackageDeclaration ||
      enclosingNode.type === SyntaxType.ScopedTypeIdentifier)
  ) {
    util.addTrailingComment(precedingNode, commentNode);
    return true;
  }
  return false;
}

/*function handleTryStatementComments(commentNode: JavaComment) {
  const { enclosingNode, followingNode } = commentNode;
  if (
    enclosingNode &&
    ["catches", "tryStatement"].includes(enclosingNode.name) &&
    followingNode &&
    isNonTerminal(followingNode)
  ) {
    const block = (
      followingNode.name === "catches"
        ? followingNode.children.catchClause[0]
        : followingNode.name === "catchClause" ||
            followingNode.name === "finally"
          ? followingNode
          : null
    )?.children.block[0];
    if (!block) {
      return false;
    }
    const blockStatement =
      block.children.blockStatements?.[0].children.blockStatement[0];
    if (blockStatement) {
      util.addLeadingComment(blockStatement, commentNode);
    } else {
      util.addDanglingComment(block, commentNode, undefined);
    }
    return true;
  }
  return false;
}*/

function isBinaryOperator(node?: JavaNode) {
  return (
    node !== undefined &&
    (node.type === "<<" ||
      node.type === ">>" ||
      node.type === ">>>" ||
      node.type === "instanceof" ||
      node.type === "<=" ||
      node.type === ">=" ||
      node.type === "==" ||
      node.type === "=" ||
      node.type === "-" ||
      node.type === "+" ||
      node.type === "&&" ||
      node.type === "&" ||
      node.type === "^" ||
      node.type === "!=" ||
      node.type === "||" ||
      node.type === "|" ||
      node.type === "*" ||
      node.type === "/" ||
      node.type === "%")
  );
}

export type JavaComment = JavaNode & {
  readonly leading: boolean;
  readonly trailing: boolean;
  readonly printed: boolean;
  readonly enclosingNode?: JavaNode;
  readonly precedingNode?: JavaNode;
  readonly followingNode?: JavaNode;
};

type PrettierIgnoreRange = {
  start: number;
  end: number;
};
