import { LoxClass } from "./lox-class.js";
import { RuntimeError } from "./runtime-error.js";
import { Obj, Token } from "./token.js";

export class LoxInstance {
  #klass;
  #fields = new Map<string, Obj>();

  constructor(klass: LoxClass) {
    this.#klass = klass;
  }

  get(name: Token): Obj {
    if (this.#fields.has(name.lexeme)) {
      return this.#fields.get(name.lexeme)!;
    }

    const method = this.#klass.findMethod(name.lexeme);
    if (method) return method.bind(this);

    throw new RuntimeError(name, `Undefined property '${name.lexeme}'.`);
  }

  set(name: Token, value: Obj) {
    this.#fields.set(name.lexeme, value);
  }

  toString(): string {
    return this.#klass.name + " instance";
  }
}
