import { test, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { extractEnvVars, scanProject } from '../src/scanner.js';
import { stripComments } from '../src/utils.js';

describe('Scanner & Extractor Tests', () => {
  it('strips single-line and multi-line comments while preserving line count', () => {
    const raw = `const a = 1; // comment
/* multi
line */
const b = 2;`;

    const cleaned = stripComments(raw);
    assert.strictEqual(cleaned.includes('comment'), false);
    assert.strictEqual(cleaned.includes('multi'), false);
    assert.strictEqual(cleaned.split('\n').length, raw.split('\n').length);
  });

  it('extracts direct dot notation and bracket notation from JS', () => {
    const content = fs.readFileSync(
      path.resolve('test/fixtures/sample-js.js'),
      'utf8'
    );
    const results = extractEnvVars(content, 'sample-js.js');
    const names = results.map((r) => r.name);

    assert.ok(names.includes('API_URL'));
    assert.ok(names.includes('DB_PORT'));
    assert.ok(names.includes('SECRET_KEY'));

    // Should NOT include commented out vars
    assert.strictEqual(names.includes('COMMENTED_VAR'), false);
    assert.strictEqual(names.includes('BLOCK_COMMENTED_VAR'), false);

    // Line check
    const apiUrlMatch = results.find((r) => r.name === 'API_URL');
    assert.strictEqual(apiUrlMatch.line, 2);
  });

  it('extracts import.meta.env and destructuring from TS', () => {
    const content = fs.readFileSync(
      path.resolve('test/fixtures/sample-ts.ts'),
      'utf8'
    );
    const results = extractEnvVars(content, 'sample-ts.ts');
    const names = results.map((r) => r.name);

    assert.ok(names.includes('VITE_API_URL'));
    assert.ok(names.includes('VITE_ANALYTICS_KEY'));
    assert.ok(names.includes('MODE'));
  });

  it('extracts multiline destructuring with default values and renaming', () => {
    const content = fs.readFileSync(
      path.resolve('test/fixtures/sample-destruct.js'),
      'utf8'
    );
    const results = extractEnvVars(content, 'sample-destruct.js');
    const names = results.map((r) => r.name);

    assert.ok(names.includes('DB_HOST'));
    assert.ok(names.includes('DB_USER'));
    assert.ok(names.includes('DB_PASSWORD'));
    assert.ok(names.includes('REDIS_URL'));
  });

  it('extracts env vars from Vue SFC files and ignores HTML comments', () => {
    const content = fs.readFileSync(
      path.resolve('test/fixtures/sample-vue.vue'),
      'utf8'
    );
    const results = extractEnvVars(content, 'sample-vue.vue');
    const names = results.map((r) => r.name);

    assert.ok(names.includes('SUPABASE_URL'));
    assert.ok(names.includes('NEXT_PUBLIC_SUPABASE_ANON_KEY'));
    assert.strictEqual(names.includes('TEMPLATE_COMMENTED_VAR'), false);
  });

  it('extracts env vars from Svelte and Astro components', () => {
    const svelteContent = fs.readFileSync(
      path.resolve('test/fixtures/sample-svelte.svelte'),
      'utf8'
    );
    const svelteVars = extractEnvVars(svelteContent, 'sample-svelte.svelte').map((r) => r.name);
    assert.ok(svelteVars.includes('VITE_GA_ID'));
    assert.ok(svelteVars.includes('BUILD_ID'));

    const astroContent = fs.readFileSync(
      path.resolve('test/fixtures/sample-astro.astro'),
      'utf8'
    );
    const astroVars = extractEnvVars(astroContent, 'sample-astro.astro').map((r) => r.name);
    assert.ok(astroVars.includes('PUBLIC_SITE_URL'));
    assert.ok(astroVars.includes('DATABASE_SECRET'));
  });

  it('extracts Bun and Deno env variables', () => {
    const content = fs.readFileSync(
      path.resolve('test/fixtures/sample-bun-deno.ts'),
      'utf8'
    );
    const names = extractEnvVars(content, 'sample-bun-deno.ts').map((r) => r.name);

    // Bun
    assert.ok(names.includes('BUN_SECRET_KEY'));
    assert.ok(names.includes('BUN_DATABASE_URL'));
    assert.ok(names.includes('BUN_PORT'));
    assert.ok(names.includes('BUN_HOST'));

    // Deno
    assert.ok(names.includes('DENO_APP_PORT'));
    assert.ok(names.includes('DENO_API_KEY'));
    assert.ok(names.includes('DENO_OPTIONAL_TOKEN'));
  });

  it('extracts NestJS ConfigService and config.get calls', () => {
    const content = fs.readFileSync(
      path.resolve('test/fixtures/sample-nestjs.ts'),
      'utf8'
    );
    const names = extractEnvVars(content, 'sample-nestjs.ts').map((r) => r.name);

    assert.ok(names.includes('NEST_DATABASE_URL'));
    assert.ok(names.includes('NEST_PORT'));
    assert.ok(names.includes('NEST_JWT_SECRET'));
    assert.ok(names.includes('NEST_REDIS_HOST'));
  });

  it('scans fixtures directory properly', () => {
    const res = scanProject({
      dir: path.resolve('test/fixtures'),
      ignores: ['node_modules'],
    });

    assert.ok(res.filesScanned >= 4);
    assert.ok(res.variables.has('API_URL'));
    assert.ok(res.variables.has('VITE_API_URL'));
    assert.ok(res.variables.has('SUPABASE_URL'));
  });
});
