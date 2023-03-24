import { Obj, Token } from "./token.js";
import * as Expr from "./expr.js";
import { TokenType } from "./token-type.js";
import { RuntimeError } from "./runtime-error.js";
import { ErrorReporter } from "./error-reporter.js";
import * as Stmt from "./stmt.js";
import { Environment } from "./environment.js";
import { LoxCallable } from "./lox-callable.js";
import { Clock } from "./clock.js";
import { LoxFun } from "./lox-fun.js";
import { Return } from "./return.js";
import { LoxClass } from "./lox-class.js";
import { LoxInstance } from "./lox-instance.js";

export class Interpreter implements Expr.Visitor<Obj>, Stmt.Visitor<void> {
  #errorReporter: ErrorReporter;

  globals = new Environment();
  #environment = this.globals;
  #locals: WeakMap<Expr.Expr, number> = new WeakMap();

  constructor(errorReporter: ErrorReporter) {
    this.#errorReporter = errorReporter;

    this.globals.define("clock", new Clock());
  }

  interpret(statements: Stmt.Stmt[]) {
    try {
      for (const stmt of statements) {
        this.#execute(stmt);
      }
    } catch (error) {
      this.#errorReporter.runtimeError(error as RuntimeError);
    }
  }

  #evaluate(expr: Expr.Expr): Obj {
    return expr.accept(this);
  }

  #execute(stmt: Stmt.Stmt) {
    stmt.accept(this);
  }

  resolve(expr: Expr.Expr, depth: number) {
    this.#locals.set(expr, depth);
  }

  executeBlock(statements: Stmt.Stmt[], environment: Environment) {
    const previous = this.#environment;
    try {
      this.#environment = environment;

      for (const statement of statements) {
        this.#execute(statement);
      }
    } finally {
      this.#environment = previous;
    }
  }

  visitBlockStmt(stmt: Stmt.Block) {
    this.executeBlock(stmt.statements, new Environment(this.#environment));
  }

  visitClassStmt(stmt: Stmt.Class) {
    let superclass: Obj | null = null;
    if (stmt.superclass !== null) {
      superclass = this.#evaluate(stmt.superclass);
      if (!(superclass instanceof LoxClass)) {
        throw new RuntimeError(
          stmt.superclass.name,
          "Superclass must be a class."
        );
      }
    }

    this.#environment.define(stmt.name.lexeme, null);

    if (stmt.superclass !== null) {
      this.#environment = new Environment(this.#environment);
      this.#environment.define("super", superclass);
    }

    const methods = new Map<string, LoxFun>();
    for (const method of stmt.methods) {
      const fun = new LoxFun(
        method,
        this.#environment,
        method.name.lexeme === "init"
      );
      methods.set(method.name.lexeme, fun);
    }

    const klass = new LoxClass(stmt.name.lexeme, superclass, methods);

    if (superclass !== null) {
      this.#environment = this.#environment.enclosing!;
    }

    this.#environment.assign(stmt.name, klass);
  }

  visitExpressionStmt(stmt: Stmt.Expression) {
    this.#evaluate(stmt.expression);
  }

  visitFunStmt(stmt: Stmt.Fun) {
    const fun = new LoxFun(stmt, this.#environment, false);
    this.#environment.define(stmt.name.lexeme, fun);
  }

  visitIfStmt(stmt: Stmt.If) {
    if (this.#isTruthy(this.#evaluate(stmt.condition))) {
      this.#execute(stmt.thenBranch);
    } else if (stmt.elseBranch !== null) {
      this.#execute(stmt.elseBranch);
    }
  }

  visitPrintStmt(stmt: Stmt.Print) {
    const value = this.#evaluate(stmt.expression);
    console.log(this.#stringify(value));
  }

  visitReturnStmt(stmt: Stmt.Return) {
    let value = null;
    if (stmt.value !== null) value = this.#evaluate(stmt.value);

    throw new Return(value);
  }

  visitVarStmt(stmt: Stmt.Var) {
    let value = null;
    if (stmt.initializer !== null) {
      value = this.#evaluate(stmt.initializer);
    }

    this.#environment.define(stmt.name.lexeme, value);
  }

  visitWhileStmt(stmt: Stmt.While) {
    while (this.#isTruthy(this.#evaluate(stmt.condition))) {
      this.#execute(stmt.body);
    }
  }

  visitAssignExpr(expr: Expr.Assign): Obj {
    const value = this.#evaluate(expr.value);
    const distance = this.#locals.get(expr);
    if (distance !== undefined) {
      this.#environment.assignAt(distance, expr.name, value);
    } else {
      this.globals.assign(expr.name, value);
    }
    return value;
  }

  visitBinaryExpr(expr: Expr.Binary): Obj {
    const left = this.#evaluate(expr.left);
    const right = this.#evaluate(expr.right);

    switch (expr.operator.type) {
      case TokenType.BANG_EQUAL:
        return !this.#isEqual(left, right);
      case TokenType.EQUAL_EQUAL:
        return this.#isEqual(left, right);
      case TokenType.GREATER:
        this.#checkNumberOperands(expr.operator, left, right);
        return Number(left) > Number(right);
      case TokenType.GREATER_EQUAL:
        this.#checkNumberOperands(expr.operator, left, right);
        return Number(left) >= Number(right);
      case TokenType.LESS:
        this.#checkNumberOperands(expr.operator, left, right);
        return Number(left) < Number(right);
      case TokenType.LESS_EQUAL:
        this.#checkNumberOperands(expr.operator, left, right);
        return Number(left) <= Number(right);
      case TokenType.MINUS:
        this.#checkNumberOperands(expr.operator, left, right);
        return Number(left) - Number(right);
      case TokenType.PLUS:
        if (typeof left === "number" && typeof right === "number") {
          return left + right;
        }

        if (typeof left === "string" && typeof right === "string") {
          return left + right;
        }

        throw new RuntimeError(
          expr.operator,
          "Operands must be two numbers or two strings."
        );
      case TokenType.SLASH:
        this.#checkNumberOperands(expr.operator, left, right);
        return Number(left) / Number(right);
      case TokenType.STAR:
        this.#checkNumberOperands(expr.operator, left, right);
        return Number(left) * Number(right);
    }

    // Unreachable.
    return null;
  }

  visitCallExpr(expr: Expr.Call): Obj {
    const callee = this.#evaluate(expr.callee);

    const args: Obj[] = [];
    for (const argument of expr.args) {
      args.push(this.#evaluate(argument));
    }

    if (!(callee instanceof LoxCallable)) {
      throw new RuntimeError(
        expr.paren,
        "Can only call functions and classes."
      );
    }

    const fun = callee;
    if (args.length !== fun.arity()) {
      throw new RuntimeError(
        expr.paren,
        "Expected " + fun.arity() + " arguments but got " + args.length + "."
      );
    }
    return fun.call(this, args);
  }

  visitGetExpr(expr: Expr.Get): Obj {
    const object = this.#evaluate(expr.object);
    if (object instanceof LoxInstance) {
      return object.get(expr.name);
    }

    throw new RuntimeError(expr.name, "Only instances have properties.");
  }

  visitGroupingExpr(expr: Expr.Grouping): Obj {
    return this.#evaluate(expr.expression);
  }

  visitLiteralExpr(expr: Expr.Literal): Obj {
    return expr.value;
  }

  visitUnaryExpr(expr: Expr.Unary): Obj {
    const right = this.#evaluate(expr.right);

    switch (expr.operator.type) {
      case TokenType.BANG:
        return !this.#isTruthy(right);
      case TokenType.MINUS:
        if (this.#checkNumberOperand(expr.operator, right)) return -right;
    }

    // Unreachable.
    return null;
  }

  visitLogicalExpr(expr: Expr.Logical): Obj {
    const left = this.#evaluate(expr.left);

    if (expr.operator.type == TokenType.OR) {
      if (this.#isTruthy(left)) return left;
    } else {
      if (!this.#isTruthy(left)) return left;
    }

    return this.#evaluate(expr.right);
  }

  visitSetExpr(expr: Expr.Set): Obj {
    const object = this.#evaluate(expr.object);

    if (!(object instanceof LoxInstance)) {
      throw new RuntimeError(expr.name, "Only instances have fields.");
    }

    const value = this.#evaluate(expr.value);
    object.set(expr.name, value);
    return value;
  }

  visitSuperExpr(expr: Expr.Super): Obj {
    const distance = this.#locals.get(expr)!;
    const superclass = this.#environment.getAt(distance, "super") as LoxClass;
    const object = this.#environment.getAt(distance - 1, "this") as LoxInstance;
    const method = superclass.findMethod(expr.method.lexeme);
    if (!method) {
      throw new RuntimeError(
        expr.method,
        `Undefined property '${expr.method.lexeme}'.`
      );
    }
    return method.bind(object);
  }

  visitThisExpr(expr: Expr.This): Obj {
    return this.#lookUpVariable(expr.keyword, expr);
  }

  visitVariableExpr(expr: Expr.Variable): Obj {
    return this.#lookUpVariable(expr.name, expr);
  }

  #lookUpVariable(name: Token, expr: Expr.Expr): Obj {
    const distance = this.#locals.get(expr);
    if (distance !== undefined) {
      return this.#environment.getAt(distance, name.lexeme);
    } else {
      return this.globals.get(name);
    }
  }

  #checkNumberOperand(operator: Token, operand: Obj): operand is number {
    if (typeof operand === "number") return true;
    throw new RuntimeError(operator, "Operand must be a number.");
  }

  #checkNumberOperands(operator: Token, left: Obj, right: Obj) {
    if (typeof left === "number" && typeof right === "number") return;

    throw new RuntimeError(operator, "Operands must be numbers.");
  }

  #isTruthy(object: Obj): boolean {
    if (object === null) return false;
    if (typeof object === "boolean") return object;
    return true;
  }

  #isEqual(a: Obj, b: Obj): boolean {
    return a === b;
  }

  #stringify(object: Obj): string {
    if (object === null) return "nil";

    if (typeof object === "number") {
      let text = object.toString();
      if (text.endsWith(".0")) {
        text = text.substring(0, text.length - 2);
      }
      return text;
    }

    return object.toString();
  }
}
