// Sample Bun & Deno source file
// Bun
const bunSecret = Bun.env.BUN_SECRET_KEY;
const bunDb = Bun.env['BUN_DATABASE_URL'];
const { BUN_PORT, BUN_HOST = 'localhost' } = Bun.env;

// Deno
const denoPort = Deno.env.get("DENO_APP_PORT");
const hasDenoKey = Deno.env.has('DENO_API_KEY');
const optDeno = Deno?.env?.get('DENO_OPTIONAL_TOKEN');

export { bunSecret, bunDb, BUN_PORT, denoPort, hasDenoKey, optDeno };
