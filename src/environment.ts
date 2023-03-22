import { RuntimeError } from "./runtime-error.js";
import { Obj, Token } from "./token.js";

export class Environment {
  enclosing: Environment | null;
  private values = new Map<string, Obj>();

  constructor(enclosing?: Environment) {
    this.enclosing = enclosing ?? null;
  }

  get(name: Token): Obj {
    if (this.values.has(name.lexeme)) {
      return this.values.get(name.lexeme)!;
    }

    if (this.enclosing !== null) return this.enclosing.get(name);

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

  ancestor(distance: number): Environment | null {
    let environment: Environment | null = this;
    for (let i = 0; i < distance; i++) {
      environment = environment?.enclosing ?? null;
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
