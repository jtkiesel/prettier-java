import type { Doc } from "prettier";
import { builders } from "prettier/doc";
import { isComment } from "../comments.js";
import { SyntaxType } from "../tree-sitter-java.js";
import {
  call,
  hasChild,
  hasLeadingComments,
  indentInParentheses,
  lineEndWithComments,
  lineStartWithComments,
  map,
  printBlock,
  printDanglingComments,
  printExpressionList,
  printSingle,
  printVariableDeclaration,
  type JavaNodePrinters
} from "./helpers.js";

const {
  group,
  hardline,
  ifBreak,
  indent,
  indentIfBreak,
  join,
  line,
  softline
} = builders;

export default {
  block(path, print) {
    const statements: Doc[] = [];
    path.each(child => {
      if (!isComment(child.node)) {
        statements.push(print(child));
      }
    }, "namedChildren");

    return printBlock(path, statements);
  },

  blockStatements(path, print) {
    return join(
      hardline,
      map(
        path,
        statementPath => {
          const { node, previous } = statementPath;
          const statement = print(statementPath);
          return previous &&
            lineStartWithComments(node) > lineEndWithComments(previous) + 1
            ? [hardline, statement]
            : statement;
        },
        "blockStatement"
      ).filter(doc => doc !== "")
    );
  },

  blockStatement: printSingle,

  localVariableDeclarationStatement(path, print) {
    return [call(path, print, "localVariableDeclaration"), ";"];
  },

  local_variable_declaration: printVariableDeclaration,

  localVariableType: printSingle,
  statement: printSingle,
  statementWithoutTrailingSubstatement: printSingle,

  emptyStatement() {
    return "";
  },

  labeled_statement(path, print) {
    const parts: Doc[] = [];
    path.each(child => {
      if (child.node.type === ":") {
        parts.push(": ");
      } else if (!isComment(child.node)) {
        parts.push(print(child));
      }
    }, "children");

    return parts;
  },

  expression_statement(path, print) {
    const expressionIndex = path.node.namedChildren.findIndex(
      child => !isComment(child)
    );
    return [path.call(print, "children", expressionIndex), ";"];
  },

  statementExpression: printSingle,

  if_statement(path, print) {
    const statement = ["if ", path.call(print, "conditionNode")];

    if (path.node.consequenceNode.type === ";") {
      statement.push(";");
    } else {
      statement.push(" ", path.call(print, "consequenceNode"));
    }

    if (!hasChild(path, "alternativeNode")) {
      return statement;
    }

    const danglingComments = printDanglingComments(path);
    if (danglingComments.length) {
      statement.push(hardline, ...danglingComments, hardline);
    } else {
      const elseHasBlock = path.node.alternativeNode.type === SyntaxType.Block;
      statement.push(elseHasBlock ? " " : hardline);
    }

    statement.push("else");

    if (path.node.alternativeNode.type === ";") {
      statement.push(";");
    } else {
      statement.push(" ", path.call(print, "alternativeNode"));
    }

    return statement;
  },

  assert_statement(path, print) {
    const expressions: Doc[] = [];
    path.each(child => {
      if (!isComment(child.node)) {
        expressions.push(print(child));
      }
    }, "namedChildren");

    return ["assert ", ...join(" : ", expressions), ";"];
  },

  switch_expression(path, print) {
    return join(" ", [
      "switch",
      indentInParentheses(path.call(print, "conditionNode")),
      path.call(print, "bodyNode")
    ]);
  },

  switchStatement(path, print) {
    return join(" ", [
      "switch",
      indentInParentheses(call(path, print, "expression")),
      call(path, print, "switchBlock")
    ]);
  },

  switch_block(path, print) {
    const cases: Doc[] = [];
    path.each(child => {
      if (!isComment(child.node)) {
        cases.push(print(child));
      }
    }, "namedChildren");
    return printBlock(path, cases);
  },

  switch_block_statement_group(path, print) {
    const parts: Doc[] = [];
    const statements: Doc[] = [];

    path.each(child => {
      if (isComment(child.node)) {
        return;
      }
      if (child.node.type === SyntaxType.SwitchLabel) {
        parts.push(print(child), ":", hardline);
      } else {
        statements.push(print(child));
      }
    }, "namedChildren");

    const onlyStatementIsBlock =
      statements.length === 1 &&
      path.node.namedChildren.some(({ type }) => type === SyntaxType.Block);
    if (onlyStatementIsBlock) {
      parts.push(" ", statements[0]);
    } else {
      parts.push(indent([hardline, ...join(hardline, statements)]));
    }

    return parts;
  },

  switch_label(path, print) {
    const hasCase = path.node.children.some(({ type }) => type === "case");
    if (!hasCase) {
      return "default";
    }
    const values: Doc[] = [];
    path.each(child => {
      if (
        child.node.type !== "case" &&
        child.node.type !== "," &&
        child.node.type !== SyntaxType.Guard &&
        !isComment(child.node)
      ) {
        values.push(print(child));
      }
    }, "children");

    const hasMultipleValues = values.length > 1;
    const label = hasMultipleValues
      ? ["case", indent([line, ...join([",", line], values)])]
      : ["case ", values[0]];

    const guardIndex = path.node.namedChildren.findIndex(
      ({ type }) => type === SyntaxType.Guard
    );
    return guardIndex !== -1
      ? [
          group([...label, hasMultipleValues ? line : " "]),
          path.call(print, "namedChildren", guardIndex)
        ]
      : group(label);
  },

  switch_rule(path, print) {
    const bodyIndex = path.node.namedChildren.findIndex(
      ({ type }) =>
        type === SyntaxType.Block ||
        type === SyntaxType.ExpressionStatement ||
        type === SyntaxType.ThrowStatement
    );
    const bodyNode = path.node.namedChildren[bodyIndex];
    const body = path.call(print, "namedChildren", bodyIndex);

    const switchLabelIndex = path.node.namedChildren.findIndex(
      ({ type }) => type === SyntaxType.SwitchLabel
    );
    const parts = [path.call(print, "namedChildren", switchLabelIndex), " ->"];

    if (bodyNode.type !== SyntaxType.Block && hasLeadingComments(bodyNode)) {
      parts.push(indent([hardline, body]));
    } else {
      parts.push(" ", body);
    }
    return parts;
  },

  caseConstant: printSingle,
  casePattern: printSingle,

  while_statement(path, print) {
    return [
      "while ",
      path.call(print, "conditionNode"),
      path.call(print, "bodyNode")
    ];
  },

  do_statement(path, print) {
    const hasEmptyStatement = path.node.bodyNode.type === ";";
    return [
      "do",
      hasEmptyStatement ? ";" : [" ", path.call(print, "bodyNode")],
      " while ",
      path.call(print, "conditionNode"),
      ";"
    ];
  },

  for_statement(path, print) {
    const danglingComments = printDanglingComments(path);
    if (danglingComments.length) {
      danglingComments.push(hardline);
    }
    const expressions = [
      hasChild(path, "initNodes")
        ? printExpressionList(path.map(print, "initNodes"))
        : "",
      hasChild(path, "conditionNode") ? path.call(print, "conditionNode") : "",
      hasChild(path, "updateNodes")
        ? printExpressionList(path.map(print, "updateNodes"))
        : ""
    ];

    const hasEmptyStatement = path.node.bodyNode.type === ";";
    return [
      ...danglingComments,
      "for ",
      expressions.some(expression => expression !== "")
        ? indentInParentheses(join([";", line], expressions))
        : "(;;)",
      hasEmptyStatement ? ";" : [" ", path.call(print, "bodyNode")]
    ];
  },

  update_expression(path, print) {
    const expressionIndex = path.node.namedChildren.findIndex(
      child => !isComment(child)
    );
    return path.call(print, "namedChildren", expressionIndex);
  },

  enhanced_for_statement(path, print) {
    const forStatement = printDanglingComments(path);
    forStatement.push("for (");

    const modifiersIndex = path.node.namedChildren.findIndex(
      ({ type }) => type === SyntaxType.Modifiers
    );
    if (modifiersIndex !== -1) {
      forStatement.push(path.call(print, "namedChildren", modifiersIndex));
    }

    forStatement.push(
      path.call(print, "typeNode"),
      " ",
      path.call(print, "nameNode")
    );

    if (hasChild(path, "dimensionsNode")) {
      forStatement.push(path.call(print, "dimensionsNode"));
    }

    forStatement.push(" : ", path.call(print, "valueNode"), ")");

    const bodyType = path.node.bodyNode.type;
    if (bodyType === ";") {
      forStatement.push(";");
    } else {
      const body = path.call(print, "bodyNode");
      forStatement.push(
        bodyType === SyntaxType.Block ? [" ", body] : indent([line, body])
      );
    }
    return group(forStatement);
  },

  break_statement(path, print) {
    const parts: Doc[] = ["break"];

    const identifierIndex = path.node.namedChildren.findIndex(
      ({ type }) => type === SyntaxType.Identifier
    );
    if (identifierIndex !== -1) {
      parts.push(" ", path.call(print, "namedChildren", identifierIndex));
    }

    parts.push(";");

    return parts;
  },

  continueStatement(path, print) {
    return path.node.children.Identifier
      ? ["continue ", call(path, print, "Identifier"), ";"]
      : "continue;";
  },

  return_statement(path, print) {
    const statement: Doc[] = ["return"];

    const expressionIndex = path.node.namedChildren.findIndex(
      child => !isComment(child)
    );
    if (expressionIndex !== -1) {
      statement.push(" ");
      const expression = path.call(print, "namedChildren", expressionIndex);
      if (
        path.node.namedChildren[expressionIndex].type ===
        SyntaxType.BinaryExpression
      ) {
        statement.push(
          group([
            ifBreak("("),
            indent([softline, expression]),
            softline,
            ifBreak(")")
          ])
        );
      } else {
        statement.push(expression);
      }
    }
    statement.push(";");
    return statement;
  },

  throw_statement(path, print) {
    const expressionIndex = path.node.namedChildren.findIndex(
      child => !isComment(child)
    );
    return ["throw ", path.call(print, "namedChildren", expressionIndex), ";"];
  },

  synchronized_statement(path, print) {
    const parenthesizedExpressionIndex = path.node.namedChildren.findIndex(
      ({ type }) => type === SyntaxType.ParenthesizedExpression
    );
    return [
      "synchronized ",
      path.call(print, "namedChildren", parenthesizedExpressionIndex),
      " ",
      path.call(print, "bodyNode")
    ];
  },

  try_statement(path, print) {
    const parts = ["try", path.call(print, "bodyNode")];

    path.each(child => {
      if (
        child.node.type === SyntaxType.CatchClause ||
        child.node.type === SyntaxType.FinallyClause
      ) {
        parts.push(print(child));
      }
    }, "namedChildren");

    return join(" ", parts);
  },

  catch_clause(path, print) {
    const catchFormalParameterIndex = path.node.namedChildren.findIndex(
      ({ type }) => type === SyntaxType.CatchFormalParameter
    );
    return [
      "catch ",
      indentInParentheses(
        path.call(print, "namedChildren", catchFormalParameterIndex)
      ),
      " ",
      path.call(print, "bodyNode")
    ];
  },

  catch_formal_parameter(path, print) {
    const parts: Doc[] = [];

    const modifiersIndex = path.node.namedChildren.findIndex(
      ({ type }) => type === SyntaxType.Modifiers
    );
    if (modifiersIndex !== -1) {
      parts.push(path.call(print, "namedChildren", modifiersIndex));
    }

    const catchTypeIndex = path.node.namedChildren.findIndex(
      ({ type }) => type === SyntaxType.CatchType
    );
    parts.push(
      path.call(print, "namedChildren", catchTypeIndex),
      " ",
      path.call(print, "nameNode")
    );

    if (hasChild(path, "dimensionsNode")) {
      parts.push(path.call(print, "dimensionsNode"));
    }
    return parts;
  },

  catch_type(path, print) {
    const types: Doc[] = [];
    path.each(child => {
      if (!isComment(child.node)) {
        types.push(print(child));
      }
    }, "namedChildren");

    return join([line, "| "], types);
  },

  finally_clause(path, print) {
    const blockIndex = path.node.namedChildren.findIndex(
      ({ type }) => type === SyntaxType.Block
    );
    return ["finally ", path.call(print, "namedChildren", blockIndex)];
  },

  try_with_resources_statement(path, print) {
    const parts = [
      "try",
      path.call(print, "resourcesNode"),
      path.call(print, "bodyNode")
    ];

    path.each(child => {
      if (
        child.node.type === SyntaxType.CatchClause ||
        child.node.type === SyntaxType.FinallyClause
      ) {
        parts.push(print(child));
      }
    }, "namedChildren");

    return join(" ", parts);
  },

  resource_specification(path, print) {
    const resources: Doc[] = [];
    let hasTrailingSemicolon = false;

    path.each(child => {
      if (child.node.type === SyntaxType.Resource) {
        resources.push(print(child));
        hasTrailingSemicolon = false;
      } else if (child.node.type === ";") {
        hasTrailingSemicolon = true;
      }
    }, "namedChildren");

    const parts = join([";", line], resources);

    if (hasTrailingSemicolon) {
      parts.push(ifBreak(";"));
    }
    return indentInParentheses(parts);
  },

  resource(path, print) {
    if (
      hasChild(path, "typeNode") &&
      hasChild(path, "nameNode") &&
      hasChild(path, "valueNode")
    ) {
      const parts: Doc[] = [];

      const modifiersIndex = path.node.namedChildren.findIndex(
        ({ type }) => type === SyntaxType.Modifiers
      );
      if (modifiersIndex !== -1) {
        parts.push(path.call(print, "namedChildren", modifiersIndex));
      }

      parts.push(
        path.call(print, "typeNode"),
        " ",
        path.call(print, "nameNode")
      );

      if (hasChild(path, "dimensionsNode")) {
        parts.push(path.call(print, "dimensionsNode"));
      }

      parts.push(" =");

      const value = path.call(print, "valueNode");
      if (
        path.node.valueNode.type === SyntaxType.BinaryExpression ||
        hasLeadingComments(path.node.valueNode)
      ) {
        parts.push(group(indent([line, value])));
      } else {
        const groupId = Symbol("assignment");
        parts.push(
          group(indent(line), { id: groupId }),
          indentIfBreak(value, { groupId })
        );
      }

      return parts;
    }

    const resourceIndex = path.node.namedChildren.findIndex(
      ({ type }) =>
        type === SyntaxType.Identifier || type === SyntaxType.FieldAccess
    );
    return path.call(print, "namedChildren", resourceIndex);
  },

  yield_statement(path, print) {
    const expressionIndex = path.node.namedChildren.findIndex(
      child => !isComment(child)
    );
    return ["yield ", path.call(print, "namedChildren", expressionIndex), ";"];
  },

  variableAccess: printSingle
} satisfies Partial<JavaNodePrinters>;
