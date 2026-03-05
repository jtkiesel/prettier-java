import type { AstPath, Doc, ParserOptions } from "prettier";
import { builders } from "prettier/doc";
import {
  SyntaxType,
  type NodeOfType,
  type SyntaxNode,
  type TypeString
} from "../tree-sitter-java.js";

const { group, hardline, ifBreak, indent, join, line, softline } = builders;

export function hasType<T extends TypeString>(
  path: JavaPath,
  type: T
): path is JavaPath<T> {
  return path.node.type === type;
}

export function hasChild<T, K extends keyof T>(
  path: AstPath<T>,
  fieldName: K
): path is AstPath<T & { [P in K]-?: NonNullable<T[P]> }> {
  return path.node[fieldName] != null;
}

export function definedKeys<T extends Record<string, any>, K extends keyof T>(
  obj: T,
  options?: K[]
) {
  return (options ?? (Object.keys(obj) as K[])).filter(
    key => obj[key] !== undefined
  );
}

export function printModifiers(
  path: JavaPath,
  print: JavaPrintFn,
  annotationMode?: "declarationOnly" | "avoidBreak" | "noBreak"
): Doc[] {
  const modifiersIndex = path.node.namedChildren.findIndex(
    ({ type }) => type === SyntaxType.Modifiers
  );
  if (modifiersIndex === -1) {
    return [];
  }
  const separator =
    annotationMode === "avoidBreak"
      ? line
      : annotationMode === "noBreak" ||
          path.node.namedChildren[modifiersIndex].children.some(
            ({ type }) =>
              type !== SyntaxType.Annotation &&
              type !== SyntaxType.MarkerAnnotation
          )
        ? " "
        : hardline;
  return [
    path.call(
      modifiers => print(modifiers, { annotationMode }),
      "namedChildren",
      modifiersIndex
    ),
    separator
  ];
}

export function lineStartWithComments(node: JavaNode) {
  return node.comments?.length
    ? Math.min(node.start.row, node.comments[0].start.row)
    : node.start.row;
}

export function lineEndWithComments(node: JavaNode) {
  return node.comments?.length
    ? Math.max(node.end.row, node.comments.at(-1)!.end.row)
    : node.end.row;
}

export function printDanglingComments(path: JavaPath) {
  if (!path.node.comments?.length) {
    return [];
  }
  const comments: Doc[] = [];
  path.each(commentPath => {
    const comment = commentPath.node;
    if (comment.leading || comment.trailing) {
      return;
    }
    comment.printed = true;
    comments.push(printComment(comment));
  }, "comments");
  return join(hardline, comments);
}

export function printComment(comment: JavaComment) {
  const lines = comment.value.split("\n").map(line => line.trim());
  return lines.length > 1 &&
    lines[0].startsWith("/*") &&
    lines.slice(1).every(line => line.startsWith("*")) &&
    lines.at(-1)!.endsWith("*/")
    ? join(
        hardline,
        lines.map((line, index) => (index === 0 ? line : ` ${line}`))
      )
    : comment.value;
}

export function hasLeadingComments(node: JavaNode) {
  return node.comments?.some(({ leading }) => leading) ?? false;
}

export function indentInParentheses(contents: Doc) {
  return !Array.isArray(contents) || contents.length
    ? ["(", indent([softline, contents]), softline, ")"]
    : "()";
}

export function printArrayInitializer(
  path: JavaPath<
    SyntaxType.ArrayInitializer | SyntaxType.ElementValueArrayInitializer
  >,
  print: JavaPrintFn,
  options: JavaParserOptions
) {
  if (!path.node.namedChildren.length) {
    const danglingComments = printDanglingComments(path);
    return danglingComments.length
      ? ["{", indent([hardline, ...danglingComments]), hardline, "}"]
      : "{}";
  }

  const list = join([",", line], path.map(print, "namedChildren"));

  if (list.length && options.trailingComma !== "none") {
    list.push(ifBreak(","));
  }

  return group(["{", indent([line, ...list]), line, "}"]);
}

export function printBlock(path: JavaPath<SyntaxType>, contents: Doc[]) {
  if (contents.length) {
    return group([
      "{",
      indent([hardline, ...join(hardline, contents)]),
      hardline,
      "}"
    ]);
  }
  const danglingComments = printDanglingComments(path);
  if (danglingComments.length) {
    return ["{", indent([hardline, ...danglingComments]), hardline, "}"];
  }
  const parent = path.parent;
  const grandparent = path.grandparent;
  return (parent?.type === SyntaxType.CatchClause &&
    (grandparent?.type === SyntaxType.TryStatement ||
      grandparent?.type === SyntaxType.TryWithResourcesStatement) &&
    grandparent.namedChildren.filter(
      ({ type }) => type === SyntaxType.CatchClause
    ).length === 1 &&
    !grandparent.namedChildren.some(
      ({ type }) => type === SyntaxType.FinallyClause
    )) ||
    (parent &&
      [
        SyntaxType.ForStatement,
        SyntaxType.DoStatement,
        SyntaxType.EnhancedForStatement,
        SyntaxType.WhileStatement
      ].includes(parent.type)) ||
    [
      SyntaxType.AnnotationTypeBody,
      SyntaxType.ClassBody,
      SyntaxType.ConstructorBody,
      SyntaxType.EnumBody,
      SyntaxType.InterfaceBody,
      SyntaxType.ModuleBody,
      SyntaxType.RecordPatternBody
    ].includes(path.node.type) ||
    (parent &&
      [
        SyntaxType.Block,
        SyntaxType.LambdaExpression,
        SyntaxType.MethodDeclaration,
        SyntaxType.StaticInitializer,
        SyntaxType.SynchronizedStatement
      ].includes(parent.type))
    ? "{}"
    : ["{", hardline, "}"];
}

export function printBlockStatements(
  path: JavaPath<
    | SyntaxType.Block
    | SyntaxType.ConstructorBody
    | SyntaxType.SwitchBlockStatementGroup
  >,
  print: JavaPrintFn
) {
  const parts: Doc[] = [];
  path.each(child => {
    const { node, previous } = child;

    if (node.type === SyntaxType.SwitchLabel) {
      return;
    }

    const blankLine =
      parts.length &&
      previous &&
      lineStartWithComments(node) > lineEndWithComments(previous) + 1;

    const declaration = print(child);
    parts.push(blankLine ? [hardline, declaration] : declaration);
  }, "namedChildren");
  return parts;
}

export function printBodyDeclarations(
  path: JavaPath<
    | SyntaxType.AnnotationTypeBody
    | SyntaxType.ClassBody
    | SyntaxType.EnumBody
    | SyntaxType.EnumBodyDeclarations
    | SyntaxType.FormalParameters
    | SyntaxType.InterfaceBody
  >,
  print: JavaPrintFn,
  padFirst = false
) {
  const isInterfaceBody = path.node.type === SyntaxType.InterfaceBody;
  const isFormalParameters = path.node.type === SyntaxType.FormalParameters;
  const separator = isFormalParameters ? softline : hardline;
  let previousRequiresPadding = padFirst;

  return path.map(child => {
    const { node, previous } = child;

    const modifiers =
      node.namedChildren.find(({ type }) => type === SyntaxType.Modifiers)
        ?.children ?? [];
    const firstAnnotationIndex = modifiers.findIndex(
      ({ type }) =>
        type === SyntaxType.Annotation || type === SyntaxType.MarkerAnnotation
    );
    const lastNonAnnotationIndex = modifiers.findLastIndex(
      ({ type }) =>
        type !== SyntaxType.Annotation && type !== SyntaxType.MarkerAnnotation
    );
    const hasDeclarationAnnotation =
      firstAnnotationIndex !== -1 &&
      ((!isFormalParameters && lastNonAnnotationIndex === -1) ||
        firstAnnotationIndex < lastNonAnnotationIndex);
    const currentRequiresPadding =
      hasDeclarationAnnotation ||
      (!isFormalParameters &&
        node.type !== SyntaxType.ConstantDeclaration &&
        node.type !== SyntaxType.EnumConstant &&
        node.type !== SyntaxType.FieldDeclaration &&
        !(
          isInterfaceBody &&
          node.type === SyntaxType.MethodDeclaration &&
          !node.bodyNode
        ));

    const blankLine =
      previousRequiresPadding ||
      (previous &&
        (currentRequiresPadding ||
          lineStartWithComments(node) > lineEndWithComments(previous) + 1));

    previousRequiresPadding = currentRequiresPadding;

    const declaration = print(child);
    return blankLine ? [separator, declaration] : declaration;
  }, "namedChildren");
}

export function printExpressionList(expressions: Doc[]) {
  return group(
    expressions.map((expression, index) =>
      index === 0 ? expression : [",", indent([line, expression])]
    )
  );
}

export function printVariableDeclaration(
  path: JavaPath<
    | SyntaxType.ConstantDeclaration
    | SyntaxType.FieldDeclaration
    | SyntaxType.LocalVariableDeclaration
  >,
  print: JavaPrintFn
) {
  const declaration = printModifiers(path, print);

  declaration.push(path.call(print, "typeNode"), " ");

  const declarators = path.map(print, "declaratorNodes");

  if (
    declarators.length > 1 &&
    path.node.declaratorNodes.some(({ valueNode }) => valueNode)
  ) {
    declaration.push(
      group(indent(join([",", line], declarators)), {
        shouldBreak:
          (path.parent as JavaNode | null)?.type !== SyntaxType.ForStatement
      })
    );
  } else {
    declaration.push(join(", ", declarators));
  }

  declaration.push(";");

  return declaration;
}

export function findBaseIndent(lines: string[]) {
  return lines.length
    ? Math.min(
        ...lines.map(line => line.search(/\S/)).filter(indent => indent >= 0)
      )
    : 0;
}

export type JavaPath<T extends TypeString = TypeString> = AstPath<JavaNode<T>>;
export type JavaNodeFields<T extends SyntaxNode> = {
  [K in keyof T as K extends `${string}Node${"s" | ""}` ? K : never]: Exclude<
    T[K],
    undefined
  > extends (infer U)[]
    ? JavaNode<Extract<U, SyntaxNode>["type"]>[]
    : Exclude<T[K], undefined> extends SyntaxNode
      ? undefined extends T[K]
        ?
            | JavaNode<Extract<Exclude<T[K], undefined>, SyntaxNode>["type"]>
            | undefined
        : JavaNode<Extract<T[K], SyntaxNode>["type"]>
      : never;
};
export type JavaNode<T extends TypeString = TypeString> = T extends any
  ? {
      type: T;
      isNamed: T extends SyntaxType ? true : false;
      value: string;
      start: Position;
      end: Position;
      children: JavaNode[];
      namedChildren: JavaNode<SyntaxType>[];
      fieldName: string | null;
      comments?: JavaComment[];
    } & JavaNodeFields<NodeOfType<T>>
  : never;
export type JavaComment = {
  type: SyntaxType.BlockComment | SyntaxType.LineComment;
  value: string;
  start: Position;
  end: Position;
  leading: boolean;
  trailing: boolean;
  printed: boolean;
  enclosingNode?: JavaNode;
  precedingNode?: JavaNode;
  followingNode?: JavaNode;
};
export type JavaNodePrinters = {
  [T in JavaNodeType]: JavaNodePrinter<T>;
};
export type JavaNodePrinter<T extends JavaNodeType> = (
  path: JavaPath<T>,
  print: JavaPrintFn,
  options: ParserOptions<JavaNode>,
  args?: unknown
) => Doc;
export type JavaNodeType = Exclude<
  SyntaxType,
  SyntaxType.BlockComment | SyntaxType.LineComment
>;
export type JavaPrintFn = (path: JavaPath, args?: unknown) => Doc;
export type JavaParserOptions = ParserOptions<JavaNode>;

type Position = {
  index: number;
  row: number;
  column: number;
};
