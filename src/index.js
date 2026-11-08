import path from 'node:path';
import { scanProject, extractEnvVars, walkDir, DEFAULT_EXTENSIONS, DEFAULT_IGNORES } from './scanner.js';
import { parseEnvContent, readEnvExample, appendMissingKeys } from './env-parser.js';
import { stripComments } from './utils.js';

/**
 * Programmatic API to scan and audit environment variables.
 *
 * @param {object} options
 * @param {string} [options.dir=process.cwd()] Directory to scan
 * @param {string} [options.example='.env.example'] Path to .env.example file
 * @param {string[]} [options.extensions] File extensions to scan
 * @param {string[]} [options.ignores] Directory names to ignore
 * @param {string[]} [options.ignoreVars] Variable names to ignore
 * @param {boolean} [options.fix=false] Whether to append missing keys automatically
 * @returns {{
 *   success: boolean,
 *   filesScanned: number,
 *   scannedFiles: string[],
 *   detectedKeys: string[],
 *   exampleKeys: string[],
 *   missingKeys: string[],
 *   unusedKeys: string[],
 *   fixed: boolean,
 *   fixedCount: number
 * }}
 */
export function scanEnv(options = {}) {
  const dir = path.resolve(options.dir || process.cwd());
  const examplePath = path.isAbsolute(options.example || '.env.example')
    ? options.example || '.env.example'
    : path.join(dir, options.example || '.env.example');

  const scanResult = scanProject({
    dir,
    extensions: options.extensions || DEFAULT_EXTENSIONS,
    ignores: options.ignores || DEFAULT_IGNORES,
    ignoreVars: options.ignoreVars || [],
  });

  const envData = readEnvExample(examplePath);
  const detectedKeys = Array.from(scanResult.variables.keys()).sort();
  const exampleKeys = Array.from(envData.keys).sort();

  const missingKeys = detectedKeys.filter((key) => !envData.keys.has(key));
  const ignoredVars = new Set(options.ignoreVars || []);
  const unusedKeys = exampleKeys.filter(
    (key) => !scanResult.variables.has(key) && !ignoredVars.has(key)
  );

  let fixed = false;
  let fixedCount = 0;

  if (options.fix && missingKeys.length > 0) {
    const res = appendMissingKeys(examplePath, missingKeys);
    fixed = true;
    fixedCount = res.count;
  }

  return {
    success: missingKeys.length === 0 || fixed,
    filesScanned: scanResult.filesScanned,
    scannedFiles: scanResult.scannedFiles,
    detectedKeys,
    exampleKeys,
    missingKeys: fixed ? [] : missingKeys,
    unusedKeys,
    variablesMap: scanResult.variables,
    fixed,
    fixedCount,
  };
}

export {
  extractEnvVars,
  scanProject,
  walkDir,
  parseEnvContent,
  readEnvExample,
  appendMissingKeys,
  stripComments,
  DEFAULT_EXTENSIONS,
  DEFAULT_IGNORES,
};
