'use client';
import { useRef } from 'react';
import { exportDatabase, importDatabase } from '@/lib/db/backup';

export function BackupControls() {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex gap-2">
      <button
        onClick={() => exportDatabase().catch(e => alert(e.message))}
        className="px-4 py-2 bg-black text-white rounded-lg text-sm"
      >
        Exportar Backup
      </button>
      
      <button
        onClick={() => inputRef.current?.click()}
        className="px-4 py-2 border rounded-lg text-sm"
      >
        Importar Backup
      </button>
      
      <input
        ref={inputRef}
        type="file"
        accept=".db,.sqlite,.sqlite3"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) importDatabase(file).catch(err => alert(err.message));
        }}
      />
    </div>
  );
}
