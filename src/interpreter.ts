import { Obj, Token } from "./token.js";
import {
  Assign,
  Binary,
  Expr,
  Grouping,
  Literal,
  Unary,
  Variable,
  Visitor,
} from "./expr.js";
import { TokenType } from "./token-type.js";
import { RuntimeError } from "./runtime-error.js";
import { ErrorReporter } from "./error-reporter.js";
import { Block, Expression, Print, Stmt, Var } from "./stmt.js";
import { Environment } from "./environment.js";

export class Interpreter implements Visitor<Obj>, Visitor<void> {
  private errorReporter: ErrorReporter;

  private environment = new Environment();

  constructor(errorReporter: ErrorReporter) {
    this.errorReporter = errorReporter;
  }

  interpret(statements: Stmt[]) {
    try {
      for (const stmt of statements) {
        this.execute(stmt);
      }
    } catch (error) {
      this.errorReporter.runtimeError(error as RuntimeError);
    }
  }

  private evaluate(expr: Expr): Obj {
    return expr.accept(this);
  }

  private execute(stmt: Stmt) {
    stmt.accept(this);
  }

  private executeBlock(statements: Stmt[], environment: Environment) {
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

  public visitBlockStmt(stmt: Block) {
    this.executeBlock(stmt.statements, new Environment(this.environment));
    return null;
  }

  visitExpressionStmt(stmt: Expression) {
    this.evaluate(stmt.expression);
  }

  visitPrintStmt(stmt: Print) {
    const value = this.evaluate(stmt.expression);
    console.log(this.stringify(value));
  }

  visitVarStmt(stmt: Var) {
    let value = null;
    if (stmt.initializer != null) {
      value = this.evaluate(stmt.initializer);
    }

    this.environment.define(stmt.name.lexeme, value);
    return null;
  }

  visitAssignExpr(expr: Assign): Obj {
    const value = this.evaluate(expr.value);
    this.environment.assign(expr.name, value);
    return value;
  }

  visitBinaryExpr(expr: Binary): Obj {
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
  visitGroupingExpr(expr: Grouping): Obj {
    return this.evaluate(expr.expression);
  }
  visitLiteralExpr(expr: Literal): Obj {
    return expr.value;
  }
  visitUnaryExpr(expr: Unary): Obj {
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
  visitVariableExpr(expr: Variable): Obj {
    return this.environment.get(expr.name);
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
