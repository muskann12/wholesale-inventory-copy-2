'use client';
import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import ProductPopup from '../components/ProductPopup';

export default function MobileScanPage() {
  const videoRef = useRef(null);
  const inputRef = useRef(null);
  const [product, setProduct] = useState(null);
  const [status, setStatus] = useState('Starting camera...');
  const [scanned, setScanned] = useState('');
  const readerRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    let isMounted = true;
    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;

    const startCamera = async () => {
      try {
        // Stop any existing stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });
        streamRef.current = stream;

        if (videoRef.current && isMounted) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            if (videoRef.current && isMounted) {
              videoRef.current.play().catch(err => console.warn('Play failed:', err));
            }
          };
          if (videoRef.current.readyState >= 2) {
            videoRef.current.play().catch(err => console.warn('Play failed:', err));
          }
          setStatus('Camera ready – scanning...');
          startReader();
        }
      } catch (err) {
        setStatus('❌ Camera access denied: ' + err.message);
        console.error(err);
      }
    };

    const startReader = () => {
      if (!videoRef.current || !isMounted) return;

      // Use decodeFromVideoElement for more reliable scanning
      reader.decodeFromVideoElement(
        videoRef.current,
        (result, err) => {
          if (result) {
            const barcodeValue = result.getText();
            setScanned(barcodeValue);
            setStatus(`✅ Scanned: ${barcodeValue}`);
            reader.reset();
            fetch(`/api/barcode?sku=${encodeURIComponent(barcodeValue)}`, { credentials: 'include' })
              .then(res => res.ok ? res.json() : Promise.reject())
              .then(data => setProduct(data))
              .catch(() => alert('Product not found'));
            // Restart scanning after a short delay
            setTimeout(() => {
              if (readerRef.current && videoRef.current) {
                readerRef.current.decodeFromVideoElement(videoRef.current, (result, err) => {});
              }
            }, 500);
          }
        }
      ).catch(err => {
        setStatus('❌ Scanner error: ' + err.message);
        console.error(err);
      });
    };

    startCamera();

    return () => {
      isMounted = false;
      if (readerRef.current) {
        try { readerRef.current.reset(); } catch (e) {}
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.onloadedmetadata = null;
      }
    };
  }, []);

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
    if (readerRef.current && videoRef.current) {
      readerRef.current.decodeFromVideoElement(videoRef.current, (result, err) => {});
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto', minHeight: '100vh' }}>
      <h1>📱 Mobile Barcode Scanner</h1>
      <p>{status}</p>
      <div style={{ background: '#000', borderRadius: '12px', overflow: 'hidden' }}>
        <video ref={videoRef} style={{ width: '100%', height: 'auto' }} playsInline muted autoPlay />
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