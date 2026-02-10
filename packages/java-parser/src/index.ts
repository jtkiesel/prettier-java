import { CharStream, CommonTokenStream } from "antlr4ng";
import { JavaLexer } from "./JavaLexer.js";
import { JavaParser } from "./JavaParser.js";

export function parse(input: string) {
  const start = performance.now();
  const lexer = new JavaLexer(CharStream.fromString(input));
  const tokens = new CommonTokenStream(lexer);
  const parser = new JavaParser(tokens);

  const tree = parser.compilationUnit();
  console.log(`${performance.now() - start}ms`);
  return tree;
}
