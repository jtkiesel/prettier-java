import type { Doc } from "prettier";
import { builders } from "prettier/doc";
import { isComment } from "../comments.js";
import { SyntaxType } from "../tree-sitter-java.js";
import {
  call,
  definedKeys,
  each,
  hasChild,
  hasDeclarationAnnotations,
  hasLeadingComments,
  indentInParentheses,
  lineEndWithComments,
  lineStartWithComments,
  map,
  onlyDefinedKey,
  printBlock,
  printClassBodyDeclarations,
  printClassType,
  printDanglingComments,
  printSingle,
  printVariableDeclaration,
  printWithModifiers,
  type JavaNodePrinters
} from "./helpers.js";

const { group, hardline, indent, indentIfBreak, join, line, softline } =
  builders;

export default {
  class_declaration(path, print) {
    const definedClauses = definedKeys(path.node, [
      "superclassNode",
      "interfacesNode",
      "permitsNode"
    ]);
    const hasMultipleClauses = definedClauses.length > 1;
    const hasTypeParameters = hasChild(path, "type_parametersNode");
    const parts: Doc[] = [];

    const modifiersIndex = path.node.namedChildren.findIndex(
      ({ type }) => type === SyntaxType.Modifiers
    );
    if (modifiersIndex !== -1) {
      parts.push(path.call(print, "namedChildren", modifiersIndex));
    }

    parts.push("class ", path.call(print, "nameNode"));
    if (hasTypeParameters) {
      const typeParameters = path.call(print, "type_parametersNode");
      parts.push(
        hasMultipleClauses ? group(indent(typeParameters)) : typeParameters
      );
    }
    if (definedClauses.length) {
      const separator = hasTypeParameters && !hasMultipleClauses ? " " : line;
      const clauses = definedClauses.flatMap(clause =>
        hasChild(path, clause) ? [separator, path.call(print, clause)] : []
      );
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

  type_parameters(path, print) {
    const typeParameters: Doc[] = [];
    path.each(child => {
      if (child.node.type === SyntaxType.TypeParameter) {
        typeParameters.push(print(child));
      }
    }, "namedChildren");
    return group([
      "<",
      indent([softline, join([",", line], typeParameters)]),
      softline,
      ">"
    ]);
  },

  superclass(path, print) {
    const typeIndex = path.node.namedChildren.findIndex(
      child => !isComment(child)
    );
    return ["extends ", path.call(print, "namedChildren", typeIndex)];
  },

  super_interfaces(path, print) {
    const typeListIndex = path.node.namedChildren.findIndex(
      ({ type }) => type === SyntaxType.TypeList
    );
    return group([
      "implements",
      indent([line, path.call(print, "namedChildren", typeListIndex)])
    ]);
  },

  permits(path, print) {
    const typeListIndex = path.node.namedChildren.findIndex(
      ({ type }) => type === SyntaxType.TypeList
    );
    return group([
      "permits",
      indent([line, path.call(print, "namedChildren", typeListIndex)])
    ]);
  },

  type_list(path, print) {
    const types: Doc[] = [];

    path.each(child => {
      if (!isComment(child.node)) {
        types.push(print(child));
      }
    }, "namedChildren");

    return join([",", line], types);
  },

  class_body(path, print) {
    return printBlock(path, printClassBodyDeclarations(path, print));
  },

  classMemberDeclaration(path, print) {
    const { children } = path.node;
    return children.Semicolon
      ? ""
      : call(path, print, onlyDefinedKey(children));
  },

  field_declaration: printVariableDeclaration,

  variable_declarator(path, print) {
    const declarator = [path.call(print, "nameNode")];
    if (hasChild(path, "dimensionsNode")) {
      declarator.push(path.call(print, "dimensionsNode"));
    }
    if (!hasChild(path, "valueNode")) {
      return declarator;
    }
    declarator.push(" =");
    const value = path.call(print, "valueNode");
    if (
      path.node.valueNode.type === SyntaxType.BinaryExpression ||
      hasLeadingComments(path.node.valueNode)
    ) {
      declarator.push(group(indent([line, value])));
    } else {
      const groupId = Symbol("assignment");
      declarator.push(
        group(indent(line), { id: groupId }),
        indentIfBreak(value, { groupId })
      );
    }
    return group(declarator);
  },

  variableDeclaratorId(path, print) {
    const { dims, Underscore } = path.node.children;
    if (Underscore) {
      return "_";
    }
    const identifier = call(path, print, "Identifier");
    return dims ? [identifier, call(path, print, "dims")] : identifier;
  },

  variableInitializer: printSingle,
  unannType: printSingle,

  unannPrimitiveTypeWithOptionalDimsSuffix(path, print) {
    const type = call(path, print, "unannPrimitiveType");
    return path.node.children.dims ? [type, call(path, print, "dims")] : type;
  },

  unannPrimitiveType: printSingle,

  unannReferenceType(path, print) {
    const type = call(path, print, "unannClassOrInterfaceType");
    return path.node.children.dims ? [type, call(path, print, "dims")] : type;
  },

  unannClassOrInterfaceType: printSingle,
  unannClassType: printClassType,
  unannInterfaceType: printSingle,
  unannTypeVariable: printSingle,

  method_declaration(path, print) {
    const declaration: Doc[] = [];

    const modifiersIndex = path.node.namedChildren.findIndex(
      ({ type }) => type === SyntaxType.Modifiers
    );
    if (modifiersIndex !== -1) {
      declaration.push(path.call(print, "namedChildren", modifiersIndex));
    }

    if (hasChild(path, "type_parametersNode")) {
      declaration.push(path.call(print, "type_parametersNode"), " ");
    }

    declaration.push(path.call(print, "typeNode"));

    if (hasChild(path, "dimensionsNode")) {
      declaration.push(path.call(print, "dimensionsNode"));
    }

    declaration.push(
      " ",
      path.call(print, "nameNode"),
      path.call(print, "parametersNode")
    );

    const throwsIndex = path.node.children.findIndex(
      ({ type }) => type === SyntaxType.Throws
    );
    if (throwsIndex !== -1) {
      declaration.push(
        group(indent([line, path.call(print, "children", throwsIndex)]))
      );
    }

    if (hasChild(path, "bodyNode")) {
      declaration.push(" ", path.call(print, "bodyNode"));
    } else {
      declaration.push(";");
    }

    return declaration;
  },

  methodDeclaration(path, print) {
    const declaration = [
      call(path, print, "methodHeader"),
      path.node.children.methodBody[0].children.Semicolon ? "" : " ",
      call(path, print, "methodBody")
    ];
    return printWithModifiers(path, print, "methodModifier", declaration);
  },

  methodModifier: printSingle,

  methodHeader(path, print) {
    const { typeParameters, annotation, throws } = path.node.children;
    const header: Doc[] = [];
    if (typeParameters) {
      header.push(group(call(path, print, "typeParameters")));
    }
    if (annotation) {
      header.push(join(line, map(path, print, "annotation")));
    }
    header.push(
      call(path, print, "result"),
      call(path, print, "methodDeclarator")
    );
    return throws
      ? group([
          ...join(" ", header),
          group(indent([line, call(path, print, "throws")]))
        ])
      : group(join(" ", header));
  },

  result: printSingle,

  methodDeclarator(path, print) {
    const { dims, formalParameterList, receiverParameter } = path.node.children;
    const declarator = [call(path, print, "Identifier")];
    const parameters: Doc[] = [];
    if (receiverParameter) {
      parameters.push(call(path, print, "receiverParameter"));
    }
    if (formalParameterList) {
      parameters.push(call(path, print, "formalParameterList"));
    }
    const items = parameters.length
      ? join([",", line], parameters)
      : printDanglingComments(path);
    declarator.push(items.length ? indentInParentheses(items) : "()");
    if (dims) {
      declarator.push(call(path, print, "dims"));
    }
    return declarator;
  },

  receiver_parameter(path, print) {
    const parts: Doc[] = [];
    path.each(child => {
      if (!isComment(child.node)) {
        parts.push(
          print(child),
          child.node.type === SyntaxType.Identifier ? "." : " "
        );
      }
    }, "namedChildren");

    parts.push("this");

    return parts;
  },

  formal_parameters(path, print) {
    const parameters: Doc[] = [];
    path.each(child => {
      if (!isComment(child.node)) {
        parameters.push(print(child));
      }
    }, "namedChildren");
    return ["(", ...join([",", line], parameters), ")"];
  },

  formal_parameter(path, print) {
    const parameter: Doc[] = [];

    const modifiersIndex = path.node.namedChildren.findIndex(
      ({ type }) => type === SyntaxType.Modifiers
    );
    if (modifiersIndex !== -1) {
      parameter.push(path.call(print, "namedChildren", modifiersIndex));
    }

    parameter.push(
      path.call(print, "typeNode"),
      " ",
      path.call(print, "nameNode")
    );

    return parameter;
  },

  spread_parameter(path, print) {
    const parts: Doc[] = [];

    const modifiersIndex = path.node.namedChildren.findIndex(
      ({ type }) => type === SyntaxType.Modifiers
    );
    if (modifiersIndex !== -1) {
      parts.push(path.call(print, "namedChildren", modifiersIndex));
    }

    path.each(child => {
      if (!isComment(child.node)) {
        parts.push(print(child));
      }
    }, "namedChildren");

    const variableDeclaratorIndex = path.node.namedChildren.findIndex(
      ({ type }) => type === SyntaxType.VariableDeclarator
    );
    return [
      join(" ", parts),
      "... ",
      path.call(print, "namedChildren", variableDeclaratorIndex)
    ];
  },

  throws(path, print) {
    const types: Doc[] = [];

    path.each(child => {
      if (!isComment(child.node)) {
        types.push(print(child));
      }
    }, "namedChildren");

    return ["throws ", ...join(", ", types)];
  },

  methodBody: printSingle,
  instanceInitializer: printSingle,

  staticInitializer(path, print) {
    return ["static ", call(path, print, "block")];
  },

  constructor_declaration(path, print) {
    const declaration: Doc[] = [];

    const modifiersIndex = path.node.namedChildren.findIndex(
      ({ type }) => type === SyntaxType.Modifiers
    );
    if (modifiersIndex !== -1) {
      declaration.push(path.call(print, "namedChildren", modifiersIndex));
    }

    if (hasChild(path, "type_parametersNode")) {
      declaration.push(path.call(print, "type_parametersNode"), " ");
    }

    declaration.push(
      path.call(print, "nameNode"),
      path.call(print, "parametersNode")
    );

    const throwsIndex = path.node.children.findIndex(
      ({ type }) => type === SyntaxType.Throws
    );
    if (throwsIndex !== -1) {
      declaration.push(
        group(indent([line, path.call(print, "children", throwsIndex)]))
      );
    }

    declaration.push(" ", path.call(print, "bodyNode"));

    return declaration;
  },

  simpleTypeName: printSingle,

  constructor_body(path, print) {
    const statements: Doc[] = [];

    path.each(child => {
      if (!isComment(child.node)) {
        statements.push(print(child));
      }
    }, "namedChildren");

    return printBlock(path, statements);
  },

  explicit_constructor_invocation(path, print) {
    const invocation: Doc[] = [];

    if (hasChild(path, "objectNode")) {
      invocation.push(path.call(print, "objectNode"), ".");
    }

    if (hasChild(path, "type_argumentsNode")) {
      invocation.push(path.call(print, "type_argumentsNode"));
    }

    invocation.push(
      path.call(print, "constructorNode"),
      path.call(print, "argumentsNode"),
      ";"
    );

    return invocation;
  },

  modifiers(path, print, { noTypeAnnotations = false }) {
    const declarationAnnotations: Doc[] = [];
    const otherModifiers: string[] = [];
    const typeAnnotations: Doc[] = [];

    path.each(modifierPath => {
      const { type } = modifierPath.node;
      if (
        type === SyntaxType.Annotation ||
        type === SyntaxType.MarkerAnnotation
      ) {
        (otherModifiers.length ? typeAnnotations : declarationAnnotations).push(
          print(modifierPath)
        );
      } else {
        otherModifiers.push(type);
        declarationAnnotations.push(...typeAnnotations);
        typeAnnotations.length = 0;
      }
    }, "children");

    if (noTypeAnnotations) {
      declarationAnnotations.push(...typeAnnotations);
      typeAnnotations.length = 0;
    }

    otherModifiers.sort(
      (a, b) => (indexByModifier.get(a) ?? -1) - (indexByModifier.get(b) ?? -1)
    );

    const typeModifiers = join(" ", [...otherModifiers, ...typeAnnotations]);
    if (typeModifiers.length) {
      typeModifiers.push(" ");
    }

    return join(hardline, [...declarationAnnotations, typeModifiers]);
  },

  enum_declaration(path, print) {
    const parts: Doc[] = [];

    const modifiersIndex = path.node.namedChildren.findIndex(
      ({ type }) => type === SyntaxType.Modifiers
    );
    if (modifiersIndex !== -1) {
      parts.push(path.call(print, "namedChildren", modifiersIndex));
    }

    parts.push("enum ", path.call(print, "nameNode"));
    if (hasChild(path, "interfacesNode")) {
      const hasBody = path.node.bodyNode.childCount > 0;
      parts.push(
        indent([line, path.call(print, "interfacesNode")]),
        hasBody ? line : " "
      );
    } else {
      parts.push(" ");
    }
    return [group(parts), path.call(print, "bodyNode")];
  },

  enum_body(path, print, options) {
    const enumConstants: Doc[] = [];
    path.each(child => {
      if (child.node.type === SyntaxType.EnumConstant) {
        enumConstants.push(print(child));
      }
    }, "children");

    const enumBodyDeclarationsIndex = path.node.children.findIndex(
      ({ type }) => type === SyntaxType.EnumBodyDeclarations
    );
    const hasDeclarations =
      enumBodyDeclarationsIndex !== -1 &&
      path.node.children[enumBodyDeclarationsIndex].namedChildCount > 0;

    const contents: Doc[] = [];
    if (enumConstants.length) {
      contents.push(join([",", hardline], enumConstants));
      if (!hasDeclarations && options.trailingComma !== "none") {
        contents.push(",");
      }
    }
    if (hasDeclarations) {
      contents.push(
        ";",
        hardline,
        hardline,
        path.call(print, "children", enumBodyDeclarationsIndex)
      );
    }
    return printBlock(path, contents.length ? [contents] : []);
  },

  enumConstantList(path, print) {
    return join(
      [",", hardline],
      map(
        path,
        constantPath => {
          const constant = print(constantPath);
          const { node, previous } = constantPath;
          return !previous ||
            lineStartWithComments(node) <= lineEndWithComments(previous) + 1
            ? constant
            : [hardline, constant];
        },
        "enumConstant"
      )
    );
  },

  enum_constant(path, print) {
    const initializer: Doc[] = [];
    const modifiersIndex = path.node.namedChildren.findIndex(
      ({ type }) => type === SyntaxType.Modifiers
    );
    if (modifiersIndex !== -1) {
      initializer.push(path.call(print, "namedChildren", modifiersIndex));
    }
    initializer.push(path.call(print, "nameNode"));
    if (hasChild(path, "argumentsNode")) {
      initializer.push(path.call(print, "argumentsNode"));
    }
    if (hasChild(path, "bodyNode")) {
      initializer.push(" ", path.call(print, "bodyNode"));
    }
    return initializer;
  },

  enum_body_declarations(path, print) {
    return join(hardline, printClassBodyDeclarations(path, print));
  },

  record_declaration(path, print) {
    const parts: Doc[] = [];

    const modifiersIndex = path.node.namedChildren.findIndex(
      ({ type }) => type === SyntaxType.Modifiers
    );
    if (modifiersIndex !== -1) {
      parts.push(path.call(print, "namedChildren", modifiersIndex));
    }

    parts.push("record ", path.call(print, "nameNode"));

    if (hasChild(path, "type_parametersNode")) {
      parts.push(group(path.call(print, "type_parametersNode")));
    }

    parts.push(path.call(print, "parametersNode"));

    if (hasChild(path, "interfacesNode")) {
      const hasParameters = path.node.parametersNode.namedChildCount > 0;
      const hasBody = path.node.bodyNode.namedChildCount > 0;
      const interfaces = [
        hasParameters ? " " : line,
        path.call(print, "interfacesNode")
      ];
      parts.push(
        group([
          hasParameters ? interfaces : indent(interfaces),
          hasBody ? line : " "
        ])
      );
    } else {
      parts.push(" ");
    }

    return [group(parts), path.call(print, "bodyNode")];
  },

  variableArityRecordComponent(path, print) {
    return [
      ...join(" ", map(path, print, "annotation")),
      "... ",
      call(path, print, "Identifier")
    ];
  },

  recordComponentModifier: printSingle,

  recordBody(path, print) {
    const declarations: Doc[] = [];
    let previousRequiresPadding = false;
    each(
      path,
      declarationPath => {
        const declaration = print(declarationPath);
        if (declaration === "") {
          return;
        }
        const { node, previous } = declarationPath;
        const fieldDeclaration =
          node.children.classBodyDeclaration?.[0].children
            .classMemberDeclaration?.[0].children.fieldDeclaration?.[0]
            .children;
        const currentRequiresPadding =
          !fieldDeclaration ||
          hasDeclarationAnnotations(fieldDeclaration.fieldModifier ?? []);
        const blankLine =
          declarations.length > 0 &&
          (previousRequiresPadding ||
            currentRequiresPadding ||
            lineStartWithComments(node) > lineEndWithComments(previous!) + 1);
        declarations.push(blankLine ? [hardline, declaration] : declaration);
        previousRequiresPadding = currentRequiresPadding;
      },
      "recordBodyDeclaration"
    );
    return printBlock(path, declarations);
  },

  recordBodyDeclaration: printSingle,

  compact_constructor_declaration(path, print) {
    const parts: Doc[] = [];

    const modifiersIndex = path.node.namedChildren.findIndex(
      ({ type }) => type === SyntaxType.Modifiers
    );
    if (modifiersIndex !== -1) {
      parts.push(path.call(print, "namedChildren", modifiersIndex));
    }

    parts.push(path.call(print, "nameNode"), " ", path.call(print, "bodyNode"));

    return parts;
  }
} satisfies Partial<JavaNodePrinters>;

const indexByModifier = [
  "public",
  "protected",
  "private",
  "abstract",
  "default",
  "static",
  "final",
  "transient",
  "volatile",
  "synchronized",
  "native",
  "sealed",
  "non-sealed",
  "strictfp"
].reduce((map, name, index) => map.set(name, index), new Map<string, number>());
