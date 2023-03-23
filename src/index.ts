import * as fs from "fs/promises";
import * as readLine from "readline/promises";
import { Scanner } from "./scanner.js";
import { ErrorReporter } from "./error-reporter.js";
import { Parser } from "./parser.js";
import { Interpreter } from "./interpreter.js";
import { Resolver } from "./resolver.js";

class Lox {
  #errorReporter = new ErrorReporter();
  #interpreter = new Interpreter(this.#errorReporter);

  main() {
    const args = process.argv;

    if (args.length < 2) {
      console.log("Usage: jlox [script]");
      process.exit(64);
    } else if (args.length === 3 && args[2]) {
      this.runFile(args[2]);
    } else {
      this.runPrompt();
    }
  }

  async runFile(path: string) {
    const source = await fs.readFile(path, { encoding: "utf8" }).catch(() => {
      console.error(`File ${path} not found`);
      process.exit(1);
    });
    this.run(source);
    if (this.#errorReporter.hadError) process.exit(65);
    if (this.#errorReporter.hadRuntimeError) process.exit(70);
  }

  async runPrompt() {
    const rl = readLine.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    for (;;) {
      const line = await rl.question("> ");
      if (!line) break;
      this.run(line);
      this.#errorReporter.hadError = false;
    }
    rl.close();
  }

  run(source: string) {
    const scanner = new Scanner(source, this.#errorReporter);
    const tokens = scanner.scanTokens();

    const parser = new Parser(tokens, this.#errorReporter);
    const statements = parser.parse();

    // Stop if there was a syntax error.
    if (this.#errorReporter.hadError) return;

    const resolver = new Resolver(this.#interpreter, this.#errorReporter);
    resolver.resolve(statements);

    if (this.#errorReporter.hadError) return;

    // console.log(new AstPrinter().print(statements));
    this.#interpreter.interpret(statements);
  }
}

const lox = new Lox();
lox.main();
