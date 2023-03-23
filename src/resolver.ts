import { ErrorReporter } from "./error-reporter.js";
import * as Expr from "./expr.js";
import { Interpreter } from "./interpreter.js";
import * as Stmt from "./stmt.js";
import { Token } from "./token.js";

enum FunctionType {
  NONE,
  FUNCTION,
  INITIALIZER,
  METHOD,
}

enum ClassType {
  NONE,
  CLASS,
}

export class Resolver implements Expr.Visitor<void>, Stmt.Visitor<void> {
  #interpreter;

  #scopes: Map<string, boolean>[] = [];
  #currentFunction = FunctionType.NONE;
  #currentClass = ClassType.NONE;

  #errorReporter: ErrorReporter;

  constructor(interpreter: Interpreter, errorReporter: ErrorReporter) {
    this.#interpreter = interpreter;
    this.#errorReporter = errorReporter;
  }

  resolve(statements: Stmt.Stmt[]) {
    for (const statement of statements) {
      this.#resolve(statement);
    }
  }

  #resolve(kind: Stmt.Stmt | Expr.Expr) {
    kind.accept(this);
  }

  resolveFun(fun: Stmt.Fun, type: FunctionType) {
    let enclosingFunction = this.#currentFunction;
    this.#currentFunction = type;

    this.#beginScope();
    for (const param of fun.params) {
      this.#declare(param);
      this.#define(param);
    }
    this.resolve(fun.body);
    this.#endScope();

    this.#currentFunction = enclosingFunction;
  }

  #beginScope() {
    this.#scopes.push(new Map());
  }

  #endScope() {
    this.#scopes.pop();
  }

  #declare(name: Token) {
    if (!this.#scopes.length) return;

    const scope = this.#scopes.at(-1);
    if (scope?.has(name.lexeme)) {
      this.#errorReporter.resolverError(
        name,
        "Already a variable with this name in this scope."
      );
    }
    scope?.set(name.lexeme, false);
  }

  #define(name: Token) {
    if (!this.#scopes.length) return;
    this.#scopes.at(-1)?.set(name.lexeme, true);
  }

  #resolveLocal(expr: Expr.Expr, name: Token) {
    for (let i = this.#scopes.length - 1; i >= 0; i--) {
      if (this.#scopes[i]!.has(name.lexeme)) {
        this.#interpreter.resolve(expr, this.#scopes.length - 1 - i);
        return;
      }
    }
  }

  visitBlockStmt(stmt: Stmt.Block) {
    this.#beginScope();
    this.resolve(stmt.statements);
    this.#endScope();
  }

  visitClassStmt(stmt: Stmt.Class) {
    const enclosingClass = this.#currentClass;
    this.#currentClass = ClassType.CLASS;

    this.#declare(stmt.name);
    this.#define(stmt.name);

    this.#beginScope();
    this.#scopes.at(-1)?.set("this", true);

    for (const method of stmt.methods) {
      let declaration = FunctionType.METHOD;
      if (method.name.lexeme === "init") {
        declaration = FunctionType.INITIALIZER;
      }
      this.resolveFun(method, declaration);
    }

    this.#endScope();
    this.#currentClass = enclosingClass;
  }

  visitExpressionStmt(stmt: Stmt.Expression) {
    this.#resolve(stmt.expression);
  }

  visitFunStmt(stmt: Stmt.Fun) {
    this.#declare(stmt.name);
    this.#define(stmt.name);

    this.resolveFun(stmt, FunctionType.FUNCTION);
  }

  visitIfStmt(stmt: Stmt.If) {
    this.#resolve(stmt.condition);
    this.#resolve(stmt.thenBranch);
    if (stmt.elseBranch !== null) this.#resolve(stmt.elseBranch);
  }

  visitPrintStmt(stmt: Stmt.Print) {
    this.#resolve(stmt.expression);
  }

  visitReturnStmt(stmt: Stmt.Return) {
    if (this.#currentFunction === FunctionType.NONE) {
      this.#errorReporter.resolverError(
        stmt.keyword,
        "Can't return from top-level code."
      );
    }

    if (stmt.value !== null) {
      if (this.#currentFunction == FunctionType.INITIALIZER) {
        this.#errorReporter.resolverError(
          stmt.keyword,
          "Can't return a value from an initializer."
        );
      }
      this.#resolve(stmt.value);
    }
  }

  visitVarStmt(stmt: Stmt.Var) {
    this.#declare(stmt.name);
    if (stmt.initializer !== null) {
      this.#resolve(stmt.initializer);
    }
    this.#define(stmt.name);
  }

  visitWhileStmt(stmt: Stmt.While) {
    this.#resolve(stmt.condition);
    this.#resolve(stmt.body);
  }

  visitAssignExpr(expr: Expr.Assign) {
    this.#resolve(expr.value);
    this.#resolveLocal(expr, expr.name);
  }

  visitBinaryExpr(expr: Expr.Binary) {
    this.#resolve(expr.left);
    this.#resolve(expr.right);
  }

  visitCallExpr(expr: Expr.Call) {
    this.#resolve(expr.callee);

    for (const argument of expr.args) {
      this.#resolve(argument);
    }
  }

  visitGetExpr(expr: Expr.Get) {
    this.#resolve(expr.object);
  }

  visitGroupingExpr(expr: Expr.Grouping) {
    this.#resolve(expr.expression);
  }

  visitLiteralExpr(_expr: Expr.Literal) {}

  visitLogicalExpr(expr: Expr.Logical) {
    this.#resolve(expr.left);
    this.#resolve(expr.right);
  }

  visitSetExpr(expr: Expr.Set) {
    this.#resolve(expr.value);
    this.#resolve(expr.object);
  }

  visitThisExpr(expr: Expr.This) {
    if (this.#currentClass === ClassType.NONE) {
      this.#errorReporter.resolverError(
        expr.keyword,
        "Can't use 'this' outside of a class."
      );
      return;
    }

    this.#resolveLocal(expr, expr.keyword);
  }

  visitUnaryExpr(expr: Expr.Unary) {
    this.#resolve(expr.right);
  }

  visitVariableExpr(expr: Expr.Variable) {
    if (
      this.#scopes.length &&
      this.#scopes.at(-1)?.get(expr.name.lexeme) === false
    ) {
      this.#errorReporter.resolverError(
        expr.name,
        "Can't read local variable in its own initializer."
      );
    }

    this.#resolveLocal(expr, expr.name);
  }
}
