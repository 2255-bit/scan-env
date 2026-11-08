const {
  DB_HOST,
  DB_USER = 'root',
  DB_PASSWORD: dbPass,
  REDIS_URL
} = process.env;

export { DB_HOST, DB_USER, REDIS_URL };
