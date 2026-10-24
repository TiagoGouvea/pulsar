import { expect, test } from "vitest";
import { sum } from "../sum.js";

test("soma dois números", () => {
  expect(sum(2, 3)).toBe(5);
});
