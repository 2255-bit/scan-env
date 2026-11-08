import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { scanEnv } from '../src/index.js';

describe('scanEnv Programmatic API', () => {
  it('returns structured scan report', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scan-env-api-'));
    fs.writeFileSync(path.join(tmpDir, 'main.js'), 'const a = process.env.TEST_API_VAR;\n');
    fs.writeFileSync(path.join(tmpDir, '.env.example'), 'TEST_API_VAR=example\n');

    const result = scanEnv({
      dir: tmpDir,
      example: '.env.example',
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.missingKeys.length, 0);
    assert.ok(result.detectedKeys.includes('TEST_API_VAR'));
    assert.ok(result.exampleKeys.includes('TEST_API_VAR'));

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('detects missing keys and fixes when requested', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scan-env-api-fix-'));
    fs.writeFileSync(
      path.join(tmpDir, 'main.js'),
      'const a = process.env.VAR_ONE;\nconst b = process.env.VAR_TWO;\n'
    );
    fs.writeFileSync(path.join(tmpDir, '.env.example'), 'VAR_ONE=\n');

    // Run without fix
    const check1 = scanEnv({ dir: tmpDir });
    assert.strictEqual(check1.success, false);
    assert.deepStrictEqual(check1.missingKeys, ['VAR_TWO']);

    // Run with fix
    const check2 = scanEnv({ dir: tmpDir, fix: true });
    assert.strictEqual(check2.success, true);
    assert.strictEqual(check2.fixed, true);
    assert.strictEqual(check2.fixedCount, 1);

    const content = fs.readFileSync(path.join(tmpDir, '.env.example'), 'utf8');
    assert.ok(content.includes('VAR_TWO='));

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('honors ignoreVars option', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scan-env-api-ignore-'));
    fs.writeFileSync(path.join(tmpDir, 'main.js'), 'const a = process.env.NODE_ENV;\n');
    fs.writeFileSync(path.join(tmpDir, '.env.example'), '');

    const result = scanEnv({
      dir: tmpDir,
      ignoreVars: ['NODE_ENV'],
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.missingKeys.length, 0);

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});
