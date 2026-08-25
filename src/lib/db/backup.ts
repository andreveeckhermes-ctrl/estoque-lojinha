import { get, set } from 'idb-keyval';

export async function exportDatabase() {
  const saved = await get('sqlite-db-file') as ArrayBuffer | undefined;
  if (!saved) throw new Error('Nenhum banco encontrado para backup');
  
  const blob = new Blob([saved], { type: 'application/x-sqlite3' });
  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'app';
  const date = new Date().toISOString().slice(0,10);
  const fileName = `backup-${appName}-${date}.db`;
  
  // download
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importDatabase(file: File) {
  const buffer = await file.arrayBuffer();
  
  // validação header SQLite
  const header = new TextDecoder().decode(new Uint8Array(buffer).slice(0, 16));
  if (!header.includes('SQLite format 3')) {
    throw new Error('Arquivo inválido. Selecione um backup .db válido.');
  }

  const confirmReplace = confirm('Isso irá substituir TODOS os dados atuais. Essa ação não pode ser desfeita. Deseja continuar?');
  if (!confirmReplace) return;

  await set('sqlite-db-file', buffer);
  window.location.reload();
}
