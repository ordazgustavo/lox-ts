import { LoxCallable } from "./lox-callable.js";
import { LoxClass } from "./lox-class.js";
import { LoxInstance } from "./lox-instance.js";
import { TokenType } from "./token-type.js";

export type Obj =
  | string
  | number
  | boolean
  | LoxCallable
  | LoxClass
  | LoxInstance
  | null;

export class Token {
  type;
  lexeme;
  literal;
  line;

  constructor(type: TokenType, lexeme: string, literal: Obj, line: number) {
    this.type = type;
    this.lexeme = lexeme;
    this.literal = literal;
    this.line = line;
  }

  display() {
    return `${this.type} ${this.lexeme} ${this.literal}`;
  }
}
