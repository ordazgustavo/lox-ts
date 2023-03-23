import { Environment } from "./environment.js";
import { Interpreter } from "./interpreter.js";
import { LoxCallable } from "./lox-callable.js";
import { LoxInstance } from "./lox-instance.js";
import { Return } from "./return.js";
import { Fun } from "./stmt.js";
import { Obj } from "./token.js";

export class LoxFun extends LoxCallable {
  #declaration;
  #closure;
  #isInitializer;

  constructor(declaration: Fun, closure: Environment, isInitializer: boolean) {
    super();
    this.#declaration = declaration;
    this.#closure = closure;
    this.#isInitializer = isInitializer;
  }

  bind(instance: LoxInstance): LoxFun {
    const environment = new Environment(this.#closure);
    environment.define("this", instance);
    return new LoxFun(this.#declaration, environment, this.#isInitializer);
  }

  override arity(): number {
    return this.#declaration.params.length;
  }

  override call(interpreter: Interpreter, args: Obj[]): Obj {
    const environment = new Environment(this.#closure);

    for (let i = 0; i < this.#declaration.params.length; i++) {
      environment.define(this.#declaration.params[i]!.lexeme, args[i]!);
    }

    try {
      interpreter.executeBlock(this.#declaration.body, environment);
    } catch (returnValue) {
      if (this.#isInitializer) return this.#closure.getAt(0, "this");

      return (returnValue as Return).value;
    }

    if (this.#isInitializer) return this.#closure.getAt(0, "this");

    return null;
  }

  override toString(): string {
    return "<fn " + this.#declaration.name.lexeme + ">";
  }
}
