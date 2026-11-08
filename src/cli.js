import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { scanProject, DEFAULT_EXTENSIONS, DEFAULT_IGNORES } from './scanner.js';
import { readEnvExample, appendMissingKeys } from './env-parser.js';
import { printReport, formatJsonResult } from './reporter.js';
import { c, setColorEnabled } from './utils.js';

const pkg = JSON.parse(
  fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8')
);

const HELP_TEXT = `
${c.brightCyan(c.bold('scan-env'))} v${pkg.version}
${pkg.description}

${c.bold('USAGE:')}
  ${c.cyan('$')} npx scan-env [directory] [options]

${c.bold('OPTIONS:')}
  ${c.brightYellow('-f, --fix')}            Automatically append missing variables to your env template
  ${c.brightYellow('-e, --example <file>')} Path to template file ${c.dim('(default: .env.example)')}
  ${c.brightYellow('-d, --dir <path>')}     Root directory to scan ${c.dim('(default: current directory)')}
  ${c.brightYellow('-i, --ignore <dirs>')}  Comma-separated folder names to ignore ${c.dim('(e.g. tests,scripts)')}
  ${c.brightYellow('--include <exts>')}     Comma-separated file extensions to scan ${c.dim('(e.g. .ts,.tsx,.vue)')}
  ${c.brightYellow('--ignore-vars <vars>')} Comma-separated variable names to ignore ${c.dim('(e.g. NODE_ENV,PORT)')}
  ${c.brightYellow('-w, --warn-unused')}    Warn about variables in template not used in code
  ${c.brightYellow('--json')}               Output results in pure JSON format
  ${c.brightYellow('-q, --quiet')}          Quiet mode: only outputs missing keys, minimal stdout
  ${c.brightYellow('--no-color')}           Disable ANSI terminal color output
  ${c.brightYellow('--color')}              Force ANSI terminal color output
  ${c.brightYellow('-v, --version')}        Show current version
  ${c.brightYellow('-h, --help')}           Show this help manual

${c.bold('EXAMPLES:')}
  ${c.dim('# Audit current project')}
  ${c.cyan('$')} npx scan-env

  ${c.dim('# Automatically append missing variables to .env.example')}
  ${c.cyan('$')} npx scan-env --fix

  ${c.dim('# Audit a monorepo workspace with custom template file')}
  ${c.cyan('$')} npx scan-env apps/frontend --example apps/frontend/.env.template

  ${c.dim('# Ignore common system variables')}
  ${c.cyan('$')} npx scan-env --ignore-vars NODE_ENV,PORT

  ${c.dim('# Use in CI / pre-commit to block failing builds (exits with code 1 on mismatch)')}
  ${c.cyan('$')} npx scan-env || exit 1
`;

export function runCli(argv = process.argv.slice(2)) {
  const optionsConfig = {
    help: { type: 'boolean', short: 'h' },
    version: { type: 'boolean', short: 'v' },
    fix: { type: 'boolean', short: 'f' },
    example: { type: 'string', short: 'e', default: '.env.example' },
    dir: { type: 'string', short: 'd' },
    ignore: { type: 'string', short: 'i' },
    include: { type: 'string' },
    'ignore-vars': { type: 'string' },
    'warn-unused': { type: 'boolean', short: 'w' },
    json: { type: 'boolean' },
    quiet: { type: 'boolean', short: 'q' },
    color: { type: 'boolean' },
    'no-color': { type: 'boolean' },
  };

  let values;
  let positionals;

  try {
    const parsed = parseArgs({
      args: argv,
      options: optionsConfig,
      allowPositionals: true,
      strict: false,
    });
    values = parsed.values;
    positionals = parsed.positionals;
  } catch (err) {
    console.error(`${c.brightRed('Error:')} ${err.message}`);
    process.exit(2);
  }

  if (values.color) {
    setColorEnabled(true);
  } else if (values['no-color'] || values.json) {
    setColorEnabled(false);
  }

  if (values.help) {
    console.log(HELP_TEXT);
    process.exit(0);
  }

  if (values.version) {
    console.log(pkg.version);
    process.exit(0);
  }

  const scanDir = values.dir || positionals[0] || '.';
  const resolvedScanDir = path.resolve(scanDir);

  const customIgnores = values.ignore
    ? values.ignore.split(',').map((s) => s.trim()).filter(Boolean)
    : [];
  const mergedIgnores = Array.from(new Set([...DEFAULT_IGNORES, ...customIgnores]));

  const customExtensions = values.include
    ? values.include
        .split(',')
        .map((s) => (s.startsWith('.') ? s.trim() : `.${s.trim()}`))
        .filter(Boolean)
    : DEFAULT_EXTENSIONS;

  const ignoredVars = values['ignore-vars']
    ? values['ignore-vars'].split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  function resolveExamplePath(targetDir, exampleOpt) {
    if (path.isAbsolute(exampleOpt)) {
      return exampleOpt;
    }
    // Check relative to targetDir first
    const fromTarget = path.resolve(targetDir, exampleOpt);
    if (fs.existsSync(fromTarget)) {
      return fromTarget;
    }
    // Then check relative to current working directory
    const fromCwd = path.resolve(process.cwd(), exampleOpt);
    if (fs.existsSync(fromCwd)) {
      return fromCwd;
    }
    // If creating a new file, prefer targetDir if exampleOpt is a simple filename
    if (path.dirname(exampleOpt) === '.') {
      return fromTarget;
    }
    return fromCwd;
  }

  const examplePath = resolveExamplePath(resolvedScanDir, values.example);

  const scanResult = scanProject({
    dir: resolvedScanDir,
    extensions: customExtensions,
    ignores: mergedIgnores,
    ignoreVars: ignoredVars,
  });

  const envData = readEnvExample(examplePath);

  // Compute missing variables (found in code, but not in .env.example)
  const missing = [];
  for (const varName of scanResult.variables.keys()) {
    if (!envData.keys.has(varName)) {
      missing.push(varName);
    }
  }
  missing.sort();

  // Compute unused variables (found in .env.example, but not in code)
  const unused = [];
  for (const key of envData.keys) {
    if (!scanResult.variables.has(key) && !ignoredVars.includes(key)) {
      unused.push(key);
    }
  }
  unused.sort();

  let fixed = false;
  let fixedCount = 0;

  if (values.fix && missing.length > 0) {
    const res = appendMissingKeys(examplePath, missing);
    fixed = true;
    fixedCount = res.count;
    // Update local state after fix
    for (const key of missing) {
      envData.keys.add(key);
    }
  }

  if (values.json) {
    console.log(
      formatJsonResult({
        examplePath: path.relative(process.cwd(), examplePath) || examplePath,
        exampleExists: envData.exists || fixed,
        filesScanned: scanResult.filesScanned,
        scannedFiles: scanResult.scannedFiles,
        codeVars: scanResult.variables,
        exampleKeys: envData.keys,
        missing: fixed ? [] : missing,
        unused,
        fixed,
        fixedCount,
      })
    );
  } else {
    printReport({
      examplePath: path.relative(process.cwd(), examplePath) || examplePath,
      exampleExists: envData.exists,
      filesScanned: scanResult.filesScanned,
      codeVars: scanResult.variables,
      exampleKeys: envData.keys,
      missing,
      unused,
      fixed,
      fixedCount,
      warnUnused: Boolean(values['warn-unused']),
      quiet: Boolean(values.quiet),
    });
  }

  // Determine exit code
  // If --fix was run, we remediated so return 0
  // Otherwise, return 1 if there are missing keys, 0 if in sync
  if (!fixed && missing.length > 0) {
    process.exit(1);
  }

  // If example file didn't exist and not fixing, return 1 or 2
  if (!envData.exists && !fixed) {
    process.exit(1);
  }

  process.exit(0);
}
