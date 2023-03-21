import { Expr } from "./expr.js";
import { Token } from "./token.js";

export interface Visitor<R> {
  visitBlockStmt(stmt: Block): R;
  visitExpressionStmt(stmt: Expression): R;
  visitPrintStmt(stmt: Print): R;
  visitVarStmt(stmt: Var): R;
}

export abstract class Stmt {
  abstract accept<R>(_visitor: Visitor<R>): R;
}

export class Block extends Stmt {
  statements: Stmt[];

  constructor(statements: Stmt[]) {
    super();
    this.statements = statements;
  }

  override accept<R>(visitor: Visitor<R>): R {
    return visitor.visitBlockStmt(this);
  }
}

export class Expression extends Stmt {
  expression: Expr;

  constructor(expression: Expr) {
    super();
    this.expression = expression;
  }

  override accept<R>(visitor: Visitor<R>): R {
    return visitor.visitExpressionStmt(this);
  }
}

export class Print extends Stmt {
  expression: Expr;

  constructor(expression: Expr) {
    super();
    this.expression = expression;
  }

  override accept<R>(visitor: Visitor<R>): R {
    return visitor.visitPrintStmt(this);
  }
}

export class Var extends Stmt {
  name: Token;
  initializer: Expr | null;

  constructor(name: Token, initializer: Expr | null) {
    super();
    this.name = name;
    this.initializer = initializer;
  }

  override accept<R>(visitor: Visitor<R>): R {
    return visitor.visitVarStmt(this);
  }
}
