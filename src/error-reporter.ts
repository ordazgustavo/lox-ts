import { TokenType } from "./token-type.js";
import { Token } from "./token.js";

export class ErrorReporter {
  hadError = false;

  scannerError(line: number, message: string) {
    this.report(line, "", message);
  }

  parserError(token: Token, message: string) {
    if (token.type == TokenType.EOF) {
      this.report(token.line, " at end", message);
    } else {
      this.report(token.line, " at '" + token.lexeme + "'", message);
    }
  }

  report(line: number, where: string, message: string) {
    console.error("[line " + line + "] Error" + where + ": " + message);
    this.hadError = true;
  }
}
