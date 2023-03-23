import { Interpreter } from "./interpreter.js";
import { LoxCallable } from "./lox-callable.js";
import { LoxFun } from "./lox-fun.js";
import { LoxInstance } from "./lox-instance.js";
import { Obj } from "./token.js";

export class LoxClass extends LoxCallable {
  name;
  #methods;

  constructor(name: string, methods: Map<string, LoxFun>) {
    super();
    this.name = name;
    this.#methods = methods;
  }

  findMethod(name: string): LoxFun | undefined {
    if (this.#methods.has(name)) {
      return this.#methods.get(name);
    }
    return;
  }

  override toString() {
    return this.name;
  }

  override arity(): number {
    const initializer = this.findMethod("init");
    if (!initializer) return 0;
    return initializer.arity();
  }

  override call(interpreter: Interpreter, args: Obj[]): Obj {
    const instance = new LoxInstance(this);
    const initializer = this.findMethod("init");
    if (initializer) {
      initializer.bind(instance).call(interpreter, args);
    }
    return instance;
  }
}
