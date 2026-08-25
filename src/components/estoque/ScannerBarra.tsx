'use client';
import { useEffect, useRef, useState } from 'react';

interface ScannerBarraProps {
  onScan: (codigo: string) => void;
  onClose: () => void;
}

export function ScannerBarra({ onScan, onClose }: ScannerBarraProps) {
  const [scanning, setScanning] = useState(false);
  const [erro, setErro] = useState('');
  const scannerRef = useRef<any>(null);
  const scannedRef = useRef(false);

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        try {
          scannerRef.current.stop().catch(() => {});
        } catch {}
        scannerRef.current = null;
      }
    };
  }, []);

  async function iniciarScanner() {
    setErro('');
    scannedRef.current = false;
    try {
      // Dynamic import para evitar conflito WASM com webpack/Next.js
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode');

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
      scannerRef.current = scanner;
      setScanning(true);

      // Calcula qrbox baseado no container — barcodes precisam de área larga
      const container = document.getElementById('scanner-container');
      const containerWidth = container?.offsetWidth || 300;
      const boxWidth = Math.min(containerWidth - 20, 500);
      const boxHeight = Math.round(boxWidth * 0.4); // aspect ratio mais horizontal para barcode

      // experimentalFeatures existe no runtime mas não nos tipos do html5-qrcode 2.x
      const config: any = {
        fps: 15,
        qrbox: { width: boxWidth, height: boxHeight },
        aspectRatio: 1.5,
        disableFlip: false,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true,
        },
      };

      await scanner.start(
        { facingMode: 'environment' },
        config,
        (decodedText) => {
          if (scannedRef.current) return;
          scannedRef.current = true;
          onScan(decodedText);
          scanner.stop().catch(() => {});
          setScanning(false);
        },
        () => {} // errorMessage esperado — ignora frames que não decodificam
      );
    } catch (e: any) {
      console.error('[ScannerBarra] Erro ao iniciar scanner:', e);
      setErro(e?.message || 'Erro ao acessar a câmera. Verifique as permissões.');
      setScanning(false);
    }
  }

  async function pararScanner() {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop().catch(() => {});
      } catch {}
      scannerRef.current = null;
      setScanning(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-zinc-900">Escanear Código de Barras</h3>
          <button
            onClick={() => { pararScanner(); onClose(); }}
            className="text-zinc-400 hover:text-zinc-600 text-xl leading-none"
          >
            ✕
          </button>
        </div>

        <div id="scanner-container" className="w-full rounded-xl overflow-hidden bg-zinc-900 min-h-[250px]" />

        {erro && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {erro}
          </div>
        )}

        <div className="flex gap-3 mt-4">
          {!scanning ? (
            <button onClick={iniciarScanner} className="btn-primary w-full">
              📷 Iniciar Câmera
            </button>
          ) : (
            <button onClick={pararScanner} className="btn-outline w-full">
              Parar Scanner
            </button>
          )}
        </div>

        <p className="text-xs text-zinc-400 text-center mt-3">
          Posicione o código de barras na área de leitura
        </p>
      </div>
    </div>
  );
}
