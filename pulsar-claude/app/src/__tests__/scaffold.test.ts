// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../..');
const read = (file: string) => readFileSync(resolve(root, file), 'utf8');

describe('scaffold scripts', () => {
  const pkg = JSON.parse(read('package.json')) as { scripts: Record<string, string> };

  it.each(['build', 'lint', 'format:check', 'typecheck', 'test:unit'])('defines the %s script', (name) => {
    expect(pkg.scripts[name]).toBeTruthy();
  });

  it('runs unit tests with v8 coverage', () => {
    expect(pkg.scripts['test:unit']).toContain('vitest');
    expect(read('vite.config.ts')).toContain("provider: 'v8'");
  });

  it('uses strict TypeScript with noUncheckedIndexedAccess', () => {
    const tsconfig = read('tsconfig.json');
    expect(tsconfig).toMatch(/"strict"\s*:\s*true/);
    expect(tsconfig).toMatch(/"noUncheckedIndexedAccess"\s*:\s*true/);
  });
});

describe('index.html language', () => {
  const html = read('index.html');

  it('declares pt-BR on <html>', () => {
    expect(html).toMatch(/<html[^>]*\slang="pt-BR"/);
  });

  it('declares no other interface language', () => {
    const langs = [...html.matchAll(/\slang="([^"]*)"/g)].map((m) => m[1]);
    expect(langs).toEqual(['pt-BR']);
  });
});

describe('lint boundary for src/stats', () => {
  const lint = async (code: string) => {
    const eslint = new ESLint({ cwd: root });
    const [result] = await eslint.lintText(code, { filePath: resolve(root, 'src/stats/__probe__.ts') });
    return result?.messages.filter((m) => m.ruleId === 'no-restricted-imports') ?? [];
  };

  it.each([
    ["import { initializeApp } from 'firebase/app';", 'firebase subpath'],
    ["import { getApp } from 'firebase';", 'firebase root'],
    ["import { useState } from 'react';", 'react'],
    ["import { createRoot } from 'react-dom/client';", 'react-dom'],
  ])('rejects %s (%s)', async (code) => {
    expect((await lint(`${code}\nexport const x = 1;\n`)).length).toBeGreaterThan(0);
  });

  it('allows pure imports', async () => {
    expect(await lint("import { join } from 'node:path';\nexport const x = join;\n")).toHaveLength(0);
  });
});
