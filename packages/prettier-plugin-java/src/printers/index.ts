import arrays from "./arrays.js";
import blocksAndStatements from "./blocks-and-statements.js";
import classes from "./classes.js";
import expressions from "./expressions.js";
import type {
  JavaNodePrinter,
  JavaNodePrinters,
  JavaRuleName
} from "./helpers.js";
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
  CharacterLiteral(path) {
    return path.node.value;
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

export function printerForNodeType(type: JavaRuleName): JavaNodePrinter {
  const printer = printersByNodeType[type];
  if (!printer) {
    throw new Error("No printer found for node type: " + type);
  }
  return printer;
}
