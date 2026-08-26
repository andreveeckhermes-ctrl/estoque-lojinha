import { getDb, saveDb } from './client';
import { gerarCodigoHash } from './schema';

export interface Produto {
  id: number;
  nome: string;
  codigo_barras: string | null;
  codigo_hash: string | null;
  categoria: string | null;
  preco_custo: number;
  preco_venda: number;
  estoque: number;
  estoque_minimo: number;
  created_at: string;
}

export interface Venda {
  id: number;
  total: number;
  created_at: string;
}

export interface ItemVendaInput {
  produto_id: number;
  quantidade: number;
  preco_unitario: number;
}

function rowsToProdutos(result: any[]): Produto[] {
  if (!result.length) return [];
  return result[0].values.map((v: any[]) => ({
    id: v[0],
    nome: v[1],
    codigo_barras: v[2],
    codigo_hash: v[3],
    categoria: v[4],
    preco_custo: v[5],
    preco_venda: v[6],
    estoque: v[7],
    estoque_minimo: v[8],
    created_at: v[9],
  }));
}

const PRODUTO_COLS = 'id, nome, codigo_barras, codigo_hash, categoria, preco_custo, preco_venda, estoque, estoque_minimo, created_at';

export async function listarProdutos(busca?: string): Promise<Produto[]> {
  const db = await getDb();
  if (!db) return [];
  let res;
  if (busca) {
    res = db.exec(
      `SELECT ${PRODUTO_COLS} FROM produtos WHERE nome LIKE ? OR codigo_barras LIKE ? ORDER BY nome`,
      [`%${busca}%`, `%${busca}%`]
    );
  } else {
    res = db.exec(`SELECT ${PRODUTO_COLS} FROM produtos ORDER BY nome`);
  }
  return rowsToProdutos(res);
}

export async function contarProdutos(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const res = db.exec('SELECT COUNT(*) FROM produtos');
  return res.length ? (res[0].values[0][0] as number) : 0;
}

export async function criarProduto(p: Omit<Produto, 'id' | 'created_at'>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  try {
    const codigoHash = p.codigo_barras ? gerarCodigoHash(p.codigo_barras) : null;
    db.run(
      `INSERT INTO produtos (nome, codigo_barras, codigo_hash, categoria, preco_custo, preco_venda, estoque, estoque_minimo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [p.nome, p.codigo_barras || null, codigoHash, p.categoria || null, p.preco_custo, p.preco_venda, p.estoque, p.estoque_minimo]
    );
    await saveDb(db);
  } catch (e) {
    console.error('[criarProduto] Erro:', e);
    // Tenta sem codigo_hash (DB antigo sem a coluna)
    db.run(
      `INSERT INTO produtos (nome, codigo_barras, categoria, preco_custo, preco_venda, estoque, estoque_minimo)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [p.nome, p.codigo_barras || null, p.categoria || null, p.preco_custo, p.preco_venda, p.estoque, p.estoque_minimo]
    );
    await saveDb(db);
  }
}

export async function atualizarProduto(p: Produto): Promise<void> {
  const db = await getDb();
  if (!db) return;
  try {
    const codigoHash = p.codigo_barras ? gerarCodigoHash(p.codigo_barras) : null;
    db.run(
      `UPDATE produtos SET nome=?, codigo_barras=?, codigo_hash=?, categoria=?, preco_custo=?, preco_venda=?, estoque=?, estoque_minimo=? WHERE id=?`,
      [p.nome, p.codigo_barras || null, codigoHash, p.categoria || null, p.preco_custo, p.preco_venda, p.estoque, p.estoque_minimo, p.id]
    );
    await saveDb(db);
  } catch (e) {
    console.error('[atualizarProduto] Erro:', e);
    db.run(
      `UPDATE produtos SET nome=?, codigo_barras=?, categoria=?, preco_custo=?, preco_venda=?, estoque=?, estoque_minimo=? WHERE id=?`,
      [p.nome, p.codigo_barras || null, p.categoria || null, p.preco_custo, p.preco_venda, p.estoque, p.estoque_minimo, p.id]
    );
    await saveDb(db);
  }
}

export async function excluirProduto(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  db.run('DELETE FROM produtos WHERE id=?', [id]);
  await saveDb(db);
}

export async function registrarVenda(itens: ItemVendaInput[]): Promise<{ ok: boolean; erro?: string }> {
  const db = await getDb();
  if (!db) return { ok: false, erro: 'Banco indisponível' };

  // Valida estoque antes de qualquer escrita
  for (const item of itens) {
    const res = db.exec('SELECT estoque, nome FROM produtos WHERE id=?', [item.produto_id]);
    if (!res.length || !res[0].values.length) return { ok: false, erro: 'Produto não encontrado' };
    const [estoque, nome] = res[0].values[0] as [number, string];
    if (estoque < item.quantidade) {
      return { ok: false, erro: `Estoque insuficiente para "${nome}" (disponível: ${estoque})` };
    }
  }

  const total = itens.reduce((acc, i) => acc + i.quantidade * i.preco_unitario, 0);
  db.run('BEGIN TRANSACTION');
  try {
    const agora = new Date().toLocaleString('sv-SE', { timeZone: 'America/Sao_Paulo' }).replace(' ', 'T');
    db.run('INSERT INTO vendas (total, created_at) VALUES (?, ?)', [total, agora]);
    const vendaId = db.exec('SELECT last_insert_rowid()')[0].values[0][0] as number;
    for (const item of itens) {
      db.run(
        'INSERT INTO itens_venda (venda_id, produto_id, quantidade, preco_unitario) VALUES (?, ?, ?, ?)',
        [vendaId, item.produto_id, item.quantidade, item.preco_unitario]
      );
      db.run('UPDATE produtos SET estoque = estoque - ? WHERE id=?', [item.quantidade, item.produto_id]);
    }
    db.run('COMMIT');
  } catch (e: any) {
    db.run('ROLLBACK');
    return { ok: false, erro: e.message };
  }
  await saveDb(db);
  return { ok: true };
}

export async function listarVendas(limite = 50): Promise<Venda[]> {
  const db = await getDb();
  if (!db) return [];
  const res = db.exec('SELECT id, total, created_at FROM vendas ORDER BY id DESC LIMIT ?', [limite]);
  if (!res.length) return [];
  return res[0].values.map((v: any[]) => ({ id: v[0], total: v[1], created_at: v[2] }));
}

export async function buscarProdutoPorCodigo(codigo: string): Promise<Produto | null> {
  const db = await getDb();
  if (!db || !codigo.trim()) return null;
  
  // Busca primeiro por código exato
  let res = db.exec(`SELECT ${PRODUTO_COLS} FROM produtos WHERE codigo_barras = ? LIMIT 1`, [codigo.trim()]);
  let produtos = rowsToProdutos(res);
  if (produtos.length > 0) return produtos[0];
  
  // Se não achou, busca por hash (útil para QR codes longos/URLs)
  const hash = gerarCodigoHash(codigo.trim());
  res = db.exec(`SELECT ${PRODUTO_COLS} FROM produtos WHERE codigo_hash = ? LIMIT 1`, [hash]);
  produtos = rowsToProdutos(res);
  return produtos[0] ?? null;
}

export async function buscarProdutoPorId(id: number): Promise<Produto | null> {
  const db = await getDb();
  if (!db) return null;
  const res = db.exec(`SELECT ${PRODUTO_COLS} FROM produtos WHERE id = ? LIMIT 1`, [id]);
  const produtos = rowsToProdutos(res);
  return produtos[0] ?? null;
}

/**
 * Detecta se o texto escaneado é um link do app e extrai o ID do produto.
 * Formatos aceitos:
 *  - https://estoque-lojinha.vercel.app/produto/123
 *  - https://estoque-lojinha.vercel.app/app?produto=123
 *  - /produto/123
 *  - produto/123
 */
export function extrairProdutoIdDaUrl(texto: string): number | null {
  const t = texto.trim();

  // Formato: /produto/{id} ou https://dominio/produto/{id}
  const matchProduto = t.match(/\/produto\/(\d+)/);
  if (matchProduto) return Number(matchProduto[1]);

  // Formato: ?produto={id} na query string
  const matchQuery = t.match(/[?&]produto=(\d+)/);
  if (matchQuery) return Number(matchQuery[1]);

  return null;
}

/** Gera a URL de um produto para QR code */
export function gerarUrlProduto(produtoId: number): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/produto/${produtoId}`;
  }
  return `/produto/${produtoId}`;
}

export async function incrementarEstoque(id: number, qtd = 1): Promise<void> {
  const db = await getDb();
  if (!db) return;
  db.run('UPDATE produtos SET estoque = estoque + ? WHERE id = ?', [qtd, id]);
  await saveDb(db);
}

export async function contarVendasMes(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const res = db.exec(
    `SELECT COUNT(*) FROM vendas WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now', 'localtime')`
  );
  return res.length ? (res[0].values[0][0] as number) : 0;
}

export async function contarVendasHoje(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const res = db.exec(
    `SELECT COUNT(*) FROM vendas WHERE date(created_at) = date('now', 'localtime')`
  );
  return res.length ? (res[0].values[0][0] as number) : 0;
}

export async function totalVendasHoje(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const res = db.exec(
    `SELECT COALESCE(SUM(total), 0) FROM vendas WHERE date(created_at) = date('now', 'localtime')`
  );
  return res.length ? (res[0].values[0][0] as number) : 0;
}

// ==================== RELATÓRIOS ====================

export interface ProdutoMaisVendido {
  produto_id: number;
  nome: string;
  categoria: string | null;
  total_vendido: number;
  receita: number;
}

export interface CurvaItem {
  produto_id: number;
  nome: string;
  receita: number;
  percentual: number;
  acumulado: number;
  classificacao: 'A' | 'B' | 'C';
}

export interface ResumoLucro {
  totalVendas: number;
  receitaTotal: number;
  custoTotal: number;
  lucroBruto: number;
  margemLucro: number;
}

export async function resumoLucro(periodo?: 'hoje' | 'mes' | 'ano'): Promise<ResumoLucro> {
  const db = await getDb();
  if (!db) return { totalVendas: 0, receitaTotal: 0, custoTotal: 0, lucroBruto: 0, margemLucro: 0 };

  let whereVendas = '';
  if (periodo === 'hoje') whereVendas = "WHERE date(v.created_at) = date('now', 'localtime')";
  else if (periodo === 'mes') whereVendas = "WHERE strftime('%Y-%m', v.created_at) = strftime('%Y-%m', 'now', 'localtime')";
  else if (periodo === 'ano') whereVendas = "WHERE strftime('%Y', v.created_at) = strftime('%Y', 'now', 'localtime')";

  // Total de vendas e receita
  const resVendas = db.exec(
    `SELECT COUNT(*), COALESCE(SUM(total), 0) FROM vendas v ${whereVendas}`
  );
  const totalVendas = resVendas.length ? (resVendas[0].values[0][0] as number) : 0;
  const receitaTotal = resVendas.length ? (resVendas[0].values[0][1] as number) : 0;

  // Custo total (soma de custo * quantidade dos itens)
  const resCusto = db.exec(
    `SELECT COALESCE(SUM(iv.quantidade * p.preco_custo), 0)
     FROM itens_venda iv
     JOIN vendas v ON v.id = iv.venda_id
     JOIN produtos p ON p.id = iv.produto_id
     ${whereVendas}`
  );
  const custoTotal = resCusto.length ? (resCusto[0].values[0][0] as number) : 0;

  const lucroBruto = receitaTotal - custoTotal;
  const margemLucro = receitaTotal > 0 ? (lucroBruto / receitaTotal) * 100 : 0;

  return { totalVendas, receitaTotal, custoTotal, lucroBruto, margemLucro };
}

export async function produtosMaisVendidos(limite = 10): Promise<ProdutoMaisVendido[]> {
  const db = await getDb();
  if (!db) return [];

  const res = db.exec(
    `SELECT iv.produto_id, p.nome, p.categoria, SUM(iv.quantidade) as total_vendido, SUM(iv.quantidade * iv.preco_unitario) as receita
     FROM itens_venda iv
     JOIN produtos p ON p.id = iv.produto_id
     GROUP BY iv.produto_id
     ORDER BY receita DESC
     LIMIT ?`,
    [limite]
  );

  if (!res.length) return [];
  return res[0].values.map((v: any[]) => ({
    produto_id: v[0],
    nome: v[1],
    categoria: v[2],
    total_vendido: v[3],
    receita: v[4],
  }));
}

export async function curvaABC(): Promise<CurvaItem[]> {
  const db = await getDb();
  if (!db) return [];

  const res = db.exec(
    `SELECT iv.produto_id, p.nome, SUM(iv.quantidade * iv.preco_unitario) as receita
     FROM itens_venda iv
     JOIN produtos p ON p.id = iv.produto_id
     GROUP BY iv.produto_id
     ORDER BY receita DESC`
  );

  if (!res.length) return [];

  const items: { produto_id: number; nome: string; receita: number }[] = res[0].values.map((v: any[]) => ({
    produto_id: v[0],
    nome: v[1],
    receita: v[2] as number,
  }));

  const receitaTotal = items.reduce((acc: number, i) => acc + i.receita, 0);
  let acumulado = 0;

  return items.map(item => {
    const percentual = receitaTotal > 0 ? (item.receita / receitaTotal) * 100 : 0;
    acumulado += percentual;
    let classificacao: 'A' | 'B' | 'C' = 'C';
    if (acumulado <= 80) classificacao = 'A';
    else if (acumulado <= 95) classificacao = 'B';
    return { ...item, percentual, acumulado, classificacao };
  });
}

export async function produtosEstoqueBaixo(): Promise<Produto[]> {
  const db = await getDb();
  if (!db) return [];
  const res = db.exec(
    `SELECT ${PRODUTO_COLS} FROM produtos WHERE estoque <= estoque_minimo ORDER BY estoque ASC`
  );
  return rowsToProdutos(res);
}
