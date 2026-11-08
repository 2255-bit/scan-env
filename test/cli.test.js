import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

const CLI_PATH = path.resolve('bin/scan-env.js');

describe('CLI Integration Tests', () => {
  it('outputs help text with -h or --help', () => {
    const output = execSync(`node "${CLI_PATH}" --help`, { encoding: 'utf8' });
    assert.ok(output.includes('USAGE:'));
    assert.ok(output.includes('--fix'));
    assert.ok(output.includes('--example'));
  });

  it('outputs version with -v or --version', () => {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const output = execSync(`node "${CLI_PATH}" --version`, { encoding: 'utf8' }).trim();
    assert.strictEqual(output, pkg.version);
  });

  it('exits with code 1 when variables are missing in .env.example', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scan-env-cli-fail-'));
    const sampleCode = path.join(tmpDir, 'app.js');
    const envFile = path.join(tmpDir, '.env.example');

    fs.writeFileSync(sampleCode, 'const token = process.env.SECRET_TOKEN;\n');
    fs.writeFileSync(envFile, 'OTHER_VAR=1\n');

    let errorThrown = false;
    let exitCode = 0;

    try {
      execSync(`node "${CLI_PATH}" "${tmpDir}" --example .env.example`, {
        encoding: 'utf8',
        stdio: 'pipe',
      });
    } catch (err) {
      errorThrown = true;
      exitCode = err.status;
    }

    assert.strictEqual(errorThrown, true);
    assert.strictEqual(exitCode, 1);

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('exits with code 0 and outputs valid JSON with --json', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scan-env-cli-json-'));
    const sampleCode = path.join(tmpDir, 'app.js');
    const envFile = path.join(tmpDir, '.env.example');

    fs.writeFileSync(sampleCode, 'const token = process.env.MY_TOKEN;\n');
    fs.writeFileSync(envFile, 'MY_TOKEN=\n');

    const output = execSync(`node "${CLI_PATH}" "${tmpDir}" --example .env.example --json`, {
      encoding: 'utf8',
    });

    const parsed = JSON.parse(output);
    assert.strictEqual(parsed.success, true);
    assert.deepStrictEqual(parsed.missingKeys, []);
    assert.ok(parsed.detectedKeys.includes('MY_TOKEN'));

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('automatically remediates missing keys with --fix', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scan-env-cli-fix-'));
    const sampleCode = path.join(tmpDir, 'service.ts');
    const envFile = path.join(tmpDir, '.env.example');

    fs.writeFileSync(sampleCode, 'export const key = process.env.API_SECRET_KEY;\n');
    fs.writeFileSync(envFile, 'INITIAL_KEY=test\n');

    // Run with --fix
    const output = execSync(`node "${CLI_PATH}" "${tmpDir}" --example .env.example --fix`, {
      encoding: 'utf8',
    });

    assert.ok(output.includes('Successfully added'));

    // Check .env.example content
    const updated = fs.readFileSync(envFile, 'utf8');
    assert.ok(updated.includes('API_SECRET_KEY='));

    // Now run again without --fix, should succeed with exit code 0
    const verifyOutput = execSync(`node "${CLI_PATH}" "${tmpDir}" --example .env.example`, {
      encoding: 'utf8',
    });
    assert.ok(verifyOutput.includes('Perfect sync!'));

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('honors --ignore-vars in CLI', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scan-env-cli-ignvars-'));
    const sampleCode = path.join(tmpDir, 'app.js');
    const envFile = path.join(tmpDir, '.env.example');

    fs.writeFileSync(sampleCode, 'const nodeEnv = process.env.NODE_ENV;\n');
    fs.writeFileSync(envFile, '');

    const output = execSync(
      `node "${CLI_PATH}" "${tmpDir}" --example .env.example --ignore-vars NODE_ENV`,
      { encoding: 'utf8' }
    );
    assert.ok(output.includes('Perfect sync!'));

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('outputs minimal output with --quiet', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scan-env-cli-quiet-'));
    const sampleCode = path.join(tmpDir, 'app.js');
    const envFile = path.join(tmpDir, '.env.example');

    fs.writeFileSync(sampleCode, 'const k = process.env.QUIET_TEST_KEY;\n');
    fs.writeFileSync(envFile, '');

    try {
      execSync(`node "${CLI_PATH}" "${tmpDir}" --example .env.example --quiet`, {
        encoding: 'utf8',
        stdio: 'pipe',
      });
      assert.fail('Should have exited with code 1');
    } catch (err) {
      assert.strictEqual(err.status, 1);
      assert.strictEqual(err.stdout.trim(), 'QUIET_TEST_KEY');
    }

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});
