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

export class Interpreter implements Expr.Visitor<Obj>, Stmt.Visitor<void> {
  private errorReporter: ErrorReporter;

  globals = new Environment();
  private environment = this.globals;
  private locals: WeakMap<Expr.Expr, number> = new WeakMap();

  constructor(errorReporter: ErrorReporter) {
    this.errorReporter = errorReporter;

    this.globals.define("clock", new Clock());
  }

  interpret(statements: Stmt.Stmt[]) {
    try {
      for (const stmt of statements) {
        this.execute(stmt);
      }
    } catch (error) {
      this.errorReporter.runtimeError(error as RuntimeError);
    }
  }

  private evaluate(expr: Expr.Expr): Obj {
    return expr.accept(this);
  }

  private execute(stmt: Stmt.Stmt) {
    stmt.accept(this);
  }

  resolve(expr: Expr.Expr, depth: number) {
    this.locals.set(expr, depth);
  }

  executeBlock(statements: Stmt.Stmt[], environment: Environment) {
    const previous = this.environment;
    try {
      this.environment = environment;

      for (const statement of statements) {
        this.execute(statement);
      }
    } finally {
      this.environment = previous;
    }
  }

  public visitBlockStmt(stmt: Stmt.Block) {
    this.executeBlock(stmt.statements, new Environment(this.environment));
    return null;
  }

  visitExpressionStmt(stmt: Stmt.Expression) {
    this.evaluate(stmt.expression);
  }

  public visitFunStmt(stmt: Stmt.Fun) {
    const fun = new LoxFun(stmt, this.environment);
    this.environment.define(stmt.name.lexeme, fun);
    return null;
  }

  public visitIfStmt(stmt: Stmt.If) {
    if (this.isTruthy(this.evaluate(stmt.condition))) {
      this.execute(stmt.thenBranch);
    } else if (stmt.elseBranch !== null) {
      this.execute(stmt.elseBranch);
    }
  }

  visitPrintStmt(stmt: Stmt.Print) {
    const value = this.evaluate(stmt.expression);
    console.log(this.stringify(value));
  }

  visitReturnStmt(stmt: Stmt.Return) {
    let value = null;
    if (stmt.value !== null) value = this.evaluate(stmt.value);

    throw new Return(value);
  }

  visitVarStmt(stmt: Stmt.Var) {
    let value = null;
    if (stmt.initializer != null) {
      value = this.evaluate(stmt.initializer);
    }

    this.environment.define(stmt.name.lexeme, value);
  }
  visitWhileStmt(stmt: Stmt.While) {
    while (this.isTruthy(this.evaluate(stmt.condition))) {
      this.execute(stmt.body);
    }
  }

  visitAssignExpr(expr: Expr.Assign): Obj {
    const value = this.evaluate(expr.value);
    const distance = this.locals.get(expr);
    if (distance !== undefined) {
      this.environment.assignAt(distance, expr.name, value);
    } else {
      this.globals.assign(expr.name, value);
    }
    return value;
  }

  visitBinaryExpr(expr: Expr.Binary): Obj {
    const left = this.evaluate(expr.left);
    const right = this.evaluate(expr.right);

    switch (expr.operator.type) {
      case TokenType.BANG_EQUAL:
        return !this.isEqual(left, right);
      case TokenType.EQUAL_EQUAL:
        return this.isEqual(left, right);
      case TokenType.GREATER:
        this.checkNumberOperands(expr.operator, left, right);
        return Number(left) > Number(right);
      case TokenType.GREATER_EQUAL:
        this.checkNumberOperands(expr.operator, left, right);
        return Number(left) >= Number(right);
      case TokenType.LESS:
        this.checkNumberOperands(expr.operator, left, right);
        return Number(left) < Number(right);
      case TokenType.LESS_EQUAL:
        this.checkNumberOperands(expr.operator, left, right);
        return Number(left) <= Number(right);
      case TokenType.MINUS:
        this.checkNumberOperands(expr.operator, left, right);
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
        this.checkNumberOperands(expr.operator, left, right);
        return Number(left) / Number(right);
      case TokenType.STAR:
        this.checkNumberOperands(expr.operator, left, right);
        return Number(left) * Number(right);
    }

    // Unreachable.
    return null;
  }
  visitCallExpr(expr: Expr.Call): Obj {
    const callee = this.evaluate(expr.callee);

    const args: Obj[] = [];
    for (const argument of expr.args) {
      args.push(this.evaluate(argument));
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
  visitGroupingExpr(expr: Expr.Grouping): Obj {
    return this.evaluate(expr.expression);
  }
  visitLiteralExpr(expr: Expr.Literal): Obj {
    return expr.value;
  }
  visitUnaryExpr(expr: Expr.Unary): Obj {
    const right = this.evaluate(expr.right);

    switch (expr.operator.type) {
      case TokenType.BANG:
        return !this.isTruthy(right);
      case TokenType.MINUS:
        this.checkNumberOperand(expr.operator, right);
        return -Number(right);
    }

    // Unreachable.
    return null;
  }
  visitLogicalExpr(expr: Expr.Logical): Obj {
    const left = this.evaluate(expr.left);

    if (expr.operator.type == TokenType.OR) {
      if (this.isTruthy(left)) return left;
    } else {
      if (!this.isTruthy(left)) return left;
    }

    return this.evaluate(expr.right);
  }
  visitVariableExpr(expr: Expr.Variable): Obj {
    return this.lookUpVariable(expr.name, expr);
  }

  private lookUpVariable(name: Token, expr: Expr.Expr): Obj {
    const distance = this.locals.get(expr);
    if (distance !== undefined) {
      return this.environment.getAt(distance, name.lexeme);
    } else {
      return this.globals.get(name);
    }
  }

  private checkNumberOperand(operator: Token, operand: Obj) {
    if (typeof operand === "number") return;
    throw new RuntimeError(operator, "Operand must be a number.");
  }

  private checkNumberOperands(operator: Token, left: Obj, right: Obj) {
    if (typeof left === "number" && typeof right === "number") return;

    throw new RuntimeError(operator, "Operands must be numbers.");
  }

  private isTruthy(object: Obj): boolean {
    if (object === null) return false;
    if (typeof object === "boolean") return object;
    return true;
  }

  private isEqual(a: Obj, b: Obj): boolean {
    return a === b;
  }

  private stringify(object: Obj): string {
    if (object == null) return "nil";

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
