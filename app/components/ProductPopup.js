'use client';
import { useState, useEffect } from 'react';

export default function ProductPopup({ product, onClose, isMobile = false }) {
  const [selectedSize, setSelectedSize] = useState(null);
  const [customPrice, setCustomPrice] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selling, setSelling] = useState(false);
  const [availableStock, setAvailableStock] = useState(0);
  const [showNegotiation, setShowNegotiation] = useState(false);
  const [isRawCloth, setIsRawCloth] = useState(false);

  useEffect(() => {
    if (!product) return;

    const raw = product.isRawCloth || !product.variants || product.variants.length === 0;
    setIsRawCloth(raw);

    if (raw) {
      setSelectedSize(null);
      setCustomPrice(product.sellingPrice || 0);
      setAvailableStock(product.quantity || 0);
      setQuantity(1);
      setShowNegotiation(false);
    } else if (product.variants && product.variants.length > 0) {
      const defaultSize = selectedSize || product.variants[0].size;
      const variant = product.variants.find(v => v.size === defaultSize);
      if (variant) {
        setSelectedSize(variant.size);
        setCustomPrice(variant.sellingPrice);
        setAvailableStock(variant.quantity);
        setQuantity(1);
        setShowNegotiation(false);
      }
    }
  }, [product]);

  const handleSizeChange = (size) => {
    const variant = product.variants.find(v => v.size === size);
    if (variant) {
      setSelectedSize(size);
      setCustomPrice(variant.sellingPrice);
      setAvailableStock(variant.quantity);
      setQuantity(1);
      setShowNegotiation(false);
    }
  };

  const handleSell = async () => {
    // Validation
    if (isRawCloth) {
      if (quantity > availableStock) return alert('Insufficient stock');
    } else {
      if (!selectedSize) return alert('Please select a size');
      if (quantity > availableStock) return alert('Insufficient stock for selected size');
    }

    setSelling(true);
    const finalPrice = (!isMobile || showNegotiation) ? customPrice : null;
    const selectedVariant = product.variants?.find(v => v.size === selectedSize);
    const defaultPrice = isRawCloth ? product.sellingPrice : selectedVariant?.sellingPrice;
    const payloadSize = isRawCloth ? null : selectedSize;

    const res = await fetch('/api/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: product._id,
        size: payloadSize,
        quantity: parseFloat(quantity) || 0,
        customSellingPrice: (finalPrice && finalPrice !== defaultPrice) ? finalPrice : null,
        isRawCloth: isRawCloth,
      }),
    });
    if (res.ok) {
      alert('Sale recorded!');
      onClose();
      window.location.reload();
    } else {
      const err = await res.json();
      alert(err.error || 'Sale failed');
    }
    setSelling(false);
  };

  if (!product) return null;

  const selectedVariant = product.variants?.find(v => v.size === selectedSize);
  const costPrice = isRawCloth ? product.costPrice : (selectedVariant?.costPrice || 0);
  const sellingPrice = isRawCloth ? product.sellingPrice : (selectedVariant?.sellingPrice || 0);
  const originalMargin = sellingPrice && costPrice
    ? ((sellingPrice - costPrice) / sellingPrice * 100).toFixed(1)
    : 0;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-40 z-40" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-md pointer-events-auto" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
          {/* Header */}
          <div className="p-5 border-b border-gray-100 flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{product.name}</h2>
              <p className="text-xs text-gray-500 mt-1">
                {isRawCloth ? `SKU: ${product.sku} (Raw cloth – per meter)` : `SKU: ${product.sku}`}
              </p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
          </div>

          {/* Size Selection – only for non‑raw cloth */}
          {!isRawCloth && (
            <div className="p-5 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-700 mb-2">Select Size</p>
              <div className="flex gap-2 flex-wrap">
                {product.variants?.map(v => {
                  const isSelected = selectedSize === v.size;
                  const outOfStock = v.quantity === 0;
                  return (
                    <button
                      key={v.size}
                      onClick={() => !outOfStock && handleSizeChange(v.size)}
                      disabled={outOfStock}
                      className={`px-4 py-2 rounded-lg border transition ${
                        isSelected
                          ? 'bg-gray-900 text-white border-gray-900'
                          : outOfStock
                            ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                            : 'bg-white text-gray-800 border-gray-300 hover:border-gray-500'
                      }`}
                    >
                      {v.size} {outOfStock && '(Out)'}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Price and Stock Info */}
          <div className="p-5 border-b border-gray-100 grid grid-cols-2 gap-3">
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-xs text-gray-500">{isRawCloth ? 'Price per meter' : 'MRP'}</p>
              <p className="text-base font-semibold">Rs {sellingPrice.toLocaleString()}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-xs text-gray-500">Stock</p>
              <p className="text-base font-semibold">{availableStock} {isRawCloth ? 'meters' : 'units'}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-xs text-gray-500">Margin</p>
              <p className="text-base font-semibold text-green-600">{originalMargin}%</p>
            </div>
          </div>

          {/* Negotiation Section */}
          {isMobile ? (
            <div className="p-5 border-b border-gray-100">
              {!showNegotiation ? (
                <button
                  onClick={() => setShowNegotiation(true)}
                  className="w-full py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm font-medium"
                >
                  + Negotiate Price
                </button>
              ) : (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Negotiated Price (Rs)</label>
                  <input
                    type="number"
                    min={costPrice}
                    step="any"
                    value={customPrice}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '') setCustomPrice('');
                      else {
                        const num = parseFloat(val);
                        if (!isNaN(num)) setCustomPrice(num);
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
                  />
                  {customPrice !== sellingPrice && (
                    <p className="text-xs text-gray-600 mt-1">Margin: {((customPrice - costPrice) / customPrice * 100).toFixed(1)}%</p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="p-5 border-b border-gray-100">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Negotiated Price (Rs)</label>
              <input
                type="number"
                min={costPrice}
                step="any"
                value={customPrice}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') setCustomPrice('');
                  else {
                    const num = parseFloat(val);
                    if (!isNaN(num)) setCustomPrice(num);
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
              {customPrice !== sellingPrice && (
                <p className="text-xs text-gray-600 mt-1">Margin: {((customPrice - costPrice) / customPrice * 100).toFixed(1)}%</p>
              )}
            </div>
          )}

          {/* Quantity – allow decimal for raw cloth */}
          <div className="p-5 border-b border-gray-100">
            <label className="block text-sm font-semibold text-gray-700 mb-1">Quantity</label>
            <input
              type="number"
              min="0.1"
              step={isRawCloth ? "0.1" : "1"}
              max={availableStock}
              value={quantity}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                if (!isNaN(val) && val >= 0) {
                  setQuantity(val);
                } else {
                  setQuantity('');
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          {/* Validation Message */}
          {((!isMobile) || (isMobile && showNegotiation)) && customPrice < costPrice && (
            <div className="p-5 bg-red-50 text-red-700 text-sm border-b border-red-100">
              ⚠️ Selling price cannot be below cost (Rs {costPrice})
            </div>
          )}

          {/* Action Buttons */}
          <div className="p-5 flex gap-3 justify-end">
            <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition">Cancel</button>
            <button
              onClick={handleSell}
              disabled={selling || quantity <= 0 || ((!isMobile || showNegotiation) && customPrice < costPrice)}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {selling ? 'Selling...' : 'Sell Now'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}