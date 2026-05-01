import { useEffect, useState } from 'react';
import { getRevenue, getMonthlyRevenue } from '../api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import StatCard from '../components/StatCard';
import { IndianRupee, CreditCard, TrendingUp } from 'lucide-react';

interface TierBreakdown {
  [key: string]: { count: number; revenueInr: number; credits: number };
}

interface PaymentRow {
  id: string;
  userId: string;
  razorpayPaymentId: string;
  razorpayOrderId: string;
  tierSlug: string;
  tierName: string;
  credits: number;
  amountInr: number;
  currency: string;
  status: string;
  createdAt: string;
}

interface RevenueData {
  totalRevenueInr: number;
  totalPayments: number;
  totalCredits: number;
  tierBreakdown: TierBreakdown;
  payments: PaymentRow[];
}

interface MonthlyData {
  year: number;
  months: { month: number; revenueInr: number; payments: number; credits: number }[];
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const TIER_COLORS: Record<string, string> = {
  starter: 'bg-blue-100 text-blue-700',
  popular: 'bg-purple-100 text-purple-700',
  pro: 'bg-amber-100 text-amber-700',
};

export default function Revenue() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState<number | undefined>(undefined);
  const [revenue, setRevenue] = useState<RevenueData | null>(null);
  const [monthly, setMonthly] = useState<MonthlyData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getRevenue(year, month),
      getMonthlyRevenue(year),
    ])
      .then(([revRes, monthRes]) => {
        setRevenue(revRes.data);
        setMonthly(monthRes.data);
      })
      .finally(() => setLoading(false));
  }, [year, month]);

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-400 text-lg">Loading revenue data...</div>;
  }

  const chartData = monthly?.months.map((m) => ({
    name: MONTH_NAMES[m.month - 1],
    revenue: m.revenueInr,
    payments: m.payments,
    credits: m.credits,
  })) || [];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Revenue & Payments</h1>
          <p className="text-gray-500 mt-1">Financial overview and payment history</p>
        </div>

        {/* Year/Month filters */}
        <div className="flex gap-3">
          <select
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value, 10))}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            {Array.from({ length: 5 }, (_, i) => currentYear - i).map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <select
            value={month ?? ''}
            onChange={(e) => setMonth(e.target.value ? parseInt(e.target.value, 10) : undefined)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            <option value="">All Months</option>
            {MONTH_NAMES.map((name, idx) => (
              <option key={idx} value={idx + 1}>{name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Revenue Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title={month ? `Revenue (${MONTH_NAMES[month - 1]} ${year})` : `Revenue (${year})`}
          value={formatCurrency(revenue?.totalRevenueInr || 0)}
          icon={<IndianRupee size={22} />}
          color="green"
        />
        <StatCard
          title="Total Payments"
          value={revenue?.totalPayments || 0}
          icon={<CreditCard size={22} />}
          color="indigo"
        />
        <StatCard
          title="Credits Sold"
          value={revenue?.totalCredits || 0}
          icon={<TrendingUp size={22} />}
          color="amber"
        />
      </div>

      {/* Monthly Revenue Chart */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Monthly Revenue ({year})</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${v}`} />
            <Tooltip formatter={(value: number) => formatCurrency(value)} />
            <Bar dataKey="revenue" fill="#4f46e5" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Monthly Payments Chart */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Monthly Payments ({year})</h2>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Line type="monotone" dataKey="payments" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981' }} />
            <Line type="monotone" dataKey="credits" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b' }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Tier Breakdown */}
      {revenue?.tierBreakdown && Object.keys(revenue.tierBreakdown).length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Tier Breakdown</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-100">
            {Object.entries(revenue.tierBreakdown).map(([slug, data]) => (
              <div key={slug} className="p-6 text-center">
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${TIER_COLORS[slug] || 'bg-gray-100 text-gray-700'}`}>
                  {slug.charAt(0).toUpperCase() + slug.slice(1)}
                </span>
                <p className="text-2xl font-bold text-gray-900 mt-3">{formatCurrency(data.revenueInr)}</p>
                <p className="text-sm text-gray-400 mt-1">{data.count} payments · {data.credits} credits</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Payments Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">
            Payment History {month ? `(${MONTH_NAMES[month - 1]} ${year})` : `(${year})`}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-3 font-medium">Date</th>
                <th className="px-6 py-3 font-medium">Razorpay ID</th>
                <th className="px-6 py-3 font-medium">Tier</th>
                <th className="px-6 py-3 font-medium">Credits</th>
                <th className="px-6 py-3 font-medium">Amount</th>
                <th className="px-6 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {revenue?.payments.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 text-gray-600">{formatDate(p.createdAt)}</td>
                  <td className="px-6 py-3 font-mono text-xs text-gray-500">{p.razorpayPaymentId}</td>
                  <td className="px-6 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${TIER_COLORS[p.tierSlug] || 'bg-gray-100 text-gray-700'}`}>
                      {p.tierName}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-gray-600">{p.credits}</td>
                  <td className="px-6 py-3 font-semibold text-gray-900">{formatCurrency(p.amountInr)}</td>
                  <td className="px-6 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${p.status === 'captured' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!revenue?.payments.length && <p className="px-6 py-8 text-center text-sm text-gray-400">No payments found for this period</p>}
        </div>
      </div>
    </div>
  );
}
