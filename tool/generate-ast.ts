import * as fs from "fs/promises";
import { fileURLToPath } from "node:url";

defineAst(
  "Expr",
  [
    "Assign   : name: Token, value: Expr",
    "Binary   : left: Expr, operator: Token, right: Expr",
    "Call     : callee: Expr, paren: Token, args: Expr[]",
    "Grouping : expression: Expr",
    "Literal  : value: Obj",
    "Logical  : left: Expr, operator: Token, right: Expr",
    "Unary    : operator: Token, right: Expr",
    "Variable : name: Token",
  ],
  [[["Token", "Obj"], "token"]]
);

defineAst(
  "Stmt",
  [
    "Block      : statements: Stmt[]",
    "Expression : expression: Expr",
    "Fun        : name: Token, params: Token[], body: Stmt[]",
    "If         : condition: Expr, thenBranch: Stmt, elseBranch: Stmt | null",
    "Print      : expression: Expr",
    "Return     : keyword: Token, value: Expr | null",
    "Var        : name: Token, initializer: Expr | null",
    "While      : condition: Expr, body: Stmt",
  ],
  [
    [["Expr"], "expr"],
    [["Token"], "token"],
  ]
);

type Ref<T> = { ref: T };

function defineAst(
  baseName: string,
  types: string[],
  deps: [string[], string][]
) {
  let source: Ref<string> = { ref: "" };

  source.ref += deps
    .map(([names, path]) => `import {${names.join()}} from "./${path}.js";`)
    .join("\n");

  source.ref += "\n\n";

  defineVisitor(source, baseName, types);
  source.ref += "\n";

  source.ref += `export abstract class ${baseName}  {
abstract accept<R>(_visitor: Visitor<R>): R;
}`;
  source.ref += "\n\n";

  for (const type of types) {
    const [className, fields] = type.split(" : ");
    defineType(source, baseName, className!.trim(), fields!.trim());
    source.ref += "\n";
  }

  const filePath = fileURLToPath(
    new URL(`../src/${baseName.toLowerCase()}.ts`, import.meta.url)
  );

  fs.writeFile(filePath, source.ref, {
    encoding: "utf8",
  }).catch(console.error);
}

function defineVisitor(source: Ref<string>, baseName: string, types: string[]) {
  source.ref += "export interface Visitor<R> {\n";

  for (const type of types) {
    const typeName = type.split(" : ")[0]!.trim();
    source.ref +=
      "visit" +
      typeName +
      baseName +
      "(" +
      baseName.toLowerCase() +
      ": " +
      typeName +
      "): R;\n";
  }

  source.ref += "}\n";
}

function defineType(
  source: Ref<string>,
  baseName: string,
  className: string,
  fieldList: string
) {
  source.ref += `export class ${className} extends ${baseName} {\n`;

  const fields = fieldList.split(", ");
  // Fields.
  for (const field of fields) {
    source.ref += `${field}\n`;
  }
  source.ref += "\n";

  // Constructor.
  source.ref += `constructor(${fieldList}) {\n`;
  source.ref += "super();\n";

  // Store parameters in fields.
  for (const field of fields) {
    const name = field.split(": ")[0];
    source.ref += `this.${name} = ${name};\n`;
  }
  source.ref += "}\n";
  source.ref += "\n";
  source.ref += `override accept<R>(visitor: Visitor<R>): R {
return visitor.visit${className}${baseName}(this);}`;

  source.ref += "}\n";
}
