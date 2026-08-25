'use client';
import { useEffect, useRef, useState, useCallback } from 'react';

interface ScannerBarraProps {
  onScan: (codigo: string) => void;
  onClose: () => void;
}

export function ScannerBarra({ onScan, onClose }: ScannerBarraProps) {
  const [status, setStatus] = useState<'loading' | 'scanning' | 'error' | 'done'>('loading');
  const [erro, setErro] = useState('');
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const [codigoLido, setCodigoLido] = useState('');
  const scannerRef = useRef<any>(null);
  const scannedRef = useRef(false);
  const mountedRef = useRef(true);
  const frameCountRef = useRef(0);
  const nativeDetectorRef = useRef<any>(null);

  function addDebug(msg: string) {
    console.log('[Scanner]', msg);
    setDebugLog(prev => [...prev.slice(-5), `[${new Date().toLocaleTimeString()}] ${msg}`]);
  }

  const pararScanner = useCallback(async () => {
    // Parar detector nativo
    if (nativeDetectorRef.current) {
      nativeDetectorRef.current = null;
    }
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState?.();
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

  /**
   * Fallback: usa BarcodeDetector nativo do browser (Chrome, Edge, Opera)
   * Funciona MELHOR que html5-qrcode em muitos dispositivos Android.
   */
  async function iniciarScannerNativo() {
    addDebug('Tentando BarcodeDetector nativo...');

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
    });

    const containerEl = document.getElementById('scanner-container');
    if (!containerEl) { stream.getTracks().forEach(t => t.stop()); return; }
    containerEl.innerHTML = '';

    const video = document.createElement('video');
    video.srcObject = stream;
    video.setAttribute('playsinline', 'true');
    video.autoplay = true;
    video.muted = true;
    video.style.width = '100%';
    video.style.borderRadius = '12px';
    containerEl.appendChild(video);

    await video.play();
    addDebug('Câmera nativa ativa');

    const BarcodeDetector = (globalThis as any).BarcodeDetector;
    if (!BarcodeDetector) {
      stream.getTracks().forEach(t => t.stop());
      throw new Error('BarcodeDetector não suportado neste browser');
    }

    const detector = new BarcodeDetector({
      formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'code_93', 'itf', 'qr_code']
    });
    nativeDetectorRef.current = detector;

    if (mountedRef.current) setStatus('scanning');
    frameCountRef.current = 0;

    async function scanLoop() {
      if (!mountedRef.current || scannedRef.current || !nativeDetectorRef.current) {
        stream.getTracks().forEach(t => t.stop());
        return;
      }

      try {
        const barcodes = await detector.detect(video);
        frameCountRef.current++;

        if (frameCountRef.current % 30 === 0) {
          addDebug(`Frames processados: ${frameCountRef.current}`);
        }

        if (barcodes.length > 0) {
          const code = barcodes[0].rawValue;
          addDebug(`✓ Detectado: ${code} (${barcodes[0].format})`);
          scannedRef.current = true;
          stream.getTracks().forEach(t => t.stop());
          nativeDetectorRef.current = null;
          setCodigoLido(code);
          if (mountedRef.current) setStatus('done');
          // Delay para o usuário ver o código que foi lido antes de fechar
          setTimeout(() => { onScan(code); }, 2500);
          return;
        }
      } catch (e: any) {
        if (frameCountRef.current % 60 === 0) {
          addDebug(`Erro detect: ${e.message}`);
        }
      }

      // Continua o loop
      requestAnimationFrame(scanLoop);
    }

    requestAnimationFrame(scanLoop);
  }

  /**
   * Fallback: usa html5-qrcode (ZXing WASM) se BarcodeDetector não existir
   */
  async function iniciarScannerZXing() {
    addDebug('Usando html5-qrcode (ZXing WASM)...');

    const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode');

    const containerEl = document.getElementById('scanner-container');
    if (!containerEl) return;
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

    const config: any = {
      fps: 10,
      aspectRatio: 1.0,
      disableFlip: false,
    };

    frameCountRef.current = 0;

    await scanner.start(
      { facingMode: 'environment' },
      config,
      (decodedText) => {
        if (scannedRef.current) return;
        scannedRef.current = true;
        addDebug(`✓ Detectado ZXing: ${decodedText}`);
        setCodigoLido(decodedText);
        if (mountedRef.current) setStatus('done');
        scanner.stop().catch(() => {});
        scannerRef.current = null;
        // Delay para o usuário ver o código lido
        setTimeout(() => { onScan(decodedText); }, 2500);
      },
      (errorMessage) => {
        // Conta frames silenciosamente
        frameCountRef.current++;
        if (frameCountRef.current % 50 === 0) {
          addDebug(`ZXing frames: ${frameCountRef.current} (não detectado ainda)`);
        }
      }
    );

    if (mountedRef.current) setStatus('scanning');
  }

  async function iniciarScanner() {
    setErro('');
    setStatus('loading');
    scannedRef.current = false;
    frameCountRef.current = 0;
    setDebugLog([]);

    try {
      // Verifica suporte a BarcodeDetector nativo
      const hasNative = typeof (globalThis as any).BarcodeDetector !== 'undefined';
      addDebug(`BarcodeDetector nativo: ${hasNative ? 'SIM' : 'NÃO'}`);

      if (hasNative) {
        await iniciarScannerNativo();
      } else {
        await iniciarScannerZXing();
      }
    } catch (e: any) {
      console.error('[Scanner] Erro:', e);
      addDebug(`ERRO: ${e.message}`);

      // Se o nativo falhar, tenta ZXing como último recurso
      if (status === 'loading') {
        try {
          addDebug('Fallback: tentando ZXing...');
          await iniciarScannerZXing();
          return;
        } catch (e2: any) {
          addDebug(`ERRO ZXing: ${e2.message}`);
        }
      }

      if (mountedRef.current) {
        setErro(e?.message || 'Erro ao acessar a câmera.');
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
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/80 rounded-b-none">
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
                  Aponte para o código de barras — segure firme por 3s
                </p>
              </div>
            </div>
          )}

          {status === 'done' && (
            <div className="absolute inset-0 flex items-center justify-center bg-green-600/80">
              <div className="text-center">
                <p className="text-white text-4xl mb-2">✓</p>
                <p className="text-white text-lg font-bold">Código lido!</p>
                {codigoLido && (
                  <p className="text-white text-2xl font-mono font-extrabold mt-2 bg-black/30 rounded-lg px-4 py-2">
                    {codigoLido}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Debug log — SEMPRE visível (remover depois de debugar) */}
        {debugLog.length > 0 && (
          <div className="mx-4 mt-3 p-3 bg-yellow-50 border-2 border-yellow-400 rounded-lg text-xs text-yellow-900 font-mono space-y-1">
            <div className="font-bold text-yellow-700 text-[11px] mb-1">⚠️ DEBUG (remover depois)</div>
            {debugLog.map((log, i) => <div key={i}>{log}</div>)}
          </div>
        )}

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