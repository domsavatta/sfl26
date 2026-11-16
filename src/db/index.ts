import sql from 'mssql';

const sqlConfig = {
  user: process.env.SFL_DB_USER,
  password: process.env.SFL_DB_PASSWORD,
  database: process.env.SFL_DB_NAME,
  server: process.env.SFL_DB_SERVER,
  requestTimeout: 300000,
  port: 1433,
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
  options: {
    encrypt: true, // for azure
    trustServerCertificate: process.env.TRUST_DB_CERT === 'true' ? true : false, // change to true for local dev / self-signed certs
  },
} as sql.config;

export type QueryParams = Record<string, string | number | boolean | Date | null>;

/**
 * Runs a query. Pass user-supplied values as `params` and reference them as
 * `@name` in the SQL — never build them into the SQL string. Param values
 * are not logged.
 */
export function query<Type>(query: string, params: QueryParams = {}) {
  return sql.connect(sqlConfig).then((pool: sql.ConnectionPool) => {
    console.log('Executing query:\n\n-----------\n', query, '\n\n------------\n');
    const request = pool.request();
    for (const [name, value] of Object.entries(params)) {
      request.input(name, value);
    }
    return request.query<Type>(query);
  });
}

export function pool() {
  return sql.connect(sqlConfig);
}
