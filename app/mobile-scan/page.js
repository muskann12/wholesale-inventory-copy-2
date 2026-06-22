'use client';
import { useEffect, useRef, useState } from 'react';
import ProductPopup from '../components/ProductPopup';  // reuse your existing popup

export default function MobileScanPage() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const inputRef = useRef(null); // for manual SKU input
  const [product, setProduct] = useState(null);
  const [status, setStatus] = useState('Starting camera...');
  const [scanned, setScanned] = useState('');
  const [supported, setSupported] = useState(true);
  let scanInterval = null;

  useEffect(() => {
    if (!('BarcodeDetector' in window)) {
      setSupported(false);
      setStatus('❌ Barcode scanning not supported. Use Chrome or Safari iOS 15.4+.');
      return;
    }

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setStatus('Ready – point camera at barcode');
          startScanning();
        }
      } catch (err) {
        setStatus('❌ Camera access denied: ' + err.message);
        console.error(err);
      }
    };
    startCamera();

    return () => {
      if (scanInterval) clearInterval(scanInterval);
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startScanning = () => {
    const detector = new BarcodeDetector({
      formats: ['code_128', 'ean_13', 'ean_8', 'code_39', 'codabar', 'upc_a', 'upc_e', 'qr_code']
    });
    scanInterval = setInterval(async () => {
      if (!videoRef.current || videoRef.current.readyState !== 4) return;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      if (canvas.width === 0 || canvas.height === 0) return;
      context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      try {
        const barcodes = await detector.detect(canvas);
        if (barcodes.length > 0) {
          const barcodeValue = barcodes[0].rawValue;
          setScanned(barcodeValue);
          setStatus(`✅ Detected: ${barcodeValue}`);
          clearInterval(scanInterval);

          // Fetch product details directly
          const res = await fetch(`/api/barcode?sku=${encodeURIComponent(barcodeValue)}`, { credentials: 'include' });
          if (res.ok) {
            const productData = await res.json();
            console.log('Product found:', productData); // for debugging
            setProduct(productData);
            setStatus('Product loaded – popup open');
          } else {
            const errText = await res.text();
            console.error('Product not found:', errText);
            setStatus(`❌ Product not found: ${barcodeValue}`);
            alert(`Product "${barcodeValue}" not found.`);
            setTimeout(() => {
              setScanned('');
              setStatus('Ready – scan again');
              startScanning();
            }, 2000);
          }
        }
      } catch (err) {
        // ignore
      }
    }, 200);
  };

  const handleManualSubmit = async (e) => {
    const sku = e.target.value.trim();
    if (!sku) {
      setStatus('⚠️ Please enter a SKU');
      return;
    }
    setStatus(`⏳ Searching for "${sku}"...`);
    try {
      const res = await fetch(`/api/barcode?sku=${encodeURIComponent(sku)}`, { credentials: 'include' });
      if (res.ok) {
        const productData = await res.json();
        setProduct(productData);
        setScanned(sku);
        setStatus('✅ Product loaded!');
        e.target.value = '';
      } else {
        const err = await res.json();
        setStatus(`❌ Product "${sku}" not found`);
        alert(`Product "${sku}" not found.`);
        e.target.value = '';
      }
    } catch (err) {
      setStatus('❌ Network error');
      alert('Network error. Please try again.');
      e.target.value = '';
    }
  };

  // Search button handler
  const handleSearchClick = () => {
    const sku = inputRef.current?.value.trim();
    if (!sku) return;
    handleManualSubmit({ target: { value: sku } });
    inputRef.current.value = '';
  };

  const closePopup = () => {
    setProduct(null);
    setScanned('');
    setStatus('Ready – scan again');
    startScanning();
  };

  if (!supported) {
    return (
      <div className="p-4 text-center">
        <h1 className="text-xl font-bold">Mobile Barcode Scanner</h1>
        <p className="text-red-600 mt-4">{status}</p>
        <div className="mt-4">
          <p className="text-sm">Or type SKU manually:</p>
          <input
            type="text"
            placeholder="Enter SKU"
            className="mt-1 border p-2 rounded w-full"
            onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit(e)}
          />
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto', minHeight: '100vh' }}>
      <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>📱 Mobile Barcode Scanner</h1>
      <p style={{ marginBottom: '20px', color: '#6b7280' }}>Point camera at product barcode</p>

      <div style={{ position: 'relative', background: '#000', borderRadius: '12px', overflow: 'hidden' }}>
        <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: 'auto' }} />
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>

      <div style={{ marginTop: '20px', padding: '16px', background: '#f9fafb', borderRadius: '8px' }}>
        <p><strong>Status:</strong> <span style={{ color: status.includes('✅') ? '#10b981' : status.includes('❌') ? '#ef4444' : '#6b7280' }}>{status}</span></p>
        {scanned && <p><strong>Last scanned:</strong> <code>{scanned}</code></p>}
      </div>

      {/* Manual SKU fallback with Search button */}
      <div style={{ marginTop: '20px' }}>
        <p className="text-sm">Or type SKU manually:</p>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            ref={inputRef}
            type="text"
            placeholder="Enter SKU"
            className="mt-1 border p-2 rounded w-full"
            onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit(e)}
            style={{ background: '#fff', borderColor: '#e5e7eb', flex: 1 }}
          />
          <button
            onClick={handleSearchClick}
            style={{
              padding: '10px 16px',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              marginTop: '4px',
              whiteSpace: 'nowrap'
            }}
          >
            Search
          </button>
        </div>
      </div>

      <p className="text-xs text-center text-gray-500 mt-6">Uses native BarcodeDetector – works with CODE‑128, EAN‑13, UPC‑A etc.</p>

      {/* Product popup (appears on mobile) */}
      {product && <ProductPopup product={product} onClose={closePopup} isMobile={true} />}
    </div>
  );
}