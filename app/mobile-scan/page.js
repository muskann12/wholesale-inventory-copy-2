'use client';
import { useEffect, useRef, useState } from 'react';
import { MultiFormatReader, BarcodeFormat } from '@zxing/library';
import ProductPopup from '../components/ProductPopup';

export default function MobileScanPage() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [product, setProduct] = useState(null);
  const [status, setStatus] = useState('Starting camera...');
  const [scanned, setScanned] = useState('');
  const readerRef = useRef(null);
  let scanInterval = null;

  useEffect(() => {
    const reader = new MultiFormatReader();
    readerRef.current = reader;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setStatus('Camera ready – scanning...');
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
    if (!readerRef.current) return;
    scanInterval = setInterval(async () => {
      if (!videoRef.current || videoRef.current.readyState !== 4) return;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      if (canvas.width === 0 || canvas.height === 0) return;
      context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      try {
        const luminanceSource = new (require('@zxing/library').HTMLCanvasElementLuminanceSource)(canvas);
        const binaryBitmap = new (require('@zxing/library').BinaryBitmap)(new (require('@zxing/library').HybridBinarizer)(luminanceSource));
        const result = readerRef.current.decodeWithState(binaryBitmap);
        if (result) {
          const barcodeValue = result.getText();
          setScanned(barcodeValue);
          setStatus(`✅ Scanned: ${barcodeValue}`);
          clearInterval(scanInterval);
          const res = await fetch(`/api/barcode?sku=${encodeURIComponent(barcodeValue)}`, { credentials: 'include' });
          if (res.ok) {
            const productData = await res.json();
            setProduct(productData);
            setStatus('Product loaded – popup open');
          } else {
            setStatus('❌ Product not found');
            setTimeout(() => {
              setScanned('');
              setStatus('Ready – scan again');
              startScanning();
            }, 2000);
          }
        }
      } catch (err) {
        // No barcode found – ignore
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
    console.log('Manual SKU entered:', sku);

    try {
      const res = await fetch(`/api/barcode?sku=${encodeURIComponent(sku)}`, { credentials: 'include' });
      console.log('API response status:', res.status);
      if (res.ok) {
        const productData = await res.json();
        console.log('Product found:', productData);
        setProduct(productData);
        setScanned(sku);
        setStatus(`✅ Product loaded!`);
        // Clear the input after successful load
        e.target.value = '';
      } else {
        const err = await res.json();
        console.error('Product not found:', err);
        setStatus(`❌ Product "${sku}" not found`);
        alert(`Product "${sku}" not found.`);
        e.target.value = '';
      }
    } catch (err) {
      console.error('Network error:', err);
      setStatus('❌ Network error');
      alert('Network error. Please try again.');
      e.target.value = '';
    }
  };

  const closePopup = () => {
    setProduct(null);
    setScanned('');
    setStatus('Ready – scan again');
    startScanning();
  };

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

      <div style={{ marginTop: '20px' }}>
        <p className="text-sm">Or type SKU manually:</p>
        <input
          type="text"
          placeholder="Enter SKU"
          style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '8px' }}
          onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit(e)}
        />
      </div>

      <p className="text-xs text-center text-gray-500 mt-6">Works on all modern browsers</p>

      {/* Popup – rendered when product is set */}
      {product && <ProductPopup product={product} onClose={closePopup} isMobile={true} />}
    </div>
  );
}