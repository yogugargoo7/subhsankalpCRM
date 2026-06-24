import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, 
  FileText, 
  Users, 
  TrendingUp, 
  MapPin,
  CreditCard,
  Clock,
  CheckCircle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { dashboardAPI, receiptsAPI, plotsAPI } from '../utils/api';
import { formatCurrency, formatDate , extractNumberFromString } from '../utils/helpers';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import toast from 'react-hot-toast';
import { set } from 'date-fns';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recentReceipts, setRecentReceipts] = useState([]);
  const [expiringTokens, setExpiringTokens] = useState([]);
  const [todaysExpiringTokens, setTodaysExpiringTokens] = useState([]);
  const [expiredTokens, setExpiredTokens] = useState([]);
  const [convertedTokens, setConvertedTokens] = useState([]);
  const [transferredTokens, setTransferredTokens] = useState([]);
  const [cancelledTokens, setCancelledTokens] = useState([]);
  const [refundedTokens, setRefundedTokens] = useState([]);
  const [expiredTokensStats, setExpiredTokensStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processingTokens, setProcessingTokens] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      if (user?.role === 'Admin') {
        const [statsResponse, expiringResponse, todaysExpiringResponse, expiredStatsResponse, expiredTokensResponse] = await Promise.all([
          dashboardAPI.getStats(),
          receiptsAPI.getExpiringTokens(7),
          receiptsAPI.getTodaysExpiringTokens(),
          plotsAPI.getExpiredTokensDashboard(),
          receiptsAPI.getExpiredTokens()
        ]);
        
        setStats(statsResponse.data);
        setExpiringTokens(expiringResponse.data);
        setTodaysExpiringTokens(todaysExpiringResponse.data);
        setExpiredTokensStats(expiredStatsResponse.data);
        
        // Separate expired, converted, transferred, and cancelled tokens - show ALL
        const allExpiredTokens = expiredTokensResponse.data || [];
        console.log('=== DASHBOARD TOKEN DEBUG ===');
        console.log('Total tokens received:', allExpiredTokens.length);
        console.log('All token statuses:', allExpiredTokens.map(t => ({ 
          id: t.id, 
          receiptNo: t.receiptNo,
          status: t.status, 
          name: t.fromName,
          plot: `${t.siteName} - ${t.plotVillaNo}`
        })));
        
        // Case-insensitive filtering
        const expired = allExpiredTokens.filter(t => t.status?.toLowerCase() === 'expired');
        const converted = allExpiredTokens.filter(t => t.status?.toLowerCase() === 'converted');
        const transferred = allExpiredTokens.filter(t => t.status?.toLowerCase() === 'transferred');
        const cancelled = allExpiredTokens.filter(t => t.status?.toLowerCase() === 'cancelled');
        const refunded = allExpiredTokens.filter(t => t.status?.toLowerCase() === 'refunded');
        
        console.log('Filtered counts:');
        console.log('  Expired:', expired.length);
        console.log('  Converted:', converted.length);
        console.log('  Transferred:', transferred.length);
        console.log('  Cancelled:', cancelled.length);
        console.log('  Refunded:', refunded.length);
        console.log('=== END DEBUG ===');
        
        setExpiredTokens(expired);
        setConvertedTokens(converted);
        setTransferredTokens(transferred);
        setCancelledTokens(cancelled);
        setRefundedTokens(refunded);
      } else if (user?.role === 'Associate') {
        const receiptsResponse = await receiptsAPI.getReceipts({ 
          page: 1, 
          pageSize: 5,
          sortBy: 'createdAt',
          sortOrder: 'desc'
        });
        setRecentReceipts(receiptsResponse.data.data);
      } else if (user?.role === 'Customer') {
        const receiptsResponse = await receiptsAPI.getCustomerReceipts();
        setRecentReceipts(receiptsResponse.data);
        console.log('Customer receipts:', receiptsResponse.data);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessExpiredTokens = async () => {
    try {
      setProcessingTokens(true);
      await receiptsAPI.processExpiredTokens();
      toast.success('Expired tokens processed successfully');
      // Refresh dashboard data
      await fetchDashboardData();
    } catch (error) {
      console.error('Error processing expired tokens:', error);
      toast.error('Failed to process expired tokens');
    } finally {
      setProcessingTokens(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const getColorClasses = (color) => {
    const colorMap = {
      primary: { bg: 'from-blue-50 to-cyan-100', border: 'border-blue-200', text: 'text-blue-900', label: 'text-blue-700', icon: 'bg-blue-500' },
      success: { bg: 'from-green-50 to-emerald-100', border: 'border-green-200', text: 'text-green-900', label: 'text-green-700', icon: 'bg-green-500' },
      warning: { bg: 'from-yellow-50 to-amber-100', border: 'border-yellow-200', text: 'text-yellow-900', label: 'text-yellow-700', icon: 'bg-yellow-500' },
      danger: { bg: 'from-red-50 to-rose-100', border: 'border-red-200', text: 'text-red-900', label: 'text-red-700', icon: 'bg-red-500' },
    };
    return colorMap[color] || colorMap.primary;
  };

  const getPLCAddTotalAmount = (receipt) => {
    if(receipt?.other == null) return receipt.plotSize * receipt.basicRate;
    const percentage = extractNumberFromString(receipt.other);
    if (percentage !== null) {
      const plotValue = receipt.plotSize * receipt.basicRate;
      const plcAmount = plotValue * (percentage / 100);
      const totalAmount = plotValue + plcAmount;
      return totalAmount;
    }
    return receipt.plotSize * receipt.basicRate;
  }
  

  const StatCard = ({ title, value, icon: Icon, color = 'primary', change, onClick }) => {
    const colors = getColorClasses(color);
    return (
      <div 
        className={`flex-grow flex-shrink-0 basis-[200px] bg-gradient-to-br ${colors.bg} rounded-xl shadow-md hover:shadow-lg transition-shadow p-5 border ${colors.border} ${onClick ? 'cursor-pointer' : ''}`}
        onClick={onClick}
      >
        <div className="flex items-center justify-between whitespace-nowrap">
          <div>
            <p className={`text-xs font-semibold ${colors.label} uppercase tracking-wide mb-1`}>{title}</p>
            <div className="flex items-baseline">
              <p className={`text-2xl font-bold ${colors.text}`}>{value}</p>
              {change && (
                <span className={`ml-2 text-sm font-semibold ${
                  change > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {change > 0 ? '+' : ''}{change}%
                </span>
              )}
            </div>
          </div>
          <div className={`${colors.icon} rounded-full p-3 ml-3 flex-shrink-0`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.name}!
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Here's what's happening with your real estate business today.
        </p>
      </div>

      {/* Admin Dashboard */}
      {user?.role === 'Admin' && stats && (
        <>
          {/* Stats Grid */}
          <div className="flex flex-wrap gap-4">
            <StatCard
              title="Total Plots"
              value={stats.plots.total}
              icon={MapPin}
              color="primary"
              onClick={() => navigate('/plots')}
            />
            <StatCard
              title="Total Receipts"
              value={stats.receipts.total}
              icon={FileText}
              color="success"
              onClick={() => navigate('/receipts')}
            />
            <StatCard
              title="Total Revenue"
              value={formatCurrency(stats.revenue.total)}
              icon={TrendingUp}
              color="warning"
              onClick={() => navigate('/receipts')}
            />
            <StatCard
              title="Pending Approvals"
              value={stats.receipts.pending}
              icon={Clock}
              color="danger"
              onClick={() => navigate('/receipts')}
            />
          </div>

          {/* Plots Status */}
          <div className="flex flex-wrap gap-4">
            <StatCard
              title="Available Plots"
              value={stats.plots.available}
              icon={Building2}
              color="success"
              onClick={() => navigate('/plots')}
            />
            <StatCard
              title="Booked Plots"
              value={stats.plots.booked}
              icon={Clock}
              color="warning"
              onClick={() => navigate('/plots')}
            />
            <StatCard
              title="Sold Plots"
              value={stats.plots.sold}
              icon={CheckCircle}
              color="primary"
              onClick={() => navigate('/plots')}
            />
          </div>

          {/* Expired Tokens Alert */}
          {expiredTokensStats && expiredTokensStats.expiredTokensCount > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <Clock className="h-5 w-5 text-red-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    {expiredTokensStats.expiredTokensCount} Token(s) Expired
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>
                      Total expired token amount: {formatCurrency(expiredTokensStats.expiredTokenAmount)}
                    </p>
                    <p className="mt-1">
                      {expiredTokensStats.expiringIn7Days > 0 && 
                        `${expiredTokensStats.expiringIn7Days} more token(s) expiring in next 7 days.`
                      }
                    </p>
                  </div>
                  <div className="mt-3">
                    <button
                      onClick={handleProcessExpiredTokens}
                      className="btn btn-sm btn-danger"
                      disabled={processingTokens}
                    >
                      {processingTokens ? 'Processing...' : 'Process Expired Tokens'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Today's Expiring Tokens Alert */}
          {todaysExpiringTokens.length > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <Clock className="h-5 w-5 text-orange-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-orange-800">
                    {todaysExpiringTokens.length} Token(s) Expiring Today
                  </h3>
                  <div className="mt-2 text-sm text-orange-700">
                    <p>
                      These tokens will expire at the end of today. Total amount: {formatCurrency(todaysExpiringTokens.reduce((sum, token) => sum + token.amount, 0))}
                    </p>
                  </div>
                  <div className="mt-3 space-y-2 max-h-96 overflow-y-auto">
                    {todaysExpiringTokens.map((token) => (
                      <div key={token.id} className="flex items-center justify-between p-2 bg-orange-100 rounded-md">
                        <div>
                          <p className="text-sm font-medium text-orange-900">{token.fromName}</p>
                          <p className="text-xs text-orange-600">
                            {token.siteName} - {token.plotVillaNo}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-orange-900">
                            {formatCurrency(token.amount)}
                          </p>
                          <span className="badge badge-warning">Expires Today</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Recent Activity & Token Status */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Recent Receipts */}
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-medium text-gray-900">Recent Receipts</h3>
              </div>
              <div className="card-content">
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {stats.recentReceipts.map((receipt) => (
                    <div key={receipt.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{receipt.fromName}</p>
                        <p className="text-xs text-gray-500">
                          {receipt.siteName} - {receipt.plotVillaNo}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                          {formatCurrency(receipt.amount)}
                        </p>
                        <span className={`badge ${
                          receipt.status === 'Approved' ? 'badge-success' :
                          receipt.status === 'Pending' ? 'badge-warning' : 'badge-danger'
                        }`}>
                          {receipt.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Expiring Tokens */}
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-medium text-gray-900">Future Expiring Tokens (Next 7 days)</h3>
              </div>
              <div className="card-content">
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {expiringTokens.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No approved tokens expiring in next 7 days
                    </p>
                  ) : (
                    expiringTokens.map((token) => (
                      <div key={token.id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-md">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{token.fromName}</p>
                          <p className="text-xs text-gray-500">
                            {token.siteName} - {token.plotVillaNo}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-yellow-600">
                            {formatDate(token.tokenExpiryDate)}
                          </p>
                          <span className="badge badge-warning">Expiring</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Expired Tokens */}
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-medium text-gray-900">Expired Tokens</h3>
              </div>
              <div className="card-content">
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {expiredTokens.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No expired tokens
                    </p>
                  ) : (
                    expiredTokens.map((token) => (
                      <div key={token.id} className="flex items-center justify-between p-3 bg-red-50 rounded-md">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{token.fromName}</p>
                          <p className="text-xs text-gray-500">
                            {token.siteName} - {token.plotVillaNo}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-red-600">
                            {formatDate(token.tokenExpiryDate)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatCurrency(token.amount)}
                          </p>
                          <span className="badge badge-danger">
                            Expired
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Converted Tokens */}
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-medium text-gray-900">Converted Tokens</h3>
              </div>
              <div className="card-content">
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {convertedTokens.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No converted tokens
                    </p>
                  ) : (
                    convertedTokens.map((token) => (
                      <div key={token.id} className="flex items-center justify-between p-3 bg-green-50 rounded-md">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{token.fromName}</p>
                          <p className="text-xs text-gray-500">
                            {token.siteName} - {token.plotVillaNo}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-green-600">
                            {formatDate(token.tokenExpiryDate)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatCurrency(token.amount)}
                          </p>
                          <span className="badge badge-success">
                            Converted
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Transferred Tokens */}
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-medium text-gray-900">Transferred Tokens</h3>
              </div>
              <div className="card-content">
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {transferredTokens.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No transferred tokens
                    </p>
                  ) : (
                    transferredTokens.map((token) => (
                      <div key={token.id} className="flex items-center justify-between p-3 bg-purple-50 rounded-md">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{token.fromName}</p>
                          <p className="text-xs text-gray-500">
                            {token.siteName} - {token.plotVillaNo}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-purple-600">
                            {formatDate(token.tokenExpiryDate)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatCurrency(token.amount)}
                          </p>
                          <span className="badge badge-secondary">
                            Transferred
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Cancelled Tokens */}
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-medium text-gray-900">Cancelled Tokens</h3>
              </div>
              <div className="card-content">
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {cancelledTokens.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No cancelled tokens
                    </p>
                  ) : (
                    cancelledTokens.map((token) => (
                      <div key={token.id} className="flex items-center justify-between p-3 bg-red-50 rounded-md">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{token.fromName}</p>
                          <p className="text-xs text-gray-500">
                            {token.siteName} - {token.plotVillaNo}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-red-600">
                            {formatDate(token.tokenExpiryDate)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatCurrency(token.amount)}
                          </p>
                          <span className="badge badge-danger">
                            Cancelled
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Refunded Tokens */}
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-medium text-gray-900">Refunded Tokens</h3>
              </div>
              <div className="card-content">
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {refundedTokens.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No refunded tokens
                    </p>
                  ) : (
                    refundedTokens.map((token) => (
                      <div key={token.id} className="flex items-center justify-between p-3 bg-red-50 rounded-md">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{token.fromName}</p>
                          <p className="text-xs text-gray-500">
                            {token.siteName} - {token.plotVillaNo}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-red-600">
                            {formatDate(token.tokenExpiryDate)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatCurrency(token.amount)}
                          </p>
                          <span className="badge badge-danger">
                            Refunded
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div> 
        </>
      )}

      {/* Associate Dashboard */}
      {user?.role === 'Associate' && (
        <>
          <div className="flex flex-wrap gap-4">
            <StatCard
              title="My Receipts"
              value={recentReceipts.length}
              icon={FileText}
              color="primary"
              onClick={() => navigate('/receipts')}
            />
            <StatCard
              title="Approved"
              value={recentReceipts.filter(r => r.status === 'Approved').length}
              icon={CheckCircle}
              color="success"
              onClick={() => navigate('/receipts')}
            />
            <StatCard
              title="Pending"
              value={recentReceipts.filter(r => r.status === 'Pending').length}
              icon={Clock}
              color="warning"
              onClick={() => navigate('/receipts')}
            />
          </div>

          {/* Recent Receipts */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">My Recent Receipts</h3>
            </div>
            <div className="card-content">
              <div className="space-y-3">
                {recentReceipts.map((receipt) => (
                  <div key={receipt.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{receipt.fromName}</p>
                      <p className="text-xs text-gray-500">
                        {receipt.siteName} - {receipt.plotVillaNo}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {formatCurrency(receipt.amount)}
                      </p>
                      <span className={`badge ${
                        receipt.status === 'Approved' ? 'badge-success' :
                        receipt.status === 'Pending' ? 'badge-warning' : 'badge-danger'
                      }`}>
                        {receipt.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Customer Dashboard */}
      {user?.role === 'Customer' && (
        <>
          <div className="flex flex-wrap gap-4">
            <StatCard
              title="My Payments"
              value={recentReceipts.length}
              icon={Building2}
              color="primary"
            />
            <StatCard
              title="Total Paid"
              value={formatCurrency(recentReceipts.reduce((sum, r) => sum + r.amount, 0))}
              icon={CreditCard}
              color="success"
            />
            <StatCard
              title="Total Plot Value"
              value={formatCurrency(recentReceipts.length > 0 ? getPLCAddTotalAmount(recentReceipts.filter(r => r.status === 'Approved')[0]) : 0)}
              icon={Building2}
              color="primary"
            />
          </div>

          {/* My Bookings */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">My Payments</h3>
            </div>
            <div className="card-content">
              <div className="space-y-4">
                {recentReceipts.map((receipt) => (
                  <div key={receipt.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-lg font-medium text-gray-900">
                        {receipt.siteName} - {receipt.plotVillaNo}
                      </h4>
                      {/* <span className={`badge ${
                        receipt.status === 'Approved' ? 'badge-success' :
                        receipt.status === 'Pending' ? 'badge-warning' : 'badge-danger'
                      }`}>
                        {receipt.status}
                      </span> */}
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Plot Size</p>
                        <p className="font-medium">{receipt.plotSize}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Amount Paid</p>
                        <p className="font-medium">{formatCurrency(receipt.amount)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Booking Date</p>
                        <p className="font-medium">{formatDate(receipt.createdAt)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;