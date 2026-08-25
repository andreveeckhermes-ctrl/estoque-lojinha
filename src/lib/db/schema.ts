// SCHEMA - Gestor de Estoque para Lojinha
// Produtos, vendas e itens de venda. 100% offline no navegador.

export const GENERIC_SCHEMA = `
  CREATE TABLE IF NOT EXISTS produtos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    codigo_barras TEXT UNIQUE,
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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
  CREATE INDEX IF NOT EXISTS idx_itens_venda_venda ON itens_venda(venda_id);

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`;
