import { get, set } from 'idb-keyval';
import { gerarCodigoHash } from './schema';

let SQL: any = null;

export async function getDb() {
  if (typeof window === 'undefined') return null;

  // @ts-ignore
  const initSqlJs = (await import('sql.js')).default;
  if (!SQL) {
    // Busca WASM manualmente para evitar problemas de locateFile em produção
    const wasmResp = await fetch('/sql-wasm.wasm');
    const wasmBinary = await wasmResp.arrayBuffer();
    SQL = await initSqlJs({ wasmBinary });
  }

  const savedDb = await get('sqlite-db-file') as ArrayBuffer | undefined;

  if (savedDb) {
    const db = new SQL.Database(new Uint8Array(savedDb));
    migrarSchema(db);
    return db;
  }

  const db = new SQL.Database();
  const { GENERIC_SCHEMA } = await import('./schema');
  db.run(GENERIC_SCHEMA);
  return db;
}

/**
 * Migração incremental — roda toda vez que o banco abre.
 * Resolve:
 *  - Coluna codigo_hash ausente (DB muito antigo)
 *  - Coluna codigo_hash com UNIQUE constraint (DB da versão anterior)
 *  - Index idx_produtos_hash como UNIQUE (deve ser normal)
 */
function migrarSchema(db: any) {
  try {
    const res = db.exec("PRAGMA table_info(produtos)");
    if (!res.length) return;

    const cols: { name: string; notnull: number; dflt_value: any; pk: number }[] =
      res[0].values.map((r: any[]) => ({ name: r[1], notnull: r[3], dflt_value: r[4], pk: r[5] }));

    const temHash = cols.some(c => c.name === 'codigo_hash');

    if (!temHash) {
      // DB muito antigo — coluna não existe ainda
      db.run("ALTER TABLE produtos ADD COLUMN codigo_hash TEXT");
      popularHashes(db);
    } else {
      // Verifica se a coluna tem UNIQUE (da versão bugada)
      const hashCol = cols.find(c => c.name === 'codigo_hash');
      const tableInfo = db.exec("SELECT sql FROM sqlite_master WHERE type='table' AND name='produtos'");
      const createSql = tableInfo.length ? tableInfo[0].values[0][0] as string : '';
      const hasUnique = createSql.includes('codigo_hash') && /codigo_hash\s+TEXT\s+UNIQUE/i.test(createSql);

      if (hasUnique) {
        console.log('[DB Migration].codigo_hash tem UNIQUE — recriando tabela...');
        recrearTabelaProdutos(db);
      }
    }

    // Corrige index: remove UNIQUE antigo, recria como normal
    try {
      db.run("DROP INDEX IF EXISTS idx_produtos_hash");
      db.run("CREATE INDEX IF NOT EXISTS idx_produtos_hash ON produtos(codigo_hash)");
    } catch {}
  } catch (e) {
    console.error('[DB Migration] Erro:', e);
  }
}

/** Popula codigo_hash para produtos existentes que têm codigo_barras */
function popularHashes(db: any) {
  try {
    const produtos = db.exec("SELECT id, codigo_barras FROM produtos WHERE codigo_barras IS NOT NULL AND codigo_barras != ''");
    if (!produtos.length) return;
    for (const row of produtos[0].values) {
      const id = row[0];
      const codigo = row[1];
      if (codigo) {
        try {
          db.run("UPDATE produtos SET codigo_hash = ? WHERE id = ?", [gerarCodigoHash(codigo), id]);
        } catch {}
      }
    }
  } catch {}
}

/**
 * Recria a tabela produtos sem UNIQUE no codigo_hash.
 * SQLite não suporta ALTER COLUMN para remover constraints.
 */
function recrearTabelaProdutos(db: any) {
  // 1. Salvar dados existentes
  const dados = db.exec("SELECT id, nome, codigo_barras, codigo_hash, categoria, preco_custo, preco_venda, estoque, estoque_minimo, created_at FROM produtos");
  const rows = dados.length ? dados[0].values : [];

  // 2. Drop antigo e criar novo sem UNIQUE
  db.run("DROP TABLE IF EXISTS produtos_backup");
  db.run("ALTER TABLE produtos RENAME TO produtos_backup");

  db.run(`
    CREATE TABLE produtos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      codigo_barras TEXT,
      codigo_hash TEXT,
      categoria TEXT,
      preco_custo REAL DEFAULT 0,
      preco_venda REAL NOT NULL DEFAULT 0,
      estoque INTEGER NOT NULL DEFAULT 0,
      estoque_minimo INTEGER NOT NULL DEFAULT 5,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 3. Copiar dados de volta
  for (const row of rows) {
    db.run(
      "INSERT INTO produtos (id, nome, codigo_barras, codigo_hash, categoria, preco_custo, preco_venda, estoque, estoque_minimo, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      row
    );
  }

  // 4. Copiar índices e sequences
  db.run("CREATE INDEX IF NOT EXISTS idx_produtos_nome ON produtos(nome)");
  db.run("CREATE INDEX IF NOT EXISTS idx_produtos_codigo ON produtos(codigo_barras)");

  // 5. Limpar
  db.run("DROP TABLE IF EXISTS produtos_backup");

  // 6. Popular hashes que possam estar faltando
  popularHashes(db);
}

export async function saveDb(db: any) {
  const data = db.export();
  await set('sqlite-db-file', data.buffer);
}

export async function clearDb() {
  await set('sqlite-db-file', undefined);
}
