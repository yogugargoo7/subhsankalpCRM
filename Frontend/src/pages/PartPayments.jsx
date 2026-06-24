import React, { useState, useEffect } from "react";
import { Receipt, Eye, Calculator, TrendingUp } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { plotsAPI } from "../utils/api";
import { formatCurrency, formatDate } from "../utils/helpers";
import DataTable from "../components/UI/DataTable";
import Modal from "../components/UI/Modal";
import LoadingSpinner from "../components/UI/LoadingSpinner";
import PartPaymentForm from "../components/Forms/PartPaymentForm";
import toast from "react-hot-toast";

const PartPayments = () => {
  const { user } = useAuth();
  const [plots, setPlots] = useState([]);
  const [allPlots, setAllPlots] = useState([]); // Store all plots for stats
  const [loading, setLoading] = useState(true);
  const [selectedPlot, setSelectedPlot] = useState(null);
  const [showPlotModal, setShowPlotModal] = useState(false);
  const [showPartPaymentForm, setShowPartPaymentForm] = useState(false);
  const [selectedPlotForPayment, setSelectedPlotForPayment] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    totalRecords: 0,
    totalPages: 0,
  });

  // Fetch all plots once on mount
  useEffect(() => {
    fetchAllPlots();
  }, []);

  // Update displayed plots when pagination changes
  useEffect(() => {
    if (allPlots.length > 0) {
      updatePaginatedPlots();
    }
  }, [pagination.page, pagination.pageSize, allPlots]);

  const fetchAllPlots = async () => {
    try {
      setLoading(true);

      // Fetch plots with Tokened status
      const tokenedResponse = await plotsAPI.getPlots({
        page: 1,
        pageSize: 10000,
        status: "Tokened",
      });

      // Fetch plots with PartPayment status
      const partPaymentResponse = await plotsAPI.getPlots({
        page: 1,
        pageSize: 10000,
        status: "PartPayment",
      });

      // Combine both results
      const combinedPlots = [
        ...(tokenedResponse.data.data || []),
        ...(partPaymentResponse.data.data || []),
      ];

      // Store all plots
      setAllPlots(combinedPlots);

      // Update pagination info with hasNextPage and hasPreviousPage
      const totalPages = Math.ceil(combinedPlots.length / pagination.pageSize);
      setPagination((prev) => ({
        ...prev,
        totalRecords: combinedPlots.length,
        totalPages: totalPages,
        hasNextPage: prev.page < totalPages,
        hasPreviousPage: prev.page > 1,
      }));
    } catch (error) {
      console.error("Error fetching part payment plots:", error);
      toast.error("Failed to load plots");
    } finally {
      setLoading(false);
    }
  };

  const updatePaginatedPlots = () => {
    const startIndex = (pagination.page - 1) * pagination.pageSize;
    const endIndex = startIndex + pagination.pageSize;
    const paginatedPlots = allPlots.slice(startIndex, endIndex);
    setPlots(paginatedPlots);

    // Update hasNextPage and hasPreviousPage
    setPagination((prev) => ({
      ...prev,
      hasNextPage: prev.page < prev.totalPages,
      hasPreviousPage: prev.page > 1,
    }));
  };

  const handleCreatePartPayment = (plot) => {
    setSelectedPlotForPayment(plot);
    setShowPartPaymentForm(true);
  };

  const handlePartPaymentSuccess = () => {
    setShowPartPaymentForm(false);
    setSelectedPlotForPayment(null);
    fetchAllPlots();
  };

  const getPaymentPercentage = (plot) => {
    const received = plot.receivedAmount || plot.ReceivedAmount || 0;
    const total = plot.totalPrice || 0;
    return total > 0 ? ((received / total) * 100).toFixed(1) : 0;
  };

  const getProgressColor = (percentage) => {
    if (percentage >= 30) return "bg-green-500";
    if (percentage >= 15) return "bg-yellow-500";
    return "bg-orange-500";
  };

  const columns = [
    {
      key: "id",
      title: "ID",
      sortable: true,
    },
    {
      key: "siteName",
      title: "Site Name",
      sortable: true,
      render: (value, row) => (
        <div className="text-sm">
          <p className="font-medium text-gray-900">{value}</p>
          {row.block && (
            <p className="text-gray-500 text-xs">Block: {row.block}</p>
          )}
        </div>
      ),
    },
    {
      key: "plotNumber",
      title: "Plot Number",
      sortable: true,
      render: (value, row) => (
        <div className="text-sm">
          <p className="font-medium text-gray-900">{value}</p>
          {row.registeredCompany && (
            <p className="text-gray-500 text-xs">{row.registeredCompany}</p>
          )}
        </div>
      ),
    },
    {
      key: "plotSize",
      title: "Size & Price",
      render: (value, row) => (
        <div className="text-sm">
          <p className="font-medium text-gray-900">{value}</p>
          <p className="text-gray-600 text-xs">
            {formatCurrency(row.totalPrice)}
          </p>
        </div>
      ),
    },
    {
      key: "customerName",
      title: "Customer",
      render: (value, row) => (
        <div className="text-sm">
          <p className="font-medium text-gray-900">{value || "N/A"}</p>
          {row.associateName && (
            <p className="text-gray-500 text-xs">by {row.associateName}</p>
          )}
        </div>
      ),
    },
    {
      key: "receivedAmount",
      title: "Payment Progress",
      render: (value, row) => {
        const received = row.receivedAmount || row.ReceivedAmount || 0;
        const total = row.totalPrice || 0;
        const percentage = parseFloat(getPaymentPercentage(row));
        const remaining = total - received;

        return (
          <div className="text-sm space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-medium text-green-600">
                {formatCurrency(received)}
              </span>
              <span className="text-xs text-gray-500">{percentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${getProgressColor(percentage)}`}
                style={{ width: `${Math.min(percentage, 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-600">
              Remaining: {formatCurrency(remaining)}
            </p>
            {percentage >= 30 && (
              <p className="text-xs text-green-600 font-medium">
                ✓ Ready for Booking
              </p>
            )}
          </div>
        );
      },
    },
    {
      key: "status",
      title: "Status",
      sortable: true,
      render: (value) => {
        const statusColors = {
          Tokened: "bg-orange-100 text-orange-800",
          PartPayment: "bg-blue-100 text-blue-800",
        };
        return (
          <span
            className={`badge ${
              statusColors[value] || "bg-gray-100 text-gray-800"
            }`}
          >
            {value}
          </span>
        );
      },
    },
    {
      key: "tokenExpiryDate",
      title: "Token Expiry",
      render: (value, row) => {
        if (!value || row.status !== "Tokened")
          return <span className="text-gray-400 text-sm">-</span>;

        const expiryDate = new Date(value);
        const today = new Date();
        const daysLeft = Math.ceil(
          (expiryDate - today) / (1000 * 60 * 60 * 24)
        );

        return (
          <div className="text-sm">
            <p className="text-gray-900">{formatDate(value)}</p>
            {daysLeft <= 7 && daysLeft > 0 && (
              <p className="text-orange-600 text-xs font-medium">
                {daysLeft} days left
              </p>
            )}
            {daysLeft <= 0 && (
              <p className="text-red-600 text-xs font-medium">Expires Today</p>
            )}
          </div>
        );
      },
    },
    {
      key: "actions",
      title: "Actions",
      render: (_, row) => (
        <div className="flex space-x-2">
          <button
            onClick={() => {
              setSelectedPlot(row);
              setShowPlotModal(true);
            }}
            className="text-primary-600 hover:text-primary-900"
            title="View Details"
          >
            <Eye className="h-4 w-4" />
          </button>
          {user?.role === "Admin" && (
            <button
              onClick={() => handleCreatePartPayment(row)}
              className="text-blue-600 hover:text-blue-900"
              title="Add Part Payment"
            >
              <Receipt className="h-4 w-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  // Calculate stats from all plots, not just paginated ones
  const stats = {
    tokened: allPlots.filter((p) => p.status === "Tokened").length,
    partPayment: allPlots.filter((p) => p.status === "PartPayment").length,
    readyForBooking: allPlots.filter(
      (p) => parseFloat(getPaymentPercentage(p)) >= 30
    ).length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Part Payment Management
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Track and manage part payments for tokened plots until they reach 30%
          for booking
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="flex flex-wrap gap-4">
        <div className="flex-grow flex-shrink-0 basis-[200px] bg-gradient-to-br from-purple-50 to-violet-100 rounded-xl shadow-md hover:shadow-lg transition-shadow p-5 border border-purple-200">
          <div className="flex items-center justify-between whitespace-nowrap">
            <div>
              <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-1">Total Plots</p>
              <p className="text-2xl font-bold text-purple-900">
                {pagination.totalRecords}
              </p>
            </div>
            <div className="bg-purple-500 rounded-full p-3 ml-3 flex-shrink-0">
              <Calculator className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="flex-grow flex-shrink-0 basis-[200px] bg-gradient-to-br from-orange-50 to-amber-100 rounded-xl shadow-md hover:shadow-lg transition-shadow p-5 border border-orange-200">
          <div className="flex items-center justify-between whitespace-nowrap">
            <div>
              <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide mb-1">Tokened</p>
              <p className="text-2xl font-bold text-orange-900">
                {stats.tokened}
              </p>
            </div>
            <div className="bg-orange-500 rounded-full p-3 ml-3 flex-shrink-0">
              <Receipt className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="flex-grow flex-shrink-0 basis-[200px] bg-gradient-to-br from-blue-50 to-cyan-100 rounded-xl shadow-md hover:shadow-lg transition-shadow p-5 border border-blue-200">
          <div className="flex items-center justify-between whitespace-nowrap">
            <div>
              <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">Part Payment</p>
              <p className="text-2xl font-bold text-blue-900">
                {stats.partPayment}
              </p>
            </div>
            <div className="bg-blue-500 rounded-full p-3 ml-3 flex-shrink-0">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="flex-grow flex-shrink-0 basis-[200px] bg-gradient-to-br from-green-50 to-emerald-100 rounded-xl shadow-md hover:shadow-lg transition-shadow p-5 border border-green-200">
          <div className="flex items-center justify-between whitespace-nowrap">
            <div>
              <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-1">Ready for Booking</p>
              <p className="text-2xl font-bold text-green-900">
                {stats.readyForBooking}
              </p>
              <p className="text-xs text-green-600 mt-1">≥30% paid</p>
            </div>
            <div className="bg-green-500 rounded-full p-3 ml-3 flex-shrink-0">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-lg shadow">
        {loading ? (
          <div className="p-8">
            <LoadingSpinner />
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={plots}
            pagination={pagination}
            onPageChange={(page) =>
              setPagination((prev) => ({ ...prev, page }))
            }
            onPageSizeChange={(pageSize) =>
              setPagination((prev) => ({ ...prev, pageSize, page: 1 }))
            }
          />
        )}
      </div>

      {/* Plot Details Modal */}
      {selectedPlot && (
        <Modal
          isOpen={showPlotModal}
          onClose={() => {
            setShowPlotModal(false);
            setSelectedPlot(null);
          }}
          title="Plot Details"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Site Name
                </label>
                <p className="text-sm text-gray-900">{selectedPlot.siteName}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Plot Number
                </label>
                <p className="text-sm text-gray-900">
                  {selectedPlot.plotNumber}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Plot Size
                </label>
                <p className="text-sm text-gray-900">{selectedPlot.plotSize}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Total Price
                </label>
                <p className="text-sm text-gray-900">
                  {formatCurrency(selectedPlot.totalPrice)}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Received Amount
                </label>
                <p className="text-sm text-green-600 font-medium">
                  {formatCurrency(
                    selectedPlot.receivedAmount ||
                      selectedPlot.ReceivedAmount ||
                      0
                  )}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Payment %
                </label>
                <p className="text-sm text-gray-900">
                  {getPaymentPercentage(selectedPlot)}%
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Customer Name
                </label>
                <p className="text-sm text-gray-900">
                  {selectedPlot.customerName || "N/A"}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Status
                </label>
                <p className="text-sm text-gray-900">{selectedPlot.status}</p>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Part Payment Form */}
      <PartPaymentForm
        isOpen={showPartPaymentForm}
        onClose={() => setShowPartPaymentForm(false)}
        plot={selectedPlotForPayment}
        onSuccess={handlePartPaymentSuccess}
      />
    </div>
  );
};

export default PartPayments;
