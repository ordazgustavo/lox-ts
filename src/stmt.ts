import { Expr, Variable } from "./expr.js";
import { Token } from "./token.js";

export interface Visitor<R> {
  visitBlockStmt(stmt: Block): R;
  visitClassStmt(stmt: Class): R;
  visitExpressionStmt(stmt: Expression): R;
  visitFunStmt(stmt: Fun): R;
  visitIfStmt(stmt: If): R;
  visitPrintStmt(stmt: Print): R;
  visitReturnStmt(stmt: Return): R;
  visitVarStmt(stmt: Var): R;
  visitWhileStmt(stmt: While): R;
}

export abstract class Stmt {
  abstract accept<R>(_visitor: Visitor<R>): R;
}

export class Block extends Stmt {
  statements;

  constructor(statements: Stmt[]) {
    super();
    this.statements = statements;
  }

  override accept<R>(visitor: Visitor<R>): R {
    return visitor.visitBlockStmt(this);
  }
}

export class Class extends Stmt {
  name;
  superclass;
  methods;

  constructor(name: Token, superclass: Variable | null, methods: Fun[]) {
    super();
    this.name = name;
    this.superclass = superclass;
    this.methods = methods;
  }

  override accept<R>(visitor: Visitor<R>): R {
    return visitor.visitClassStmt(this);
  }
}

export class Expression extends Stmt {
  expression;

  constructor(expression: Expr) {
    super();
    this.expression = expression;
  }

  override accept<R>(visitor: Visitor<R>): R {
    return visitor.visitExpressionStmt(this);
  }
}

export class Fun extends Stmt {
  name;
  params;
  body;

  constructor(name: Token, params: Token[], body: Stmt[]) {
    super();
    this.name = name;
    this.params = params;
    this.body = body;
  }

  override accept<R>(visitor: Visitor<R>): R {
    return visitor.visitFunStmt(this);
  }
}

export class If extends Stmt {
  condition;
  thenBranch;
  elseBranch;

  constructor(condition: Expr, thenBranch: Stmt, elseBranch: Stmt | null) {
    super();
    this.condition = condition;
    this.thenBranch = thenBranch;
    this.elseBranch = elseBranch;
  }

  override accept<R>(visitor: Visitor<R>): R {
    return visitor.visitIfStmt(this);
  }
}

export class Print extends Stmt {
  expression;

  constructor(expression: Expr) {
    super();
    this.expression = expression;
  }

  override accept<R>(visitor: Visitor<R>): R {
    return visitor.visitPrintStmt(this);
  }
}

export class Return extends Stmt {
  keyword;
  value;

  constructor(keyword: Token, value: Expr | null) {
    super();
    this.keyword = keyword;
    this.value = value;
  }

  override accept<R>(visitor: Visitor<R>): R {
    return visitor.visitReturnStmt(this);
  }
}

export class Var extends Stmt {
  name;
  initializer;

  constructor(name: Token, initializer: Expr | null) {
    super();
    this.name = name;
    this.initializer = initializer;
  }

  override accept<R>(visitor: Visitor<R>): R {
    return visitor.visitVarStmt(this);
  }
}

export class While extends Stmt {
  condition;
  body;

  constructor(condition: Expr, body: Stmt) {
    super();
    this.condition = condition;
    this.body = body;
  }

  override accept<R>(visitor: Visitor<R>): R {
    return visitor.visitWhileStmt(this);
  }
}
