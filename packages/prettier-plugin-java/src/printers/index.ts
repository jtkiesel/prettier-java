import arrays from "./arrays.js";
import blocksAndStatements from "./blocks-and-statements.js";
import classes from "./classes.js";
import expressions from "./expressions.js";
import type {
  JavaNodePrinter,
  JavaNodePrinters,
  JavaNodeType
} from "./helpers.js";
import interfaces from "./interfaces.js";
import lexicalStructure from "./lexical-structure.js";
import names from "./names.js";
import packagesAndModules from "./packages-and-modules.js";
import typesValuesAndVariables from "./types-values-and-variables.js";

const printersByNodeType: JavaNodePrinters = {
  ERROR(path) {
    throw new Error(`Failed to parse: "${path.node.value}"`);
  },
  this(path) {
    return path.node.value;
  },
  type_identifier(path) {
    return path.node.value;
  },
  null_literal(path) {
    return path.node.value;
  },
  super(path) {
    return path.node.value;
  },
  underscore_pattern(path) {
    return path.node.value;
  },
  asterisk(path) {
    return path.node.value;
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

export function printerForNodeType<T extends JavaNodeType>(
  type: T
): JavaNodePrinter<T> {
  const printer = printersByNodeType[type];
  if (!printer) {
    throw new Error("No printer found for node type: " + type);
  }
  return printer;
}
