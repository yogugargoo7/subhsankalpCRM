import React, { useState, useEffect } from "react";
import {
  Plus,
  Filter,
  Edit,
  Eye,
  MapPin,
  Download,
  Receipt,
  Trash2,
  FileCheck,
  FileText,
  TrendingUp,
  DollarSign,
  Building2,
  Ruler,
  Compass,
  Tag,
  Calendar,
  User,
  Users,
  Phone,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend
} from 'recharts';
import { useAuth } from "../contexts/AuthContext";
import { plotsAPI, receiptsAPI } from "../utils/api";
import {
  formatCurrency,
  formatDate,
  getStatusBadgeClass,
} from "../utils/helpers";
import { exportPlotsToCSV } from "../utils/csvExport";
import DataTable from "../components/UI/DataTable";
import Modal from "../components/UI/Modal";
import LoadingSpinner from "../components/UI/LoadingSpinner";
import CreatePlotForm from "../components/Forms/CreatePlotForm";
import EditPlotForm from "../components/Forms/EditPlotForm";
import BulkCreatePlotsForm from "../components/Forms/BulkCreatePlotsForm";
import BookingReceiptForm from "../components/Forms/BookingReceiptForm";
import PartPaymentForm from "../components/Forms/PartPaymentForm";
import NOCReceiptForm from "../components/Forms/NOCReceiptForm";
import toast from "react-hot-toast";

const Plots = () => {
  const { user } = useAuth();
  const [plots, setPlots] = useState([]);
  const [allPlots, setAllPlots] = useState([]); // For statistics calculation
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10, // Keep 10 plots per page
    totalRecords: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  });
  const [sortConfig, setSortConfig] = useState({
    sortBy: "id",
    sortOrder: "asc"
  });
  const [filters, setFilters] = useState({
    siteName: "",
    plotNumber: "",
    registeredCompany: "",
    status: "",
    minPrice: "",
    maxPrice: "",
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedPlot, setSelectedPlot] = useState(null);
  const [showPlotModal, setShowPlotModal] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showBulkCreateForm, setShowBulkCreateForm] = useState(false);
  const [showBookingReceiptForm, setShowBookingReceiptForm] = useState(false);
  const [selectedPlotForBooking, setSelectedPlotForBooking] = useState(null);
  const [showPartPaymentForm, setShowPartPaymentForm] = useState(false);
  const [selectedPlotForPartPayment, setSelectedPlotForPartPayment] = useState(null);
  const [showNOCReceiptForm, setShowNOCReceiptForm] = useState(false);
  const [selectedPlotForNOC, setSelectedPlotForNOC] = useState(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [selectedPlotForEdit, setSelectedPlotForEdit] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedPlotForDelete, setSelectedPlotForDelete] = useState(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [exportingCSV, setExportingCSV] = useState(false);

  useEffect(() => {
    fetchPlots();
  }, [pagination.page, pagination.pageSize, filters, sortConfig]);

  const fetchPlots = async () => {
    try {
      setLoading(true);

      // Fetch paginated plots for table display
      const params = {
        page: pagination.page,
        pageSize: pagination.pageSize,
        sortBy: sortConfig.sortBy,
        sortOrder: sortConfig.sortOrder,
        ...filters,
      };

      // Remove empty filters
      Object.keys(params).forEach((key) => {
        if (
          params[key] === "" ||
          params[key] === null ||
          params[key] === undefined
        ) {
          delete params[key];
        }
      });

      const response = await plotsAPI.getPlots(params);
      const { data, totalRecords, totalPages, hasNextPage, hasPreviousPage } =
        response.data;

      setPlots(data);
      setPagination((prev) => ({
        ...prev,
        totalRecords,
        totalPages,
        hasNextPage,
        hasPreviousPage,
      }));

      // Fetch all plots for statistics (use main endpoint with large page size)
      try {
        const allPlotsResponse = await plotsAPI.getPlots({
          pageSize: 1000,
          page: 1,
        }); // Get all plots for statistics
        const allPlotsData = allPlotsResponse.data.data || [];

        setAllPlots(allPlotsData);
      } catch (error) {
        // Use current page data as fallback
        setAllPlots(data || []);
      }
    } catch (error) {
      console.error("Error fetching plots:", error);
      toast.error("Failed to fetch plots");
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  const handlePageSizeChange = (newPageSize) => {
    setPagination((prev) => ({ ...prev, pageSize: newPageSize, page: 1 }));
  };

  const handleSort = (key, direction) => {
    setSortConfig({
      sortBy: key,
      sortOrder: direction
    });
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page on sort
  };

  const handleExportCSV = async () => {
    try {
      setExportingCSV(true);

      // Always fetch plots with current filters and sorting applied
      const params = {
        pageSize: 10000, // Large number to get all matching plots
        sortBy: sortConfig.sortBy, // Use current sort column
        sortOrder: sortConfig.sortOrder, // Use current sort order
        ...filters,
      };

      // Remove empty filters
      Object.keys(params).forEach((key) => {
        if (
          params[key] === "" ||
          params[key] === null ||
          params[key] === undefined
        ) {
          delete params[key];
        }
      });

      const response = await plotsAPI.getPlots(params);
      const plotsToExport = response.data.data || [];

      if (plotsToExport.length === 0) {
        toast.error("No plots found to export with current filters");
        return;
      }

      // Generate filename with current date and filter info
      const currentDate = new Date().toISOString().split("T")[0];
      let filename = `plots-export-${currentDate}`;

      // Add filter info to filename
      if (filters.status) {
        filename += `-${filters.status.toLowerCase()}`;
      }
      if (filters.siteName) {
        filename += `-${filters.siteName.replace(/\s+/g, "-").toLowerCase()}`;
      }
      filename += ".csv";

      // Export to CSV
      exportPlotsToCSV(plotsToExport, filename);

      const filterInfo = [];
      if (filters.status) filterInfo.push(`Status: ${filters.status}`);
      if (filters.siteName) filterInfo.push(`Site: ${filters.siteName}`);

      const filterText =
        filterInfo.length > 0 ? ` (${filterInfo.join(", ")})` : "";
      toast.success(
        `Successfully exported ${plotsToExport.length} plots to CSV${filterText}`
      );
    } catch (error) {
      console.error("Error exporting plots:", error);
      toast.error("Failed to export plots to CSV");
    } finally {
      setExportingCSV(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const clearFilters = () => {
    setFilters({
      siteName: "",
      plotNumber: "",
      registeredCompany: "",
      status: "",
      minPrice: "",
      maxPrice: "",
    });
  };

  const handleStatusFilter = (status) => {
    setFilters((prev) => ({
      ...prev,
      status: prev.status === status ? "" : status, // Toggle filter
    }));
    setPagination((prev) => ({ ...prev, page: 1 })); // Reset to first page
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Available":
        return "bg-green-100 text-green-800";
      case "Tokened":
        return "bg-orange-100 text-orange-800";
      case "PartPayment":
        return "bg-blue-100 text-blue-800";
      case "Booked":
        return "bg-yellow-100 text-yellow-800";
      case "Sold":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const columns = [
    {
      key: "id",
      title: "ID",
      sortable: true,
      render: (value) => value,
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
      title: "Plot Size",
      sortable: true,
      render: (value, row) => (
        <div className="text-sm">
          <p className="font-medium text-gray-900">
            {value || "Not specified"}
          </p>
          {row.facing && (
            <p className="text-gray-500 text-xs">Facing: {row.facing}</p>
          )}
        </div>
      ),
    },
    {
      key: "basicRate",
      title: "Rate & Price",
      sortable: true,
      render: (value, row) => (
        <div className="text-sm">
          <p className="font-medium text-gray-900">
            {formatCurrency(value)}/sq yard
          </p>
          <p className="text-gray-600 text-xs">
            Total:{" "}
            {row.totalPrice ? formatCurrency(row.totalPrice) : "Not Calculated"}
          </p>
        </div>
      ),
    },
    {
      key: "customerName",
      title: "Customer & Associate",
      render: (value, row) => {
        if (row.status === "Available") {
          return <span className="text-gray-400 text-sm">-</span>;
        }
        // Show customer data for Tokened, PartPayment, Booked and Sold plots
        if (
          row.status === "Tokened" ||
          row.status === "PartPayment" ||
          row.status === "Booked" ||
          row.status === "Sold"
        ) {
          return (
            <div className="text-sm">
              <p className="font-medium text-gray-900">{value || "N/A"}</p>
              {row.associateName && (
                <p className="text-gray-500 text-xs">by {row.associateName}</p>
              )}
              {row.referenceName && (
                <p className="text-gray-500 text-xs">
                  Ref: {row.referenceName}
                </p>
              )}
            </div>
          );
        }
        return <span className="text-gray-400 text-sm">-</span>;
      },
    },
    {
      key: "receivedAmount",
      title: "Received Amount",
      render: (value, row) => {
        // Use the received amount from the backend (supports both PascalCase and camelCase)
        const received =
          row.receivedAmount ||
          row.ReceivedAmount ||
          row.totalPaid ||
          row.TotalPaid ||
          value ||
          0;

        return (
          <div className="text-sm">
            <p className="font-medium text-green-600">
              {received > 0 ? formatCurrency(received) : "₹0"}
            </p>
          </div>
        );
      },
    },
    {
      key: "paymentStatus",
      title: "Payment Status",
      render: (value, row) => {
        if (row.status === "Available") {
          return <span className="text-gray-400 text-sm">-</span>;
        }

        // Show payment info for Tokened, PartPayment, Booked and Sold plots
        if (
          row.status === "Tokened" ||
          row.status === "PartPayment" ||
          row.status === "Booked" ||
          row.status === "Sold"
        ) {
          const received = row.receivedAmount || row.ReceivedAmount || 0;
          const total = row.totalPrice || 0;
          const percentage = total > 0 ? (received / total) * 100 : 0;

          return (
            <div className="text-sm">
              {total > 0 && (
                <p className="text-gray-600 text-xs">
                  {percentage.toFixed(1)}% paid
                </p>
              )}
              {row.tokenExpiryDate && row.status === "Tokened" && (
                <p className="text-orange-600 text-xs">
                  Expires: {formatDate(row.tokenExpiryDate)}
                </p>
              )}
              {percentage >= 100 && (
                <p className="text-green-600 text-xs font-medium">
                  ✓ Fully Paid
                </p>
              )}
            </div>
          );
        }
        return <span className="text-gray-400 text-sm">-</span>;
      },
    },
    {
      key: "status",
      title: "Status",
      sortable: true,
      render: (value) => (
        <span className={`badge ${getStatusColor(value)}`}>{value}</span>
      ),
    },
    {
      key: "createdAt",
      title: "Created",
      sortable: true,
      render: (value) => (
        <div className="text-sm">
          <p className="text-gray-900">{formatDate(value)}</p>
        </div>
      ),
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
          {canCreatePartPayment(row) && (
            <button
              onClick={() => handlePartPayment(row)}
              className="text-blue-600 hover:text-blue-900"
              title="Create Part Payment"
            >
              <Receipt className="h-4 w-4" />
            </button>
          )}
          {canCreateBookingReceipt(row) && (
            <button
              onClick={() => handleBookingReceipt(row)}
              className="text-green-600 hover:text-green-900"
              title="Create Booking Receipt"
            >
              <Receipt className="h-4 w-4" />
            </button>
          )}
          {canGenerateBookingReceipt(row) && (
            <button
              onClick={() => handleGenerateBookingReceipt(row)}
              className="text-purple-600 hover:text-purple-900"
              title="Generate Booking Receipt"
            >
              <FileText className="h-4 w-4" />
            </button>
          )}
          {canCreateNOCReceipt(row) && (
            <button
              onClick={() => handleNOCReceipt(row)}
              className="text-indigo-600 hover:text-indigo-900"
              title="Generate NOC Receipt"
            >
              <FileCheck className="h-4 w-4" />
            </button>
          )}
          {user?.role === "Admin" && (
            <>
              <button
                onClick={() => handleEditPlot(row)}
                className="text-blue-600 hover:text-blue-900"
                title="Edit Plot"
              >
                <Edit className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleDeletePlot(row)}
                className="text-red-600 hover:text-red-900"
                title="Delete Plot"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  const handleEditPlot = (plot) => {
    setSelectedPlotForEdit(plot);
    setShowEditForm(true);
  };

  const handleDeletePlot = (plot) => {
    setSelectedPlotForDelete(plot);
    setDeleteConfirmation("");
    setShowDeleteConfirm(true);
  };

  const confirmDeletePlot = async () => {
    if (!selectedPlotForDelete) return;
    
    // Check if user entered the correct plot number
    if (deleteConfirmation !== selectedPlotForDelete.plotNumber) {
      toast.error("Plot number doesn't match. Please enter the correct plot number to confirm deletion.");
      return;
    }

    try {
      setDeleting(true);
      await plotsAPI.deletePlot(selectedPlotForDelete.id);
      
      toast.success(`Plot ${selectedPlotForDelete.plotNumber} deleted successfully`);
      setShowDeleteConfirm(false);
      setSelectedPlotForDelete(null);
      setDeleteConfirmation("");
      fetchPlots(); // Refresh the plots list
    } catch (error) {
      console.error("Error deleting plot:", error);
      const errorMessage = error.response?.data?.message || "Failed to delete plot";
      toast.error(errorMessage);
    } finally {
      setDeleting(false);
    }
  };

  const cancelDeletePlot = () => {
    setShowDeleteConfirm(false);
    setSelectedPlotForDelete(null);
    setDeleteConfirmation("");
  };

  const handlePartPayment = (plot) => {
    setSelectedPlotForPartPayment(plot);
    setShowPartPaymentForm(true);
  };

  const handlePartPaymentSuccess = () => {
    setShowPartPaymentForm(false);
    setSelectedPlotForPartPayment(null);
    fetchPlots(); // Refresh the plots list
  };

  const handleBookingReceipt = (plot) => {
    setSelectedPlotForBooking(plot);
    setShowBookingReceiptForm(true);
  };

  const handleBookingReceiptSuccess = () => {
    setShowBookingReceiptForm(false);
    setSelectedPlotForBooking(null);
    fetchPlots(); // Refresh the plots list
  };

  const handleNOCReceipt = async (plot) => {
    // Ask user if they want to save to database
    const saveToDatabase = window.confirm(
      'Do you want to save this NOC Receipt to the database?\n\n' +
      '• Click OK to save with a permanent receipt number\n' +
      '• Click Cancel to generate for printing only (temporary number)'
    );

    try {
      setLoading(true);
      
      // Fetch all receipts for this plot
      const response = await receiptsAPI.getReceiptsByPlot(plot.id);
      const previousReceipts = response.data || [];
      const latestReceipt = previousReceipts[0] || {};

      if (saveToDatabase) {
        // Save to database with permanent receipt number
        const receiptData = {
          receiptType: 'noc',
          fromName: latestReceipt.fromName || plot.customerName || '',
          relationType: 'S/O',
          relationName: latestReceipt.relationName || '',
          address: latestReceipt.address || '',
          mobile: latestReceipt.mobile || '',
          panNumber: latestReceipt.panNumber || '',
          aadharNumber: latestReceipt.aadharNumber || '',
          companyName: latestReceipt.companyName || '',
          referenceName: latestReceipt.referenceName || '',
          siteName: plot.siteName || '',
          plotVillaNo: plot.plotNumber || '',
          amount: 0, // NOC has no amount
          other: '',
          cashChecked: false,
          chequeChecked: false,
          rtgsChecked: false,
          chequeNo: '',
          rtgsNeft: '',
          adminRemarks: `NOC issued for fully paid plot - Total from ${previousReceipts.length} payment(s)`,
          plotId: plot.id
        };

        const savedResponse = await receiptsAPI.createReceipt(receiptData);
        const savedReceipt = savedResponse.data;

        // Add payment history for display (exclude booking and NOC receipts)
        savedReceipt.paymentHistory = previousReceipts
          .filter(r => r.receiptType !== 'booking' && r.receiptType !== 'noc')
          .map(r => ({
            receiptNo: r.receiptNo,
            receiptType: r.receiptType,
            amount: r.totalAmount > 0 ? r.totalAmount : r.amount,
            date: r.createdAt || r.date,
            paymentMethod: r.cashChecked ? 'Cash' : 
                          r.chequeChecked ? `Cheque (${r.chequeNo || 'N/A'})` :
                          r.rtgsChecked ? `UPI/NEFT (${r.rtgsNeft || 'N/A'})` : 'N/A'
          }));
        savedReceipt.nocDate = savedReceipt.date;

        setSelectedPlotForNOC(savedReceipt);
        setShowNOCReceiptForm(true);
        toast.success(`NOC receipt ${savedReceipt.receiptNo} saved to database!`);
        
        // Refresh plots to show updated data
        fetchPlots();
      } else {
        // Generate temporary receipt for printing only
        const nocReceiptNo = `NOC/${new Date().getFullYear()}/TEMP-${Date.now()}`;

        const nocReceipt = {
          receiptNo: nocReceiptNo,
          receiptType: 'noc',
          fromName: latestReceipt.fromName || plot.customerName || '',
          relationType: 'S/O',
          relationName: latestReceipt.relationName || '',
          address: latestReceipt.address || '',
          mobile: latestReceipt.mobile || '',
          panNumber: latestReceipt.panNumber || '',
          aadharNumber: latestReceipt.aadharNumber || '',
          companyName: latestReceipt.companyName || '',
          referenceName: latestReceipt.referenceName || '',
          siteName: plot.siteName || '',
          plotVillaNo: plot.plotNumber || '',
          plotSize: plot.plotSize,
          basicRate: plot.basicRate,
          amount: 0,
          totalAmount: plot.totalPrice || 0,
          nocDate: new Date().toISOString(),
          date: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          adminRemarks: `NOC (print only) - Total from ${previousReceipts.length} payment(s)`,
          status: 'Approved',
          paymentHistory: previousReceipts
            .filter(r => r.receiptType !== 'booking' && r.receiptType !== 'noc')
            .map(r => ({
              receiptNo: r.receiptNo,
              receiptType: r.receiptType,
              amount: r.totalAmount > 0 ? r.totalAmount : r.amount,
              date: r.createdAt || r.date,
              paymentMethod: r.cashChecked ? 'Cash' : 
                            r.chequeChecked ? `Cheque (${r.chequeNo || 'N/A'})` :
                            r.rtgsChecked ? `UPI/NEFT (${r.rtgsNeft || 'N/A'})` : 'N/A'
            }))
        };
        
        setSelectedPlotForNOC(nocReceipt);
        setShowNOCReceiptForm(true);
        toast.success('NOC receipt generated for printing only!');
      }
    } catch (error) {
      console.error('Error generating NOC receipt:', error);
      toast.error('Failed to generate NOC receipt');
    } finally {
      setLoading(false);
    }
  };

  const handleNOCReceiptSuccess = () => {
    setShowNOCReceiptForm(false);
    setSelectedPlotForNOC(null);
  };

  const handleGenerateBookingReceipt = async (plot) => {
    // Ask user if they want to save to database
    const saveToDatabase = window.confirm(
      'Do you want to save this Booking Receipt to the database?\n\n' +
      '• Click OK to save with a permanent receipt number\n' +
      '• Click Cancel to generate for printing only (temporary number)'
    );

    try {
      setLoading(true);
      
      // Fetch all receipts for this plot
      const response = await receiptsAPI.getReceiptsByPlot(plot.id);
      const previousReceipts = response.data || [];
      const latestReceipt = previousReceipts[0] || {};

      // Calculate total received
      const totalReceived = previousReceipts.reduce((sum, r) => {
        return sum + (r.totalAmount > 0 ? r.totalAmount : r.amount);
      }, 0);

      if (saveToDatabase) {
        // Save to database with permanent receipt number
        const receiptData = {
          receiptType: 'booking',
          fromName: latestReceipt.fromName || plot.customerName || '',
          relationType: 'S/O',
          relationName: latestReceipt.relationName || '',
          address: latestReceipt.address || '',
          mobile: latestReceipt.mobile || '',
          panNumber: latestReceipt.panNumber || '',
          aadharNumber: latestReceipt.aadharNumber || '',
          companyName: latestReceipt.companyName || '',
          referenceName: latestReceipt.referenceName || '',
          siteName: plot.siteName || '',
          plotVillaNo: plot.plotNumber || '',
          amount: plot.totalPrice || 0, // Show plot's total price, not amount received
          other: '',
          cashChecked: false,
          chequeChecked: false,
          rtgsChecked: false,
          chequeNo: '',
          rtgsNeft: '',
          adminRemarks: `Booking receipt - Plot Total: ₹${(plot.totalPrice || 0).toLocaleString()}, Paid: ₹${totalReceived.toLocaleString()} from ${previousReceipts.length} payment(s)`,
          plotId: plot.id
        };

        const savedResponse = await receiptsAPI.createReceipt(receiptData);
        const savedReceipt = savedResponse.data;

        // Add payment history for display (exclude booking and NOC receipts)
        savedReceipt.paymentHistory = previousReceipts
          .filter(r => r.receiptType !== 'booking' && r.receiptType !== 'noc')
          .map(r => ({
            receiptNo: r.receiptNo,
            receiptType: r.receiptType,
            amount: r.totalAmount > 0 ? r.totalAmount : r.amount,
            date: r.createdAt || r.date,
            paymentMethod: r.cashChecked ? 'Cash' : 
                          r.chequeChecked ? `Cheque (${r.chequeNo || 'N/A'})` :
                          r.rtgsChecked ? `UPI/NEFT (${r.rtgsNeft || 'N/A'})` : 'N/A'
          }));

        setSelectedPlotForBooking(savedReceipt);
        setShowBookingReceiptForm(true);
        toast.success(`Booking receipt ${savedReceipt.receiptNo} saved to database!`);
        
        // Refresh plots to show updated data
        fetchPlots();
      } else {
        // Generate temporary receipt for printing only
        const bookingReceiptNo = `BR/${new Date().getFullYear()}/TEMP-${Date.now()}`;

        const bookingReceipt = {
          receiptNo: bookingReceiptNo,
          receiptType: 'booking',
          fromName: latestReceipt.fromName || plot.customerName || '',
          relationType: 'S/O',
          relationName: latestReceipt.relationName || '',
          address: latestReceipt.address || '',
          mobile: latestReceipt.mobile || '',
          panNumber: latestReceipt.panNumber || '',
          aadharNumber: latestReceipt.aadharNumber || '',
          companyName: latestReceipt.companyName || '',
          referenceName: latestReceipt.referenceName || '',
          siteName: plot.siteName || '',
          plotVillaNo: plot.plotNumber || '',
          plotSize: plot.plotSize,
          basicRate: plot.basicRate,
          amount: totalReceived,
          totalAmount: plot.totalPrice || 0,
          date: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          adminRemarks: `Booking receipt (print only) - Total from ${previousReceipts.length} payment(s)`,
          status: 'Approved',
          cashChecked: false,
          chequeChecked: false,
          rtgsChecked: false,
          chequeNo: '',
          rtgsNeft: '',
          paymentHistory: previousReceipts
            .filter(r => r.receiptType !== 'booking' && r.receiptType !== 'noc')
            .map(r => ({
              receiptNo: r.receiptNo,
              receiptType: r.receiptType,
              amount: r.totalAmount > 0 ? r.totalAmount : r.amount,
              date: r.createdAt || r.date,
              paymentMethod: r.cashChecked ? 'Cash' : 
                            r.chequeChecked ? `Cheque (${r.chequeNo || 'N/A'})` :
                            r.rtgsChecked ? `UPI/NEFT (${r.rtgsNeft || 'N/A'})` : 'N/A'
          }))
        };
        
        setSelectedPlotForBooking(bookingReceipt);
        setShowBookingReceiptForm(true);
        toast.success('Booking receipt generated for printing only!');
      }
    } catch (error) {
      console.error('Error generating booking receipt:', error);
      toast.error('Failed to generate booking receipt');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to determine if plot can have part payment
  const canCreatePartPayment = (plot) => {
    const isTokened = plot.status === "Tokened";
    const isPartPayment = plot.status === "PartPayment";
    const isBooked = plot.status === "Booked";
    const isAdmin = user?.role === "Admin";
    
    const totalPlotAmount = plot.totalPrice || 0;
    const receivedAmount = plot.receivedAmount || plot.ReceivedAmount || 0;
    const isNotFullyPaid = receivedAmount < totalPlotAmount;

    return (isTokened || isPartPayment || isBooked) && isAdmin && isNotFullyPaid;
  };

  // Helper function to determine if plot can have booking receipt
  const canCreateBookingReceipt = (plot) => {
    const isTokened = plot.status === "Tokened";
    const isPartPayment = plot.status === "PartPayment";
    const isAdmin = user?.role === "Admin";
    
    const totalPlotAmount = plot.totalPrice || 0;
    const receivedAmount = plot.receivedAmount || plot.ReceivedAmount || 0;
    const paymentPercentage = totalPlotAmount > 0 ? (receivedAmount / totalPlotAmount) * 100 : 0;
    
    // Can create booking receipt if plot is Tokened or PartPayment with payment >= 30%
    return (isTokened || isPartPayment) && isAdmin && paymentPercentage >= 30;
  };

  // Helper function to determine if plot can generate booking receipt (for Booked status)
  const canGenerateBookingReceipt = (plot) => {
    return plot.status === "Booked" && user?.role === "Admin";
  };

  // Helper function to determine if plot can have NOC receipt
  const canCreateNOCReceipt = (plot) => {
    return plot.status === "Sold" && user?.role === "Admin";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Plots Management</h1>
          <p className="mt-1 text-sm md:text-base text-gray-500">
            Manage property plots and their details
          </p>
          {!loading && (
            <p className="mt-1 text-xs text-gray-400">
              Showing {(pagination.page - 1) * pagination.pageSize + 1} to{" "}
              {Math.min(
                pagination.page * pagination.pageSize,
                pagination.totalRecords
              )}{" "}
              of {pagination.totalRecords} plots
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2 md:gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="btn-secondary text-sm whitespace-nowrap"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </button>
          {user?.role === "Admin" && (
            <>
              <button
                onClick={handleExportCSV}
                disabled={exportingCSV || loading}
                className="btn-secondary text-sm whitespace-nowrap"
              >
                <Download className="h-4 w-4 mr-2" />
                {exportingCSV ? "Exporting..." : "Export CSV"}
              </button>
              <button
                onClick={() => setShowBulkCreateForm(true)}
                className="btn-success text-sm whitespace-nowrap"
              >
                <Plus className="h-4 w-4 mr-2" />
                Bulk Add Plots
              </button>
              <button
                onClick={() => setShowCreateForm(true)}
                className="btn-primary text-sm whitespace-nowrap"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Single Plot
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="card">
          <div className="card-content">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Site Name
                </label>
                <input
                  type="text"
                  value={filters.siteName}
                  onChange={(e) =>
                    handleFilterChange("siteName", e.target.value)
                  }
                  className="input"
                  placeholder="Search by site name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Plot Number
                </label>
                <input
                  type="text"
                  value={filters.plotNumber}
                  onChange={(e) =>
                    handleFilterChange("plotNumber", e.target.value)
                  }
                  className="input"
                  placeholder="Search by plot number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Name
                </label>
                <input
                  type="text"
                  value={filters.registeredCompany}
                  onChange={(e) =>
                    handleFilterChange("registeredCompany", e.target.value)
                  }
                  className="input"
                  placeholder="Search by company"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange("status", e.target.value)}
                  className="input"
                >
                  <option value="">All Status</option>
                  <option value="Available">Available</option>
                  <option value="Tokened">Tokened</option>
                  <option value="PartPayment">Part Payment</option>
                  <option value="Booked">Booked</option>
                  <option value="Sold">Sold</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Min Price
                </label>
                <input
                  type="number"
                  value={filters.minPrice}
                  onChange={(e) =>
                    handleFilterChange("minPrice", e.target.value)
                  }
                  className="input"
                  placeholder="Minimum price"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Price
                </label>
                <input
                  type="number"
                  value={filters.maxPrice}
                  onChange={(e) =>
                    handleFilterChange("maxPrice", e.target.value)
                  }
                  className="input"
                  placeholder="Maximum price"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Items per page
                </label>
                <select
                  value={pagination.pageSize}
                  onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                  className="input"
                >
                  <option value={10}>10 per page</option>
                  <option value={25}>25 per page</option>
                  <option value={50}>50 per page</option>
                  <option value={100}>100 per page</option>
                </select>
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

      {/* Statistics Cards - Clickable Filters */}
      <div className="flex flex-wrap gap-4">
        <div
          className={`flex-grow flex-shrink-0 basis-[180px] cursor-pointer transition-all duration-200 rounded-xl shadow-md hover:shadow-lg p-5 border ${
            filters.status === "Available"
              ? "ring-2 ring-green-500 bg-gradient-to-br from-green-50 to-emerald-100 border-green-200"
              : "bg-gradient-to-br from-green-50 to-emerald-100 border-green-200 hover:ring-2 hover:ring-green-300"
          }`}
          onClick={() => handleStatusFilter("Available")}
        >
          <div className="flex items-center justify-between whitespace-nowrap">
            <div>
              <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-1">Available</p>
              <p className="text-2xl font-bold text-green-900">
                {allPlots.filter((p) => p.status === "Available").length}
              </p>
              {filters.status === "Available" && (
                <p className="text-xs text-green-600 font-medium mt-1">
                  ✓ Filtered
                </p>
              )}
            </div>
            <div className="bg-green-500 rounded-full p-3 ml-3 flex-shrink-0">
              <MapPin className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div
          className={`flex-grow flex-shrink-0 basis-[180px] cursor-pointer transition-all duration-200 rounded-xl shadow-md hover:shadow-lg p-5 border ${
            filters.status === "Tokened"
              ? "ring-2 ring-orange-500 bg-gradient-to-br from-orange-50 to-amber-100 border-orange-200"
              : "bg-gradient-to-br from-orange-50 to-amber-100 border-orange-200 hover:ring-2 hover:ring-orange-300"
          }`}
          onClick={() => handleStatusFilter("Tokened")}
        >
          <div className="flex items-center justify-between whitespace-nowrap">
            <div>
              <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide mb-1">Tokened</p>
              <p className="text-2xl font-bold text-orange-900">
                {allPlots.filter((p) => p.status === "Tokened").length}
              </p>
              {filters.status === "Tokened" && (
                <p className="text-xs text-orange-600 font-medium mt-1">
                  ✓ Filtered
                </p>
              )}
            </div>
            <div className="bg-orange-500 rounded-full p-3 ml-3 flex-shrink-0">
              <MapPin className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div
          className={`flex-grow flex-shrink-0 basis-[180px] cursor-pointer transition-all duration-200 rounded-xl shadow-md hover:shadow-lg p-5 border ${
            filters.status === "PartPayment"
              ? "ring-2 ring-blue-500 bg-gradient-to-br from-blue-50 to-cyan-100 border-blue-200"
              : "bg-gradient-to-br from-blue-50 to-cyan-100 border-blue-200 hover:ring-2 hover:ring-blue-300"
          }`}
          onClick={() => handleStatusFilter("PartPayment")}
        >
          <div className="flex items-center justify-between whitespace-nowrap">
            <div>
              <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">Part Payment</p>
              <p className="text-2xl font-bold text-blue-900">
                {allPlots.filter((p) => p.status === "PartPayment").length}
              </p>
              {filters.status === "PartPayment" && (
                <p className="text-xs text-blue-600 font-medium mt-1">
                  ✓ Filtered
                </p>
              )}
            </div>
            <div className="bg-blue-500 rounded-full p-3 ml-3 flex-shrink-0">
              <MapPin className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div
          className={`flex-grow flex-shrink-0 basis-[180px] cursor-pointer transition-all duration-200 rounded-xl shadow-md hover:shadow-lg p-5 border ${
            filters.status === "Booked"
              ? "ring-2 ring-yellow-500 bg-gradient-to-br from-yellow-50 to-amber-100 border-yellow-200"
              : "bg-gradient-to-br from-yellow-50 to-amber-100 border-yellow-200 hover:ring-2 hover:ring-yellow-300"
          }`}
          onClick={() => handleStatusFilter("Booked")}
        >
          <div className="flex items-center justify-between whitespace-nowrap">
            <div>
              <p className="text-xs font-semibold text-yellow-700 uppercase tracking-wide mb-1">Booked</p>
              <p className="text-2xl font-bold text-yellow-900">
                {allPlots.filter((p) => p.status === "Booked").length}
              </p>
              {filters.status === "Booked" && (
                <p className="text-xs text-yellow-600 font-medium mt-1">
                  ✓ Filtered
                </p>
              )}
            </div>
            <div className="bg-yellow-500 rounded-full p-3 ml-3 flex-shrink-0">
              <MapPin className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div
          className={`flex-grow flex-shrink-0 basis-[180px] cursor-pointer transition-all duration-200 rounded-xl shadow-md hover:shadow-lg p-5 border ${
            filters.status === "Sold"
              ? "ring-2 ring-red-500 bg-gradient-to-br from-red-50 to-rose-100 border-red-200"
              : "bg-gradient-to-br from-red-50 to-rose-100 border-red-200 hover:ring-2 hover:ring-red-300"
          }`}
          onClick={() => handleStatusFilter("Sold")}
        >
          <div className="flex items-center justify-between whitespace-nowrap">
            <div>
              <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-1">Sold</p>
              <p className="text-2xl font-bold text-red-900">
                {allPlots.filter((p) => p.status === "Sold").length}
              </p>
              {filters.status === "Sold" && (
                <p className="text-xs text-red-600 font-medium mt-1">✓ Filtered</p>
              )}
            </div>
            <div className="bg-red-500 rounded-full p-3 ml-3 flex-shrink-0">
              <MapPin className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div
          className={`flex-grow flex-shrink-0 basis-[180px] cursor-pointer transition-all duration-200 rounded-xl shadow-md hover:shadow-lg p-5 border ${
            filters.status === ""
              ? "ring-2 ring-purple-500 bg-gradient-to-br from-purple-50 to-violet-100 border-purple-200"
              : "bg-gradient-to-br from-purple-50 to-violet-100 border-purple-200 hover:ring-2 hover:ring-purple-300"
          }`}
          onClick={() => handleStatusFilter("")}
        >
          <div className="flex items-center justify-between whitespace-nowrap">
            <div>
              <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-1">Total</p>
              <p className="text-2xl font-bold text-purple-900">
                {allPlots.length}
              </p>
              {filters.status === "" && (
                <p className="text-xs text-purple-600 font-medium mt-1">
                  ✓ All Plots
                </p>
              )}
            </div>
            <div className="bg-purple-500 rounded-full p-3 ml-3 flex-shrink-0">
              <MapPin className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Active Filter Indicator */}
      {filters.status && (
        <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <span className="text-blue-800 font-medium">
              📊 Showing {filters.status} plots only
            </span>
            <span className="ml-2 text-blue-600">
              ({pagination.totalRecords} plots found)
            </span>
          </div>
          <button
            onClick={() => handleStatusFilter("")}
            className="text-blue-600 hover:text-blue-800 font-medium text-sm"
          >
            ✕ Clear Filter
          </button>
        </div>
      )}

      {/* Data Table */}
      <DataTable
        data={plots}
        columns={columns}
        loading={loading}
        pagination={pagination}
        onPageChange={handlePageChange}
        onSort={handleSort}
        searchable={false}
        filterable={false}
      />

      {/* Plot Details Modal */}
      <Modal
        isOpen={showPlotModal}
        onClose={() => setShowPlotModal(false)}
        title="Plot Details"
        size="xl"
      >
        {selectedPlot && (
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-5 rounded-lg border border-gray-200">
              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Building2 className="h-5 w-5 mr-2 text-blue-600" />
                Basic Information
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-3 rounded-lg shadow-sm">
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1 flex items-center">
                    <MapPin className="h-3 w-3 mr-1" />
                    Site Name
                  </label>
                  <p className="text-sm font-semibold text-gray-900">
                    {selectedPlot.siteName}
                  </p>
                </div>
                <div className="bg-white p-3 rounded-lg shadow-sm">
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1 flex items-center">
                    <Tag className="h-3 w-3 mr-1" />
                    Plot Number
                  </label>
                  <p className="text-sm font-semibold text-gray-900">
                    {selectedPlot.plotNumber}
                  </p>
                </div>
                <div className="bg-white p-3 rounded-lg shadow-sm">
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
                    Block
                  </label>
                  <p className="text-sm font-semibold text-gray-900">
                    {selectedPlot.block || "Not specified"}
                  </p>
                </div>
                <div className="bg-white p-3 rounded-lg shadow-sm">
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1 flex items-center">
                    <Building2 className="h-3 w-3 mr-1" />
                    Registered Company
                  </label>
                  <p className="text-sm font-semibold text-gray-900">
                    {selectedPlot.registeredCompany || "Not specified"}
                  </p>
                </div>
              </div>
            </div>

            {/* Plot Dimensions */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-5 rounded-lg border border-purple-200">
              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Ruler className="h-5 w-5 mr-2 text-purple-600" />
                Plot Dimensions
              </h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-lg shadow-sm text-center">
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-2">
                    Length
                  </label>
                  <p className="text-2xl font-bold text-purple-600">
                    {selectedPlot.length || "—"}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">feet</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm text-center">
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-2">
                    Width
                  </label>
                  <p className="text-2xl font-bold text-purple-600">
                    {selectedPlot.width || "—"}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">feet</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm text-center">
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-2">
                    Plot Size
                  </label>
                  <p className="text-2xl font-bold text-purple-600">
                    {selectedPlot.plotSize || "—"}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">sq yard</p>
                </div>
              </div>
            </div>

            {/* Location & Features */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-5 rounded-lg border border-green-200">
              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Compass className="h-5 w-5 mr-2 text-green-600" />
                Location & Features
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-3 rounded-lg shadow-sm">
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
                    Road
                  </label>
                  <p className="text-sm font-semibold text-gray-900">
                    {selectedPlot.road || "Not specified"}
                  </p>
                </div>
                <div className="bg-white p-3 rounded-lg shadow-sm">
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1 flex items-center">
                    <Compass className="h-3 w-3 mr-1" />
                    Facing
                  </label>
                  <p className="text-sm font-semibold text-gray-900">
                    {selectedPlot.facing || "Not specified"}
                  </p>
                </div>
                <div className="bg-white p-3 rounded-lg shadow-sm">
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
                    Gata/Khesra No
                  </label>
                  <p className="text-sm font-semibold text-gray-900">
                    {selectedPlot.gataKhesraNo || "Not specified"}
                  </p>
                </div>
                <div className="bg-white p-3 rounded-lg shadow-sm">
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
                    PLC Applicable
                  </label>
                  <p className="text-sm font-semibold text-gray-900">
                    {selectedPlot.plcApplicable ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Yes {selectedPlot.typeofPLC && `(${selectedPlot.typeofPLC})`}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        No
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Pricing & Status */}
            <div className="bg-gradient-to-r from-yellow-50 to-amber-50 p-5 rounded-lg border border-yellow-200">
              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <DollarSign className="h-5 w-5 mr-2 text-yellow-600" />
                Pricing & Status
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-2">
                    Basic Rate
                  </label>
                  <p className="text-xl font-bold text-gray-900">
                    {formatCurrency(selectedPlot.basicRate)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">per sq yard</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-2">
                    Total Price
                  </label>
                  <p className="text-xl font-bold text-green-600">
                    {selectedPlot.totalPrice
                      ? formatCurrency(selectedPlot.totalPrice)
                      : "Not Calculated"}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-2">
                    Status
                  </label>
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(
                      selectedPlot.status
                    )}`}
                  >
                    {selectedPlot.status}
                  </span>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-2">
                    Available for Sale
                  </label>
                  <p className="text-sm font-semibold text-gray-900">
                    {(selectedPlot.status === "Available" && selectedPlot.availablePlot) ? (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                        ✓ Yes
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                        ✗ No
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Payment Progress - Only for Tokened/PartPayment/Booked/Sold plots */}
            {(selectedPlot.status === "Tokened" ||
              selectedPlot.status === "PartPayment" ||
              selectedPlot.status === "Booked" ||
              selectedPlot.status === "Sold") && selectedPlot.totalPrice > 0 && (
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200">
                <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2 text-blue-600" />
                  Payment Progress
                </h4>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Payment Stats */}
                  <div className="space-y-4">
                    <div className="bg-white p-4 rounded-lg shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase">Total Price</p>
                          <p className="text-2xl font-bold text-gray-900 mt-1">
                            {formatCurrency(selectedPlot.totalPrice)}
                          </p>
                        </div>
                        <DollarSign className="h-8 w-8 text-gray-400" />
                      </div>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase">Amount Paid</p>
                          <p className="text-2xl font-bold text-green-600 mt-1">
                            {formatCurrency(selectedPlot.totalPaid || selectedPlot.receivedAmount || 0)}
                          </p>
                        </div>
                        <div className="text-sm font-medium text-green-600">
                          {((((selectedPlot.totalPaid || selectedPlot.receivedAmount || 0) / selectedPlot.totalPrice) * 100) || 0).toFixed(1)}%
                        </div>
                      </div>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase">Remaining Balance</p>
                          <p className="text-2xl font-bold text-orange-600 mt-1">
                            {formatCurrency(selectedPlot.remainingBalance || 0)}
                          </p>
                        </div>
                        <div className="text-sm font-medium text-orange-600">
                          {((((selectedPlot.remainingBalance || 0) / selectedPlot.totalPrice) * 100) || 0).toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Payment Chart */}
                  <div className="bg-white p-4 rounded-lg shadow-sm flex items-center justify-center">
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={[
                            { 
                              name: 'Paid', 
                              value: selectedPlot.totalPaid || selectedPlot.receivedAmount || 0,
                              fill: '#10b981'
                            },
                            { 
                              name: 'Remaining', 
                              value: selectedPlot.remainingBalance || 0,
                              fill: '#f59e0b'
                            }
                          ].filter(item => item.value > 0)}
                          cx="50%"
                          cy="50%"
                          labelLine={true}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={70}
                          dataKey="value"
                        >
                          <Cell fill="#10b981" />
                          <Cell fill="#f59e0b" />
                        </Pie>
                        <Tooltip formatter={(value) => formatCurrency(value)} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div className="mt-4">
                  <div className="flex justify-between text-sm font-medium text-gray-700 mb-2">
                    <span>Payment Progress</span>
                    <span>{((((selectedPlot.totalPaid || selectedPlot.receivedAmount || 0) / selectedPlot.totalPrice) * 100) || 0).toFixed(1)}% Complete</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all duration-500"
                      style={{ 
                        width: `${Math.min(((selectedPlot.totalPaid || selectedPlot.receivedAmount || 0) / selectedPlot.totalPrice) * 100, 100)}%` 
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            )}

            {/* Description */}
            {selectedPlot.description && (
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">
                  Description
                </h4>
                <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">
                  {selectedPlot.description}
                </p>
              </div>
            )}

            {/* Timestamps */}
            <div className="bg-gradient-to-r from-slate-50 to-gray-100 p-5 rounded-lg border border-slate-200">
              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Calendar className="h-5 w-5 mr-2 text-slate-600" />
                Timestamps
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-3 rounded-lg shadow-sm">
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1 flex items-center">
                    <Calendar className="h-3 w-3 mr-1" />
                    Created Date
                  </label>
                  <p className="text-sm font-semibold text-gray-900">
                    {formatDate(selectedPlot.createdAt)}
                  </p>
                </div>
                <div className="bg-white p-3 rounded-lg shadow-sm">
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1 flex items-center">
                    <Calendar className="h-3 w-3 mr-1" />
                    Last Updated
                  </label>
                  <p className="text-sm font-semibold text-gray-900">
                    {selectedPlot.updatedAt
                      ? formatDate(selectedPlot.updatedAt)
                      : "Not updated"}
                  </p>
                </div>
              </div>
            </div>
            {/* Customer Information for Tokened/PartPayment/Booked/Sold Plots */}
            {(selectedPlot.status === "Tokened" ||
              selectedPlot.status === "PartPayment" ||
              selectedPlot.status === "Booked" ||
              selectedPlot.status === "Sold") && (
              <div
                className={`p-5 rounded-lg border ${
                  selectedPlot.status === "Tokened"
                    ? "bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200"
                    : selectedPlot.status === "PartPayment"
                    ? "bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200"
                    : selectedPlot.status === "Booked"
                    ? "bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200"
                    : "bg-gradient-to-r from-green-50 to-emerald-50 border-green-200"
                }`}
              >
                <h4
                  className={`text-lg font-semibold mb-4 flex items-center ${
                    selectedPlot.status === "Tokened"
                      ? "text-orange-900"
                      : selectedPlot.status === "PartPayment"
                      ? "text-blue-900"
                      : selectedPlot.status === "Booked"
                      ? "text-yellow-900"
                      : "text-green-900"
                  }`}
                >
                  <User className="h-5 w-5 mr-2" />
                  {selectedPlot.status === "Tokened"
                    ? "Token Information"
                    : "Customer Information"}
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-3 rounded-lg shadow-sm">
                    <label className="block text-xs font-medium text-gray-500 uppercase mb-1 flex items-center">
                      <User className="h-3 w-3 mr-1" />
                      Customer Name
                    </label>
                    <p className="text-sm font-semibold text-gray-900">
                      {selectedPlot.customerName || "Not available"}
                    </p>
                  </div>
                  <div className="bg-white p-3 rounded-lg shadow-sm">
                    <label className="block text-xs font-medium text-gray-500 uppercase mb-1 flex items-center">
                      <Users className="h-3 w-3 mr-1" />
                      Associate
                    </label>
                    <p className="text-sm font-semibold text-gray-900">
                      {selectedPlot.associateName || "Not available"}
                    </p>
                  </div>
                  <div className="bg-white p-3 rounded-lg shadow-sm">
                    <label className="block text-xs font-medium text-gray-500 uppercase mb-1 flex items-center">
                      <User className="h-3 w-3 mr-1" />
                      Reference Name
                    </label>
                    <p className="text-sm font-semibold text-gray-900">
                      {selectedPlot.referenceName || "Not available"}
                    </p>
                  </div>
                  <div className="bg-white p-3 rounded-lg shadow-sm">
                    <label className="block text-xs font-medium text-gray-500 uppercase mb-1 flex items-center">
                      <DollarSign className="h-3 w-3 mr-1" />
                      {selectedPlot.status === "Tokened"
                        ? "Token Amount"
                        : "Received Amount"}
                    </label>
                    <p
                      className={`mt-1 text-sm font-medium ${
                        selectedPlot.status === "Tokened"
                          ? "text-orange-900"
                          : selectedPlot.status === "Booked"
                          ? "text-yellow-900"
                          : "text-blue-900"
                      }`}
                    >
                      {selectedPlot.receivedAmount &&
                      selectedPlot.receivedAmount > 0
                        ? formatCurrency(selectedPlot.receivedAmount)
                        : "₹0"}
                    </p>
                  </div>
                  {selectedPlot.status === "Tokened" &&
                    selectedPlot.tokenExpiryDate && (
                      <div>
                        <label className="block text-sm font-medium text-orange-700">
                          Token Expiry Date
                        </label>
                        <p className="mt-1 text-sm font-medium text-orange-900">
                          {formatDate(selectedPlot.tokenExpiryDate)}
                        </p>
                      </div>
                    )}
                  <div>
                    <label
                      className={`block text-sm font-medium ${
                        selectedPlot.status === "Tokened"
                          ? "text-orange-700"
                          : selectedPlot.status === "Booked"
                          ? "text-yellow-700"
                          : "text-blue-700"
                      }`}
                    >
                      Total Paid
                    </label>
                    <p className="text-sm font-semibold text-green-600">
                      {formatCurrency(selectedPlot.totalPaid || 0)}
                    </p>
                  </div>
                  <div className="bg-white p-3 rounded-lg shadow-sm">
                    <label className="block text-xs font-medium text-gray-500 uppercase mb-1 flex items-center">
                      <DollarSign className="h-3 w-3 mr-1" />
                      Remaining Balance
                    </label>
                    <p className="text-sm font-semibold text-orange-600">
                      {formatCurrency(selectedPlot.remainingBalance || 0)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Create Plot Form */}
      <CreatePlotForm
        isOpen={showCreateForm}
        onClose={() => setShowCreateForm(false)}
        onSuccess={fetchPlots}
      />

      {/* Bulk Create Plots Form */}
      <BulkCreatePlotsForm
        isOpen={showBulkCreateForm}
        onClose={() => setShowBulkCreateForm(false)}
        onSuccess={fetchPlots}
      />

      {/* Booking Receipt Form */}
      <BookingReceiptForm
        isOpen={showBookingReceiptForm}
        onClose={() => setShowBookingReceiptForm(false)}
        plot={selectedPlotForBooking}
        onSuccess={handleBookingReceiptSuccess}
      />

      {/* Edit Plot Form */}
      <EditPlotForm
        isOpen={showEditForm}
        onClose={() => {
          setShowEditForm(false);
          setSelectedPlotForEdit(null);
        }}
        plot={selectedPlotForEdit}
        onSuccess={fetchPlots}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && selectedPlotForDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={cancelDeletePlot}
            />

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle w-full max-w-lg">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <Trash2 className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Delete Plot
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500 mb-4">
                        Are you sure you want to delete this plot? This action cannot be undone and will permanently remove:
                      </p>
                      <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
                        <div className="text-sm">
                          <p className="font-medium text-red-800">Plot Details:</p>
                          <p className="text-red-700">• Site: {selectedPlotForDelete.siteName}</p>
                          <p className="text-red-700">• Plot Number: {selectedPlotForDelete.plotNumber}</p>
                          <p className="text-red-700">• Plot Size: {selectedPlotForDelete.plotSize}</p>
                          <p className="text-red-700">• Basic Rate: ₹{selectedPlotForDelete.basicRate?.toLocaleString()}/sq yard</p>
                          <p className="text-red-700">• Status: {selectedPlotForDelete.status}</p>
                        </div>
                      </div>
                      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
                        <p className="text-sm text-yellow-800">
                          <strong>Warning:</strong> All plot data will be permanently deleted. This action cannot be undone.
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          To confirm deletion, please type the plot number: <strong>{selectedPlotForDelete.plotNumber}</strong>
                        </label>
                        <input
                          type="text"
                          value={deleteConfirmation}
                          onChange={(e) => setDeleteConfirmation(e.target.value)}
                          className="input w-full"
                          placeholder={`Enter ${selectedPlotForDelete.plotNumber} to confirm`}
                          autoFocus
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={confirmDeletePlot}
                  disabled={deleteConfirmation !== selectedPlotForDelete.plotNumber || deleting}
                  className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm ${
                    deleteConfirmation === selectedPlotForDelete.plotNumber && !deleting
                      ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                      : 'bg-gray-400 cursor-not-allowed'
                  }`}
                >
                  {deleting ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Deleting...
                    </>
                  ) : (
                    'Delete Plot'
                  )}
                </button>
                <button
                  type="button"
                  onClick={cancelDeletePlot}
                  disabled={deleting}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Part Payment Form */}
      <PartPaymentForm
        isOpen={showPartPaymentForm}
        onClose={() => setShowPartPaymentForm(false)}
        plot={selectedPlotForPartPayment}
        onSuccess={handlePartPaymentSuccess}
      />

      {/* Booking Receipt Form */}
      <BookingReceiptForm
        isOpen={showBookingReceiptForm}
        onClose={() => setShowBookingReceiptForm(false)}
        plot={selectedPlotForBooking}
        onSuccess={handleBookingReceiptSuccess}
      />

      {/* NOC Receipt Form */}
      <NOCReceiptForm
        isOpen={showNOCReceiptForm}
        onClose={() => setShowNOCReceiptForm(false)}
        plot={selectedPlotForNOC}
        onSuccess={handleNOCReceiptSuccess}
      />
    </div>
  );
};

export default Plots;
