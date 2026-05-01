import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, IndianRupee, FolderKanban, TrendingUp, CreditCard, ImageIcon } from 'lucide-react';
import { getDashboard, getRecentActivity } from '../api';
import StatCard from '../components/StatCard';

interface DashboardData {
  totalUsers: number;
  newUsersLast30: number;
  payingUsers: number;
  totalRevenueInr: number;
  revenueLast30Inr: number;
  totalPayments: number;
  totalCreditsGranted: number;
  totalProjects: number;
  completedProjects: number;
  failedProjects: number;
  processingProjects: number;
}

interface Activity {
  recentUsers: { id: string; email: string; name: string; createdAt: string }[];
  recentPayments: { id: string; userEmail: string; userName: string; tierName: string; amountInr: number; status: string; createdAt: string }[];
  recentProjects: { id: string; userEmail: string; productName: string; status: string; createdAt: string }[];
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const statusColors: Record<string, string> = {
  completed: 'bg-green-100 text-green-700',
  processing: 'bg-blue-100 text-blue-700',
  pending: 'bg-yellow-100 text-yellow-700',
  failed: 'bg-red-100 text-red-700',
  captured: 'bg-green-100 text-green-700',
};

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardData | null>(null);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getDashboard(), getRecentActivity(10)])
      .then(([dashRes, actRes]) => {
        setStats(dashRes.data);
        setActivity(actRes.data);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="text-gray-400 text-lg">Loading dashboard...</div></div>;
  }

  if (!stats) return null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Overview of your Listic platform</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Revenue" value={formatCurrency(stats.totalRevenueInr)} subtitle={`${formatCurrency(stats.revenueLast30Inr)} last 30 days`} icon={<IndianRupee size={22} />} color="green" />
        <StatCard title="Total Users" value={stats.totalUsers} subtitle={`${stats.newUsersLast30} new in last 30 days`} icon={<Users size={22} />} color="indigo" />
        <StatCard title="Paying Users" value={stats.payingUsers} subtitle={`${stats.totalPayments} total payments`} icon={<CreditCard size={22} />} color="amber" />
        <StatCard title="Total Projects" value={stats.totalProjects} subtitle={`${stats.completedProjects} completed, ${stats.failedProjects} failed`} icon={<FolderKanban size={22} />} color="blue" />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Credits Granted" value={stats.totalCreditsGranted.toLocaleString()} icon={<ImageIcon size={22} />} color="indigo" />
        <StatCard title="Revenue (30d)" value={formatCurrency(stats.revenueLast30Inr)} icon={<TrendingUp size={22} />} color="green" />
        <StatCard title="Processing Now" value={stats.processingProjects} icon={<FolderKanban size={22} />} color="amber" />
      </div>

      {/* Recent Activity Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Payments */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Recent Payments</h2>
            <Link to="/revenue" className="text-sm text-indigo-600 hover:text-indigo-800">View all →</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {activity?.recentPayments.map((p) => (
              <div key={p.id} className="px-6 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{p.userEmail}</p>
                  <p className="text-xs text-gray-400">{p.tierName} · {formatDate(p.createdAt)}</p>
                </div>
                <span className="text-sm font-semibold text-green-600">{formatCurrency(p.amountInr)}</span>
              </div>
            ))}
            {!activity?.recentPayments.length && <p className="px-6 py-4 text-sm text-gray-400">No payments yet</p>}
          </div>
        </div>

        {/* Recent Users */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Recent Users</h2>
            <Link to="/users" className="text-sm text-indigo-600 hover:text-indigo-800">View all →</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {activity?.recentUsers.map((u) => (
              <Link key={u.id} to={`/users/${u.id}`} className="px-6 py-3 flex items-center justify-between hover:bg-gray-50 block">
                <div>
                  <p className="text-sm font-medium text-gray-900">{u.name || u.email}</p>
                  <p className="text-xs text-gray-400">{u.email}</p>
                </div>
                <span className="text-xs text-gray-400">{formatDate(u.createdAt)}</span>
              </Link>
            ))}
            {!activity?.recentUsers.length && <p className="px-6 py-4 text-sm text-gray-400">No users yet</p>}
          </div>
        </div>
      </div>

      {/* Recent Projects */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Recent Projects</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-100">
                <th className="px-6 py-3 font-medium">Product</th>
                <th className="px-6 py-3 font-medium">User</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {activity?.recentProjects.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 font-medium text-gray-900">{p.productName || '—'}</td>
                  <td className="px-6 py-3 text-gray-500">{p.userEmail}</td>
                  <td className="px-6 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[p.status] || 'bg-gray-100 text-gray-600'}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-gray-400">{formatDate(p.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!activity?.recentProjects.length && <p className="px-6 py-4 text-sm text-gray-400">No projects yet</p>}
        </div>
      </div>
    </div>
  );
}
