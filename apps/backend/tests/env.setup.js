'use strict';

process.env.NODE_ENV = 'test';
process.env.SESSION_SECRET = 'test-secret-minimum-64-characters-for-itportal-sessions-testing-only-abc';
process.env.POSTGRES_HOST = 'localhost';
process.env.POSTGRES_PORT = '5432';
process.env.POSTGRES_DB = 'itportal';
process.env.POSTGRES_USER = 'itportal_user';
process.env.POSTGRES_PASSWORD = 'changeme';
process.env.BACKEND_PORT = '0';
