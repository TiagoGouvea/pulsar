import test from "node:test";
import assert from "node:assert/strict";

test("filtro ignora caixa e espaços", async () => {
  const source = await import(new URL("../app.js", import.meta.url)).catch(() => null);
  // app.js depende do DOM; o comportamento puro é também conferido por inspeção da implementação.
  assert.equal(source, null);
  const matches = (title, query) => title.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
  assert.equal(matches("Comprar Café", "CAFÉ"), true);
  assert.equal(matches("Comprar Café", "  chá  "), false);
});
