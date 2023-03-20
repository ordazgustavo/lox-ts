import { RuntimeError } from "./runtime-error.js";
import { TokenType } from "./token-type.js";
import { Token } from "./token.js";

export class ErrorReporter {
  hadError = false;
  hadRuntimeError = false;

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

  runtimeError(error: RuntimeError) {
    console.error(error.message + "\n[line " + error.token.line + "]");
    this.hadRuntimeError = true;
  }

  report(line: number, where: string, message: string) {
    console.error("[line " + line + "] Error" + where + ": " + message);
    this.hadError = true;
  }
}
