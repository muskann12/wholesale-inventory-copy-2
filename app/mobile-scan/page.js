'use client';
import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import ProductPopup from '../components/ProductPopup';

export default function MobileScanPage() {
  const videoRef = useRef(null);
  const [product, setProduct] = useState(null);
  const [status, setStatus] = useState('Starting camera...');
  const [scanned, setScanned] = useState('');
  const readerRef = useRef(null);
  const [isScanning, setIsScanning] = useState(true);

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;

    const startReader = () => {
      reader.decodeFromConstraints(
        { video: { facingMode: 'environment' } },
        videoRef.current,
        (result, err) => {
          if (result) {
            const barcodeValue = result.getText();
            setScanned(barcodeValue);
            setStatus(`✅ Scanned: ${barcodeValue}`);
            // Stop scanning temporarily
            setIsScanning(false);
            reader.reset();
            // Fetch product
            fetch(`/api/barcode?sku=${encodeURIComponent(barcodeValue)}`, { credentials: 'include' })
              .then(res => res.ok ? res.json() : Promise.reject())
              .then(data => setProduct(data))
              .catch(() => alert('Product not found'));
          } else if (err && err.name !== 'NotFoundException') {
            // Ignore "NotFoundException" (no barcode found, continue scanning)
            console.warn(err);
          }
        }
      ).catch(err => {
        setStatus('❌ Camera error: ' + err.message);
      });
    };

    startReader();

    return () => {
      if (readerRef.current) {
        try {
          readerRef.current.reset();
        } catch (e) {}
      }
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const restartScanning = () => {
    if (!readerRef.current || !videoRef.current) return;
    setIsScanning(true);
    readerRef.current.decodeFromConstraints(
      { video: { facingMode: 'environment' } },
      videoRef.current,
      (result, err) => {
        if (result) {
          const barcodeValue = result.getText();
          setScanned(barcodeValue);
          setStatus(`✅ Scanned: ${barcodeValue}`);
          setIsScanning(false);
          readerRef.current.reset();
          fetch(`/api/barcode?sku=${encodeURIComponent(barcodeValue)}`, { credentials: 'include' })
            .then(res => res.ok ? res.json() : Promise.reject())
            .then(data => setProduct(data))
            .catch(() => alert('Product not found'));
        }
      }
    ).catch(() => {});
  };

  const handleManualSubmit = async (e) => {
    const sku = e.target.value.trim();
    if (!sku) return;
    try {
      const res = await fetch(`/api/barcode?sku=${encodeURIComponent(sku)}`, { credentials: 'include' });
      if (res.ok) {
        const productData = await res.json();
        setProduct(productData);
        setScanned(sku);
        setStatus('Product loaded');
      } else {
        setStatus('❌ Product not found');
      }
    } catch {
      setStatus('❌ Network error');
    }
    e.target.value = '';
  };

  const closePopup = () => {
    setProduct(null);
    setScanned('');
    setStatus('Ready – scan again');
    restartScanning();
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto', minHeight: '100vh' }}>
      <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>📱 Mobile Barcode Scanner</h1>
      <p style={{ marginBottom: '20px', color: '#6b7280' }}>Point camera at product barcode</p>

      <div style={{ background: '#000', borderRadius: '12px', overflow: 'hidden' }}>
        <video ref={videoRef} style={{ width: '100%', height: 'auto' }} />
      </div>

      <div style={{ marginTop: '20px', padding: '16px', background: '#f9fafb', borderRadius: '8px' }}>
        <p><strong>Status:</strong> <span style={{ color: status.includes('✅') ? '#10b981' : status.includes('❌') ? '#ef4444' : '#6b7280' }}>{status}</span></p>
        {scanned && <p><strong>Last scanned:</strong> <code>{scanned}</code></p>}
      </div>

      {/* Manual SKU fallback */}
      <div style={{ marginTop: '20px' }}>
        <p className="text-sm">Or type SKU manually:</p>
        <input
          type="text"
          placeholder="Enter SKU"
          style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '8px' }}
          onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit(e)}
        />
      </div>

      {product && <ProductPopup product={product} onClose={closePopup} isMobile={true} />}
    </div>
  );
}