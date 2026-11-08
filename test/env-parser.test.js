import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { parseEnvContent, readEnvExample, appendMissingKeys } from '../src/env-parser.js';

describe('Env Parser Tests', () => {
  it('parses standard and formatted .env content', () => {
    const content = `
# Server settings
PORT=3000
HOST="127.0.0.1"

# Database
export DATABASE_URL='postgresql://user:pass@localhost:5432/db'
EMPTY_VAR=

# Commented var
# COMMENTED=true
`;

    const keys = parseEnvContent(content);
    assert.strictEqual(keys.size, 4);
    assert.ok(keys.has('PORT'));
    assert.ok(keys.has('HOST'));
    assert.ok(keys.has('DATABASE_URL'));
    assert.ok(keys.has('EMPTY_VAR'));
    assert.strictEqual(keys.has('COMMENTED'), false);
  });

  it('reads existing file or reports non-existence cleanly', () => {
    const nonExistent = readEnvExample(path.resolve('test/fixtures/non-existent.env'));
    assert.strictEqual(nonExistent.exists, false);
    assert.strictEqual(nonExistent.keys.size, 0);
  });

  it('appends missing keys without overwriting existing content', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scan-env-test-'));
    const envFile = path.join(tmpDir, '.env.example');

    fs.writeFileSync(envFile, 'EXISTING_VAR=123\n');

    const result = appendMissingKeys(envFile, ['NEW_VAR_A', 'NEW_VAR_B']);
    assert.strictEqual(result.count, 2);

    const updated = fs.readFileSync(envFile, 'utf8');
    assert.ok(updated.includes('EXISTING_VAR=123'));
    assert.ok(updated.includes('NEW_VAR_A='));
    assert.ok(updated.includes('NEW_VAR_B='));

    // Clean up
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('creates new file if not existing when appendMissingKeys is called', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scan-env-test-create-'));
    const envFile = path.join(tmpDir, '.env.example');

    const result = appendMissingKeys(envFile, ['FIRST_KEY']);
    assert.strictEqual(result.created, true);
    assert.strictEqual(result.count, 1);

    const content = fs.readFileSync(envFile, 'utf8');
    assert.ok(content.includes('FIRST_KEY='));

    // Clean up
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});
