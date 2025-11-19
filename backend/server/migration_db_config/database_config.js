module.exports = {
  development: {
    username: 'postgres',
    password: 'postgres',
    database: 'knowledge-base-db',
    host: 'localhost',
    dialect: 'postgres', // Make sure this is a string
  },
  test: {
    username: 'postgres',
    password: 'postgres',
    database: 'knowledge-base-db-test',
    host: 'localhost',
    dialect: 'postgres',
  },
  production: {
    username: 'postgres',
    password: 'postgres',
    database: 'knowledge-base-db-prod',
    host: 'localhost',
    dialect: 'postgres',
  },
};