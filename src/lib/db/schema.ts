// SCHEMA - Gestor de Estoque para Lojinha
// Produtos, vendas e itens de venda. 100% offline no navegador.

export const GENERIC_SCHEMA = `
  CREATE TABLE IF NOT EXISTS produtos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    codigo_barras TEXT UNIQUE,
    codigo_hash TEXT,
    categoria TEXT,
    preco_custo REAL DEFAULT 0,
    preco_venda REAL NOT NULL DEFAULT 0,
    estoque INTEGER NOT NULL DEFAULT 0,
    estoque_minimo INTEGER NOT NULL DEFAULT 5,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS vendas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    total REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL -- passado explicitamente em JS com fuso horário local
  );

  CREATE TABLE IF NOT EXISTS itens_venda (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    venda_id INTEGER NOT NULL REFERENCES vendas(id),
    produto_id INTEGER NOT NULL REFERENCES produtos(id),
    quantidade INTEGER NOT NULL,
    preco_unitario REAL NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_produtos_nome ON produtos(nome);
  CREATE INDEX IF NOT EXISTS idx_produtos_codigo ON produtos(codigo_barras);
  -- indice para busca por hash (nao UNIQUE: hash pode colidir)
  CREATE INDEX IF NOT EXISTS idx_produtos_hash ON produtos(codigo_hash);
  CREATE INDEX IF NOT EXISTS idx_itens_venda_venda ON itens_venda(venda_id);

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`;

/**
 * Gera hash curto do código para buscas eficientes.
 * Permite usar QR codes longos (URLs) como identificadores únicos.
 */
export function gerarCodigoHash(codigo: string): string {
  let hash = 0;
  for (let i = 0; i < codigo.length; i++) {
    const char = codigo.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 32bit integer
  }
  return Math.abs(hash).toString(36);
}
