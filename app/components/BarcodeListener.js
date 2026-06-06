'use client';
import { useEffect, useRef, useState } from 'react';
import ProductPopup from './ProductPopup';

export default function BarcodeListener() {
  const [product, setProduct] = useState(null);
  const hiddenInputRef = useRef(null);

  // Focus hidden input when not typing in form fields
  useEffect(() => {
    const maybeFocusHidden = () => {
      const active = document.activeElement;
      const isFormField = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT');
      if (!isFormField && hiddenInputRef.current) {
        hiddenInputRef.current.focus();
      }
    };

    maybeFocusHidden();
    window.addEventListener('click', maybeFocusHidden);
    window.addEventListener('focus', maybeFocusHidden, true);

    return () => {
      window.removeEventListener('click', maybeFocusHidden);
      window.removeEventListener('focus', maybeFocusHidden, true);
    };
  }, []);

  const handleScan = async (e) => {
    if (e.key === 'Enter') {
      const sku = e.target.value.trim();
      if (sku) {
        e.target.value = '';
        try {
          const res = await fetch(`/api/barcode?sku=${encodeURIComponent(sku)}`, { credentials: 'include' });
          if (!res.ok) throw new Error('Not found');
          const data = await res.json();
          setProduct(data);
        } catch (err) {
          alert(`Product "${sku}" not found.`);
        }
      }
    }
  };

  return (
    <>
      <input
        ref={hiddenInputRef}
        type="text"
        onKeyDown={handleScan}
        style={{
          position: 'fixed',
          top: '-200px',
          left: '-200px',
          opacity: 0,
          height: 0,
          width: 0,
          pointerEvents: 'none',
        }}
      />
      <ProductPopup product={product} onClose={() => setProduct(null)} />
    </>
  );
}