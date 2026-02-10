import { Parser, type TokenStream } from "antlr4ng";

import { JavaParser, RecordComponentListContext } from "./JavaParser.js";

export abstract class JavaParserBase extends Parser {
  constructor(input: TokenStream) {
    super(input);
  }

  public DoLastRecordComponent(): boolean {
    const ctx = this.context;

    if (!(ctx instanceof RecordComponentListContext)) {
      return true; // or throw if unexpected
    }

    const rcs = ctx.recordComponent();
    if (rcs.length === 0) return true;

    const count = rcs.length;
    for (let c = 0; c < count; ++c) {
      const rc = rcs[c];
      if (rc.ELLIPSIS() !== null && c + 1 < count) {
        return false;
      }
    }
    return true;
  }

  public IsNotIdentifierAssign(): boolean {
    const la = this.inputStream.LA(1);

    switch (la) {
      case JavaParser.IDENTIFIER:
      case JavaParser.MODULE:
      case JavaParser.OPEN:
      case JavaParser.REQUIRES:
      case JavaParser.EXPORTS:
      case JavaParser.OPENS:
      case JavaParser.TO:
      case JavaParser.USES:
      case JavaParser.PROVIDES:
      case JavaParser.WHEN:
      case JavaParser.WITH:
      case JavaParser.TRANSITIVE:
      case JavaParser.YIELD:
      case JavaParser.SEALED:
      case JavaParser.PERMITS:
      case JavaParser.RECORD:
      case JavaParser.VAR:
        break;
      default:
        return true;
    }

    const la2 = this.inputStream.LA(2);
    return la2 !== JavaParser.ASSIGN;
  }
}
