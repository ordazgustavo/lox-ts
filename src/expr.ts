import { Token, Obj } from "./token.js";

export interface Visitor<R> {
  visitAssignExpr(expr: Assign): R;
  visitBinaryExpr(expr: Binary): R;
  visitCallExpr(expr: Call): R;
  visitGetExpr(expr: Get): R;
  visitGroupingExpr(expr: Grouping): R;
  visitLiteralExpr(expr: Literal): R;
  visitLogicalExpr(expr: Logical): R;
  visitSetExpr(expr: Set): R;
  visitSuperExpr(expr: Super): R;
  visitThisExpr(expr: This): R;
  visitUnaryExpr(expr: Unary): R;
  visitVariableExpr(expr: Variable): R;
}

export abstract class Expr {
  abstract accept<R>(_visitor: Visitor<R>): R;
}

export class Assign extends Expr {
  name;
  value;

  constructor(name: Token, value: Expr) {
    super();
    this.name = name;
    this.value = value;
  }

  override accept<R>(visitor: Visitor<R>): R {
    return visitor.visitAssignExpr(this);
  }
}

export class Binary extends Expr {
  left;
  operator;
  right;

  constructor(left: Expr, operator: Token, right: Expr) {
    super();
    this.left = left;
    this.operator = operator;
    this.right = right;
  }

  override accept<R>(visitor: Visitor<R>): R {
    return visitor.visitBinaryExpr(this);
  }
}

export class Call extends Expr {
  callee;
  paren;
  args;

  constructor(callee: Expr, paren: Token, args: Expr[]) {
    super();
    this.callee = callee;
    this.paren = paren;
    this.args = args;
  }

  override accept<R>(visitor: Visitor<R>): R {
    return visitor.visitCallExpr(this);
  }
}

export class Get extends Expr {
  object;
  name;

  constructor(object: Expr, name: Token) {
    super();
    this.object = object;
    this.name = name;
  }

  override accept<R>(visitor: Visitor<R>): R {
    return visitor.visitGetExpr(this);
  }
}

export class Grouping extends Expr {
  expression;

  constructor(expression: Expr) {
    super();
    this.expression = expression;
  }

  override accept<R>(visitor: Visitor<R>): R {
    return visitor.visitGroupingExpr(this);
  }
}

export class Literal extends Expr {
  value;

  constructor(value: Obj) {
    super();
    this.value = value;
  }

  override accept<R>(visitor: Visitor<R>): R {
    return visitor.visitLiteralExpr(this);
  }
}

export class Logical extends Expr {
  left;
  operator;
  right;

  constructor(left: Expr, operator: Token, right: Expr) {
    super();
    this.left = left;
    this.operator = operator;
    this.right = right;
  }

  override accept<R>(visitor: Visitor<R>): R {
    return visitor.visitLogicalExpr(this);
  }
}

export class Set extends Expr {
  object;
  name;
  value;

  constructor(object: Expr, name: Token, value: Expr) {
    super();
    this.object = object;
    this.name = name;
    this.value = value;
  }

  override accept<R>(visitor: Visitor<R>): R {
    return visitor.visitSetExpr(this);
  }
}

export class Super extends Expr {
  keyword;
  method;

  constructor(keyword: Token, method: Token) {
    super();
    this.keyword = keyword;
    this.method = method;
  }

  override accept<R>(visitor: Visitor<R>): R {
    return visitor.visitSuperExpr(this);
  }
}

export class This extends Expr {
  keyword;

  constructor(keyword: Token) {
    super();
    this.keyword = keyword;
  }

  override accept<R>(visitor: Visitor<R>): R {
    return visitor.visitThisExpr(this);
  }
}

export class Unary extends Expr {
  operator;
  right;

  constructor(operator: Token, right: Expr) {
    super();
    this.operator = operator;
    this.right = right;
  }

  override accept<R>(visitor: Visitor<R>): R {
    return visitor.visitUnaryExpr(this);
  }
}

export class Variable extends Expr {
  name;

  constructor(name: Token) {
    super();
    this.name = name;
  }

  override accept<R>(visitor: Visitor<R>): R {
    return visitor.visitVariableExpr(this);
  }
}
