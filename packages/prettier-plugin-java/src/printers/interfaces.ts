import type { Doc } from "prettier";
import { builders } from "prettier/doc";
import { isComment } from "../comments.js";
import { SyntaxType } from "../tree-sitter-java.js";
import {
  call,
  hasChild,
  indentInParentheses,
  onlyDefinedKey,
  printArrayInitializer,
  printBlock,
  printClassBodyDeclarations,
  printClassPermits,
  printVariableDeclaration,
  printWithModifiers,
  type JavaNodePrinters
} from "./helpers.js";

const { group, hardline, indent, join, line } = builders;

export default {
  interfaceDeclaration(path, print) {
    const declarationKey = onlyDefinedKey(path.node.children, [
      "annotationInterfaceDeclaration",
      "normalInterfaceDeclaration"
    ]);
    return printWithModifiers(
      path,
      print,
      "interfaceModifier",
      call(path, print, declarationKey),
      true
    );
  },

  interface_declaration(path, print) {
    const parts: Doc[] = [];

    const modifiersIndex = path.node.namedChildren.findIndex(
      ({ type }) => type === SyntaxType.Modifiers
    );
    if (modifiersIndex !== -1) {
      parts.push(path.call(print, "namedChildren", modifiersIndex));
    }

    parts.push("interface ", path.call(print, "nameNode"));

    const extendsInterfacesIndex = path.node.namedChildren.findIndex(
      ({ type }) => type === SyntaxType.ExtendsInterfaces
    );
    const hasExtendsInterfaces = extendsInterfacesIndex !== -1;
    const hasPermits = hasChild(path, "permitsNode");
    const hasMultipleClauses = hasExtendsInterfaces && hasPermits;

    const hasTypeParameters = hasChild(path, "type_parametersNode");
    if (hasTypeParameters) {
      const typeParameters = path.call(print, "type_parametersNode");
      parts.push(
        hasMultipleClauses ? group(indent(typeParameters)) : typeParameters
      );
    }

    if (hasExtendsInterfaces || hasPermits) {
      const separator = hasTypeParameters && !hasMultipleClauses ? " " : line;
      const clauses: Doc[] = [];
      if (hasExtendsInterfaces) {
        clauses.push(
          separator,
          path.call(print, "namedChildren", extendsInterfacesIndex)
        );
      }
      if (hasPermits) {
        clauses.push(separator, path.call(print, "permitsNode"));
      }
      const hasBody = path.node.bodyNode.namedChildCount > 0;
      const clauseGroup = [
        hasTypeParameters && !hasMultipleClauses ? clauses : indent(clauses),
        hasBody ? separator : " "
      ];
      parts.push(hasMultipleClauses ? clauseGroup : group(clauseGroup));
    } else {
      parts.push(" ");
    }
    return [group(parts), path.call(print, "bodyNode")];
  },

  extends_interfaces(path, print) {
    const typeListIndex = path.node.namedChildren.findIndex(
      ({ type }) => type === SyntaxType.TypeList
    );
    return group([
      "extends",
      indent([line, path.call(print, "namedChildren", typeListIndex)])
    ]);
  },

  interfacePermits: printClassPermits,

  interface_body(path, print) {
    return printBlock(path, printClassBodyDeclarations(path, print));
  },

  constant_declaration: printVariableDeclaration,

  interfaceMethodDeclaration(path, print) {
    const declaration = [
      call(path, print, "methodHeader"),
      path.node.children.methodBody[0].children.Semicolon ? "" : " ",
      call(path, print, "methodBody")
    ];
    return printWithModifiers(
      path,
      print,
      "interfaceMethodModifier",
      declaration
    );
  },

  annotation_type_declaration(path, print) {
    const parts: Doc[] = [];

    const modifiersIndex = path.node.namedChildren.findIndex(
      ({ type }) => type === SyntaxType.Modifiers
    );
    if (modifiersIndex !== -1) {
      parts.push(path.call(print, "namedChildren", modifiersIndex));
    }

    parts.push(
      "@interface ",
      path.call(print, "nameNode"),
      " ",
      path.call(print, "bodyNode")
    );

    return parts;
  },

  annotation_type_body(path, print) {
    const declarations: Doc[] = [];
    path.each(child => {
      if (!isComment(child.node)) {
        const declaration = print(child);
        declarations.push(
          declarations.length ? [hardline, declaration] : declaration
        );
      }
    }, "namedChildren");

    return printBlock(path, declarations);
  },

  annotation_type_element_declaration(path, print) {
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
      path.call(print, "nameNode"),
      "()"
    );

    if (hasChild(path, "dimensionsNode")) {
      parts.push(path.call(print, "dimensionsNode"));
    }

    if (hasChild(path, "valueNode")) {
      parts.push(" default ", path.call(print, "valueNode"));
    }

    parts.push(";");

    return parts;
  },

  annotation(path, print) {
    return [
      "@",
      path.call(print, "nameNode"),
      path.call(print, "argumentsNode")
    ];
  },

  marker_annotation(path, print) {
    return ["@", path.call(print, "nameNode")];
  },

  annotation_argument_list(path, print) {
    const args: Doc[] = [];
    path.each(child => {
      if (!isComment(child.node)) {
        args.push(print(child));
      }
    }, "namedChildren");

    return indentInParentheses(join([",", line], args));
  },

  element_value_pair(path, print) {
    return [path.call(print, "keyNode"), " = ", path.call(print, "valueNode")];
  },

  element_value_array_initializer: printArrayInitializer
} satisfies Partial<JavaNodePrinters>;
