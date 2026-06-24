import React, { useState, useEffect } from "react";
import { Plus, Filter, Eye, CreditCard, DollarSign, TrendingUp, Calendar } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { receiptsAPI } from "../utils/api";
import { formatCurrency, formatDate, getStatusBadgeClass } from "../utils/helpers";
import DataTable from "../components/UI/DataTable";
import Modal from "../components/UI/Modal";
import LoadingSpinner from "../components/UI/LoadingSpinner";
import toast from "react-hot-toast";

const Payments = () => {
  const { user } = useAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    totalRecords: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  });
  const [filters, setFilters] = useState({
    customerName: "",
    paymentType: "",
    status: [],
    fromDate: "",
    toDate: "",
    minAmount: "",
    maxAmount: "",
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [stats, setStats] = useState({
    totalAmount: 0,
    totalPayments: 0,
    pendingAmount: 0,
    approvedAmount: 0,
    expiredAmount: 0,
    cancelledAmount: 0,
  });

  useEffect(() => {
    fetchPayments();
  }, [pagination.page, filters]);

  useEffect(() => {
    fetchPaymentStats();
  }, [filters]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      
      // Handle multiple status selections
      const selectedStatuses = filters.status || [];
      
      if (selectedStatuses.length > 0) {
        // Fetch data for each selected status and combine
        const allResults = await Promise.all(
          selectedStatuses.map(async (status) => {
            const params = {
              pageSize: 10000, // Get all for this status
              ...filters,
              status: status, // Single status per call
            };
            
            // Remove empty filters
            Object.keys(params).forEach((key) => {
              if (params[key] === "" || params[key] === null || params[key] === undefined || (Array.isArray(params[key]) && params[key].length === 0)) {
                delete params[key];
              }
            });
            
            const response = await receiptsAPI.getReceipts(params);
            return response.data.data || [];
          })
        );
        
        // Combine and deduplicate results
        const combinedData = allResults.flat();
        const uniqueData = Array.from(new Map(combinedData.map(item => [item.id, item])).values());
        
        // Apply client-side pagination
        const startIndex = (pagination.page - 1) * pagination.pageSize;
        const endIndex = startIndex + pagination.pageSize;
        const paginatedData = uniqueData.slice(startIndex, endIndex);
        
        setPayments(paginatedData);
        setPagination((prev) => ({
          ...prev,
          totalRecords: uniqueData.length,
          totalPages: Math.ceil(uniqueData.length / pagination.pageSize),
          hasNextPage: endIndex < uniqueData.length,
          hasPreviousPage: pagination.page > 1,
        }));
      } else {
        // No status filter or empty - fetch normally
        const params = {
          page: pagination.page,
          pageSize: pagination.pageSize,
          ...filters,
        };
        
        delete params.status; // Remove empty array

        // Remove empty filters
        Object.keys(params).forEach((key) => {
          if (params[key] === "" || params[key] === null || params[key] === undefined || (Array.isArray(params[key]) && params[key].length === 0)) {
            delete params[key];
          }
        });

        const response = await receiptsAPI.getReceipts(params);
        const { data, totalRecords, totalPages, hasNextPage, hasPreviousPage } = response.data;

        setPayments(data);
        setPagination((prev) => ({
          ...prev,
          totalRecords,
          totalPages,
          hasNextPage,
          hasPreviousPage,
        }));
      }
    } catch (error) {
      console.error("Error fetching payments:", error);
      toast.error("Failed to fetch payments");
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentStats = async () => {
    try {
      // Fetch ALL receipts (not paginated) for accurate statistics
      const params = {
        pageSize: 100000, // Large number to get all receipts
        ...filters,
      };

      // Remove empty filters
      Object.keys(params).forEach((key) => {
        if (params[key] === "" || params[key] === null || params[key] === undefined) {
          delete params[key];
        }
      });

      const response = await receiptsAPI.getReceipts(params);
      const allReceipts = response.data.data || [];

      // Calculate stats from ALL receipts
      // Total Amount: Approved + Converted (active revenue)
      const totalAmount = allReceipts
        .filter(p => p.status === "Approved" || p.status === "Converted")
        .reduce((sum, payment) => sum + (payment.totalAmount > 0 ? payment.totalAmount : payment.amount), 0);
      
      const totalPayments = allReceipts.length;
      
      const pendingAmount = allReceipts
        .filter(p => p.status === "Pending")
        .reduce((sum, payment) => sum + (payment.totalAmount > 0 ? payment.totalAmount : payment.amount), 0);
      
      // Approved amount: Only Approved and Converted receipts
      const approvedAmount = allReceipts
        .filter(p => p.status === "Approved" || p.status === "Converted")
        .reduce((sum, payment) => sum + (payment.totalAmount > 0 ? payment.totalAmount : payment.amount), 0);

      // Expired amount: Separate tracking for expired tokens
      const expiredAmount = allReceipts
        .filter(p => p.status === "Expired")
        .reduce((sum, payment) => sum + (payment.totalAmount > 0 ? payment.totalAmount : payment.amount), 0);

      // Cancelled amount: Separate tracking for cancelled receipts
      const cancelledAmount = allReceipts
        .filter(p => p.status === "Cancelled")
        .reduce((sum, payment) => sum + (payment.totalAmount > 0 ? payment.totalAmount : payment.amount), 0);

      setStats({
        totalAmount,
        totalPayments,
        pendingAmount,
        approvedAmount,
        expiredAmount,
        cancelledAmount,
      });
    } catch (error) {
      console.error("Error calculating payment stats:", error);
    }
  };

  const handlePageChange = (newPage) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleStatusToggle = (statusValue) => {
    setFilters((prev) => {
      const currentStatuses = prev.status || [];
      const newStatuses = currentStatuses.includes(statusValue)
        ? currentStatuses.filter(s => s !== statusValue)
        : [...currentStatuses, statusValue];
      return { ...prev, status: newStatuses };
    });
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const clearFilters = () => {
    setFilters({
      customerName: "",
      paymentType: "",
      status: [],
      fromDate: "",
      toDate: "",
      minAmount: "",
      maxAmount: "",
    });
  };

  const getPaymentMethodIcon = (payment) => {
    if (payment.cashChecked) return "💵";
    if (payment.chequeChecked) return "📄";
    if (payment.rtgsChecked) return "🏦";
    return "💳";
  };

  const getPaymentMethods = (payment) => {
    const methods = [];
    if (payment.cashChecked) methods.push("Cash");
    if (payment.chequeChecked) methods.push(`Cheque (${payment.chequeNo || 'N/A'})`);
    if (payment.rtgsChecked) methods.push(`RTGS/NEFT (${payment.rtgsNeft || 'N/A'})`);
    return methods.length > 0 ? methods.join(", ") : "Not specified";
  };

  const columns = [
    {
      key: "receiptNo",
      title: "Receipt No",
      sortable: true,
    },
    {
      key: "fromName",
      title: "Customer Name",
      sortable: true,
    },
    {
      key: "amount",
      title: "Amount",
      sortable: true,
      render: (value) => formatCurrency(value),
    },
    {
      key: "paymentMethod",
      title: "Payment Method",
      render: (_, row) => (
        <div className="flex items-center space-x-2">
          <span>{getPaymentMethodIcon(row)}</span>
          <span className="text-sm">{getPaymentMethods(row)}</span>
        </div>
      ),
    },
    {
      key: "status",
      title: "Status",
      sortable: true,
      render: (value, row) => (
        <div className="flex items-center space-x-2">
          <span className={`badge ${getStatusBadgeClass(value)}`}>{value}</span>
          {row.associateRemarks && (
            <span 
              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800"
              title="Has associate remarks"
            >
              📝
            </span>
          )}
        </div>
      ),
    },
    {
      key: "createdAt",
      title: "Payment Date",
      sortable: true,
      render: (value) => formatDate(value),
    },
    {
      key: "actions",
      title: "Actions",
      render: (_, row) => (
        <div className="flex space-x-2">
          <button
            onClick={() => {
              setSelectedPayment(row);
              setShowPaymentModal(true);
            }}
            className="text-primary-600 hover:text-primary-900"
            title="View Payment Details"
          >
            <Eye className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-4 md:p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center">
              <CreditCard className="h-6 w-6 md:h-8 md:w-8 mr-2 md:mr-3 text-blue-600" />
              Payments Management
            </h1>
            <p className="mt-2 text-sm md:text-base text-gray-600">
              Track and manage all payment transactions
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="bg-blue-600 text-white hover:bg-blue-700 font-medium px-4 py-2 rounded-lg transition-colors flex items-center text-sm md:text-base whitespace-nowrap"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </button>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="flex flex-wrap gap-4">
        <div className="flex-grow flex-shrink-0 basis-[200px] bg-gradient-to-br from-green-50 to-emerald-100 rounded-xl shadow-md hover:shadow-lg transition-shadow p-5 border border-green-200">
          <div className="flex items-center justify-between">
            <div className="flex-1 mr-3">
              <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-1 whitespace-nowrap">Total Amount</p>
              <p className="text-2xl font-bold text-green-900 whitespace-nowrap">
                {formatCurrency(stats.totalAmount)}
              </p>
            </div>
            <div className="bg-green-500 rounded-full p-3 flex-shrink-0">
              <DollarSign className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="flex-grow flex-shrink-0 basis-[200px] bg-gradient-to-br from-blue-50 to-cyan-100 rounded-xl shadow-md hover:shadow-lg transition-shadow p-5 border border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex-1 mr-3">
              <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1 whitespace-nowrap">Total Payments</p>
              <p className="text-2xl font-bold text-blue-900 whitespace-nowrap">{stats.totalPayments}</p>
            </div>
            <div className="bg-blue-500 rounded-full p-3 flex-shrink-0">
              <CreditCard className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="flex-grow flex-shrink-0 basis-[200px] bg-gradient-to-br from-yellow-50 to-amber-100 rounded-xl shadow-md hover:shadow-lg transition-shadow p-5 border border-yellow-200">
          <div className="flex items-center justify-between">
            <div className="flex-1 mr-3">
              <p className="text-xs font-semibold text-yellow-700 uppercase tracking-wide mb-1 whitespace-nowrap">Pending Amount</p>
              <p className="text-2xl font-bold text-yellow-900 whitespace-nowrap">
                {formatCurrency(stats.pendingAmount)}
              </p>
            </div>
            <div className="bg-yellow-500 rounded-full p-3 flex-shrink-0">
              <Calendar className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="flex-grow flex-shrink-0 basis-[200px] bg-gradient-to-br from-purple-50 to-violet-100 rounded-xl shadow-md hover:shadow-lg transition-shadow p-5 border border-purple-200">
          <div className="flex items-center justify-between">
            <div className="flex-1 mr-3">
              <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-1 whitespace-nowrap">Approved Amount</p>
              <p className="text-2xl font-bold text-purple-900 whitespace-nowrap">
                {formatCurrency(stats.approvedAmount)}
              </p>
            </div>
            <div className="bg-purple-500 rounded-full p-3 flex-shrink-0">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="flex-grow flex-shrink-0 basis-[200px] bg-gradient-to-br from-red-50 to-rose-100 rounded-xl shadow-md hover:shadow-lg transition-shadow p-5 border border-red-200">
          <div className="flex items-center justify-between">
            <div className="flex-1 mr-3">
              <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-1 whitespace-nowrap">Expired Revenue</p>
              <p className="text-2xl font-bold text-red-900 whitespace-nowrap">
                {formatCurrency(stats.expiredAmount)}
              </p>
            </div>
            <div className="bg-red-500 rounded-full p-3 flex-shrink-0">
              <span className="text-white text-xl">⏰</span>
            </div>
          </div>
        </div>

        <div className="flex-grow flex-shrink-0 basis-[200px] bg-gradient-to-br from-pink-50 to-rose-100 rounded-xl shadow-md hover:shadow-lg transition-shadow p-5 border border-pink-200">
          <div className="flex items-center justify-between">
            <div className="flex-1 mr-3">
              <p className="text-xs font-semibold text-pink-700 uppercase tracking-wide mb-1 whitespace-nowrap">Cancelled Revenue</p>
              <p className="text-2xl font-bold text-pink-900 whitespace-nowrap">
                {formatCurrency(stats.cancelledAmount)}
              </p>
            </div>
            <div className="bg-pink-500 rounded-full p-3 flex-shrink-0">
              <span className="text-white text-xl">✕</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="card">
          <div className="card-content">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Customer Name
                </label>
                <input
                  type="text"
                  value={filters.customerName}
                  onChange={(e) => handleFilterChange("customerName", e.target.value)}
                  className="input"
                  placeholder="Search by customer name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Method
                </label>
                <select
                  value={filters.paymentType}
                  onChange={(e) => handleFilterChange("paymentType", e.target.value)}
                  className="input"
                >
                  <option value="">All Methods</option>
                  <option value="Cash">Cash</option>
                  <option value="Cheque">Cheque</option>
                  <option value="RTGS">RTGS/NEFT/UPI</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status (Select Multiple)
                </label>
                <div className="space-y-2 bg-gray-50 p-3 rounded-lg border border-gray-200">
                  {['Pending', 'Approved', 'Rejected', 'Expired', 'Converted', 'Transferred', 'Cancelled'].map((status) => (
                    <label key={status} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-100 p-1 rounded">
                      <input
                        type="checkbox"
                        checked={filters.status.includes(status)}
                        onChange={() => handleStatusToggle(status)}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-700">{status}</span>
                    </label>
                  ))}
                </div>
                {filters.status.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    {filters.status.length} status(es) selected
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  From Date
                </label>
                <input
                  type="date"
                  value={filters.fromDate}
                  onChange={(e) => handleFilterChange("fromDate", e.target.value)}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  To Date
                </label>
                <input
                  type="date"
                  value={filters.toDate}
                  onChange={(e) => handleFilterChange("toDate", e.target.value)}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Min Amount
                </label>
                <input
                  type="number"
                  value={filters.minAmount}
                  onChange={(e) => handleFilterChange("minAmount", e.target.value)}
                  className="input"
                  placeholder="Minimum amount"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Amount
                </label>
                <input
                  type="number"
                  value={filters.maxAmount}
                  onChange={(e) => handleFilterChange("maxAmount", e.target.value)}
                  className="input"
                  placeholder="Maximum amount"
                />
              </div>
              <div className="flex items-end">
                <button onClick={clearFilters} className="btn-secondary w-full">
                  Clear Filters
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Data Table */}
      <DataTable
        data={payments}
        columns={columns}
        loading={loading}
        pagination={pagination}
        onPageChange={handlePageChange}
        searchable={false}
        filterable={false}
      />

      {/* Payment Details Modal */}
      <Modal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        title="Payment Details"
        size="lg"
      >
        {selectedPayment && (
          <div className="space-y-6">
            {/* Payment Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Payment Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Receipt No
                  </label>
                  <p className="mt-1 text-sm text-gray-900">{selectedPayment.receiptNo}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Amount
                  </label>
                  <p className="mt-1 text-sm text-gray-900 font-semibold">
                    {formatCurrency(selectedPayment.amount)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Payment Date
                  </label>
                  <p className="mt-1 text-sm text-gray-900">
                    {formatDate(selectedPayment.createdAt)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Status
                  </label>
                  <span className={`badge ${getStatusBadgeClass(selectedPayment.status)} mt-1`}>
                    {selectedPayment.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Customer Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Customer Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Customer Name
                  </label>
                  <p className="mt-1 text-sm text-gray-900">{selectedPayment.fromName}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Mobile
                  </label>
                  <p className="mt-1 text-sm text-gray-900">{selectedPayment.mobile}</p>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Address
                  </label>
                  <p className="mt-1 text-sm text-gray-900">{selectedPayment.address}</p>
                </div>
              </div>
            </div>

            {/* Property Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Property Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Site Name
                  </label>
                  <p className="mt-1 text-sm text-gray-900">{selectedPayment.siteName}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Plot No
                  </label>
                  <p className="mt-1 text-sm text-gray-900">{selectedPayment.plotVillaNo}</p>
                </div>
              </div>
            </div>

            {/* Payment Method Details */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Payment Method Details</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="space-y-3">
                  {selectedPayment.cashChecked && (
                    <div className="flex items-center space-x-2">
                      <span className="text-green-600">💵</span>
                      <span className="text-sm font-medium">Cash Payment</span>
                    </div>
                  )}
                  {selectedPayment.chequeChecked && (
                    <div className="flex items-center space-x-2">
                      <span className="text-blue-600">📄</span>
                      <span className="text-sm font-medium">
                        Cheque Payment {selectedPayment.chequeNo && `(${selectedPayment.chequeNo})`}
                      </span>
                    </div>
                  )}
                  {selectedPayment.rtgsChecked && (
                    <div className="flex items-center space-x-2">
                      <span className="text-purple-600">🏦</span>
                      <span className="text-sm font-medium">
                        RTGS/NEFT/UPI {selectedPayment.rtgsNeft && `(${selectedPayment.rtgsNeft})`}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Remarks */}
            {selectedPayment.associateRemarks && (
              <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                <label className="block text-sm font-bold text-green-800 mb-1">
                  📝 Associate Remarks
                </label>
                <p className="text-sm text-green-900 font-medium">
                  "{selectedPayment.associateRemarks}"
                </p>
              </div>
            )}
            {selectedPayment.adminRemarks && (
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                <label className="block text-sm font-bold text-blue-800 mb-1">
                  👨‍💼 Admin Remarks
                </label>
                <p className="text-sm text-blue-900">
                  {selectedPayment.adminRemarks}
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Payments;