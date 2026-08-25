'use client';
import { useEffect, useRef, useState, useCallback } from 'react';

interface ScannerBarraProps {
  onScan: (codigo: string) => void;
  onClose: () => void;
}

export function ScannerBarra({ onScan, onClose }: ScannerBarraProps) {
  const [status, setStatus] = useState<'loading' | 'scanning' | 'error' | 'done'>('loading');
  const [erro, setErro] = useState('');
  const scannerRef = useRef<any>(null);
  const scannedRef = useRef(false);
  const mountedRef = useRef(true);

  const pararScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        // 2 = SCANNING, 3 = PAUSED
        if (state === 2 || state === 3) {
          await scannerRef.current.stop();
        }
      } catch {}
      scannerRef.current = null;
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      pararScanner();
    };
  }, [pararScanner]);

  async function iniciarScanner() {
    setErro('');
    setStatus('loading');
    scannedRef.current = false;

    try {
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode');

      // Garante que container existe e está vazio
      const containerEl = document.getElementById('scanner-container');
      if (!containerEl) {
        throw new Error('Container do scanner não encontrado');
      }
      containerEl.innerHTML = '';

      const scanner = new Html5Qrcode('scanner-container', {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.CODE_93,
          Html5QrcodeSupportedFormats.ITF,
          Html5QrcodeSupportedFormats.QR_CODE,
        ],
        verbose: false,
      });

      if (!mountedRef.current) return;
      scannerRef.current = scanner;

      // SEM qrbox — escanear o frame inteiro da câmera
      // Quando tinha qrbox o código precisava estar perfeitamente
      // dentro da caixa. Sem qrbox, qualquer posição na câmera funciona.
      const config: any = {
        fps: 10,
        aspectRatio: 1.0,
        disableFlip: false,
      };

      // Tenta BarcodeDetector nativo (Chrome Android funciona bem)
      if (typeof (globalThis as any).BarcodeDetector !== 'undefined') {
        config.experimentalFeatures = { useBarCodeDetectorIfSupported: true };
      }

      await scanner.start(
        { facingMode: 'environment' },
        config,
        (decodedText) => {
          if (scannedRef.current) return;
          scannedRef.current = true;
          setStatus('done');
          // Para o scanner antes de chamar onScan
          scanner.stop().catch(() => {});
          scannerRef.current = null;
          onScan(decodedText);
        },
        (_errorMessage) => {
          // Normal — cada frame que não decodifica chama isso.
          // Não logar para não spammar o console.
        }
      );

      if (mountedRef.current) {
        setStatus('scanning');
      }
    } catch (e: any) {
      console.error('[ScannerBarra] Erro:', e);
      if (mountedRef.current) {
        setErro(e?.message || 'Erro ao acessar a câmera. Verifique as permissões.');
        setStatus('error');
      }
    }
  }

  // Auto-iniciar quando o componente monta
  useEffect(() => {
    iniciarScanner();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleClose() {
    pararScanner();
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="text-base font-bold text-zinc-900">📷 Escanear Código</h3>
          <button
            onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-100 text-zinc-500"
          >
            ✕
          </button>
        </div>

        {/* Scanner area */}
        <div className="relative">
          <div
            id="scanner-container"
            className="w-full"
            style={{ minHeight: 280 }}
          />

          {/* Overlay de status */}
          {status === 'loading' && (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/80">
              <div className="text-center">
                <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-3" />
                <p className="text-white text-sm">Abrindo câmera...</p>
              </div>
            </div>
          )}

          {status === 'scanning' && (
            <div className="absolute inset-x-0 bottom-0 p-3">
              <div className="bg-black/50 backdrop-blur rounded-lg px-3 py-2 text-center">
                <p className="text-white text-xs font-medium">
                  📷 Aponte para o código de barras do produto
                </p>
              </div>
            </div>
          )}

          {status === 'done' && (
            <div className="absolute inset-0 flex items-center justify-center bg-green-600/80">
              <p className="text-white text-lg font-bold">✓ Código lido!</p>
            </div>
          )}
        </div>

        {/* Erro */}
        {erro && (
          <div className="mx-4 mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {erro}
          </div>
        )}

        {/* Controles */}
        <div className="p-4 space-y-2">
          {status === 'error' && (
            <button
              onClick={iniciarScanner}
              className="w-full py-2.5 bg-blue-600 text-white rounded-xl font-medium text-sm hover:bg-blue-700"
            >
              Tentar novamente
            </button>
          )}

          <button
            onClick={handleClose}
            className="w-full py-2.5 border border-zinc-200 rounded-xl text-sm text-zinc-600 hover:bg-zinc-50"
          >
            Digitar código manualmente
          </button>
        </div>
      </div>
    </div>
  );
}