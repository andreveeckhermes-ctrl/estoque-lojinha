// Exportação de dados — Excel (CSV) e PDF (via impressão do navegador)
// 100% client-side, sem dependências externas.

/**
 * Exporta uma matriz de linhas como CSV compatível com Excel pt-BR.
 * Usa separador ";" e BOM UTF-8 para acentuação correta.
 */
export function exportCSV(nomeArquivo: string, cabecalho: string[], linhas: (string | number)[][]) {
  const escapar = (v: string | number) => {
    const s = String(v ?? '');
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const csv = [cabecalho, ...linhas].map(l => l.map(escapar).join(';')).join('\r\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${nomeArquivo}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

interface PDFSecao {
  titulo?: string;
  cabecalho?: string[];
  linhas: (string | number)[][];
}

interface PDFOpts {
  titulo: string;
  subtitulo?: string;
  secoes: PDFSecao[];
  /** FREE => adiciona marca d'água diagonal */
  isPro: boolean;
  appName?: string;
}

/**
 * Gera um PDF via janela de impressão do navegador (Ctrl+P -> Salvar como PDF).
 * No plano FREE aplica marca d'água diagonal "VERSÃO FREE".
 */
export function exportPDF({ titulo, subtitulo, secoes, isPro, appName = 'Estoque Lojinha' }: PDFOpts) {
  const data = new Date().toLocaleString('pt-BR');

  const tabelaHTML = (sec: PDFSecao) => {
    const th = sec.cabecalho?.map(c => `<th>${c}</th>`).join('') ?? '';
    const tr = sec.linhas
      .map(l => `<tr>${l.map(c => `<td>${String(c ?? '')}</td>`).join('')}</tr>`)
      .join('');
    return `
      ${sec.titulo ? `<h2>${sec.titulo}</h2>` : ''}
      ${sec.cabecalho ? `<table><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table>` : ''}
    `;
  };

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="utf-8" />
      <title>${titulo} — ${appName}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: 'Segoe UI', Arial, sans-serif;
          color: #18181b;
          padding: 40px;
          position: relative;
        }
        header { border-bottom: 3px solid #15803d; padding-bottom: 16px; margin-bottom: 24px; }
        header h1 { font-size: 22px; color: #15803d; }
        header p { font-size: 12px; color: #71717a; margin-top: 4px; }
        h2 { font-size: 15px; margin: 24px 0 8px; color: #18181b; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th {
          background: #f4f4f5; text-align: left;
          padding: 8px; border-bottom: 2px solid #e4e4e7;
        }
        td { padding: 7px 8px; border-bottom: 1px solid #f4f4f5; }
        footer {
          margin-top: 40px; padding-top: 12px;
          border-top: 1px solid #e4e4e7;
          font-size: 10px; color: #a1a1aa; text-align: center;
        }
        ${isPro ? '' : `
        .marca-dagua {
          position: fixed; top: 50%; left: 50%;
          transform: translate(-50%, -50%) rotate(-35deg);
          font-size: 90px; font-weight: 800;
          color: rgba(0, 0, 0, 0.06);
          white-space: nowrap; pointer-events: none; z-index: -1;
        }`}
        @media print { .marca-dagua { position: fixed; } }
      </style>
    </head>
    <body>
      ${isPro ? '' : '<div class="marca-dagua">VERSÃO FREE</div>'}
      <header>
        <h1>${titulo}</h1>
        <p>${subtitulo ? subtitulo + ' — ' : ''}${appName} • Gerado em ${data}</p>
      </header>
      ${secoes.map(tabelaHTML).join('')}
      <footer>
        © ${new Date().getFullYear()} ${appName} — Dados salvos localmente no seu dispositivo.
      </footer>
    </body>
    </html>
  `;

  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) {
    alert('Permita pop-ups para exportar o PDF.');
    return;
  }
  win.document.write(html);
  win.document.close();
  win.focus();
  // Aguarda render antes de abrir o diálogo de impressão
  setTimeout(() => win.print(), 400);
}
