import type { ImportDeclarationCstNode, IToken } from "java-parser";
import type { AstPath, Doc } from "prettier";
import { builders } from "prettier/doc";
import { isComment } from "../comments.js";
import {
  ExportsModuleDirectiveNode,
  OpensModuleDirectiveNode,
  SyntaxType
} from "../tree-sitter-java.js";
import {
  call,
  hasChild,
  lineEndWithComments,
  lineStartWithComments,
  map,
  printBlock,
  printDanglingComments,
  printSingle,
  type JavaNodePrinters,
  type JavaPrintFn
} from "./helpers.js";

const { group, hardline, indent, join, line } = builders;

export default {
  program(path, print) {
    const children: Doc[] = [];
    path.each(child => {
      if (!isComment(child.node)) {
        children.push(print(child));
      }
    }, "children");
    return [
      ...printDanglingComments(path),
      join([hardline, hardline], children),
      hardline
    ];
  },

  ordinaryCompilationUnit(path, print) {
    const { children } = path.node;
    const declarations: Doc[] = [];
    if (children.packageDeclaration) {
      declarations.push(call(path, print, "packageDeclaration"));
    }
    if (children.importDeclaration) {
      const staticCount = sortImports(children.importDeclaration);
      const importDeclarations = map(path, print, "importDeclaration").filter(
        doc => doc !== ""
      );
      const staticDeclarations = importDeclarations.slice(0, staticCount);
      const nonStaticDeclarations = importDeclarations.slice(staticCount);
      declarations.push(
        ...[staticDeclarations, nonStaticDeclarations]
          .filter(({ length }) => length)
          .map(declarations => join(hardline, declarations))
      );
    }
    if (children.typeDeclaration) {
      declarations.push(
        ...map(path, print, "typeDeclaration").filter(
          declaration => declaration !== ""
        )
      );
    }
    return join([hardline, hardline], declarations);
  },

  modularCompilationUnit(path, print) {
    const { children } = path.node;
    const declarations: Doc[] = [];
    if (children.importDeclaration) {
      const staticCount = sortImports(children.importDeclaration);
      const importDeclarations = map(path, print, "importDeclaration").filter(
        doc => doc !== ""
      );
      const staticDeclarations = importDeclarations.slice(0, staticCount);
      const nonStaticDeclarations = importDeclarations.slice(staticCount);
      declarations.push(
        ...[staticDeclarations, nonStaticDeclarations]
          .filter(({ length }) => length)
          .map(declarations => join(hardline, declarations))
      );
    }
    declarations.push(call(path, print, "moduleDeclaration"));
    return join([hardline, hardline], declarations);
  },

  package_declaration(path, print) {
    const annotations: Doc[] = [];
    const identifier: Doc[] = [];
    path.each(child => {
      switch (child.node.type) {
        case SyntaxType.Annotation:
        case SyntaxType.MarkerAnnotation:
          annotations.push(print(child));
          break;
        case SyntaxType.Identifier:
        case SyntaxType.ScopedIdentifier:
          identifier.push(print(child));
          break;
      }
    }, "namedChildren");
    return join(hardline, [...annotations, ["package ", ...identifier, ";"]]);
  },

  import_declaration(path, print) {
    const declaration: Doc[] = ["import "];

    if (path.node.children.some(({ type }) => type === "static")) {
      declaration.push("static ");
    }

    const identifierIndex = path.node.namedChildren.findIndex(
      ({ type }) =>
        type === SyntaxType.Identifier || type === SyntaxType.ScopedIdentifier
    );
    declaration.push(path.call(print, "namedChildren", identifierIndex));

    if (
      path.node.namedChildren.some(({ type }) => type === SyntaxType.Asterisk)
    ) {
      declaration.push(".*");
    }
    declaration.push(";");

    return declaration;
  },

  typeDeclaration(path, print) {
    return path.node.children.Semicolon ? "" : printSingle(path, print);
  },

  module_declaration(path, print) {
    const parts: Doc[] = [];

    path.each(child => {
      if (
        child.node.type === SyntaxType.Annotation ||
        child.node.type === SyntaxType.MarkerAnnotation
      ) {
        parts.push(print(child));
      }
    }, "namedChildren");

    if (path.node.children.some(({ type }) => type === "open")) {
      parts.push("open");
    }

    parts.push(
      "module",
      path.call(print, "nameNode"),
      path.call(print, "bodyNode")
    );

    return join(" ", parts);
  },

  module_body(path, print) {
    const moduleDirectives: Doc[] = [];
    path.each(child => {
      const { node, previous } = child;
      if (isComment(node)) {
        return;
      }

      const directive = print(child);
      moduleDirectives.push(
        previous &&
          lineStartWithComments(node) > lineEndWithComments(previous) + 1
          ? [hardline, directive]
          : directive
      );
    }, "namedChildren");

    return printBlock(path, moduleDirectives);
  },

  moduleDirective: printSingle,

  requires_module_directive(path, print) {
    const parts: Doc[] = ["requires"];

    path.each(child => {
      if (
        child.node.type === SyntaxType.Annotation ||
        child.node.type === SyntaxType.MarkerAnnotation
      ) {
        parts.push(print(child));
      }
    }, "namedChildren");

    parts.push(path.call(print, "moduleNode"));

    return [...join(" ", parts), ";"];
  },

  exports_module_directive: printToModuleNamesDirective,
  opens_module_directive: printToModuleNamesDirective,

  uses_module_directive(path, print) {
    return ["uses ", path.call(print, "typeNode"), ";"];
  },

  provides_module_directive(path, print) {
    const providers = path.map(print, "providerNodes");
    return [
      "provides ",
      path.call(print, "providedNode"),
      group(
        indent([
          line,
          group(indent(["with", line, ...join([",", line], providers)]))
        ])
      ),
      ";"
    ];
  }
} satisfies Partial<JavaNodePrinters>;

function sortImports(importDeclarations: ImportDeclarationCstNode[]) {
  importDeclarations.sort(({ children: a }, { children: b }) => {
    if (a.Static && !b.Static) {
      return -1;
    } else if (b.Static && !a.Static) {
      return 1;
    }
    if (!b.packageOrTypeName) {
      if (a.packageOrTypeName) {
        return -1;
      }
      return 0;
    } else if (!a.packageOrTypeName) {
      return 1;
    }
    return compareFqn(a.packageOrTypeName[0], b.packageOrTypeName[0]);
  });

  return importDeclarations.reduce(
    (staticCount, importDeclaration) =>
      importDeclaration.children.Static ? staticCount + 1 : staticCount,
    0
  );
}

function compareFqn(
  a: { children: { Identifier: IToken[] } },
  b: { children: { Identifier: IToken[] } }
) {
  const identifiersA = a.children.Identifier;
  const identifiersB = b.children.Identifier;

  const minParts = Math.min(identifiersA.length, identifiersB.length);
  for (let i = 0; i < minParts; i++) {
    const imageA = identifiersA[i].image;
    const imageB = identifiersB[i].image;
    if (imageA < imageB) {
      return -1;
    } else if (imageA > imageB) {
      return 1;
    }
  }

  return identifiersA.length - identifiersB.length;
}

function printToModuleNamesDirective(
  path: AstPath<ExportsModuleDirectiveNode | OpensModuleDirectiveNode>,
  print: JavaPrintFn
) {
  const prefix =
    path.node.type === SyntaxType.ExportsModuleDirective ? "exports" : "opens";
  const directive = [prefix, " ", path.call(print, "packageNode")];
  if (hasChild(path, "modulesNodes")) {
    const moduleNames = join([",", line], path.map(print, "modulesNodes"));
    directive.push(
      group(indent([line, group(indent(["to", line, ...moduleNames]))]))
    );
  }
  directive.push(";");
  return directive;
}
