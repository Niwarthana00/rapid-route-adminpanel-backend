import app from './app.js';
import { config } from './config/env.js';
import { pool } from './config/database.js';
const server = app.listen(config.port, async () => {
    console.log(`====================================================`);
    console.log(`🚌 Rapid Route Backend API Server Running`);
    console.log(`🌐 Base URL: http://localhost:${config.port}/api/v1`);
    console.log(`🔧 Mode    : ${config.nodeEnv}`);
    console.log(`====================================================`);
    try {
        const res = await pool.query('SELECT current_database(), current_user, version()');
        console.log(` Connected to PostgreSQL: ${res.rows[0].current_database} as ${res.rows[0].current_user}`);
    }
    catch (err) {
        console.warn(`⚠️ PostgreSQL Connection Notice: ${err.message}`);
        console.warn(`  Ensure PostgreSQL is running and credentials in .env are correct.`);
    }
});
process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    server.close(() => {
        pool.end();
        process.exit(0);
    });
});
