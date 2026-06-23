'use client';
import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import {
  TrendingUp,
  Package,
  ShoppingBag,
  Coins,
  Activity,
  Wallet
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAuth } from '../hooks/useAuth';

function StatCard({ title, value, sub, icon: Icon, color }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-gray-800 dark:bg-gray-900/60">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500">{title}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
          {sub && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{sub}</p>}
        </div>
        <div className="rounded-xl p-2" style={{ backgroundColor: `${color}15`, color }}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow dark:border-gray-700 dark:bg-gray-800">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-sm font-semibold" style={{ color: p.color }}>
          {p.name}: Rs{p.value?.toLocaleString()}
        </p>
      ))}
    </div>
  );
};

export default function DashboardPage() {
  const isLoading = useAuth();
  const { theme, systemTheme } = useTheme();
  const currentTheme = theme === 'system' ? systemTheme : theme;
  const isDark = currentTheme === 'dark';
  const [data, setData] = useState({
    totalRevenue: 0,
    totalProfit: 0,
    totalSold: 0,
    remainingStock: 0,
    stockCost: 0,
    dailyData: []
  });
  const [days, setDays] = useState(30);
  const [loadingChart, setLoadingChart] = useState(false);

  const fetchData = async (selectedDays = days) => {
    setLoadingChart(true);
    try {
      const res = await fetch(`/api/dashboard?days=${selectedDays}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setDays(json.days);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingChart(false);
    }
  };

  useEffect(() => {
    fetchData(days);
    const interval = setInterval(() => fetchData(days), 30000);
    return () => clearInterval(interval);
  }, []);

  const handleDaysChange = (newDays) => {
    setDays(newDays);
    fetchData(newDays);
  };

  if (isLoading) return <div className="p-8 text-center">Loading...</div>;

  const profitMargin = data.totalRevenue > 0
    ? ((data.totalProfit / data.totalRevenue) * 100).toFixed(1)
    : 0;

  // Softer, more modern colors
  const revenueColor = isDark ? '#fbbf24' : '#eab308'; // amber
  const profitColor = isDark ? '#34d399' : '#10b981';  // emerald
  const gridColor = isDark ? '#374151' : '#e5e7eb';

  return (
    <div className="min-h-screen bg-gray-50 p-6 dark:bg-gray-950">
      {/* HEADER */}
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-sm text-gray-500">Live overview (auto refresh 30s)</p>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 dark:bg-emerald-950/30">
          <span className="h-2 w-2 animate-ping rounded-full bg-emerald-500" />
          <span className="text-xs font-medium text-emerald-600">Live</span>
        </div>
      </div>

      {/* STATS */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard title="Revenue" value={`Rs${data.totalRevenue.toLocaleString()}`} sub="All time" icon={Coins} color="#eab308" />
        <StatCard title="Profit" value={`Rs${data.totalProfit.toLocaleString()}`} sub={`${profitMargin}% margin`} icon={TrendingUp} color="#10b981" />
        <StatCard title="Sold" value={data.totalSold.toLocaleString()} sub="Units" icon={ShoppingBag} color="#3b82f6" />
        <StatCard title="Stock" value={data.remainingStock.toLocaleString()} sub="Available" icon={Package} color="#8b5cf6" />
        <StatCard title="Stock Cost" value={`Rs${(data.stockCost ?? 0).toLocaleString()}`} sub="Remaining inventory" icon={Wallet} color="#f43f5e" />
      </div>

      {/* CHART with range buttons */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900/60">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Revenue & Profit Trends</h2>
            <p className="text-xs text-gray-500">Daily performance (last {days} days)</p>
          </div>
          <div className="flex gap-2">
            {[30, 60, 90].map((d) => (
              <button
                key={d}
                onClick={() => handleDaysChange(d)}
                className={`px-3 py-1.5 text-sm rounded-lg transition ${
                  days === d
                    ? 'bg-amber-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300'
                }`}
              >
                {d} Days
              </button>
            ))}
          </div>
        </div>
        <div className="h-80">
          {loadingChart ? (
            <div className="flex h-full items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.dailyData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid stroke={gridColor} strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: isDark ? '#9ca3af' : '#6b7280' }}
                  tickFormatter={(tick) => tick.slice(5)} // show MM-DD
                />
                <YAxis
                  tick={{ fontSize: 11, fill: isDark ? '#9ca3af' : '#6b7280' }}
                  tickFormatter={(value) => `Rs${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: 12, paddingTop: 10 }}
                  iconType="circle"
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke={revenueColor}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5 }}
                  name="Revenue"
                />
                <Line
                  type="monotone"
                  dataKey="profit"
                  stroke={profitColor}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5 }}
                  name="Profit"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}