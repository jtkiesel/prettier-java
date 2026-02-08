import { Doc } from "prettier";
import { builders } from "prettier/doc";
import { isComment } from "../comments.js";
import {
  call,
  map,
  onlyDefinedKey,
  printClassType,
  printSingle,
  type JavaNodePrinters
} from "./helpers.js";

const { group, indent, join, line, softline } = builders;

export default {
  boolean_type(path) {
    return path.node.text;
  },

  integral_type(path) {
    return path.node.text;
  },

  floating_point_type(path) {
    return path.node.text;
  },

  void_type(path) {
    return path.node.text;
  },

  referenceType(path, print) {
    const { children } = path.node;
    const typeKey = onlyDefinedKey(children, [
      "primitiveType",
      "classOrInterfaceType"
    ]);
    const type = call(path, print, typeKey);
    return join(" ", [
      ...map(path, print, "annotation"),
      children.dims ? [type, call(path, print, "dims")] : type
    ]);
  },

  array_type(path, print) {
    return [
      path.call(print, "elementNode"),
      path.call(print, "dimensionsNode")
    ];
  },

  classOrInterfaceType: printSingle,
  classType: printClassType,
  interfaceType: printSingle,

  typeVariable(path, print) {
    return join(" ", [
      ...map(path, print, "annotation"),
      call(path, print, "Identifier")
    ]);
  },

  dimensions(path, print) {
    const parts: Doc[] = [];
    path.each(child => {
      if (isComment(child.node)) {
        return;
      }

      if (child.node.isNamed) {
        parts.push(print(child), " ");
      } else {
        parts.push(child.node.text);
      }
    }, "children");

    return parts;
  },

  type_parameter(path, print) {
    const parameter: Doc = [];

    path.each(child => {
      if (!isComment(child.node)) {
        parameter.push(print(child));
      }
    }, "children");

    return join(" ", parameter);
  },

  type_bound(path, print) {
    const types: Doc[] = [];

    path.each(child => {
      if (!isComment(child.node)) {
        types.push(print(child));
      }
    }, "namedChildren");

    return types.length === 1
      ? ["extends ", types[0]]
      : group(indent(["extends", line, ...join(["&", line], types)]));
  },

  type_arguments(path, print) {
    const types: Doc[] = [];

    path.each(child => {
      if (!isComment(child.node)) {
        types.push(print(child));
      }
    }, "namedChildren");

    return types.length
      ? group([
          "<",
          indent([softline, join([",", line], types)]),
          softline,
          ">"
        ])
      : "<>";
  },

  wildcard(path, print) {
    const wildcard = [...map(path, print, "annotation"), "?"];
    if (path.node.children.wildcardBounds) {
      wildcard.push(call(path, print, "wildcardBounds"));
    }
    return join(" ", wildcard);
  },

  wildcardBounds(path, print) {
    return [
      path.node.children.Extends ? "extends" : "super",
      " ",
      call(path, print, "referenceType")
    ];
  }
} satisfies Partial<JavaNodePrinters>;
