import { Environment } from "./environment.js";
import { Interpreter } from "./interpreter.js";
import { LoxCallable } from "./lox-callable.js";
import { Return } from "./return.js";
import { Fun } from "./stmt.js";
import { Obj } from "./token.js";

export class LoxFun extends LoxCallable {
  private declaration: Fun;
  private closure: Environment;

  constructor(declaration: Fun, closure: Environment) {
    super();
    this.declaration = declaration;
    this.closure = closure;
  }

  override arity(): number {
    return this.declaration.params.length;
  }

  override call(interpreter: Interpreter, args: Obj[]): Obj {
    const environment = new Environment(this.closure);

    for (let i = 0; i < this.declaration.params.length; i++) {
      environment.define(this.declaration.params[i]!.lexeme, args[i]!);
    }

    try {
      interpreter.executeBlock(this.declaration.body, environment);
    } catch (returnValue) {
      return (returnValue as Return).value;
    }

    return null;
  }

  override toString(): string {
    return "<fn " + this.declaration.name.lexeme + ">";
  }
}
