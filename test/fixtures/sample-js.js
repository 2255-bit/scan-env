// Sample JavaScript file referencing env vars
const apiUrl = process.env.API_URL || 'http://localhost:3000';
const dbPort = process.env['DB_PORT'];
const secretKey = process.env?.["SECRET_KEY"];

// Commented variable that should NOT be detected:
// const ignored = process.env.COMMENTED_VAR;
/*
   const alsoIgnored = process.env.BLOCK_COMMENTED_VAR;
*/

export const config = {
  apiUrl,
  dbPort,
  secretKey,
};
