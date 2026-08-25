import { get, set } from 'idb-keyval';
import { gerarCodigoHash } from './schema';

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
    const db = new SQL.Database(new Uint8Array(savedDb));
    // Migração automática: garante que o schema está atualizado
    migrarSchema(db);
    return db;
  }

  const db = new SQL.Database();
  // importa schema generico
  const { GENERIC_SCHEMA } = await import('./schema');
  db.run(GENERIC_SCHEMA);
  return db;
}

/**
 * Migração incremental — roda toda vez que o banco abre.
 * Adiciona colunas/índices que faltam sem quebrar dados existentes.
 */
function migrarSchema(db: any) {
  try {
    // Verifica se a coluna codigo_hash existe na tabela produtos
    const res = db.exec("PRAGMA table_info(produtos)");
    const temHash = res.length > 0 && res[0].values.some((col: any[]) => col[1] === 'codigo_hash');

    if (!temHash) {
      db.run("ALTER TABLE produtos ADD COLUMN codigo_hash TEXT");
      db.run("CREATE UNIQUE INDEX IF NOT EXISTS idx_produtos_hash ON produtos(codigo_hash)");

      // Popula o hash dos produtos existentes que têm codigo_barras
      const produtos = db.exec("SELECT id, codigo_barras FROM produtos WHERE codigo_barras IS NOT NULL AND codigo_barras != ''");
      if (produtos.length > 0) {
        for (const row of produtos[0].values) {
          const id = row[0];
          const codigo = row[1];
          if (codigo) {
            try {
              db.run("UPDATE produtos SET codigo_hash = ? WHERE id = ?", [gerarCodigoHash(codigo), id]);
            } catch {
              // Hash duplicado (dois produtos com mesmo código) — deixa null
            }
          }
        }
      }
    }
  } catch (e) {
    console.error('[DB Migration] Erro:', e);
  }
}

export async function saveDb(db: any) {
  const data = db.export();
  await set('sqlite-db-file', data.buffer);
}

export async function clearDb() {
  await set('sqlite-db-file', undefined);
}