/**
 * Terminal colors and styling without external dependencies.
 * Respects NO_COLOR env var and non-TTY environments unless overridden.
 */

const hasNoColor = 'NO_COLOR' in process.env;
let colorEnabled = !hasNoColor && (process.stdout?.isTTY ?? false);

export function setColorEnabled(enabled) {
  colorEnabled = enabled;
}

const codes = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  italic: '\x1b[3m',
  underline: '\x1b[4m',

  // Foreground colors
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  white: '\x1b[37m',

  // Bright
  brightRed: '\x1b[91m',
  brightGreen: '\x1b[92m',
  brightYellow: '\x1b[93m',
  brightCyan: '\x1b[96m',

  // Background
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
};

function style(code, str) {
  if (!colorEnabled) return String(str);
  return `${code}${str}${codes.reset}`;
}

export const c = {
  bold: (s) => style(codes.bold, s),
  dim: (s) => style(codes.dim, s),
  italic: (s) => style(codes.italic, s),
  red: (s) => style(codes.red, s),
  green: (s) => style(codes.green, s),
  yellow: (s) => style(codes.yellow, s),
  blue: (s) => style(codes.blue, s),
  cyan: (s) => style(codes.cyan, s),
  gray: (s) => style(codes.gray, s),
  brightRed: (s) => style(codes.brightRed, s),
  brightGreen: (s) => style(codes.brightGreen, s),
  brightYellow: (s) => style(codes.brightYellow, s),
  brightCyan: (s) => style(codes.brightCyan, s),
  bgRed: (s) => style(codes.bgRed, s),
  bgGreen: (s) => style(codes.bgGreen, s),
};

/**
 * Strip single-line and multi-line comments from JavaScript/TypeScript/Vue/Svelte code.
 * Replaces comments with whitespace to preserve character/line count for accurate line reporting.
 *
 * @param {string} code
 * @returns {string}
 */
export function stripComments(code) {
  let result = '';
  let i = 0;
  const len = code.length;
  let inString = false;
  let stringChar = '';
  let inRegex = false;

  while (i < len) {
    const ch = code[i];
    const next = code[i + 1];

    // String literal handling ('...', "...", `...`)
    if (inString) {
      result += ch;
      if (ch === '\\') {
        // Escaped character
        i++;
        if (i < len) result += code[i];
      } else if (ch === stringChar) {
        inString = false;
      }
      i++;
      continue;
    }

    // Check for comment start
    if (ch === '/' && next === '/') {
      // Single line comment: blank out until newline
      result += '  ';
      i += 2;
      while (i < len && code[i] !== '\n' && code[i] !== '\r') {
        result += ' ';
        i++;
      }
      continue;
    }

    if (ch === '/' && next === '*') {
      // Block comment: blank out until */
      result += '  ';
      i += 2;
      while (i < len && !(code[i] === '*' && code[i + 1] === '/')) {
        result += code[i] === '\n' ? '\n' : (code[i] === '\r' ? '\r' : ' ');
        i++;
      }
      if (i < len) {
        result += '  '; // replace */
        i += 2;
      }
      continue;
    }

    // Check for HTML comments (common in .vue, .svelte, .astro, .html templates)
    if (ch === '<' && code.slice(i, i + 4) === '<!--') {
      result += '    ';
      i += 4;
      while (i < len && code.slice(i, i + 3) !== '-->') {
        result += code[i] === '\n' ? '\n' : (code[i] === '\r' ? '\r' : ' ');
        i++;
      }
      if (i < len) {
        result += '   ';
        i += 3;
      }
      continue;
    }

    // Check if entering a string literal
    if (ch === '\'' || ch === '"' || ch === '`') {
      inString = true;
      stringChar = ch;
      result += ch;
      i++;
      continue;
    }

    result += ch;
    i++;
  }

  return result;
}
