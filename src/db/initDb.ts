import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { config } from '../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function initDatabase() {
  console.log('🚀 Initializing PostgreSQL Database Schema...');

  // First connect to default 'postgres' database to ensure rapid_route exists
  const adminClient = new pg.Client({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: 'postgres',
  });

  try {
    await adminClient.connect();
    const dbCheck = await adminClient.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [config.db.database]
    );

    if (dbCheck.rows.length === 0) {
      console.log(`Creating database "${config.db.database}"...`);
      await adminClient.query(`CREATE DATABASE "${config.db.database}"`);
      console.log(`Database "${config.db.database}" created successfully.`);
    } else {
      console.log(`Database "${config.db.database}" already exists.`);
    }
  } catch (err: any) {
    console.warn(`Admin client notice (if DB already exists or non-superuser): ${err.message}`);
  } finally {
    await adminClient.end();
  }

  // Now connect to rapid_route database and run 01_schema.sql
  const targetClient = new pg.Client(
    config.db.connectionString
      ? { connectionString: config.db.connectionString }
      : {
          host: config.db.host,
          port: config.db.port,
          user: config.db.user,
          password: config.db.password,
          database: config.db.database,
        }
  );

  try {
    await targetClient.connect();
    const schemaPath = path.resolve(__dirname, '../../01_schema.sql');
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found at ${schemaPath}`);
    }

    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    console.log(`Applying 01_schema.sql to "${config.db.database}"...`);
    await targetClient.query(schemaSql);
    console.log('01_schema.sql applied successfully!');
  } catch (err: any) {
    console.error('Error applying schema:', err.message);
  } finally {
    await targetClient.end();
  }
}

initDatabase();
