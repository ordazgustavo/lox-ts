import { RuntimeError } from "./runtime-error.js";
import { Obj, Token } from "./token.js";

export class Environment {
  enclosing;
  private values = new Map<string, Obj>();

  constructor(enclosing?: Environment) {
    this.enclosing = enclosing;
  }

  get(name: Token): Obj {
    if (this.values.has(name.lexeme)) {
      return this.values.get(name.lexeme)!;
    }

    if (this.enclosing !== undefined) return this.enclosing.get(name);

    throw new RuntimeError(name, "Undefined variable '" + name.lexeme + "'.");
  }

  assign(name: Token, value: Obj) {
    if (this.values.has(name.lexeme)) {
      this.values.set(name.lexeme, value);
      return;
    }

    if (this.enclosing != null) {
      this.enclosing.assign(name, value);
      return;
    }

    throw new RuntimeError(name, "Undefined variable '" + name.lexeme + "'.");
  }

  define(name: string, value: Obj) {
    this.values.set(name, value);
  }

  ancestor(distance: number): Environment | undefined {
    let environment: Environment | undefined = this;
    for (let i = 0; i < distance; i++) {
      environment = environment?.enclosing;
    }

    return environment;
  }

  getAt(distance: number, name: string): Obj {
    return this.ancestor(distance)?.values.get(name) ?? null;
  }

  assignAt(distance: number, name: Token, value: Obj) {
    this.ancestor(distance)?.values.set(name.lexeme, value);
  }
}
