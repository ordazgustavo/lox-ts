import { Obj } from "./token.js";
import { LoxCallable } from "./lox-callable.js";
import { Interpreter } from "./interpreter.js";

export class Clock extends LoxCallable {
  override arity(): number {
    return 0;
  }

  override call(_interpreter: Interpreter, _args: Obj[]): Obj {
    return new Date().getTime() / 1000.0;
  }

  override toString(): string {
    return "<native fn>";
  }
}
