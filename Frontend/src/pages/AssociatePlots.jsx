import { useState, useEffect } from "react";
import {
  MapPin,
  User,
  Building2,
  Clock,
  CheckCircle,
  Eye,
  X,
} from "lucide-react";
import { plotsAPI } from "../utils/api";
import LoadingSpinner from "../components/UI/LoadingSpinner";
import toast from "react-hot-toast";

const AssociatePlots = () => {
  const [plotsData, setPlotsData] = useState({
    availablePlots: [],
    tokenedPlots: [],
    bookedPlots: [],
    summary: {},
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("available");
  const [selectedPlot, setSelectedPlot] = useState(null);
  const [showPlotModal, setShowPlotModal] = useState(false);

  useEffect(() => {
    fetchAssociatePlots();
  }, []);

  const fetchAssociatePlots = async () => {
    try {
      setLoading(true);
      const response = await plotsAPI.getAssociatePlots();
      setPlotsData({
        availablePlots: response.data.availablePlots || [],
        tokenedPlots: response.data.tokenedPlots || [],
        bookedPlots: response.data.bookedPlots || [],
        summary: response.data.summary || {},
      });
    } catch (error) {
      console.error("Error fetching associate plots:", error);
      toast.error("Failed to fetch plots data");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-IN");
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Available":
        return "bg-green-100 text-green-800";
      case "Tokened":
        return "bg-primary-100 text-primary-800";
      case "Booked":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const isTokenExpired = (expiryDate) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  };

  const handleViewPlot = (plot) => {
    setSelectedPlot(plot);
    setShowPlotModal(true);
  };

  const handleClosePlotModal = () => {
    setSelectedPlot(null);
    setShowPlotModal(false);
  };

  const PlotCard = ({ plot, showCustomer = false }) => (
    <div className="card hover:shadow-lg transition-shadow duration-200">
      <div className="card-content">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {plot.siteName}
            </h3>
            <p className="text-primary-600 font-medium">
              Plot {plot.plotNumber}
            </p>
          </div>
          <span className={`badge ${getStatusColor(plot.status)}`}>
            {plot.status}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex items-center text-sm text-gray-600">
            <MapPin className="h-4 w-4 mr-2" />
            <span>{plot.plotSize}</span>
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <Building2 className="h-4 w-4 mr-2" />
            <span>₹{plot.basicRate.toLocaleString()}/sq yard</span>
          </div>
        </div>

        {showCustomer && plot.customerName && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center text-sm text-gray-700 mb-1">
              <User className="h-4 w-4 mr-2" />
              <span className="font-medium">{plot.customerName}</span>
            </div>
            {plot.tokenExpiryDate && (
              <div
                className={`flex items-center text-sm ${
                  isTokenExpired(plot.tokenExpiryDate)
                    ? "text-red-600"
                    : "text-gray-600"
                }`}
              >
                <Clock className="h-4 w-4 mr-2" />
                <span>
                  Expires: {formatDate(plot.tokenExpiryDate)}
                  {isTokenExpired(plot.tokenExpiryDate) && (
                    <span className="ml-2 text-red-600 font-medium">
                      (Expired)
                    </span>
                  )}
                </span>
              </div>
            )}
          </div>
        )}

        <div className="border-t pt-4">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">Total Value:</span>
            <span className="font-semibold text-gray-900">
              {formatCurrency(plot.totalPrice)}
            </span>
          </div>
          {showCustomer && plot.receivedAmount > 0 && (
            <>
              <div className="flex justify-between items-center text-sm mt-1">
                <span className="text-gray-600">Received:</span>
                <span className="font-medium text-green-600">
                  {formatCurrency(plot.receivedAmount)}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm mt-1">
                <span className="text-gray-600">Balance:</span>
                <span className="font-medium text-orange-600">
                  {formatCurrency(plot.remainingBalance)}
                </span>
              </div>
            </>
          )}

          {/* View Button */}
          <div className="mt-4">
            <button
              onClick={() => handleViewPlot(plot)}
              className="w-full flex items-center justify-center px-3 py-2 text-sm font-medium text-primary-600 bg-primary-50 border border-primary-200 rounded-md hover:bg-primary-100 transition-colors"
            >
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Plots</h1>
          <p className="text-gray-600">
            Manage your available, tokened, and booked plots
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="card-content">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <MapPin className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">
                  Available Plots
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {plotsData.summary.availableCount || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-content">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-8 w-8 text-primary-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">
                  Tokened Plots
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {plotsData.summary.tokenedCount || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-content">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircle className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">
                  Booked Plots
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {plotsData.summary.bookedCount || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-content">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Building2 className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">
                  Total Managed
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {plotsData.summary.totalManagedPlots || 0}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("available")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "available"
                ? "border-primary-500 text-primary-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Available Plots ({plotsData.summary.availableCount || 0})
          </button>
          <button
            onClick={() => setActiveTab("tokened")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "tokened"
                ? "border-primary-500 text-primary-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            My Tokened Plots ({plotsData.summary.tokenedCount || 0})
          </button>
          <button
            onClick={() => setActiveTab("booked")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "booked"
                ? "border-primary-500 text-primary-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            My Booked Plots ({plotsData.summary.bookedCount || 0})
          </button>
        </nav>
      </div>

      {/* Content */}
      <div className="mt-6">
        {activeTab === "available" && (
          <div>
            <div className="mb-4">
              <h2 className="text-lg font-medium text-gray-900">
                Available Plots
              </h2>
              <p className="text-sm text-gray-600">
                These plots are available for creating token receipts
              </p>
            </div>
            {plotsData.availablePlots.length === 0 ? (
              <div className="text-center py-12">
                <MapPin className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  No available plots
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  There are currently no available plots.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {plotsData.availablePlots.map((plot) => (
                  <PlotCard key={plot.id} plot={plot} />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "tokened" && (
          <div>
            <div className="mb-4">
              <h2 className="text-lg font-medium text-gray-900">
                My Tokened Plots
              </h2>
              <p className="text-sm text-gray-600">
                Plots where you have created token receipts
              </p>
            </div>
            {plotsData.tokenedPlots.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  No tokened plots
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  You haven't created any token receipts yet.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {plotsData.tokenedPlots.map((plot) => (
                  <PlotCard key={plot.id} plot={plot} showCustomer={true} />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "booked" && (
          <div>
            <div className="mb-4">
              <h2 className="text-lg font-medium text-gray-900">
                My Booked Plots
              </h2>
              <p className="text-sm text-gray-600">
                Plots where you have created booking receipts
              </p>
            </div>
            {plotsData.bookedPlots.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  No booked plots
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  You haven't created any booking receipts yet.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {plotsData.bookedPlots.map((plot) => (
                  <PlotCard key={plot.id} plot={plot} showCustomer={true} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Plot Details Modal */}
      {showPlotModal && selectedPlot && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={handleClosePlotModal}
            />

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle w-full max-w-4xl">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    Plot Details
                  </h3>
                  <p className="text-sm text-gray-500">
                    {selectedPlot.siteName} - Plot {selectedPlot.plotNumber}
                  </p>
                </div>
                <button
                  onClick={handleClosePlotModal}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Basic Information */}
                  <div>
                    <h4 className="text-md font-medium text-gray-900 mb-4">
                      Basic Information
                    </h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">
                          Site Name:
                        </span>
                        <span className="text-sm font-medium text-gray-900">
                          {selectedPlot.siteName}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">
                          Plot Number:
                        </span>
                        <span className="text-sm font-medium text-gray-900">
                          {selectedPlot.plotNumber}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Block:</span>
                        <span className="text-sm font-medium text-gray-900">
                          {selectedPlot.block || "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">
                          Plot Size:
                        </span>
                        <span className="text-sm font-medium text-gray-900">
                          {selectedPlot.plotSize}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">
                          Dimensions:
                        </span>
                        <span className="text-sm font-medium text-gray-900">
                          {selectedPlot.length && selectedPlot.width
                            ? `${selectedPlot.length} × ${selectedPlot.width}`
                            : "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Area:</span>
                        <span className="text-sm font-medium text-gray-900">
                          {selectedPlot.area
                            ? `${selectedPlot.area} sq yard`
                            : "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Status:</span>
                        <span
                          className={`text-sm font-medium px-2 py-1 rounded-full ${getStatusColor(
                            selectedPlot.status
                          )}`}
                        >
                          {selectedPlot.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Location & Features */}
                  <div>
                    <h4 className="text-md font-medium text-gray-900 mb-4">
                      Location & Features
                    </h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Road:</span>
                        <span className="text-sm font-medium text-gray-900">
                          {selectedPlot.road || "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Facing:</span>
                        <span className="text-sm font-medium text-gray-900">
                          {selectedPlot.facing || "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">
                          PLC Applicable:
                        </span>
                        <span className="text-sm font-medium text-gray-900">
                          {selectedPlot.plcApplicable || selectedPlot.PLCApplicable ? "Yes" : "No"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">
                          Type of PLC:
                        </span>
                        <span className="text-sm font-medium text-gray-900">
                          {selectedPlot.typeofPLC || selectedPlot.TypeofPLC || "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">
                          Gata Khesra No:
                        </span>
                        <span className="text-sm font-medium text-gray-900">
                          {selectedPlot.gataKhesraNo || "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">
                          Registered Company:
                        </span>
                        <span className="text-sm font-medium text-gray-900">
                          {selectedPlot.registeredCompany || "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Financial Information */}
                  <div>
                    <h4 className="text-md font-medium text-gray-900 mb-4">
                      Financial Information
                    </h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">
                          Basic Rate:
                        </span>
                        <span className="text-sm font-medium text-gray-900">
                          ₹{selectedPlot.basicRate?.toLocaleString()}/sq yard
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">
                          Total Value:
                        </span>
                        <span className="text-sm font-medium text-gray-900">
                          {formatCurrency(selectedPlot.totalPrice)}
                        </span>
                      </div>
                      {selectedPlot.receivedAmount > 0 && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">
                              Received Amount:
                            </span>
                            <span className="text-sm font-medium text-green-600">
                              {formatCurrency(selectedPlot.receivedAmount)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">
                              Remaining Balance:
                            </span>
                            <span className="text-sm font-medium text-orange-600">
                              {formatCurrency(selectedPlot.remainingBalance)}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Customer Information */}
                  {selectedPlot.customerName && (
                    <div>
                      <h4 className="text-md font-medium text-gray-900 mb-4">
                        Customer Information
                      </h4>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">
                            Customer Name:
                          </span>
                          <span className="text-sm font-medium text-gray-900">
                            {selectedPlot.customerName}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">
                            Associate:
                          </span>
                          <span className="text-sm font-medium text-gray-900">
                            {selectedPlot.associateName || "N/A"}
                          </span>
                        </div>
                        {selectedPlot.tokenExpiryDate && (
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">
                              Token Expiry:
                            </span>
                            <span
                              className={`text-sm font-medium ${
                                isTokenExpired(selectedPlot.tokenExpiryDate)
                                  ? "text-red-600"
                                  : "text-gray-900"
                              }`}
                            >
                              {formatDate(selectedPlot.tokenExpiryDate)}
                              {isTokenExpired(selectedPlot.tokenExpiryDate) && (
                                <span className="ml-2 text-red-600">
                                  (Expired)
                                </span>
                              )}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Additional Information */}
                {selectedPlot.description && (
                  <div className="mt-8">
                    <h4 className="text-md font-medium text-gray-900 mb-4">
                      Description
                    </h4>
                    <p className="text-sm text-gray-600 bg-gray-50 p-4 rounded-lg">
                      {selectedPlot.description}
                    </p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
                <button
                  onClick={handleClosePlotModal}
                  className="btn-secondary"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssociatePlots;
