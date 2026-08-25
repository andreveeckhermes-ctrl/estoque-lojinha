'use client';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md text-center">
        <div className="text-4xl mb-4">😵</div>
        <h2 className="text-xl font-bold text-zinc-900 mb-2">Algo deu errado</h2>
        <p className="text-sm text-zinc-500 mb-6">
          Ocorreu um erro inesperado. Tente recarregar a página.
        </p>
        <button
          onClick={reset}
          className="btn-primary px-6 py-2.5 rounded-full text-sm font-medium"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  );
}
