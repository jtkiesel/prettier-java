import type {
  AnnotationCstNode,
  BinaryExpressionCstNode,
  ClassPermitsCstNode,
  ClassTypeCtx,
  CstElement,
  CstNode,
  ExpressionCstNode,
  InterfacePermitsCstNode,
  IToken,
  StatementCstNode
} from "java-parser";
import type { AstPath, Doc, ParserOptions } from "prettier";
import { builders } from "prettier/doc";
import { isComment, JavaComment } from "../comments.js";
import parser from "../parser.js";
import {
  ArrayInitializerNode,
  ClassBodyNode,
  ConstantDeclarationNode,
  ElementValueArrayInitializerNode,
  EnumBodyDeclarationsNode,
  FieldDeclarationNode,
  InterfaceBodyNode,
  LocalVariableDeclarationNode,
  type NamedNode,
  type SyntaxNode,
  SyntaxType
} from "../tree-sitter-java.js";

const { group, hardline, ifBreak, indent, join, line, softline } = builders;

export function hasChild<T, K extends keyof T>(
  path: AstPath<T>,
  fieldName: K
): path is AstPath<T & { [P in K]-?: NonNullable<T[P]> }> {
  return path.node[fieldName] != null;
}

export function onlyDefinedKey<
  T extends Record<string, any>,
  K extends Key<T> & string
>(obj: T, options?: K[]) {
  const keys = definedKeys(obj, options);
  if (keys.length === 1) {
    return keys[0];
  }
  throw new Error(
    keys.length > 1
      ? `More than one defined key found: ${keys}`
      : "No defined keys found"
  );
}

export function definedKeys<
  T extends Record<string, any>,
  K extends Key<T> & string
>(obj: T, options?: K[]) {
  return (options ?? (Object.keys(obj) as K[])).filter(
    key => obj[key] !== undefined
  );
}

export function printWithModifiers<
  T extends CstNode,
  P extends IterProperties<T["children"]>
>(
  path: AstPath<T>,
  print: JavaPrintFn,
  modifierChild: P,
  contents: Doc,
  noTypeAnnotations = false
) {
  const declarationAnnotations: Doc[] = [];
  const otherModifiers: string[] = [];
  const typeAnnotations: Doc[] = [];
  each(
    path,
    modifierPath => {
      const { children } = modifierPath.node as ModifierNode;
      const modifier = print(modifierPath);
      if (children.annotation) {
        (otherModifiers.length ? typeAnnotations : declarationAnnotations).push(
          modifier
        );
      } else {
        otherModifiers.push(modifier as string);
        declarationAnnotations.push(...typeAnnotations);
        typeAnnotations.length = 0;
      }
    },
    modifierChild
  );
  if (noTypeAnnotations) {
    declarationAnnotations.push(...typeAnnotations);
    typeAnnotations.length = 0;
  }
  otherModifiers.sort(
    (a, b) => indexByModifier.get(a)! - indexByModifier.get(b)!
  );
  return join(hardline, [
    ...declarationAnnotations,
    join(" ", [...otherModifiers, ...typeAnnotations, contents])
  ]);
}

export function hasDeclarationAnnotations(modifiers: ModifierNode[]) {
  let hasAnnotation = false;
  let hasNonAnnotation = false;
  for (const modifier of modifiers) {
    if (modifier.children.annotation) {
      hasAnnotation = true;
    } else if (hasAnnotation) {
      return true;
    } else {
      hasNonAnnotation = true;
    }
  }
  return hasAnnotation && !hasNonAnnotation;
}

export function call<
  T extends CstNode,
  U,
  P extends IterProperties<T["children"]>
>(
  path: AstPath<T>,
  callback: MapCallback<IndexValue<IndexValue<T, "children">, P>, U>,
  child: P
) {
  return path.map(callback, "children", child)[0];
}

export function each<
  T extends CstNode,
  P extends IterProperties<T["children"]>
>(
  path: AstPath<T>,
  callback: MapCallback<IndexValue<IndexValue<T, "children">, P>, void>,
  child: P
) {
  if (path.node.children[child]) {
    path.each(callback, "children", child);
  }
}

export function map<
  T extends CstNode,
  U,
  P extends IterProperties<T["children"]>
>(
  path: AstPath<T>,
  callback: MapCallback<IndexValue<IndexValue<T, "children">, P>, U>,
  child: P
) {
  return path.node.children[child] ? path.map(callback, "children", child) : [];
}

export function flatMap<
  T extends SyntaxNode,
  U,
  P extends IterProperties<T["children"]>
>(
  path: AstPath<T>,
  callback: MapCallback<IndexValue<IndexValue<T, "children">, P>, U>,
  children: P[]
) {
  return children
    .flatMap(child =>
      map(path, callback, child).map((doc, index) => {
        const node = path.node.children[child][index];
        return {
          doc,
          startOffset: parser.locStart(node)
        };
      })
    )
    .sort((a, b) => a.startOffset - b.startOffset)
    .map(({ doc }) => doc);
}

export function printSingle(
  path: AstPath<JavaNonTerminal>,
  print: JavaPrintFn,
  _?: JavaParserOptions,
  args?: unknown
) {
  return call(
    path,
    childPath => print(childPath, args),
    onlyDefinedKey(path.node.children)
  );
}

export function lineStartWithComments(node: SyntaxNode) {
  /*const { comments, location } = node;
  return comments
    ? Math.min(location.startLine, comments[0].startLine)
    : location.startLine;*/
  return node.startPosition.row;
}

export function lineEndWithComments(node: SyntaxNode) {
  /*const { comments, location } = node;
  return comments
    ? Math.max(location.endLine, comments.at(-1)!.endLine)
    : location.endLine;*/
  return node.endPosition.row;
}

export function printDanglingComments(path: AstPath<JavaNode>) {
  if (!path.node.comments) {
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

export function printComment(node: JavaNode) {
  const lines = node.text.split("\n").map(line => line.trim());
  return lines.length > 1 &&
    lines[0].startsWith("/*") &&
    lines.slice(1).every(line => line.startsWith("*")) &&
    lines.at(-1)!.endsWith("*/")
    ? join(
        hardline,
        lines.map((line, index) => (index === 0 ? line : ` ${line}`))
      )
    : node.text;
}

export function hasLeadingComments(node: JavaNode) {
  return node.comments?.some(({ leading }) => leading) ?? false;
}

export function indentInParentheses(
  contents: Doc,
  opts?: { shouldBreak?: boolean }
) {
  return !Array.isArray(contents) || contents.length
    ? group(["(", indent([softline, contents]), softline, ")"], opts)
    : "()";
}

export function printArrayInitializer(
  path: AstPath<ArrayInitializerNode | ElementValueArrayInitializerNode>,
  print: JavaPrintFn,
  options: JavaParserOptions
) {
  if (!path.node.namedChildren.some(child => !isComment(child))) {
    const danglingComments = printDanglingComments(path);
    return danglingComments.length
      ? ["{", indent([hardline, ...danglingComments]), hardline, "}"]
      : "{}";
  }

  const list: Doc[] = [];
  path.each(child => {
    if (!isComment(child.node)) {
      list.push(print(child));
    }
  }, "namedChildren");

  const trailingComma = options.trailingComma === "none" ? [] : [ifBreak(",")];

  return list.length
    ? group([
        "{",
        indent([line, ...join([",", line], list), ...trailingComma]),
        line,
        "}"
      ])
    : "{}";
}

export function printBlock(path: AstPath<NamedNode>, contents: Doc[]) {
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
  return ((grandparent?.type === SyntaxType.TryStatement ||
    grandparent?.type === SyntaxType.TryWithResourcesStatement) &&
    grandparent.children.filter(({ type }) => type === SyntaxType.CatchClause)
      .length === 1 &&
    !grandparent.children.some(
      ({ type }) => type === SyntaxType.FinallyClause
    )) ||
    (grandparent &&
      [
        SyntaxType.ForStatement,
        SyntaxType.DoStatement,
        SyntaxType.EnhancedForStatement,
        SyntaxType.WhileStatement
      ].includes(grandparent.type)) ||
    [
      SyntaxType.AnnotationTypeBody,
      SyntaxType.ClassBody,
      SyntaxType.ConstructorBody,
      SyntaxType.EnumBody,
      SyntaxType.InterfaceBody,
      SyntaxType.ModuleDeclaration,
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

export function printName(
  path: AstPath<JavaNonTerminal & { children: { Identifier: IToken[] } }>,
  print: JavaPrintFn
) {
  return join(".", map(path, print, "Identifier"));
}

export function printList<T extends SyntaxNode, P extends IterProperties<T>>(
  path: AstPath<T>,
  print: JavaPrintFn,
  child: P
) {
  return join([",", line], path.map(print, child));
}

export function printClassPermits(
  path: AstPath<ClassPermitsCstNode | InterfacePermitsCstNode>,
  print: JavaPrintFn
) {
  return group(["permits", indent([line, printList(path, print, "typeName")])]);
}

export function printClassType(
  path: AstPath<JavaNonTerminal & { children: ClassTypeCtx }>,
  print: JavaPrintFn
) {
  const { children } = path.node;
  return definedKeys(children, ["annotation", "Identifier", "typeArguments"])
    .flatMap(child =>
      children[child]!.map((node, index) => ({
        child,
        index,
        startOffset: parser.locStart(node)
      }))
    )
    .sort((a, b) => a.startOffset - b.startOffset)
    .flatMap(({ child, index: childIndex }, index, array) => {
      const node = children[child]![childIndex];
      const next = array.at(index + 1);
      const nextNode = next && children[next.child]![next.index];
      const docs = [path.call(print, "children", child, childIndex)];
      if (nextNode) {
        if (isNonTerminal(node)) {
          docs.push(node.name === "annotation" ? " " : ".");
        } else if (isTerminal(nextNode) || nextNode.name === "annotation") {
          docs.push(".");
        }
      }
      return docs;
    });
}

export function printClassBodyDeclarations(
  path: AstPath<ClassBodyNode | EnumBodyDeclarationsNode | InterfaceBodyNode>,
  print: JavaPrintFn
) {
  const declarations: Doc[] = [];
  let previousRequiresPadding = false;

  path.each(child => {
    const { node, previous } = child;
    if (isComment(node) || node.type === ";") {
      return;
    }

    const isField = node.type === SyntaxType.FieldDeclaration;
    let hasAnnotation = false;
    if (isField) {
      const modifiers = node.children.find(
        c => c.type === SyntaxType.Modifiers
      );
      if (modifiers) {
        hasAnnotation = modifiers.children.some(
          c =>
            c.type === SyntaxType.Annotation ||
            c.type === SyntaxType.MarkerAnnotation
        );
      }
    }

    const currentRequiresPadding = !isField || hasAnnotation;
    const blankLine =
      declarations.length > 0 &&
      (previousRequiresPadding ||
        currentRequiresPadding ||
        (previous &&
          lineStartWithComments(node) > lineEndWithComments(previous) + 1));

    const declaration = print(child);
    declarations.push(blankLine ? [hardline, declaration] : declaration);
    previousRequiresPadding = currentRequiresPadding;
  }, "namedChildren");

  return declarations;
}

export function printExpressionList(expressions: Doc[]) {
  return group(
    expressions.map((expression, index) =>
      index === 0 ? expression : [",", indent([line, expression])]
    )
  );
}

export function printVariableDeclaration(
  path: AstPath<
    | ConstantDeclarationNode
    | FieldDeclarationNode
    | LocalVariableDeclarationNode
  >,
  print: JavaPrintFn
) {
  const declaration: Doc[] = [];

  const modifiersIndex = path.node.namedChildren.findIndex(
    ({ type }) => type === SyntaxType.Modifiers
  );
  if (modifiersIndex !== -1) {
    declaration.push(path.call(print, "namedChildren", modifiersIndex));
  }

  declaration.push(path.call(print, "typeNode"), " ");

  const declarators = path.map(print, "declaratorNodes");

  if (path.node.declaratorNodes.some(({ valueNode }) => valueNode)) {
    declaration.push(
      group(indent(join([",", line], declarators)), {
        shouldBreak:
          (path.grandparent as JavaNode | null)?.type !==
          SyntaxType.ForStatement
      })
    );
  } else {
    declaration.push(join(", ", declarators));
  }

  declaration.push(";");

  return declaration;
}

export function isBinaryExpression(expression: ExpressionCstNode) {
  const conditionalExpression =
    expression.children.conditionalExpression?.[0].children;
  if (!conditionalExpression) {
    return false;
  }
  const isTernary = conditionalExpression.QuestionMark !== undefined;
  if (isTernary) {
    return false;
  }
  return hasNonAssignmentOperators(conditionalExpression.binaryExpression[0]);
}

export function hasAssignmentOperators(
  binaryExpression: BinaryExpressionCstNode
) {
  return binaryExpression.children.AssignmentOperator !== undefined;
}

export function hasNonAssignmentOperators(
  binaryExpression: BinaryExpressionCstNode
) {
  return Object.keys(binaryExpression.children).some(name =>
    ["BinaryOperator", "Instanceof", "shiftOperator"].includes(name)
  );
}

export function findBaseIndent(lines: string[]) {
  return lines.length
    ? Math.min(
        ...lines.map(line => line.search(/\S/)).filter(indent => indent >= 0)
      )
    : 0;
}

export function isEmptyStatement(statement: StatementCstNode) {
  return (
    statement.children.statementWithoutTrailingSubstatement?.[0].children
      .emptyStatement !== undefined
  );
}

export function isNonTerminal(node: CstElement): node is JavaNonTerminal {
  return !isTerminal(node);
}

export function isTerminal(node: CstElement): node is IToken {
  return "tokenType" in node;
}

export type JavaNode<T extends SyntaxNode = SyntaxNode> = T & {
  comments?: JavaComment[];
};
export type JavaNodePrinters = {
  [T in SyntaxType]: JavaNodePrinter<T>;
};
export type JavaNodePrinter<T extends SyntaxType> = (
  path: AstPath<JavaNode<NamedNode<T>>>,
  print: (path: AstPath<JavaNode>, args?: unknown) => Doc,
  options: ParserOptions<JavaNode>,
  args?: unknown
) => Doc;
export type JavaPrintFn = (path: AstPath<JavaNode>, args?: unknown) => Doc;
export type JavaParserOptions = ParserOptions<JavaNode>;
export type IterProperties<T> = T extends any[]
  ? IndexProperties<T>
  : ArrayProperties<T>;

type Key<T> = T extends T ? keyof T : never;
type ModifierNode = JavaNonTerminal & {
  children: { annotation?: AnnotationCstNode[] };
};
type IsTuple<T> = T extends []
  ? true
  : T extends [infer First, ...infer Remain]
    ? IsTuple<Remain>
    : false;
type IndexProperties<T extends { length: number }> =
  IsTuple<T> extends true ? Exclude<Partial<T>["length"], T["length"]> : number;
type ArrayProperties<T> = {
  [K in keyof T]: NonNullable<T[K]> extends readonly any[] ? K : never;
}[keyof T];
type ArrayElement<T> = T extends Array<infer E> ? E : never;
type MapCallback<T, U> = (
  path: AstPath<ArrayElement<T>>,
  index: number,
  value: any
) => U;
type IndexValue<T, P> = T extends any[]
  ? P extends number
    ? T[P]
    : never
  : P extends keyof T
    ? T[P]
    : never;
