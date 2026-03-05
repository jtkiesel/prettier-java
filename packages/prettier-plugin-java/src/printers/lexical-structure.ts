import { builders } from "prettier/doc";
import { SyntaxType } from "../tree-sitter-java.js";
import {
  findBaseIndent,
  type JavaNode,
  type JavaNodePrinters
} from "./helpers.js";

const { group, hardline, indent, join, softline } = builders;

export default {
  string_literal(path, print) {
    const hasInterpolations = path.node.namedChildren.some(
      ({ type }) => type === SyntaxType.StringInterpolation
    );
    if (hasInterpolations || path.node.children[0].value === '"') {
      return path.map(print, "children");
    }

    const lines = path.node.children
      .map(({ value }) => value)
      .join("")
      .split("\n")
      .slice(1);
    const baseIndent = findBaseIndent(lines);
    const textBlock = join(hardline, [
      '"""',
      ...lines.map(line => line.slice(baseIndent))
    ]);
    const parentType = (path.parent as JavaNode | null)?.type;
    const grandparentType = (path.grandparent as JavaNode | null)?.type;
    return parentType === SyntaxType.AssignmentExpression ||
      parentType === SyntaxType.VariableDeclarator ||
      (path.node.fieldName === "object" &&
        (grandparentType === SyntaxType.AssignmentExpression ||
          grandparentType === SyntaxType.VariableDeclarator))
      ? indent(textBlock)
      : textBlock;
  },

  string_fragment(path) {
    return path.node.value;
  },

  multiline_string_fragment(path) {
    return path.node.value;
  },

  string_interpolation(path, print) {
    const expressionType = path.node.namedChildren[0].type;
    const expression = path.call(print, "namedChildren", 0);

    return expressionType === SyntaxType.BinaryExpression ||
      expressionType === SyntaxType.TernaryExpression
      ? group(["\\{", indent([softline, expression]), softline, "}"])
      : ["\\{", expression, "}"];
  },

  escape_sequence(path) {
    return path.node.value;
  },

  character_literal(path) {
    return path.node.value;
  },

  binary_integer_literal(path) {
    return path.node.value;
  },

  decimal_integer_literal(path) {
    return path.node.value;
  },

  hex_integer_literal(path) {
    return path.node.value;
  },

  octal_integer_literal(path) {
    return path.node.value;
  },

  decimal_floating_point_literal(path) {
    return path.node.value;
  },

  hex_floating_point_literal(path) {
    return path.node.value;
  },

  true(path) {
    return path.node.value;
  },

  false(path) {
    return path.node.value;
  }
} satisfies Partial<JavaNodePrinters>;
