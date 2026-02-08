import {
  printArrayInitializer,
  printList,
  type JavaNodePrinters
} from "./helpers.js";

export default {
  array_initializer: printArrayInitializer,

  variableInitializerList(path, print) {
    return printList(path, print, "variableInitializer");
  }
} satisfies Partial<JavaNodePrinters>;
