import fs from 'node:fs';
import path from 'node:path';
import { stripComments } from './utils.js';

export const DEFAULT_EXTENSIONS = [
  '.js',
  '.mjs',
  '.cjs',
  '.jsx',
  '.ts',
  '.mts',
  '.cts',
  '.tsx',
  '.vue',
  '.svelte',
  '.astro',
  '.html',
];

export const DEFAULT_IGNORES = [
  'node_modules',
  '.git',
  '.github',
  'dist',
  'build',
  'out',
  '.next',
  '.nuxt',
  '.output',
  '.svelte-kit',
  '.astro',
  '.turbo',
  '.cache',
  'coverage',
  '.idea',
  '.vscode',
  'vendor',
];

/**
 * Calculates the line number in the source text given an index offset.
 * Line numbers are 1-based.
 *
 * @param {string} source
 * @param {number} index
 * @returns {number}
 */
export function getLineNumber(source, index) {
  let line = 1;
  for (let i = 0; i < index && i < source.length; i++) {
    if (source[i] === '\n') {
      line++;
    }
  }
  return line;
}

/**
 * Extracts env variable names and their positions from code content.
 *
 * @param {string} code
 * @param {string} [filePath='']
 * @returns {Array<{ name: string, file: string, line: number }>}
 */
export function extractEnvVars(code, filePath = '') {
  const cleanCode = stripComments(code);
  const results = [];
  const seenAtLine = new Set();

  function record(name, index) {
    if (!name || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) return;
    const line = getLineNumber(code, index);
    const key = `${name}:${line}`;
    if (!seenAtLine.has(key)) {
      seenAtLine.add(key);
      results.push({ name, file: filePath, line });
    }
  }

  // 1. Direct and bracket property accesses:
  // - process.env.VAR_NAME or process.env?.VAR_NAME
  // - process.env['VAR_NAME'] or process.env?.["VAR_NAME"]
  // - import.meta.env.VAR_NAME or import.meta.env?.VAR_NAME
  // - import.meta.env['VAR_NAME'] or import.meta.env?.["VAR_NAME"]
  // - Bun.env.VAR_NAME or Bun.env['VAR_NAME']
  const dotBracketRegex =
    /(?:process\.env|import\.meta\.env|Bun\.env)(?:\?\.)?(?:\.([a-zA-Z_][a-zA-Z0-9_]*)|\[\s*['"`]([a-zA-Z_][a-zA-Z0-9_]*)['"`]\s*\])/g;

  let match;
  while ((match = dotBracketRegex.exec(cleanCode)) !== null) {
    const varName = match[1] || match[2];
    record(varName, match.index);
  }

  // 2. Destructuring assignment:
  // e.g. const { FOO, BAR: renamed, BAZ = 'default' } = process.env;
  // or const { FOO } = import.meta.env;
  // or const { FOO } = Bun.env;
  // [^{}]+ ensures we do not match through an outer function or object brace.
  const destructuringRegex =
    /(?:(?:const|let|var)\s+|\(\s*)?\{([^{}]+)\}\s*=\s*(?:process\.env|import\.meta\.env|Bun\.env)/g;

  while ((match = destructuringRegex.exec(cleanCode)) !== null) {
    const patternGroup = match[1];
    const baseOffset = match.index + match[0].indexOf('{') + 1;

    // Pattern group may contain comma separated keys:
    // e.g. FOO, BAR: renamed, BAZ = 'default'
    const items = patternGroup.split(',');
    let currentOffset = baseOffset;

    for (const rawItem of items) {
      const trimmed = rawItem.trim();
      if (trimmed.length > 0) {
        // Find identifier before ':' or '='
        const itemMatch = /^\s*([a-zA-Z_][a-zA-Z0-9_]*)/.exec(rawItem);
        if (itemMatch) {
          const varName = itemMatch[1];
          const itemIndexInGroup = rawItem.indexOf(varName);
          record(varName, currentOffset + itemIndexInGroup);
        }
      }
      currentOffset += rawItem.length + 1; // +1 for the comma
    }
  }

  // 3. Deno environment access:
  // - Deno.env.get("VAR_NAME")
  // - Deno.env.has("VAR_NAME")
  // - Deno?.env?.get('VAR_NAME')
  const denoRegex =
    /Deno(?:\?\.|\.)env(?:\?\.|\.)(?:get|has)\s*\(\s*['"`]([a-zA-Z_][a-zA-Z0-9_]*)['"`]\s*\)/g;

  while ((match = denoRegex.exec(cleanCode)) !== null) {
    const varName = match[1];
    record(varName, match.index);
  }

  // 4. NestJS / ConfigService / config.get access:
  // - configService.get('VAR_NAME')
  // - this.configService.get<string>('VAR_NAME')
  // - this.configService.getOrThrow<number>('VAR_NAME')
  // - config.get('VAR_NAME')
  const configServiceRegex =
    /(?:\bthis\.configService|\bconfigService|\bconfig)(?:\?\.|\.)(?:get|getOrThrow)(?:<[^>]+>)?\s*\(\s*['"`]([a-zA-Z_][a-zA-Z0-9_]*)['"`]/g;

  while ((match = configServiceRegex.exec(cleanCode)) !== null) {
    const varName = match[1];
    record(varName, match.index);
  }

  return results;
}

/**
 * Recursively walks directory to collect files matching given criteria.
 *
 * @param {string} dir
 * @param {object} options
 * @param {string[]} options.extensions
 * @param {string[]} options.ignores
 * @returns {string[]}
 */
export function walkDir(dir, options = {}) {
  const extensions = options.extensions || DEFAULT_EXTENSIONS;
  const ignores = new Set(options.ignores || DEFAULT_IGNORES);
  const filesList = [];

  function walk(currentDir) {
    let entries;
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        if (!ignores.has(entry.name) && !entry.name.startsWith('.')) {
          walk(fullPath);
        }
      } else if (entry.isFile()) {
        // Skip .env files (.env, .env.local, .env.example, etc.)
        if (entry.name.startsWith('.env')) continue;

        // Skip minified and map files
        if (entry.name.endsWith('.min.js') || entry.name.endsWith('.map')) continue;

        const ext = path.extname(entry.name);
        if (extensions.includes(ext)) {
          filesList.push(fullPath);
        }
      }
    }
  }

  walk(dir);
  return filesList;
}

/**
 * Scans a project directory and extracts all environment variables.
 *
 * @param {object} options
 * @param {string} [options.dir=process.cwd()]
 * @param {string[]} [options.extensions]
 * @param {string[]} [options.ignores]
 * @param {string[]} [options.ignoreVars]
 * @returns {{ filesScanned: number, variables: Map<string, Array<{ file: string, line: number }>> }}
 */
export function scanProject(options = {}) {
  const dir = path.resolve(options.dir || process.cwd());
  const files = walkDir(dir, {
    extensions: options.extensions || DEFAULT_EXTENSIONS,
    ignores: options.ignores || DEFAULT_IGNORES,
  });

  const variablesMap = new Map();
  const ignoredVars = new Set(options.ignoreVars || []);

  for (const filePath of files) {
    let content;
    try {
      content = fs.readFileSync(filePath, 'utf8');
    } catch {
      continue;
    }

    const relativePath = path.relative(dir, filePath).replace(/\\/g, '/');
    const detected = extractEnvVars(content, relativePath);

    for (const item of detected) {
      if (ignoredVars.has(item.name)) continue;

      if (!variablesMap.has(item.name)) {
        variablesMap.set(item.name, []);
      }
      variablesMap.get(item.name).push({
        file: item.file,
        line: item.line,
      });
    }
  }

  return {
    filesScanned: files.length,
    scannedFiles: files.map((f) => path.relative(dir, f).replace(/\\/g, '/')),
    variables: variablesMap,
  };
}
