import pg from 'pg';
import { config } from './env.js';
const { Pool } = pg;
export const pool = new Pool(config.db.connectionString
    ? { connectionString: config.db.connectionString }
    : {
        host: config.db.host,
        port: config.db.port,
        user: config.db.user,
        password: config.db.password,
        database: config.db.database,
    });
// pool error logging
pool.on('error', (err) => {
    console.error('Unexpected error on idle PostgreSQL client', err);
});
export const query = async (text, params) => {
    const start = Date.now();
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development' && duration > 500) {
        console.log('Executed query', { text: text.slice(0, 80), duration, rows: res.rowCount });
    }
    return res;
};
