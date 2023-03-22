import { LoxCallable } from "./lox-callable.js";
import { TokenType } from "./token-type.js";

export type Obj = string | number | boolean | LoxCallable | null;

export class Token {
  type: TokenType;
  lexeme: string;
  literal: Obj;
  line: number;

  constructor(type: TokenType, lexeme: string, literal: Obj, line: number) {
    this.type = type;
    this.lexeme = lexeme;
    this.literal = literal;
    this.line = line;
  }

  display() {
    return this.type + " " + this.lexeme + " " + this.literal;
  }
}
