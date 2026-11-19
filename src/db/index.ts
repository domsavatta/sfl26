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

/**
 * A table-valued parameter (a user-defined table type, e.g. dbo.MakePicks).
 * Columns must be in the type's column order.
 */
export type TableParam = {
  tableType: string; // e.g. "dbo.MakePicks"
  columns: { name: string; type: 'int' | 'bit' }[];
  rows: (number | boolean)[][];
};

export type QueryParams = Record<
  string,
  string | number | boolean | Date | null | TableParam
>;

function toTable(param: TableParam) {
  const [schema, name] = param.tableType.includes('.')
    ? param.tableType.split('.')
    : ['dbo', param.tableType];
  const table = new sql.Table(name);
  table.schema = schema;
  for (const col of param.columns) {
    table.columns.add(col.name, col.type === 'int' ? sql.Int : sql.Bit);
  }
  for (const row of param.rows) table.rows.add(...row);
  return table;
}

/** Adds `params` to a request as inputs (table params as TVPs). */
export function addParams(request: sql.Request, params: QueryParams) {
  for (const [name, value] of Object.entries(params)) {
    if (value && typeof value === 'object' && 'tableType' in value) {
      request.input(name, sql.TVP, toTable(value));
    } else {
      request.input(name, value);
    }
  }
  return request;
}

/**
 * Runs a query. Pass user-supplied values as `params` and reference them as
 * `@name` in the SQL — never build them into the SQL string. Param values
 * are not logged.
 */
export function query<Type>(query: string, params: QueryParams = {}) {
  return sql.connect(sqlConfig).then((pool: sql.ConnectionPool) => {
    console.log('Executing query:\n\n-----------\n', query, '\n\n------------\n');
    return addParams(pool.request(), params).query<Type>(query);
  });
}

export function pool() {
  return sql.connect(sqlConfig);
}
