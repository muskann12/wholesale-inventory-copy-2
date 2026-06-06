'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';

export const dynamic = 'force-dynamic';

const EMPTY_FORM = {
  name: '',
  sku: '',
  costPrice: '',
  description: '',
  images: [],
  variants: [
    { size: 'Small', costPrice: '', sellingPrice: '', quantity: '' },
    { size: 'Medium', costPrice: '', sellingPrice: '', quantity: '' },
    { size: 'Large', costPrice: '', sellingPrice: '', quantity: '' }
  ]
};

function ProductModal({ mode, form, setForm, onClose, onSubmit, loading }) {
  const [useVariants, setUseVariants] = useState(
    form.variants && form.variants.some(v => v.costPrice || v.sellingPrice)
  );

  const calculateMargin = (selling, cost) => {
    if (!selling || !cost) return null;
    return (((selling - cost) / selling) * 100).toFixed(1);
  };

  const handleVariantChange = (index, field, value) => {
    const newVariants = [...form.variants];
    if (field === 'quantity') {
      newVariants[index].quantity = parseInt(value) || '';
    } else {
      newVariants[index][field] = parseFloat(value) || '';
    }
    setForm({ ...form, variants: newVariants });
  };

  const handleLegacyChange = (field, value) => {
    const newForm = { ...form, [field]: value };
    if (useVariants && field === 'costPrice') {
      const newVariants = [...form.variants];
      newVariants[1].costPrice = parseFloat(value) || '';
      newForm.variants = newVariants;
    } else if (useVariants && field === 'sellingPrice') {
      const newVariants = [...form.variants];
      newVariants[1].sellingPrice = parseFloat(value) || '';
      newForm.variants = newVariants;
    }
    setForm(newForm);
  };

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: '20px', fontWeight: 700 }}>
            {mode === 'add' ? 'Add Product' : 'Edit Product'}
          </h2>
          <button onClick={onClose} style={{
            background: '#f3f4f6', border: '1px solid #e5e7eb',
            color: '#6b7280', borderRadius: '8px', width: 32, height: 32, cursor: 'pointer'
          }}>×</button>
        </div>

        <div style={{ display: 'grid', gap: '16px', maxHeight: '80vh', overflowY: 'auto', paddingRight: '8px' }}>
          {/* Basic fields */}
          <div>
            <label className="lbl">Product Name</label>
            <input className="inp" value={form.name ?? ''}
              onChange={e => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <label className="lbl">SKU / Barcode ID</label>
            <input className="inp" value={form.sku ?? ''}
              onChange={e => setForm({ ...form, sku: e.target.value })}
              disabled={mode === 'edit'} required
              style={mode === 'edit' ? { opacity: 0.6, cursor: 'not-allowed' } : {}} />
          </div>
          <div>
            <label className="lbl">Description</label>
            <textarea className="inp" rows="3"
              value={form.description ?? ''}
              onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>

          {/* Multiple Images */}
          <div>
            <label className="lbl">Product Images (URLs)</label>
            {(form.images || []).map((url, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <input className="inp" type="text" value={url} placeholder="Image URL"
                  onChange={e => {
                    const newImages = [...(form.images || [])];
                    newImages[idx] = e.target.value;
                    setForm({ ...form, images: newImages });
                  }} />
                <button type="button"
                  onClick={() => {
                    const newImages = (form.images || []).filter((_, i) => i !== idx);
                    setForm({ ...form, images: newImages });
                  }}
                  style={{ background: '#fee2e2', border: 'none', borderRadius: '8px', padding: '0 12px', cursor: 'pointer' }}>
                  ✕
                </button>
              </div>
            ))}
            <button type="button" onClick={() => setForm({ ...form, images: [...(form.images || []), ''] })}
              className="btn btn-ghost btn-sm" style={{ marginTop: '8px' }}>
              + Add another image
            </button>
          </div>

          {/* Legacy imageUrl field (optional, you can remove) */}
          <div>
            <label className="lbl">Legacy Image URL (optional)</label>
            <input className="inp" placeholder="https://..." value={form.imageUrl ?? ''}
              onChange={e => setForm({ ...form, imageUrl: e.target.value })} />
          </div>

          {/* Toggle for variant pricing */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            <input type="checkbox" id="useVariants" checked={useVariants} onChange={e => setUseVariants(e.target.checked)} />
            <label htmlFor="useVariants">Use different prices/stock for sizes (S/M/L)</label>
          </div>

          {!useVariants && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div><label className="lbl">Cost Price (Rs)</label>
                  <input className="inp" type="number" value={form.costPrice ?? ''}
                    onChange={e => handleLegacyChange('costPrice', e.target.value)} required />
                </div>
                <div><label className="lbl">Selling Price (Rs)</label>
                  <input className="inp" type="number" value={form.sellingPrice ?? ''}
                    onChange={e => handleLegacyChange('sellingPrice', e.target.value)} required />
                </div>
              </div>
              {form.sellingPrice && form.costPrice && (
                <div style={{ background: '#f9fafb', borderRadius: '8px', padding: '10px 14px', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Profit Margin</span>
                  <span style={{ fontWeight: 700, color: calculateMargin(form.sellingPrice, form.costPrice) > 0 ? '#10b981' : '#ef4444' }}>
                    {calculateMargin(form.sellingPrice, form.costPrice)}%
                  </span>
                </div>
              )}
              <div><label className="lbl">Stock Quantity</label>
                <input className="inp" type="number" value={form.quantity ?? ''}
                  onChange={e => setForm({ ...form, quantity: parseInt(e.target.value) || '' })} />
              </div>
            </>
          )}

          {useVariants && form.variants && (
            <>
              {form.variants.map((variant, idx) => {
                const margin = calculateMargin(variant.sellingPrice, variant.costPrice);
                return (
                  <div key={variant.size} style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px', background: '#f9fafb' }}>
                    <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 600 }}>{variant.size}</h3>
                    <div style={{ display: 'grid', gap: '12px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div><label style={{ fontSize: '12px', color: '#6b7280' }}>Cost Price (Rs)</label>
                          <input className="inp" type="number" value={variant.costPrice ?? ''}
                            onChange={e => handleVariantChange(idx, 'costPrice', e.target.value)} />
                        </div>
                        <div><label style={{ fontSize: '12px', color: '#6b7280' }}>Selling Price (Rs)</label>
                          <input className="inp" type="number" value={variant.sellingPrice ?? ''}
                            onChange={e => handleVariantChange(idx, 'sellingPrice', e.target.value)} />
                        </div>
                      </div>
                      <div><label style={{ fontSize: '12px', color: '#6b7280' }}>Stock</label>
                        <input className="inp" type="number" value={variant.quantity ?? ''}
                          onChange={e => handleVariantChange(idx, 'quantity', e.target.value)} />
                      </div>
                      {margin && (
                        <div style={{ background: 'white', borderRadius: '6px', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                          <span>Margin</span>
                          <span style={{ fontWeight: 700, color: parseFloat(margin) > 0 ? '#10b981' : '#ef4444' }}>{margin}%</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
          <button className="btn btn-ghost" onClick={onClose} style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
          <button className="btn btn-primary" onClick={onSubmit} disabled={loading} style={{ flex: 2, justifyContent: 'center' }}>
            {loading ? 'Saving...' : mode === 'add' ? 'Create Product' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

function StockBadge({ qty }) {
  if (qty <= 0)  return <span className="badge badge-red">Out of stock</span>;
  if (qty <= 5)  return <span className="badge badge-yellow">{qty} left</span>;
  return <span className="badge badge-green">{qty} in stock</span>;
}

export default function ProductsPage() {
  const isLoading = useAuth();
  const [products, setProducts] = useState([]);
  const [modal, setModal] = useState(null);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [windowWidth, setWindowWidth] = useState(0);

  useEffect(() => {
    setWindowWidth(window.innerWidth);
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchProducts = async () => {
    const res = await fetch('/api/products');
    if (res.ok) setProducts(await res.json());
  };
  useEffect(() => { fetchProducts(); }, []);

  const openAdd = () => { setForm(EMPTY_FORM); setModal('add'); };
const openEdit = (p) => {
  let variants = p.variants;
  if (!variants || variants.length === 0 || variants.every(v => v.costPrice === 0 && v.sellingPrice === 0 && v.quantity === 0)) {
    // No valid variants – fallback to legacy fields
    variants = [
      { size: 'Small', costPrice: p.costPrice || 0, sellingPrice: p.sellingPrice || 0, quantity: p.quantity || 0 },
      { size: 'Medium', costPrice: p.costPrice || 0, sellingPrice: p.sellingPrice || 0, quantity: p.quantity || 0 },
      { size: 'Large', costPrice: p.costPrice || 0, sellingPrice: p.sellingPrice || 0, quantity: p.quantity || 0 },
    ];
  }
  setForm({
    name: p.name || '',
    sku: p.sku || '',
    costPrice: p.costPrice || 0,
    description: p.description || '',
    images: p.images || [],
    variants: variants,
    sellingPrice: p.sellingPrice || 0,
    quantity: p.quantity || 0,
    imageUrl: p.imageUrl || '',
  });
  setEditId(p._id);
  setModal('edit');
};
  const closeModal = () => { setModal(null); setEditId(null); setForm(EMPTY_FORM); };
const handleSubmit = async () => {
  setLoading(true);
  try {
    // Determine if we are using variants or single mode
    const useVariants = form.variants && form.variants.some(v => v.costPrice || v.sellingPrice);

    let variantsToSend;
    if (useVariants) {
      // Use the variants from the form
      variantsToSend = form.variants.map(v => ({
        size: v.size,
        costPrice: Number(v.costPrice) || 0,
        sellingPrice: Number(v.sellingPrice) || 0,
        quantity: Number(v.quantity) || 0,
      }));
    } else {
      // Legacy single mode: copy the same values to all three sizes
      const singleCost = Number(form.costPrice) || 0;
      const singlePrice = Number(form.sellingPrice) || 0;
      const singleQty = Number(form.quantity) || 0;
      variantsToSend = [
        { size: 'Small', costPrice: singleCost, sellingPrice: singlePrice, quantity: singleQty },
        { size: 'Medium', costPrice: singleCost, sellingPrice: singlePrice, quantity: singleQty },
        { size: 'Large', costPrice: singleCost, sellingPrice: singlePrice, quantity: singleQty },
      ];
    }

    const payload = {
      name: form.name,
      sku: form.sku,
      costPrice: Number(form.costPrice) || 0,
      description: form.description || '',
      images: form.images || [],
      variants: variantsToSend,
    };

    const url = modal === 'add' ? '/api/products' : `/api/products/${editId}`;
    const method = modal === 'add' ? 'POST' : 'PUT';
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (res.ok) { closeModal(); fetchProducts(); }
    else { const err = await res.json(); alert(err.error || 'Error saving product'); }
  } finally { setLoading(false); }
};

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    await fetch(`/api/products/${id}`, { method: 'DELETE' });
    fetchProducts();
  };

  const downloadBarcode = async (sku) => {
    try {
      const res = await fetch(`/api/products/barcode/${encodeURIComponent(sku)}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Barcode not found');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `barcode-${sku}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Could not download barcode');
    }
  };

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase())
  );
  const isMobile = windowWidth < 768;
  if (isLoading) return <div className="p-8 text-center">Loading...</div>;

  const totalStock = (p) => {
    if (p.variants && p.variants.length) {
      return p.variants.reduce((sum, v) => sum + (parseInt(v.quantity) || 0), 0);
    }
    return p.quantity || 0;
  };

  return (
    <div className="page">
      <style jsx global>{`
        :root {
          --bg: #ffffff;
          --bg2: #f9fafb;
          --bg3: #f3f4f6;
          --border: #e5e7eb;
          --text: #111827;
          --text2: #6b7280;
          --primary: #111827;
          --primary-hover: #374151;
          --danger: #ef4444;
          --danger-hover: #dc2626;
          --success: #111827;
          --success-bg: #f3f4f6;
          --shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: var(--bg); color: var(--text); font-family: 'Inter', sans-serif; }
        .page { max-width: 1400px; margin: 0 auto; padding: 32px 24px; }
        .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; flex-wrap: wrap; gap: 16px; }
        .page-title { font-family: 'Syne', sans-serif; font-size: 32px; font-weight: 700; letter-spacing: -0.02em; color: var(--text); }
        .page-sub { font-size: 14px; color: var(--text2); margin-top: 4px; }
        .btn { display: inline-flex; align-items: center; gap: 8px; padding: 10px 18px; font-size: 14px; font-weight: 500; border-radius: 8px; cursor: pointer; transition: all 0.2s ease; border: none; font-family: 'Inter', sans-serif; background: transparent; }
        .btn-primary { background: var(--primary); color: #ffffff; border: 1px solid var(--border); }
        .btn-primary:hover:not(:disabled) { background: var(--primary-hover); transform: translateY(-1px); }
        .btn-ghost { background: var(--bg3); color: var(--text); border: 1px solid var(--border); }
        .btn-ghost:hover { background: #e5e7eb; }
        .btn-danger { background: var(--danger); color: #ffffff; border: none; }
        .btn-danger:hover { background: var(--danger-hover); }
        .btn-success { background: var(--success-bg); color: var(--success); border: 1px solid var(--border); }
        .btn-success:hover { background: #e5e7eb; }
        .btn-sm { padding: 6px 12px; font-size: 12px; }
        .lbl { display: block; font-size: 13px; font-weight: 500; margin-bottom: 6px; color: var(--text2); }
        .inp { width: 100%; padding: 10px 14px; background: var(--bg3); border: 1px solid var(--border); border-radius: 8px; font-size: 14px; color: var(--text); transition: all 0.2s; font-family: 'Inter', sans-serif; }
        .inp:focus { outline: none; border-color: #9ca3af; box-shadow: 0 0 0 2px rgba(0,0,0,0.05); }
        .card { background: var(--bg2); border: 1px solid var(--border); border-radius: 16px; overflow: hidden; }
        .tbl { width: 100%; border-collapse: collapse; font-size: 14px; }
        .tbl th { text-align: left; padding: 16px 16px; background: var(--bg3); border-bottom: 1px solid var(--border); font-weight: 600; color: var(--text2); font-size: 13px; }
        .tbl td { padding: 16px 16px; border-bottom: 1px solid var(--border); color: var(--text); }
        .tbl tr:hover td { background: #f3f4f6; }
        .product-card { background: var(--bg2); border: 1px solid var(--border); border-radius: 12px; padding: 16px; margin-bottom: 12px; display: none; }
        .badge { display: inline-block; padding: 4px 10px; border-radius: 30px; font-size: 12px; font-weight: 500; }
        .badge-green { background: #e0f2e7; color: #166534; border: 1px solid #bbf0c6; }
        .badge-yellow { background: #fef9c3; color: #854d0e; border: 1px solid #fde047; }
        .badge-red { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.4); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
        .modal-box { background: var(--bg2); border: 1px solid var(--border); border-radius: 20px; padding: 28px; width: 100%; max-width: 520px; box-shadow: var(--shadow); }
        @media (max-width: 768px) { .page { padding: 20px 16px; } .page-title { font-size: 24px; } .page-header { flex-direction: column; align-items: flex-start; } .tbl-container { display: none; } .product-card { display: block; } .btn { padding: 8px 14px; font-size: 13px; } }
        @media (max-width: 640px) { .page { padding: 16px 12px; } .page-title { font-size: 20px; } .modal-box { padding: 20px; } .btn-sm { padding: 5px 10px; font-size: 11px; } }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: #f3f4f6; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
      `}</style>

      {modal && <ProductModal mode={modal} form={form} setForm={setForm} onClose={closeModal} onSubmit={handleSubmit} loading={loading} />}

      <div className="page-header">
        <div><h1 className="page-title">Products</h1><p className="page-sub">{products.length} items in inventory</p></div>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Product</button>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <input className="inp" placeholder="Search by name or SKU..." value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: '360px' }} />
      </div>

      {/* Desktop Table View */}
      {!isMobile && (
        <div className="card tbl-container" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead>
                <tr><th>Product</th><th>SKU</th><th>Cost</th><th>Price</th><th>Margin</th><th>Stock</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', color: '#6b7280', padding: '48px 20px' }}>{search ? 'No products match your search.' : 'No products yet. Add your first one!'}</td></tr>
                ) : (
                  filtered.map(p => {
                    const medium = p.variants?.find(v => v.size === 'Medium');
                    const displayCost = p.costPrice ?? medium?.costPrice ?? 0;
                    const displayPrice = p.sellingPrice ?? medium?.sellingPrice ?? 0;
                    const margin = displayPrice && displayCost ? (((displayPrice - displayCost) / displayPrice) * 100).toFixed(1) : '0';
                    const stock = totalStock(p);
                    return (
                      <tr key={p._id}>
                        <td><div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          {p.images && p.images[0] ? (
                            <img src={p.images[0]} alt={p.name} style={{ width: 40, height: 40, borderRadius: '8px', objectFit: 'cover', border: '1px solid #e5e7eb' }} />
                          ) : (
                            <div style={{ width: 40, height: 40, borderRadius: '8px', background: '#f3f4f6', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: '#6b7280' }}>◈</div>
                          )}
                          <span style={{ fontWeight: 500 }}>{p.name}</span>
                        </div></td>
                        <td><code style={{ color: '#6b7280', fontSize: 13, background: '#f3f4f6', padding: '2px 8px', borderRadius: 6 }}>{p.sku}</code></td>
                        <td style={{ color: '#6b7280' }}>Rs{displayCost.toLocaleString()}</td>
                        <td style={{ fontWeight: 600 }}>Rs{displayPrice.toLocaleString()}</td>
                        <td><span style={{ color: parseFloat(margin) > 0 ? '#10b981' : '#ef4444', fontWeight: 600 }}>{margin}%</span></td>
                        <td><StockBadge qty={stock} /></td>
                        <td><div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => openEdit(p)}>Edit</button>
                          <button className="btn btn-success btn-sm" onClick={() => downloadBarcode(p.sku)}>Barcode</button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p._id, p.name)}>Delete</button>
                        </div></td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Mobile Card View */}
      {isMobile && (
        <div>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 20px', background: 'var(--bg2)', borderRadius: '12px', border: '1px solid var(--border)' }}>
              {search ? 'No products match your search.' : 'No products yet. Add your first one!'}
            </div>
          ) : (
            filtered.map(p => {
              const medium = p.variants?.find(v => v.size === 'Medium');
              const displayCost = p.costPrice ?? medium?.costPrice ?? 0;
              const displayPrice = p.sellingPrice ?? medium?.sellingPrice ?? 0;
              const margin = displayPrice && displayCost ? (((displayPrice - displayCost) / displayPrice) * 100).toFixed(1) : '0';
              const stock = totalStock(p);
              return (
                <div key={p._id} className="product-card" style={{ display: 'block' }}>
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                    {p.images && p.images[0] ? (
                      <img src={p.images[0]} alt={p.name} style={{ width: 50, height: 50, borderRadius: '8px', objectFit: 'cover', border: '1px solid #e5e7eb' }} />
                    ) : (
                      <div style={{ width: 50, height: 50, borderRadius: '8px', background: '#f3f4f6', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: '#6b7280' }}>◈</div>
                    )}
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 4px 0' }}>{p.name}</h3>
                      <p style={{ fontSize: '12px', color: '#6b7280' }}>SKU: <code style={{ background: '#f3f4f6', padding: '1px 4px', borderRadius: 4 }}>{p.sku}</code></p>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px', fontSize: '13px' }}>
                    <div style={{ background: '#f9fafb', padding: '8px', borderRadius: '6px' }}><span>Cost</span><p>Rs{displayCost.toLocaleString()}</p></div>
                    <div style={{ background: '#f9fafb', padding: '8px', borderRadius: '6px' }}><span>Price</span><p>Rs{displayPrice.toLocaleString()}</p></div>
                    <div style={{ background: parseFloat(margin) > 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', padding: '8px', borderRadius: '6px' }}><span>Margin</span><p style={{ color: parseFloat(margin) > 0 ? '#10b981' : '#ef4444' }}>{margin}%</p></div>
                    <div style={{ background: '#f9fafb', padding: '8px', borderRadius: '6px' }}><StockBadge qty={stock} /></div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(p)}>Edit</button>
                    <button className="btn btn-success btn-sm" onClick={() => downloadBarcode(p.sku)}>Barcode</button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p._id, p.name)}>Delete</button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}