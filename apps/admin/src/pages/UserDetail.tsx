import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Shield, ShieldOff, Save } from 'lucide-react';
import { getUserDetail, updateUserCredits, toggleUserAdmin } from '../api';
import StatCard from '../components/StatCard';

interface PaymentInfo {
  id: string;
  razorpayPaymentId: string;
  tierSlug: string;
  tierName: string;
  credits: number;
  amountInr: number;
  status: string;
  createdAt: string;
}

interface ProjectInfo {
  id: string;
  productName: string;
  productCategory: string;
  status: string;
  targetPlatforms: string[];
  createdAt: string;
}

interface UserDetailData {
  id: string;
  email: string;
  name: string | null;
  creditsRemaining: number;
  isAdmin: boolean;
  createdAt: string;
  updatedAt: string;
  totalSpentInr: number;
  totalCreditsEver: number;
  payments: PaymentInfo[];
  projects: ProjectInfo[];
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

export default function UserDetail() {
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<UserDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [creditsInput, setCreditsInput] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getUserDetail(id)
      .then((res) => {
        setUser(res.data);
        setCreditsInput(String(res.data.creditsRemaining));
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleSaveCredits = async () => {
    if (!id) return;
    setSaving(true);
    try {
      const res = await updateUserCredits(id, parseInt(creditsInput, 10));
      setUser((prev) => prev ? { ...prev, creditsRemaining: res.data.creditsRemaining } : prev);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAdmin = async () => {
    if (!id || !user) return;
    const confirmed = window.confirm(
      user.isAdmin
        ? 'Remove admin access from this user?'
        : 'Grant admin access to this user?',
    );
    if (!confirmed) return;

    const res = await toggleUserAdmin(id, !user.isAdmin);
    setUser((prev) => prev ? { ...prev, isAdmin: res.data.isAdmin } : prev);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-400 text-lg">Loading user...</div>;
  }

  if (!user) {
    return <div className="text-center py-12 text-gray-500">User not found</div>;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/users" className="p-2 rounded-lg hover:bg-gray-100 transition">
          <ArrowLeft size={20} className="text-gray-600" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{user.name || user.email}</h1>
            {user.isAdmin && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                <Shield size={12} /> Admin
              </span>
            )}
          </div>
          <p className="text-gray-500 mt-1">{user.email} · Joined {formatDate(user.createdAt)}</p>
        </div>
        <button
          onClick={handleToggleAdmin}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
            user.isAdmin
              ? 'bg-red-50 text-red-600 hover:bg-red-100'
              : 'bg-purple-50 text-purple-600 hover:bg-purple-100'
          }`}
        >
          {user.isAdmin ? <><ShieldOff size={16} /> Remove Admin</> : <><Shield size={16} /> Make Admin</>}
        </button>
      </div>

      {/* User Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Credits Remaining" value={user.creditsRemaining} color="indigo" />
        <StatCard title="Total Spent" value={formatCurrency(user.totalSpentInr)} color="green" />
        <StatCard title="Total Credits Purchased" value={user.totalCreditsEver} color="amber" />
        <StatCard title="Total Projects" value={user.projects.length} color="blue" />
      </div>

      {/* Edit Credits */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Manage Credits</h2>
        <div className="flex items-center gap-3">
          <input
            type="number"
            min="0"
            value={creditsInput}
            onChange={(e) => setCreditsInput(e.target.value)}
            className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
          />
          <button
            onClick={handleSaveCredits}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition text-sm font-medium"
          >
            <Save size={16} />
            {saving ? 'Saving...' : 'Update Credits'}
          </button>
        </div>
      </div>

      {/* Payment History */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Payments ({user.payments.length})</h2>
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
              {user.payments.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 text-gray-600">{formatDate(p.createdAt)}</td>
                  <td className="px-6 py-3 font-mono text-xs text-gray-500">{p.razorpayPaymentId}</td>
                  <td className="px-6 py-3">{p.tierName}</td>
                  <td className="px-6 py-3 text-gray-600">{p.credits}</td>
                  <td className="px-6 py-3 font-semibold text-gray-900">{formatCurrency(p.amountInr)}</td>
                  <td className="px-6 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[p.status] || 'bg-gray-100 text-gray-600'}`}>
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!user.payments.length && <p className="px-6 py-6 text-center text-sm text-gray-400">No payments yet</p>}
        </div>
      </div>

      {/* Projects */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Projects ({user.projects.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-3 font-medium">Product</th>
                <th className="px-6 py-3 font-medium">Category</th>
                <th className="px-6 py-3 font-medium">Platforms</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {user.projects.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 font-medium text-gray-900">{p.productName || '—'}</td>
                  <td className="px-6 py-3 text-gray-500">{p.productCategory || '—'}</td>
                  <td className="px-6 py-3">
                    <div className="flex flex-wrap gap-1">
                      {p.targetPlatforms.filter(Boolean).map((pl) => (
                        <span key={pl} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">{pl}</span>
                      ))}
                    </div>
                  </td>
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
          {!user.projects.length && <p className="px-6 py-6 text-center text-sm text-gray-400">No projects yet</p>}
        </div>
      </div>
    </div>
  );
}
