'use client';
import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import ProductPopup from '../components/ProductPopup';

export default function MobileScanPage() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const inputRef = useRef(null);
  const [product, setProduct] = useState(null);
  const [status, setStatus] = useState('Starting camera...');
  const [scanned, setScanned] = useState('');
  const readerRef = useRef(null);
  const streamRef = useRef(null);
  let scanInterval = null;

  useEffect(() => {
    let isMounted = true;
    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;

    const startCamera = async () => {
      try {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        streamRef.current = stream;
        if (videoRef.current && isMounted) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setStatus('Camera ready – scanning...');
          startScanning();
        }
      } catch (err) {
        setStatus('❌ Camera error: ' + err.message);
        console.error(err);
      }
    };

    const startScanning = () => {
      if (scanInterval) clearInterval(scanInterval);
      scanInterval = setInterval(async () => {
        if (!videoRef.current || videoRef.current.readyState !== 4) return;
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        if (canvas.width === 0 || canvas.height === 0) return;
        context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        try {
          // Use decodeFromCanvas with the canvas element
          const result = await reader.decodeFromCanvas(canvas);
          if (result) {
            const barcodeValue = result.getText();
            setScanned(barcodeValue);
            setStatus(`✅ Scanned: ${barcodeValue}`);
            clearInterval(scanInterval);
            const res = await fetch(`/api/barcode?sku=${encodeURIComponent(barcodeValue)}`, { credentials: 'include' });
            if (res.ok) {
              const data = await res.json();
              setProduct(data);
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

    startCamera();

    return () => {
      isMounted = false;
      if (scanInterval) clearInterval(scanInterval);
      if (readerRef.current) {
        try { readerRef.current.reset(); } catch (e) {}
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, []);

  // Manual capture button
  const captureNow = async () => {
    if (!videoRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    try {
      const result = await readerRef.current.decodeFromCanvas(canvas);
      if (result) {
        const barcodeValue = result.getText();
        setScanned(barcodeValue);
        setStatus(`✅ Manual capture: ${barcodeValue}`);
        const res = await fetch(`/api/barcode?sku=${encodeURIComponent(barcodeValue)}`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setProduct(data);
        } else {
          setStatus('❌ Product not found');
        }
      } else {
        setStatus('❌ No barcode in captured frame');
      }
    } catch (err) {
      setStatus('❌ Decode failed: ' + err.message);
    }
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
        const data = await res.json();
        setProduct(data);
        setScanned(sku);
        setStatus(`✅ Product loaded!`);
        e.target.value = '';
      } else {
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
    // Restart scanning
    const startScanning = () => {
      if (scanInterval) clearInterval(scanInterval);
      scanInterval = setInterval(async () => {
        if (!videoRef.current || videoRef.current.readyState !== 4) return;
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        if (canvas.width === 0 || canvas.height === 0) return;
        context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        try {
          const result = await readerRef.current.decodeFromCanvas(canvas);
          if (result) {
            const barcodeValue = result.getText();
            setScanned(barcodeValue);
            setStatus(`✅ Scanned: ${barcodeValue}`);
            clearInterval(scanInterval);
            const res = await fetch(`/api/barcode?sku=${encodeURIComponent(barcodeValue)}`, { credentials: 'include' });
            if (res.ok) {
              const data = await res.json();
              setProduct(data);
            } else {
              setStatus('❌ Product not found');
              setTimeout(() => {
                setScanned('');
                setStatus('Ready – scan again');
                startScanning();
              }, 2000);
            }
          }
        } catch (err) {}
      }, 200);
    };
    startScanning();
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto', minHeight: '100vh' }}>
      <h1>📱 Mobile Barcode Scanner</h1>
      <p>{status}</p>
      <div style={{ background: '#000', borderRadius: '12px', overflow: 'hidden' }}>
        <video ref={videoRef} style={{ width: '100%', height: 'auto' }} playsInline muted />
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>
      <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
        <button onClick={captureNow} style={{ padding: '10px', background: '#f59e0b', color: '#000', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
          📸 Capture & Decode
        </button>
      </div>
      <div style={{ marginTop: '20px', padding: '16px', background: '#f9fafb', borderRadius: '8px' }}>
        <p><strong>Status:</strong> {status}</p>
        {scanned && <p><strong>Last scanned:</strong> <code>{scanned}</code></p>}
      </div>
      <div style={{ marginTop: '20px' }}>
        <p>Or type SKU manually:</p>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            ref={inputRef}
            type="text"
            placeholder="Enter SKU"
            style={{ flex: 1, padding: '10px', border: '1px solid #ccc', borderRadius: '8px' }}
            onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit(e)}
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
              whiteSpace: 'nowrap'
            }}
          >
            Search
          </button>
        </div>
      </div>
      {product && <ProductPopup product={product} onClose={closePopup} isMobile={true} />}
    </div>
  );
}