import { Knex } from 'knex';

const config: { [key: string]: Knex.Config } = {
  development: {
    client: 'pg',
    connection: {
      host: process.env.PGHOST || '127.0.0.1',
      user: process.env.PGUSER || 'lab',
      password: process.env.PGPASSWORD || 'lab',
      database: process.env.PGDATABASE || 'labdb',
      port: Number(process.env.PGPORT || 5432),
    },
    migrations: {
      directory: __dirname + '/migrations'
    },
    seeds: {
      directory: __dirname + '/seeds'
    }
  }
};

export default config;
