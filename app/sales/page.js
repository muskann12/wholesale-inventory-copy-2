'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';

function SaleRow({ sale, onDelete }) {
  const date = new Date(sale.createdAt).toLocaleString();
  return (
    <tr className="border-b border-gray-200 hover:bg-gray-50">
      <td className="px-4 py-3 text-sm text-gray-700">{date}</td>
      <td className="px-4 py-3 text-sm font-medium text-gray-900">
        {sale.productId?.name || 'Deleted product'}
      </td>
      <td className="px-4 py-3 text-sm text-gray-600">{sale.productId?.sku || '-'}</td>
      <td className="px-4 py-3 text-sm text-gray-600">{sale.quantity}</td>
      <td className="px-4 py-3 text-sm font-medium text-gray-900">Rs{sale.revenue.toLocaleString()}</td>
      <td className="px-4 py-3 text-sm text-emerald-600 font-medium">Rs{sale.profit.toLocaleString()}</td>
      <td className="px-4 py-3 text-sm">
        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
          sale.source === 'shopify'
            ? 'bg-blue-100 text-blue-800'
            : 'bg-gray-100 text-gray-800'
        }`}>
          {sale.source === 'shopify' ? 'Shopify' : 'Physical Store'}
        </span>
      </td>
      <td className="px-4 py-3 text-sm">
        {sale.source === 'physical' && (
          <button
            onClick={() => onDelete(sale._id)}
            className="text-red-600 hover:text-red-800 text-sm font-medium transition"
          >
            Delete
          </button>
        )}
      </td>
    </tr>
  );
}

export default function SalesPage() {
  const isLoading = useAuth();
  const [sales, setSales] = useState([]);
  const [filter, setFilter] = useState('all');

  const fetchSales = async () => {
    const url = filter === 'all' ? '/api/sales' : `/api/sales?source=${filter}`;
    const res = await fetch(url);
    if (res.ok) setSales(await res.json());
  };

  useEffect(() => {
    fetchSales();
  }, [filter]);

  const handleDeleteSale = async (saleId) => {
    if (!confirm('Delete this sale? Stock will be restored and Shopify inventory updated.')) return;
    try {
      const res = await fetch(`/api/sales?id=${saleId}`, { method: 'DELETE' });
      if (res.ok) {
        alert('Sale deleted successfully');
        fetchSales();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to delete sale');
      }
    } catch (err) {
      alert('Error deleting sale');
    }
  };

  // Stats
  const totalRevenue = sales.reduce((sum, s) => sum + s.revenue, 0);
  const totalProfit = sales.reduce((sum, s) => sum + s.profit, 0);
  const totalQuantity = sales.reduce((sum, s) => sum + s.quantity, 0);

  if (isLoading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Sales</h1>
            <p className="text-sm text-gray-500">All orders from physical store & Shopify</p>
          </div>
          <div className="flex gap-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All sales</option>
              <option value="physical">Physical store</option>
              <option value="shopify">Shopify online</option>
            </select>
            <button
              onClick={fetchSales}
              className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 hover:bg-gray-50"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-white p-5 shadow-sm border border-gray-200">
            <p className="text-xs uppercase text-gray-500">Total Revenue</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">Rs{totalRevenue.toLocaleString()}</p>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm border border-gray-200">
            <p className="text-xs uppercase text-gray-500">Total Profit</p>
            <p className="mt-1 text-2xl font-bold text-emerald-600">Rs{totalProfit.toLocaleString()}</p>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm border border-gray-200">
            <p className="text-xs uppercase text-gray-500">Units Sold</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{totalQuantity.toLocaleString()}</p>
          </div>
        </div>

        {/* Sales Table */}
        <div className="rounded-2xl bg-white border border-gray-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Revenue</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Profit</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sales.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-4 py-12 text-center text-gray-500">
                      No sales yet. Scan a barcode or create an online order.
                    </td>
                  </tr>
                ) : (
                  sales.map((sale) => (
                    <SaleRow key={sale._id} sale={sale} onDelete={handleDeleteSale} />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}