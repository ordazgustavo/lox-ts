import { Interpreter } from "./interpreter.js";
import { Obj } from "./token.js";

export abstract class LoxCallable {
  abstract arity(): number;
  abstract call(interpreter: Interpreter, args: Obj[]): Obj;
}
