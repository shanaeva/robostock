import 'reflect-metadata';
import { inject } from 'vitest';

declare module 'vitest' {
  interface ProvidedContext {
    testDatabaseUrl: string;
  }
}

process.env.NODE_ENV = 'test';
process.env.PORT = '3000';
process.env.DATABASE_URL = inject('testDatabaseUrl');
