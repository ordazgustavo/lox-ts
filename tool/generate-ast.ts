import * as fs from "fs/promises";
import { fileURLToPath } from "node:url";

defineAst("Expr", [
  "Binary   : left: Expr, operator: Token, right: Expr",
  "Grouping : expression: Expr",
  "Literal  : value: Obj",
  "Unary    : operator: Token, right: Expr",
]);

type Ref<T> = { ref: T };

function defineAst(baseName: string, types: string[]) {
  let source: Ref<string> = { ref: "" };

  source.ref += 'import { Token, Obj } from "./token.js";\n';
  source.ref += "\n";

  defineVisitor(source, baseName, types);

  source.ref += "export abstract class " + baseName + " {\n";
  source.ref += "abstract accept<R>(_visitor: Visitor<R>): R;\n";
  source.ref += "}\n";

  for (const type of types) {
    const [className, fields] = type.split(" : ");
    defineType(source, baseName, className!.trim(), fields!.trim());
  }

  const filePath = fileURLToPath(new URL("../src/expr.ts", import.meta.url));

  fs.writeFile(filePath, source.ref, {
    encoding: "utf8",
  }).catch(console.log);
}

function defineVisitor(source: Ref<string>, baseName: string, types: string[]) {
  source.ref += "export interface Visitor<R> {\n";

  for (const type of types) {
    const typeName = type.split(" : ")[0]!.trim();
    source.ref +=
      "    visit" +
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
    source.ref += "    " + field + ";\n";
  }

  // Constructor.
  source.ref += "    constructor(" + fieldList + ") {\n";
  source.ref += "      super();\n";

  // Store parameters in fields.
  for (const field of fields) {
    const name = field.split(": ")[0];
    source.ref += "      this." + name + " = " + name + ";\n";
  }
  source.ref += "    }\n";

  source.ref += "\n";
  source.ref += "    override accept<R>(visitor: Visitor<R>): R {\n";
  source.ref +=
    "      return visitor.visit" + className + baseName + "(this);\n";
  source.ref += "    }\n";

  source.ref += "  }\n";
}
