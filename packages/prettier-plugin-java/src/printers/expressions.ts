import type {
  FqnOrRefTypeCtx,
  StringTemplateCstNode,
  TextBlockTemplateCstNode
} from "java-parser";
import type { AstPath, Doc } from "prettier";
import { builders, utils } from "prettier/doc";
import { isComment } from "../comments.js";
import { SyntaxNode, SyntaxType } from "../tree-sitter-java.js";
import {
  call,
  definedKeys,
  each,
  findBaseIndent,
  flatMap,
  hasChild,
  hasLeadingComments,
  hasNonAssignmentOperators,
  indentInParentheses,
  isTerminal,
  JavaNode,
  map,
  onlyDefinedKey,
  printList,
  printSingle,
  type IterProperties,
  type JavaNodePrinters,
  type JavaNonTerminal,
  type JavaPrintFn
} from "./helpers.js";

const {
  align,
  breakParent,
  conditionalGroup,
  group,
  hardline,
  ifBreak,
  indent,
  indentIfBreak,
  join,
  line,
  lineSuffixBoundary,
  softline
} = builders;
const { removeLines, willBreak } = utils;

export default {
  lambda_expression(path, print, _, args = {}) {
    const hug = (args as { hug?: boolean }).hug ?? false;
    const parameters = path.call(print, "parametersNode");
    const expression = [hug ? removeLines(parameters) : parameters, " ->"];

    const body = path.call(print, "bodyNode");
    if (path.node.bodyNode.type === SyntaxType.Block) {
      expression.push(" ", body);
    } else {
      const suffix = indent([line, body]);
      expression.push(group(hug ? [suffix, softline] : suffix));
    }

    return expression;
  },

  inferred_parameters(path, print, options) {
    const identifiers: Doc[] = [];
    path.each(child => {
      if (child.node.type === SyntaxType.Identifier) {
        identifiers.push(print(child));
      }
    }, "namedChildren");

    if (!identifiers.length) {
      return "()";
    }

    const parameters = join([",", line], identifiers);
    if (identifiers.length > 1) {
      return indentInParentheses(parameters);
    }
    return options.arrowParens === "avoid"
      ? parameters
      : ["(", ...parameters, ")"];
  },

  lambdaBody: printSingle,

  ternary_expression(path, print, options) {
    const condition = path.call(print, "conditionNode");
    const consequence = path.call(print, "consequenceNode");
    const alternative = path.call(print, "alternativeNode");

    const grandparentNodeType = (path.getNode(4) as SyntaxNode | null)?.type;
    const isInReturn = grandparentNodeType === SyntaxType.ReturnStatement;
    const isNestedTernary =
      grandparentNodeType === SyntaxType.TernaryExpression;
    const suffix = [
      line,
      ["? ", options.useTabs ? indent(consequence) : align(2, consequence)],
      line,
      [": ", options.useTabs ? indent(alternative) : align(2, alternative)]
    ];

    const prefix = group(isInReturn ? indent(condition) : condition);
    const alignedSuffix =
      !isNestedTernary || options.useTabs
        ? suffix
        : align(Math.max(0, options.tabWidth - 2), suffix);

    if (isNestedTernary) {
      return [prefix, alignedSuffix];
    }

    const parts = [prefix, indent(alignedSuffix)];
    return grandparentNodeType === SyntaxType.ParenthesizedExpression
      ? parts
      : group(parts);
  },

  assignment_expression(path, print) {
    const groupId = Symbol("assignment");
    return [
      path.call(print, "leftNode"),
      " ",
      path.node.operatorNode.text,
      group(indent(line), { id: groupId }),
      indentIfBreak(path.call(print, "rightNode"), { groupId })
    ];
  },

  binaryExpression(path, print, options) {
    const { children } = path.node;
    const operands = flatMap(
      path,
      print,
      definedKeys(children, [
        "expression",
        "pattern",
        "referenceType",
        "unaryExpression"
      ])
    );
    const operators = flatMap(
      path,
      operatorPath => {
        const { node } = operatorPath;
        let image: string;
        if (isTerminal(node)) {
          image = node.image;
        } else if (node.children.Less) {
          image = "<<";
        } else {
          image = node.children.Greater!.length === 2 ? ">>" : ">>>";
        }
        return { image, doc: print(operatorPath) };
      },
      definedKeys(children, [
        "AssignmentOperator",
        "BinaryOperator",
        "Instanceof",
        "shiftOperator"
      ])
    );
    const isInList =
      (path.getNode(4) as JavaNonTerminal | null)?.name === "elementValue" ||
      (path.getNode(6) as JavaNonTerminal | null)?.name === "argumentList";
    const binaryExpression =
      children.expression?.[0].children.conditionalExpression?.[0].children
        .binaryExpression[0];
    return binary(operands, operators, {
      hasNonAssignmentOperators:
        (operators.length > 0 && !children.AssignmentOperator) ||
        (binaryExpression && hasNonAssignmentOperators(binaryExpression)),
      isInList,
      isRoot: true,
      operatorPosition: options.experimentalOperatorPosition
    });
  },

  unaryExpression(path, print) {
    return [
      ...map(path, print, "UnaryPrefixOperator"),
      call(path, print, "primary"),
      ...map(path, print, "UnarySuffixOperator")
    ];
  },

  unaryExpressionNotPlusMinus(path, print) {
    const { children } = path.node;
    const expression: Doc[] = [];
    if (children.UnaryPrefixOperatorNotPlusMinus) {
      expression.push(...map(path, print, "UnaryPrefixOperatorNotPlusMinus"));
    }
    expression.push(call(path, print, "primary"));
    if (children.UnarySuffixOperator) {
      expression.push(...map(path, print, "UnarySuffixOperator"));
    }
    return join(" ", expression);
  },

  primary(path, print) {
    const { children } = path.node;
    if (!children.primarySuffix) {
      return call(path, print, "primaryPrefix");
    }
    const methodInvocations = children.primarySuffix
      .filter(({ children }) => children.methodInvocationSuffix)
      .map(({ children }) => children.methodInvocationSuffix![0].children);
    const hasLambdaMethodParameter = methodInvocations.some(
      ({ argumentList }) =>
        argumentList?.[0].children.expression.some(
          ({ children }) => children.lambdaExpression
        )
    );
    const prefixIsCallExpression =
      children.primaryPrefix[0].children.newExpression;
    const callExpressionCount =
      methodInvocations.length +
      (prefixIsCallExpression ? 1 : 0) +
      children.primarySuffix.filter(
        ({ children }) => children.unqualifiedClassInstanceCreationExpression
      ).length;
    const fqnOrRefType =
      children.primaryPrefix[0].children.fqnOrRefType?.[0].children;
    const prefixIsMethodInvocation =
      fqnOrRefType?.fqnOrRefTypePartRest !== undefined &&
      children.primarySuffix?.[0].children.methodInvocationSuffix !== undefined;
    const prefixIsStaticMethodInvocation =
      prefixIsMethodInvocation && isCapitalizedIdentifier(fqnOrRefType);
    const prefixIsInstanceMethodInvocation =
      prefixIsMethodInvocation && !prefixIsStaticMethodInvocation;
    const mustBreakForCallExpressions =
      methodInvocations.length > 2 && hasLambdaMethodParameter;
    const separator = mustBreakForCallExpressions ? hardline : softline;
    const prefix = [
      call(
        path,
        prefixPath =>
          print(prefixPath, {
            lastSeparator:
              prefixIsStaticMethodInvocation ||
              (prefixIsInstanceMethodInvocation && callExpressionCount === 1)
                ? ""
                : separator
          }),
        "primaryPrefix"
      )
    ];
    const canBreakForCallExpressions =
      callExpressionCount > 2 ||
      (callExpressionCount === 2 && prefixIsInstanceMethodInvocation) ||
      willBreak(prefix);
    const suffixes: Doc[] = [];
    each(
      path,
      suffixPath => {
        const { node, previous } = suffixPath;
        const suffix = print(suffixPath);
        if (node.children.Dot) {
          if (
            (canBreakForCallExpressions &&
              ((!previous && prefixIsCallExpression) ||
                previous?.children.methodInvocationSuffix ||
                previous?.children
                  .unqualifiedClassInstanceCreationExpression)) ||
            (!node.children.templateArgument && willBreak(suffix))
          ) {
            suffixes.push(separator);
          }
          suffixes.push(suffix);
        } else if (previous) {
          suffixes.push(suffix);
        } else {
          prefix.push(
            prefixIsInstanceMethodInvocation && callExpressionCount >= 2
              ? indent(suffix)
              : suffix
          );
        }
      },
      "primarySuffix"
    );
    const hasSuffixComments = children.primarySuffix.some(suffix =>
      hasLeadingComments(suffix)
    );
    return group(
      canBreakForCallExpressions || hasSuffixComments
        ? [prefix, indent(suffixes)]
        : [prefix, ...suffixes]
    );
  },

  primaryPrefix: printSingle,

  field_access(path, print) {
    const parts = [path.call(print, "objectNode")];

    if (path.node.children.filter(({ type }) => type === ".").length === 2) {
      parts.push("super");
    }

    parts.push(path.call(print, "fieldNode"));

    return join(".", parts);
  },

  primarySuffix(path, print) {
    const { children } = path.node;
    if (!children.Dot) {
      return printSingle(path, print);
    }
    const suffix: Doc[] = ["."];
    if (children.This) {
      suffix.push("this");
    } else if (children.Identifier) {
      if (children.typeArguments) {
        suffix.push(call(path, print, "typeArguments"));
      }
      suffix.push(call(path, print, "Identifier"));
    } else {
      const suffixKey = onlyDefinedKey(children, [
        "templateArgument",
        "unqualifiedClassInstanceCreationExpression"
      ]);
      suffix.push(call(path, print, suffixKey));
    }
    return suffix;
  },

  fqnOrRefType(path, print, _, args) {
    const lastSeparator = (args as { lastSeparator?: Doc }).lastSeparator ?? "";
    const fqnOrRefType = [
      call(path, print, "fqnOrRefTypePartFirst"),
      ...map(
        path,
        partPath => {
          const part = print(partPath);
          return partPath.isLast
            ? [willBreak(part) ? hardline : lastSeparator, part]
            : part;
        },
        "fqnOrRefTypePartRest"
      )
    ];
    fqnOrRefType.push(indent(fqnOrRefType.pop()!));
    return path.node.children.dims
      ? [fqnOrRefType, call(path, print, "dims")]
      : fqnOrRefType;
  },

  fqnOrRefTypePartFirst(path, print) {
    return join(" ", [
      ...map(path, print, "annotation"),
      call(path, print, "fqnOrRefTypePartCommon")
    ]);
  },

  fqnOrRefTypePartRest(path, print) {
    const common = call(path, print, "fqnOrRefTypePartCommon");
    const type = path.node.children.typeArguments
      ? [call(path, print, "typeArguments"), common]
      : common;
    return [".", ...join(" ", [...map(path, print, "annotation"), type])];
  },

  generic_type(path, print) {
    const typeIdentifierIndex = path.node.namedChildren.findIndex(
      ({ type }) =>
        type === SyntaxType.ScopedTypeIdentifier ||
        type === SyntaxType.TypeIdentifier
    );
    const typeArgumentsIndex = path.node.namedChildren.findIndex(
      ({ type }) => type === SyntaxType.TypeArguments
    );
    return [
      path.call(print, "namedChildren", typeIdentifierIndex),
      path.call(print, "namedChildren", typeArgumentsIndex)
    ];
  },

  parenthesized_expression(path, print) {
    const expressionIndex = path.node.children.findIndex(
      child => !isComment(child)
    );
    const expression = path.call(print, "children", expressionIndex);
    const grandparentNode = path.grandparent as JavaNode | null;
    const expressionNode = path.node.children[expressionIndex];
    const hasLambda = expressionNode.type === SyntaxType.LambdaExpression;
    const hasTernary = expressionNode.type === SyntaxType.TernaryExpression;
    const hasSuffix =
      grandparentNode &&
      (grandparentNode.type === SyntaxType.ArrayAccess ||
        grandparentNode.type === SyntaxType.ExplicitConstructorInvocation ||
        grandparentNode.type === SyntaxType.FieldAccess ||
        grandparentNode.type === SyntaxType.MethodInvocation ||
        grandparentNode.type === SyntaxType.MethodReference ||
        grandparentNode.type === SyntaxType.ObjectCreationExpression);
    const isAssignment =
      grandparentNode &&
      (grandparentNode.type === SyntaxType.AssignmentExpression ||
        grandparentNode.type === SyntaxType.VariableDeclarator);
    if (!hasLambda && hasSuffix && (!hasTernary || isAssignment)) {
      return indentInParentheses(hasTernary ? group(expression) : expression);
    } else if (
      grandparentNode &&
      (grandparentNode.type === SyntaxType.Guard ||
        grandparentNode.type === SyntaxType.ReturnStatement)
    ) {
      return indentInParentheses(group(expression));
    } else if (hasTernary && hasSuffix && !isAssignment) {
      return group(["(", expression, softline, ")"]);
    } else {
      return group([
        "(",
        hasLambda || hasTernary ? expression : indent(expression),
        ")"
      ]);
    }
  },

  cast_expression(path, print) {
    const types = path.map(print, "typeNodes");
    const value = path.call(print, "valueNode");

    return types.length > 1
      ? [indentInParentheses(join([" &", line], types)), " ", value]
      : ["(", ...types, ") ", value];
  },

  object_creation_expression(path, print) {
    const expression: Doc[] = [];

    path.each(child => {
      if (isComment(child.node)) {
        return;
      }

      if (child.node.type === SyntaxType.ClassBody) {
        expression.push(" ");
      }

      expression.push(print(child));

      if (
        child.node.type === SyntaxType.Annotation ||
        child.node.type === SyntaxType.MarkerAnnotation ||
        child.node.type === "new"
      ) {
        expression.push(" ");
      }
    }, "children");

    return expression;
  },

  method_invocation(path, print) {
    const parts: Doc[] = [];
    if (hasChild(path, "objectNode")) {
      parts.push(path.call(print, "objectNode"), ".");
    }
    if (path.node.children.filter(({ type }) => type === ".").length === 2) {
      parts.push("super", ".");
    }
    if (hasChild(path, "type_argumentsNode")) {
      parts.push(path.call(print, "type_argumentsNode"));
    }
    parts.push(
      path.call(print, "nameNode"),
      group(path.call(print, "argumentsNode"))
    );

    return parts;
  },

  argument_list(path, print) {
    const args: Doc[] = [];
    path.each(child => {
      if (!isComment(child.node)) {
        args.push(child.call(print));
      }
    }, "namedChildren");
    const allArgsExpandable = [
      indent([softline, ...join([",", line], args)]),
      softline
    ];
    return group(["(", ...allArgsExpandable, ")"]);
  },
  /*
  argumentList(path, print) {
    const expressions = path.node.children.expression;
    const lastExpression = expressions.at(
      -1
    ) as (typeof expressions)[number] & { comments?: JavaComment[] };
    const lastExpressionLambdaBodyExpression =
      lastExpression.children.lambdaExpression?.[0].children.lambdaBody[0]
        .children.expression?.[0].children;
    const lastExpressionLambdaBodyTernaryExpression =
      lastExpressionLambdaBodyExpression?.conditionalExpression?.[0].children;
    const isHuggable =
      !lastExpression.comments &&
      (!lastExpressionLambdaBodyExpression ||
        lastExpressionLambdaBodyTernaryExpression?.QuestionMark !== undefined ||
        lastExpressionLambdaBodyTernaryExpression?.binaryExpression?.[0]
          .children.unaryExpression.length === 1) &&
      expressions.findIndex(({ children }) => children.lambdaExpression) ===
        expressions.length - 1;
    const args = map(path, print, "expression");
    const allArgsExpandable = [
      indent([softline, ...join([",", line], args)]),
      softline
    ];
    if (!isHuggable || willBreak((args.at(-1) as Doc[])[0])) {
      return allArgsExpandable;
    }
    const headArgs = args.slice(0, -1);
    const huggedLastArg = path.call(
      argPath => print(argPath, { hug: true }),
      "children",
      "expression",
      args.length - 1
    );
    const lastArgExpanded = join(", ", [
      ...headArgs,
      group(huggedLastArg, { shouldBreak: true })
    ]);
    if (willBreak(huggedLastArg)) {
      return [
        breakParent,
        conditionalGroup([lastArgExpanded, allArgsExpandable])
      ];
    }
    return conditionalGroup([
      join(", ", [...headArgs, huggedLastArg]),
      lastArgExpanded,
      allArgsExpandable
    ]);
  },
*/
  array_creation_expression(path, print) {
    const parts: Doc[] = ["new "];

    path.each(child => {
      if (
        child.node.type === SyntaxType.Annotation ||
        child.node.type === SyntaxType.MarkerAnnotation
      ) {
        parts.push(print(child), " ");
      }
    }, "namedChildren");

    parts.push(
      path.call(print, "typeNode"),
      path.map(print, "dimensionsNodes")
    );

    if (hasChild(path, "valueNode")) {
      parts.push(" ", path.call(print, "valueNode"));
    }

    return parts;
  },

  dimensions_expr(path, print) {
    const parts: Doc[] = [];

    path.each(child => {
      if (
        child.node.type === SyntaxType.Annotation ||
        child.node.type === SyntaxType.MarkerAnnotation
      ) {
        parts.push(print(child), " ");
      } else if (!isComment(child.node)) {
        parts.push("[", print(child), "]");
      }
    }, "namedChildren");

    return parts;
  },

  class_literal(path, print) {
    const unannotatedTypeIndex = path.node.namedChildren.findIndex(
      child => !isComment(child)
    );
    return [path.call(print, "namedChildren", unannotatedTypeIndex), ".class"];
  },

  array_access(path, print) {
    return [
      path.call(print, "arrayNode"),
      "[",
      path.call(print, "indexNode"),
      "]"
    ];
  },

  method_reference(path, print) {
    const reference: Doc[] = [];
    path.each(child => {
      if (!isComment(child.node)) {
        reference.push(print(child));
      }
    }, "children");

    return reference;
  },

  pattern(path, print) {
    const patternIndex = path.node.namedChildren.findIndex(
      ({ type }) =>
        type === SyntaxType.TypePattern || type === SyntaxType.RecordPattern
    );
    return path.call(print, "namedChildren", patternIndex);
  },

  type_pattern(path, print) {
    const parts: Doc[] = [];
    path.each(child => {
      if (!isComment(child.node)) {
        parts.push(print(child));
      }
    }, "children");

    return join(" ", parts);
  },

  recordPattern(path, print) {
    const patterns = path.node.children.componentPatternList
      ? indentInParentheses(call(path, print, "componentPatternList"))
      : "()";
    return [call(path, print, "referenceType"), patterns];
  },

  componentPatternList(path, print) {
    return printList(path, print, "componentPattern");
  },

  componentPattern: printSingle,
  matchAllPattern: printSingle,

  guard(path, print) {
    const expressionIndex = path.node.namedChildren.findIndex(
      child => !isComment(child)
    );
    const hasParentheses =
      path.node.namedChildren[expressionIndex].type ===
      SyntaxType.ParenthesizedExpression;
    const expression = path.call(print, "namedChildren", expressionIndex);

    return [
      "when ",
      hasParentheses
        ? expression
        : group([
            ifBreak("("),
            indent([softline, expression]),
            softline,
            ifBreak(")")
          ])
    ];
  }
} satisfies Partial<JavaNodePrinters>;

function binary(
  operands: Doc[],
  operators: { image: string; doc: Doc }[],
  {
    hasNonAssignmentOperators = false,
    isInList = false,
    isRoot = false,
    operatorPosition
  }: {
    hasNonAssignmentOperators?: boolean;
    isInList?: boolean;
    isRoot?: boolean;
    operatorPosition: "end" | "start";
  }
): Doc {
  let levelOperator: string | undefined;
  let levelPrecedence: number | undefined;
  let level: Doc[] = [];
  while (operators.length) {
    const nextOperator = operators[0].image;
    const nextPrecedence = getOperatorPrecedence(nextOperator);

    if (levelPrecedence === undefined || nextPrecedence === levelPrecedence) {
      const { image: operator, doc: operatorDoc } = operators.shift()!;
      level.push(operands.shift()!);
      if (
        levelOperator !== undefined &&
        needsParentheses(levelOperator, operator)
      ) {
        level = [["(", group(indent(level)), ")"]];
      }
      const parts = [" ", operatorDoc, line];
      if (operatorPosition === "start" && !isAssignmentOperator(operator)) {
        parts.reverse();
      }
      level.push(parts);
      levelOperator = operator;
      levelPrecedence = nextPrecedence;
    } else if (nextPrecedence < levelPrecedence) {
      if (!isRoot) {
        break;
      }
      level.push(operands.shift()!);
      const content = group(indent(level));
      operands.unshift(
        levelOperator !== undefined &&
          needsParentheses(levelOperator, nextOperator)
          ? ["(", content, ")"]
          : content
      );
      level = [];
      levelOperator = undefined;
      levelPrecedence = undefined;
    } else {
      const content = binary(operands, operators, { operatorPosition });
      operands.unshift(
        levelOperator !== undefined &&
          needsParentheses(nextOperator, levelOperator)
          ? ["(", group(indent(content)), ")"]
          : group(content)
      );
    }
  }
  level.push(operands.shift()!);
  if (
    !levelOperator ||
    (!isInList &&
      !isAssignmentOperator(levelOperator) &&
      levelOperator !== "instanceof")
  ) {
    return level;
  }
  if (!isRoot || hasNonAssignmentOperators) {
    return indent(level);
  }
  const groupId = Symbol("assignment");
  return [
    level[0],
    group(indent(level[1]), { id: groupId }),
    indentIfBreak(level[2], { groupId })
  ];
}

const precedencesByOperator = new Map(
  [
    ["||"],
    ["&&"],
    ["|"],
    ["^"],
    ["&"],
    ["==", "!="],
    ["<", ">", "<=", ">=", "instanceof"],
    ["<<", ">>", ">>>"],
    ["+", "-"],
    ["*", "/", "%"]
  ].flatMap((operators, index) => operators.map(operator => [operator, index]))
);
function getOperatorPrecedence(operator: string) {
  return precedencesByOperator.get(operator) ?? -1;
}

function needsParentheses(operator: string, parentOperator: string) {
  return (
    (operator === "&&" && parentOperator === "||") ||
    (["|", "^", "&", "<<", ">>", ">>>"].includes(parentOperator) &&
      getOperatorPrecedence(operator) >
        getOperatorPrecedence(parentOperator)) ||
    [operator, parentOperator].every(o => ["==", "!="].includes(o)) ||
    [operator, parentOperator].every(o => ["<<", ">>", ">>>"].includes(o)) ||
    (operator === "*" && parentOperator === "/") ||
    (operator === "/" && parentOperator === "*") ||
    (operator === "%" && ["+", "-", "*", "/"].includes(parentOperator)) ||
    (["*", "/"].includes(operator) && parentOperator === "%")
  );
}

const assignmentOperators = new Set([
  "=",
  "*=",
  "/=",
  "%=",
  "+=",
  "-=",
  "<<=",
  ">>=",
  ">>>=",
  "&=",
  "^=",
  "|="
]);
function isAssignmentOperator(operator: string) {
  return assignmentOperators.has(operator);
}

function isCapitalizedIdentifier(fqnOrRefType: FqnOrRefTypeCtx) {
  const nextToLastIdentifier = [
    fqnOrRefType.fqnOrRefTypePartFirst[0],
    ...(fqnOrRefType.fqnOrRefTypePartRest ?? [])
  ].at(-2)?.children.fqnOrRefTypePartCommon[0].children.Identifier?.[0].image;
  return /^\p{Uppercase_Letter}/u.test(nextToLastIdentifier ?? "");
}

function printTemplate<
  T extends StringTemplateCstNode | TextBlockTemplateCstNode,
  C extends Exclude<IterProperties<T["children"]>, "embeddedExpression">
>(path: AstPath<T>, print: JavaPrintFn, beginKey: C, midKey: C, endKey: C) {
  const begin = call(path, ({ node }) => node.image, beginKey);
  const mids = map(path, ({ node }) => node.image, midKey);
  const end = call(path, ({ node }) => node.image, endKey);
  const lines = [begin, ...mids, end].join("").split("\n").slice(1);
  const baseIndent = findBaseIndent(lines);
  const prefix = "\n" + " ".repeat(baseIndent);
  const parts = [begin, ...mids, end].map(image =>
    join(hardline, image.split(prefix))
  );
  return indent([
    parts[0],
    ...map(
      path,
      (expressionPath, index) => {
        const expression = group([
          indent([softline, print(expressionPath), lineSuffixBoundary]),
          softline
        ]);
        return index === 0 ? expression : [parts[index], expression];
      },
      "embeddedExpression" as IterProperties<T["children"]>
    ),
    parts.at(-1)!
  ]);
}
