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
  const [formatoLido, setFormatoLido] = useState('');
  const scannerRef = useRef<any>(null);
  const scannedRef = useRef(false);
  const mountedRef = useRef(true);
  const frameCountRef = useRef(0);
  const nativeDetectorRef = useRef<any>(null);

  function addDebug(msg: string) {
    console.log('[Scanner]', msg);
    setDebugLog(prev => [...prev.slice(-8), msg]);
  }

  const pararScanner = useCallback(async () => {
    if (nativeDetectorRef.current) nativeDetectorRef.current = null;
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState?.();
        if (state === 2 || state === 3) await scannerRef.current.stop();
      } catch {}
      scannerRef.current = null;
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; pararScanner(); };
  }, [pararScanner]);

  // Aceita QUALQUER código — QR code, barcode, texto, URL
  function handleCodeDetected(code: string, format: string) {
    if (scannedRef.current) return;
    scannedRef.current = true;
    setCodigoLido(code);
    setFormatoLido(format);
    setStatus('done');
    addDebug(`✓ Detectado: ${code} (${format})`);

    setTimeout(() => {
      if (mountedRef.current) onScan(code);
    }, 2500);
  }

  async function iniciarScannerNativo() {
    addDebug('BarcodeDetector nativo...');

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
    addDebug('Câmera ativa ✓');

    const BarcodeDetector = (globalThis as any).BarcodeDetector;
    if (!BarcodeDetector) {
      stream.getTracks().forEach(t => t.stop());
      throw new Error('BarcodeDetector não suportado');
    }

    const detector = new BarcodeDetector({
      formats: ['qr_code', 'ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'itf']
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
        if (frameCountRef.current % 30 === 0) addDebug(`Escaneando... ${frameCountRef.current}`);

        if (barcodes.length > 0) {
          handleCodeDetected(barcodes[0].rawValue, barcodes[0].format);
        }
      } catch (e: any) {
        if (frameCountRef.current % 60 === 0) addDebug(`Erro: ${e.message}`);
      }
      requestAnimationFrame(scanLoop);
    }
    requestAnimationFrame(scanLoop);
  }

  async function iniciarScannerZXing() {
    addDebug('ZXing WASM...');
    const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode');

    const containerEl = document.getElementById('scanner-container');
    if (!containerEl) return;
    containerEl.innerHTML = '';

    const scanner = new Html5Qrcode('scanner-container', {
      formatsToSupport: [
        Html5QrcodeSupportedFormats.QR_CODE,
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.ITF,
      ],
      verbose: false,
    });

    if (!mountedRef.current) return;
    scannerRef.current = scanner;
    frameCountRef.current = 0;

    await scanner.start(
      { facingMode: 'environment' },
      { fps: 10, aspectRatio: 1.0, disableFlip: false } as any,
      (decodedText, result) => {
        if (scannedRef.current) return;
        const format = result?.result?.format?.formatName?.toLowerCase() || 'unknown';
        handleCodeDetected(decodedText, format);
      },
      () => {
        frameCountRef.current++;
        if (frameCountRef.current % 50 === 0) addDebug(`Escaneando... ${frameCountRef.current}`);
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
      const hasNative = typeof (globalThis as any).BarcodeDetector !== 'undefined';
      addDebug(`Nativo: ${hasNative ? 'SIM ✓' : 'NÃO'}`);

      if (hasNative) await iniciarScannerNativo();
      else await iniciarScannerZXing();
    } catch (e: any) {
      console.error('[Scanner] Erro:', e);
      addDebug(`ERRO: ${e.message}`);
      try {
        addDebug('Fallback ZXing...');
        await iniciarScannerZXing();
      } catch (e2: any) {
        addDebug(`ERRO ZXing: ${e2.message}`);
        if (mountedRef.current) { setErro(e?.message || 'Erro na câmera'); setStatus('error'); }
      }
    }
  }

  useEffect(() => { iniciarScanner(); /* eslint-disable-line */ }, []);

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="text-base font-bold text-zinc-900">📷 Escanear QR Code</h3>
          <button onClick={() => { pararScanner(); onClose(); }}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-100 text-zinc-500">✕</button>
        </div>

        <div className="relative">
          <div id="scanner-container" className="w-full" style={{ minHeight: 280 }} />

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
              <div className="bg-black/70 backdrop-blur rounded-lg px-3 py-2 text-center">
                <p className="text-white text-xs font-medium">
                  📱 Aponte para o <strong>QR Code</strong> do produto
                </p>
              </div>
            </div>
          )}

          {status === 'done' && (
            <div className="absolute inset-0 flex items-center justify-center bg-green-600/80">
              <div className="text-center px-4">
                <p className="text-white text-4xl mb-2">✓</p>
                <p className="text-white text-lg font-bold">Código lido!</p>
                {codigoLido && (
                  <p className="text-white text-sm font-mono mt-2 bg-black/30 rounded-lg px-3 py-2 break-all">
                    {codigoLido}
                  </p>
                )}
                {formatoLido && (
                  <p className="text-white/70 text-xs mt-1">Formato: {formatoLido}</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Debug — REMOVER DEPOIS */}
        {debugLog.length > 0 && (
          <div className="mx-4 mt-3 p-3 bg-yellow-50 border-2 border-yellow-400 rounded-lg text-xs text-yellow-900 font-mono space-y-1">
            <div className="font-bold text-yellow-700 text-[11px] mb-1">⚠️ DEBUG (remover depois)</div>
            {debugLog.map((log, i) => <div key={i}>{log}</div>)}
          </div>
        )}

        {erro && (
          <div className="mx-4 mt-3 p-3 bg-red-100 border border-red-300 rounded-lg text-sm text-red-700">{erro}</div>
        )}

        <div className="p-4 space-y-2">
          {status === 'error' && (
            <button onClick={iniciarScanner}
              className="w-full py-2.5 bg-blue-600 text-white rounded-xl font-medium text-sm hover:bg-blue-700">
              Tentar novamente
            </button>
          )}
          <button onClick={() => { pararScanner(); onClose(); }}
            className="w-full py-2.5 border border-zinc-200 rounded-xl text-sm text-zinc-600 hover:bg-zinc-50">
            Digitar código ou link
          </button>
        </div>
      </div>
    </div>
  );
}