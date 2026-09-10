/**
 * Database Configuration and Connection
 * 
 * PostgreSQL with PostGIS extension for geospatial operations
 * Optimized for East African deployment with connection pooling
 */

import { Pool, PoolClient } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'boda_platform',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  // SSL configuration for production
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

/**
 * Test database connection
 */
export async function connectDatabase(): Promise<void> {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    console.log('PostgreSQL connection established at:', result.rows[0].now);
    
    // Verify PostGIS extension is available
    try {
      const postgisCheck = await pool.query('SELECT PostGIS_Version()');
      console.log('PostGIS enabled:', postgisCheck.rows[0].postgis_version);
    } catch (error) {
      console.warn('PostGIS not enabled. Run: CREATE EXTENSION IF NOT EXISTS postgis;');
    }
  } catch (error) {
    console.error('Database connection failed:', error);
    throw error;
  }
}

/**
 * Execute a query with automatic connection management
 */
export async function query<T = any>(
  text: string,
  params?: any[]
): Promise<{ rows: T[]; rowCount: number | null }> {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return { rows: result.rows as T[], rowCount: result.rowCount };
  } finally {
    client.release();
  }
}

/**
 * Execute a transaction with automatic rollback on error
 */
export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Close database connection pool
 */
export async function closeDatabase(): Promise<void> {
  await pool.end();
  console.log('Database connection pool closed');
}

export default pool;
