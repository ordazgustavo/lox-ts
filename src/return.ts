import { Obj } from "./token.js";

export class Return extends Error {
  value: Obj;

  constructor(value: Obj) {
    super();
    this.value = value;
  }
}
