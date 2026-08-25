import { get, set } from 'idb-keyval';

let SQL: any = null;

export async function getDb() {
  if (typeof window === 'undefined') return null;
  
  // @ts-ignore
  const initSqlJs = (await import('sql.js')).default;
  if (!SQL) {
    SQL = await initSqlJs({
      locateFile: (file: string) => `/${file}`
    });
  }

  const savedDb = await get('sqlite-db-file') as ArrayBuffer | undefined;
  
  if (savedDb) {
    return new SQL.Database(new Uint8Array(savedDb));
  }
  
  const db = new SQL.Database();
  // importa schema generico
  const { GENERIC_SCHEMA } = await import('./schema');
  db.run(GENERIC_SCHEMA);
  return db;
}

export async function saveDb(db: any) {
  const data = db.export();
  await set('sqlite-db-file', data.buffer);
}

export async function clearDb() {
  await set('sqlite-db-file', undefined);
}
