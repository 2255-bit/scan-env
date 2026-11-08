import { c } from './utils.js';

/**
 * Prints formatted report to the console based on scan results.
 *
 * @param {object} params
 * @param {string} params.examplePath
 * @param {boolean} params.exampleExists
 * @param {number} params.filesScanned
 * @param {Map<string, Array<{ file: string, line: number }>>} params.codeVars
 * @param {Set<string>} params.exampleKeys
 * @param {string[]} params.missing
 * @param {string[]} params.unused
 * @param {boolean} params.fixed
 * @param {number} params.fixedCount
 * @param {boolean} params.warnUnused
 * @param {boolean} params.quiet
 */
export function printReport({
  examplePath,
  exampleExists,
  filesScanned,
  codeVars,
  exampleKeys,
  missing,
  unused,
  fixed = false,
  fixedCount = 0,
  warnUnused = false,
  quiet = false,
}) {
  if (quiet) {
    if (missing.length > 0 && !fixed) {
      for (const m of missing) {
        console.log(m);
      }
    }
    return;
  }

  console.log();
  console.log(`${c.brightCyan(c.bold('scan-env'))} ${c.dim('• Zero-dependency env auditor')}`);
  console.log(c.dim('─'.repeat(50)));

  console.log(
    `${c.dim('Scanned:')} ${c.bold(filesScanned)} files  ${c.dim('|')}  ` +
    `${c.dim('Detected:')} ${c.bold(codeVars.size)} env vars  ${c.dim('|')}  ` +
    `${c.dim('Target:')} ${c.bold(examplePath)} ${exampleExists ? c.dim(`(${exampleKeys.size} defined)`) : c.yellow('(file not found)')}`
  );
  console.log();

  if (fixed) {
    console.log(
      `${c.brightGreen('✔')} ${c.bold(`Fixed:`)} Successfully added ${c.bold(fixedCount)} missing variable${fixedCount > 1 ? 's' : ''} to ${examplePath}.`
    );
    console.log();
    return;
  }

  if (missing.length === 0) {
    console.log(
      `${c.brightGreen('✔')} ${c.bold('Perfect sync!')} All ${codeVars.size} environment variable${codeVars.size === 1 ? '' : 's'} are documented in ${examplePath}.`
    );
  } else {
    console.log(
      `${c.brightRed('✖')} ${c.bold(`Integrity error:`)} ${missing.length} undeclared variable${missing.length > 1 ? 's' : ''} missing in ${c.yellow(examplePath)}:`
    );
    console.log();

    for (const varName of missing) {
      console.log(`  ${c.brightRed('●')} ${c.bold(varName)}`);
      const occurrences = codeVars.get(varName) || [];
      const displayOccurrences = occurrences.slice(0, 5);

      for (const occ of displayOccurrences) {
        console.log(`    ${c.gray('↳')} ${occ.file}:${c.brightYellow(occ.line)}`);
      }

      if (occurrences.length > 5) {
        console.log(`    ${c.gray(`...and ${occurrences.length - 5} more occurrence(s)`)}`);
      }
    }

    console.log();
    console.log(
      `${c.cyan('➜')} ${c.dim('Run with')} ${c.bold('scan-env --fix')} ${c.dim('to automatically add missing keys.')}`
    );
  }

  if (warnUnused && unused.length > 0) {
    console.log();
    console.log(
      `${c.yellow('▲')} ${c.bold(`Notice:`)} ${unused.length} variable${unused.length > 1 ? 's' : ''} declared in ${examplePath} but not referenced in scanned code:`
    );
    for (const u of unused) {
      console.log(`  ${c.dim('-')} ${c.yellow(u)}`);
    }
  }

  console.log();
}

/**
 * Returns structured JSON representation of the scan result.
 */
export function formatJsonResult({
  examplePath,
  exampleExists,
  filesScanned,
  scannedFiles,
  codeVars,
  exampleKeys,
  missing,
  unused,
  fixed,
  fixedCount,
}) {
  const missingDetailed = missing.map((name) => ({
    name,
    occurrences: codeVars.get(name) || [],
  }));

  return JSON.stringify(
    {
      success: missing.length === 0 || fixed,
      targetExample: examplePath,
      targetExampleExists: exampleExists,
      filesScanned,
      scannedFiles,
      detectedKeys: Array.from(codeVars.keys()).sort(),
      exampleKeys: Array.from(exampleKeys).sort(),
      missingKeys: missing,
      missing: missingDetailed,
      unusedKeys: unused,
      fixed,
      fixedCount,
    },
    null,
    2
  );
}
