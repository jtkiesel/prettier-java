import type { SyntaxType } from "../tree-sitter-java.js";
import arrays from "./arrays.js";
import blocksAndStatements from "./blocks-and-statements.js";
import classes from "./classes.js";
import expressions from "./expressions.js";
import type { JavaNodePrinter, JavaNodePrinters } from "./helpers.js";
import interfaces from "./interfaces.js";
import lexicalStructure from "./lexical-structure.js";
import names from "./names.js";
import packagesAndModules from "./packages-and-modules.js";
import typesValuesAndVariables from "./types-values-and-variables.js";

const printersByNodeType: JavaNodePrinters = {
  ERROR(path) {
    console.log(`Failed to parse: "${path.node.text}"`);
    return path.node.text;
  },
  this(path) {
    return path.node.text;
  },
  type_identifier(path) {
    return path.node.text;
  },
  decimal_integer_literal(path) {
    return path.node.text;
  },
  decimal_floating_point_literal(path) {
    return path.node.text;
  },
  null_literal(path) {
    return path.node.text;
  },
  super(path) {
    return path.node.text;
  },
  character_literal(path) {
    return path.node.text;
  },
  underscore_pattern(path) {
    return path.node.text;
  },
  hex_integer_literal(path) {
    return path.node.text;
  },
  octal_integer_literal(path) {
    return path.node.text;
  },
  true(path) {
    return path.node.text;
  },
  false(path) {
    return path.node.text;
  },
  ...arrays,
  ...blocksAndStatements,
  ...classes,
  ...expressions,
  ...interfaces,
  ...lexicalStructure,
  ...names,
  ...packagesAndModules,
  ...typesValuesAndVariables
};

export function printerForNodeType<T extends SyntaxType>(
  type: T
): JavaNodePrinter<T> {
  const printer = printersByNodeType[type];
  if (!printer) {
    throw new Error("No printer found for node type: " + type);
  }
  return printer;
}
