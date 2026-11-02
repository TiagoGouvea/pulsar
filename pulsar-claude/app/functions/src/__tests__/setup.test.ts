import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';
import { getFileInfo } from 'prettier';
import { describe, expect, it } from 'vitest';

const appDirectory = fileURLToPath(new URL('../../../', import.meta.url));
const projectId = 'demo-pulsar';

function functionsEmulatorUrl(region: string) {
  const config = JSON.parse(readFileSync(resolve(appDirectory, 'firebase.json'), 'utf8')) as {
    emulators?: { functions?: { port?: number } };
  };
  expect(config.emulators?.functions).toBeDefined();
  const port = config.emulators?.functions?.port ?? 5001;
  return `http://127.0.0.1:${port}/${projectId}/${region}/healthcheck`;
}

describe('Cloud Functions workspace', () => {
  it('runs the healthcheck on the Functions emulator in southamerica-east1', async () => {
    const response = await fetch(functionsEmulatorUrl('southamerica-east1'));

    expect(response.status).toBeGreaterThanOrEqual(200);
    expect(response.status).toBeLessThan(300);
  }, 30000);

  it('does not expose the healthcheck in the Firebase default region', async () => {
    const response = await fetch(functionsEmulatorUrl('us-central1'));

    expect(response.status).toBe(404);
  });

  it.each(['functions/lib/generated.js', 'functions/lib/nested/generated.js'])(
    'ignores %s in ESLint and Prettier',
    async (relativePath) => {
      const generatedPath = resolve(appDirectory, relativePath);
      const eslint = new ESLint({ cwd: appDirectory });
      const prettier = await getFileInfo(generatedPath, {
        ignorePath: resolve(appDirectory, '.prettierignore'),
      });

      expect(await eslint.isPathIgnored(generatedPath)).toBe(true);
      expect(prettier.ignored).toBe(true);
    },
  );
});
