import React, { useState, useEffect } from "react";
import { Plus, Filter, Download, Eye, Printer, Edit, Trash2 } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { receiptsAPI } from "../utils/api";
import {
  formatCurrency,
  formatDate,
  getStatusBadgeClass,
} from "../utils/helpers";
import { exportReceiptsToCSV } from "../utils/csvExport";
import DataTable from "../components/UI/DataTable";
import Modal from "../components/UI/Modal";
import LoadingSpinner from "../components/UI/LoadingSpinner";
import CreateReceiptForm from "../components/Forms/CreateReceiptForm";
import EditReceiptForm from "../components/Forms/EditReceiptForm";
import ApprovalForm from "../components/Forms/ApprovalForm";
import PrintReceipt from "../components/Receipt/PrintReceipt";
import toast from "react-hot-toast";

const Receipts = () => {
  const { user } = useAuth();
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    totalRecords: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  });
  const [sortConfig, setSortConfig] = useState({
    sortBy: "receiptno",
    sortOrder: "desc"
  });
  const [filters, setFilters] = useState({
    customerName: "",
    referenceName: "",
    siteName: "",
    plotNumber: "",
    status: "",
    receiptType: "",
    companyName: "",
    paymentType: "",
    fromDate: "",
    toDate: "",
    tokenExpiryFromDate: "",
    tokenExpiryToDate: "",
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printReceiptData, setPrintReceiptData] = useState(null);
  const [showApprovalForm, setShowApprovalForm] = useState(false);
  const [approvalReceiptData, setApprovalReceiptData] = useState(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editReceiptId, setEditReceiptId] = useState(null);
  const [exportingCSV, setExportingCSV] = useState(false);

  useEffect(() => {
    fetchReceipts();
  }, [pagination.page, filters, sortConfig]);

  const fetchReceipts = async () => {
    try {
      setLoading(true);
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

      const response = await receiptsAPI.getReceipts(params);
      const { data, totalRecords, totalPages, hasNextPage, hasPreviousPage } =
        response.data;

      setReceipts(data);
      setPagination((prev) => ({
        ...prev,
        totalRecords,
        totalPages,
        hasNextPage,
        hasPreviousPage,
      }));
    } catch (error) {
      console.error("Error fetching receipts:", error);
      console.error("Error details:", error.response?.data);
      console.error("Error status:", error.response?.status);
      const errorMessage = error.response?.data?.message || error.response?.data || error.message || "Failed to fetch receipts";
      toast.error(`Failed to fetch receipts: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (key, direction) => {
    setSortConfig({
      sortBy: key,
      sortOrder: direction
    });
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page on sort
  };

  const handlePageChange = (newPage) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  const handleExportCSV = async () => {
    try {
      setExportingCSV(true);
      
      // Fetch all receipts (not paginated) for export
      // Use current sorting and filters applied by user
      const params = {
        pageSize: 10000, // Large number to get all receipts
        sortBy: sortConfig.sortBy, // Use current sort column
        sortOrder: sortConfig.sortOrder, // Use current sort order
        ...filters, // Include all current filters
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

      const response = await receiptsAPI.getReceipts(params);
      const allReceipts = response.data.data || [];

      if (allReceipts.length === 0) {
        toast.error("No receipts found to export");
        return;
      }

      // Generate filename with current date and filter info
      const currentDate = new Date().toISOString().split('T')[0];
      const hasFilters = Object.values(filters).some(val => val !== "");
      const filterSuffix = hasFilters ? '-filtered' : '';
      const filename = `receipts-export-${currentDate}${filterSuffix}.csv`;

      // Export to CSV
      exportReceiptsToCSV(allReceipts, filename);
      
      toast.success(`Successfully exported ${allReceipts.length} receipts to CSV`);
    } catch (error) {
      console.error("Error exporting receipts:", error);
      toast.error("Failed to export receipts to CSV");
    } finally {
      setExportingCSV(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, page: 1 })); // Reset to first page
  };

  const clearFilters = () => {
    setFilters({
      customerName: "",
      referenceName: "",
      siteName: "",
      plotNumber: "",
      status: "",
      receiptType: "",
      companyName: "",
      paymentType: "",
      fromDate: "",
      toDate: "",
      tokenExpiryFromDate: "",
      tokenExpiryToDate: "",
    });
  };

  const handleApproveReceipt = (receipt) => {
    setApprovalReceiptData(receipt);
    setShowApprovalForm(true);
  };

  const handlePrintReceipt = (receipt) => {
    setPrintReceiptData(receipt);
    setShowPrintModal(true);
  };

  const handleEditReceipt = (receipt) => {
    setEditReceiptId(receipt.id);
    setShowEditForm(true);
  };

  const handleDeleteReceipt = async (receipt) => {
    // Only allow deletion of booking and NOC receipts
    if (receipt.receiptType !== 'booking' && receipt.receiptType !== 'noc') {
      toast.error('Only booking and NOC receipts can be deleted');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete this ${receipt.receiptType} receipt? This action cannot be undone.`)) {
      return;
    }

    try {
      await receiptsAPI.deleteReceipt(receipt.id);
      toast.success('Receipt deleted successfully');
      fetchReceipts(); // Refresh the list
    } catch (error) {
      console.error('Error deleting receipt:', error);
      const errorMessage = error.response?.data?.message || error.response?.data || 'Failed to delete receipt';
      toast.error(errorMessage);
    }
  };

  const handleAddFiles = (receiptId) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = '.jpg,.jpeg,.png,.pdf,.doc,.docx';
    
    input.onchange = async (event) => {
      const files = Array.from(event.target.files);
      
      if (files.length === 0) return;
      
      // Validate file count and size
      if (files.length > 5) {
        toast.error('Maximum 5 files allowed');
        return;
      }
      
      for (const file of files) {
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`File "${file.name}" is too large. Maximum size is 10MB.`);
          return;
        }
      }
      
      try {
        const formData = new FormData();
        files.forEach(file => {
          formData.append('files', file);
        });
        
        await receiptsAPI.uploadFilesToReceipt(receiptId, formData);
        toast.success('Files uploaded successfully');
        
        // Refresh the receipt data
        const updatedReceipt = await receiptsAPI.getReceipt(receiptId);
        setSelectedReceipt(updatedReceipt.data);
        fetchReceipts(); // Refresh the list
      } catch (error) {
        console.error('Error uploading files:', error);
        toast.error('Failed to upload files');
      }
    };
    
    input.click();
  };

  const handleDeleteFile = async (receiptId, fileIndex) => {
    if (!confirm('Are you sure you want to delete this file?')) {
      return;
    }
    
    try {
      await receiptsAPI.deleteFileFromReceipt(receiptId, fileIndex);
      toast.success('File deleted successfully');
      
      // Refresh the receipt data
      const updatedReceipt = await receiptsAPI.getReceipt(receiptId);
      setSelectedReceipt(updatedReceipt.data);
      fetchReceipts(); // Refresh the list
    } catch (error) {
      console.error('Error deleting file:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      
      let errorMessage = 'Failed to delete file';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    }
  };

  const handleDownloadFile = async (fileUrl, fileName) => {
    try {
      const response = await receiptsAPI.downloadFile(fileUrl);
      
      // Create blob URL and download
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('File downloaded successfully');
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('Failed to download file');
    }
  };

  const columns = [
    {
      key: "receiptno",
      title: "Receipt No",
      sortable: true,
      render: (_, row) => row.receiptNo,
    },
    {
      key: "receipttype",
      title: "Type",
      sortable: true,
      render: (_, row) => {
        const value = row.receiptType;
        const typeConfig = {
          token: { label: 'Token', class: 'badge-info' },
          partpayment: { label: 'Part Payment', class: 'badge-primary' },
          booking: { label: 'Booking', class: 'badge-warning' },
          noc: { label: 'NOC', class: 'badge-success' }
        };
        const config = typeConfig[value] || { label: value, class: 'badge-secondary' };
        return (
          <span className={`badge ${config.class}`}>
            {config.label}
          </span>
        );
      },
    },
    {
      key: "fromname",
      title: "Customer Name",
      sortable: true,
      render: (_, row) => row.fromName,
    },
    {
      key: "sitename",
      title: "Site Name",
      sortable: true,
      render: (_, row) => row.siteName,
    },
    {
      key: "plotnumber",
      title: "Plot No",
      sortable: true,
      render: (_, row) => row.plotVillaNo,
    },
    {
      key: "amount",
      title: "Amount",
      sortable: true,
      render: (_, row) => formatCurrency(row.amount),
    },
    {
      key: "status",
      title: "Status",
      sortable: true,
      render: (_, row) => (
        <div className="flex items-center space-x-2">
          <span className={`badge ${getStatusBadgeClass(row.status)}`}>{row.status}</span>
          {row.associateRemarks && row.status === "Pending" && (
            <span 
              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800"
              title="Has associate remarks for review"
            >
              📝
            </span>
          )}
        </div>
      ),
    },
    {
      key: "attachedFiles",
      title: "Files",
      render: (value, row) => (
        <div className="flex items-center">
          {row.attachedFiles && row.attachedFiles.length > 0 ? (
            <span 
              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
              title={`${row.attachedFiles.length} file(s) attached`}
            >
              📎 {row.attachedFiles.length}
            </span>
          ) : (
            <span className="text-gray-400 text-xs">No files</span>
          )}
        </div>
      ),
    },
    {
      key: "date",
      title: "Created Date",
      sortable: true,
      render: (_, row) => formatDate(row.createdAt),
    },
    {
      key: "actions",
      title: "Actions",
      render: (_, row) => (
        <div className="flex space-x-2">
          <button
            onClick={() => {
              setSelectedReceipt(row);
              setShowReceiptModal(true);
            }}
            className="text-primary-600 hover:text-primary-900"
            title="View Details"
          >
            <Eye className="h-4 w-4" />
          </button>
          {/* Edit button - only for pending receipts and own receipts for associates */}
          {(() => {
            // Allow editing for:
            // 1. Pending receipts: Admin can edit any, Associates can edit their own
            // 2. Approved receipts: Only Admin can edit
            const canEdit = (row.status === "Pending" && (user?.role === "Admin" || row.createdByName === user?.name)) ||
                           (row.status === "Approved" && user?.role === "Admin") || (row.status === "Expired" && user?.role === "Admin");
            

            
            return canEdit;
          })() && (
            <button
              onClick={() => handleEditReceipt(row)}
              className="text-orange-600 hover:text-orange-900"
              title="Edit Receipt"
            >
              <Edit className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() => handlePrintReceipt(row)}
            className="text-blue-600 hover:text-blue-900"
            title="Print Receipt"
          >
            <Printer className="h-4 w-4" />
          </button>
          {user?.role === "Admin" && row.status === "Pending" && (
            <button
              onClick={() => handleApproveReceipt(row)}
              className="text-success-600 hover:text-success-900"
              title="Approve Receipt"
            >
              Approve
            </button>
          )}
          {user?.role === "Admin" && (row.receiptType === "booking" || row.receiptType === "noc") && (
            <button
              onClick={() => handleDeleteReceipt(row)}
              className="text-red-600 hover:text-red-900"
              title="Delete Receipt"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Receipts</h1>
          <p className="mt-1 text-sm md:text-base text-gray-500">
            Manage token and booking receipts
          </p>
          {!loading && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs md:text-sm font-medium bg-primary-100 text-primary-800">
                Total: {pagination.totalRecords} receipt{pagination.totalRecords !== 1 ? 's' : ''}
              </span>
              {Object.values(filters).some(val => val !== "") && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs md:text-sm font-medium bg-blue-100 text-blue-800">
                  Filtered results
                </span>
              )}
            </div>
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
          <button
            onClick={handleExportCSV}
            disabled={exportingCSV || loading}
            className="btn-secondary text-sm whitespace-nowrap"
          >
            <Download className="h-4 w-4 mr-2" />
            {exportingCSV ? "Exporting..." : "Export CSV"}
          </button>
          {user?.role !== "Customer" && (
            <button
              onClick={() => setShowCreateForm(true)}
              className="btn-primary text-sm whitespace-nowrap"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Receipt
            </button>
          )}
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
                  onChange={(e) =>
                    handleFilterChange("customerName", e.target.value)
                  }
                  className="input"
                  placeholder="Search by customer name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reference Name
                </label>
                <input
                  type="text"
                  value={filters.referenceName}
                  onChange={(e) =>
                    handleFilterChange("referenceName", e.target.value)
                  }
                  className="input"
                  placeholder="Search by reference"
                />
              </div>
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
                  placeholder="Search by site"
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
                  Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange("status", e.target.value)}
                  className="input"
                >
                  <option value="">All Status</option>
                  <option value="Pending">Pending</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Expired">Expired</option>
                  <option value="Converted">Converted</option>
                  <option value="Transferred">Transferred</option>
                  <option value="Cancelled">Cancelled</option>
                  <option value="Booking">Booking</option>
                  <option value="NOC">NOC</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Receipt Type
                </label>
                <select
                  value={filters.receiptType}
                  onChange={(e) => handleFilterChange("receiptType", e.target.value)}
                  className="input"
                >
                  <option value="">All Types</option>
                  <option value="token">Token Receipt</option>
                  <option value="partpayment">Part Payment Receipt</option>
                  <option value="booking">Booking Receipt</option>
                  <option value="noc">NOC Receipt</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Name
                </label>
                <select
                  value={filters.companyName}
                  onChange={(e) => handleFilterChange("companyName", e.target.value)}
                  className="input"
                >
                  <option value="">All Companies</option>
                  <option value="Subhsankalp">Subhsankalp</option>
                  <option value="Golden City">Golden City</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Type
                </label>
                <select
                  value={filters.paymentType}
                  onChange={(e) => handleFilterChange("paymentType", e.target.value)}
                  className="input"
                >
                  <option value="">All Payment Types</option>
                  <option value="Cash">Cash</option>
                  <option value="Cheque">Cheque</option>
                  <option value="RTGS">RTGS/NEFT/UPI</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  From Date
                </label>
                <input
                  type="date"
                  value={filters.fromDate}
                  onChange={(e) =>
                    handleFilterChange("fromDate", e.target.value)
                  }
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
                  Token Expiry From
                </label>
                <input
                  type="date"
                  value={filters.tokenExpiryFromDate}
                  onChange={(e) =>
                    handleFilterChange("tokenExpiryFromDate", e.target.value)
                  }
                  className="input"
                  placeholder="Token expiry start date"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Token Expiry To
                </label>
                <input
                  type="date"
                  value={filters.tokenExpiryToDate}
                  onChange={(e) =>
                    handleFilterChange("tokenExpiryToDate", e.target.value)
                  }
                  className="input"
                  placeholder="Token expiry end date"
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
        data={receipts}
        columns={columns}
        loading={loading}
        pagination={pagination}
        onPageChange={handlePageChange}
        onSort={handleSort}
        searchable={false}
        filterable={false}
      />

      {/* Receipt Details Modal */}
      <Modal
        isOpen={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        title="Receipt Details"
        size="lg"
      >
        {selectedReceipt && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Receipt No
                </label>
                <p className="mt-1 text-sm text-gray-900">
                  {selectedReceipt.receiptNo}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Receipt Type
                </label>
                <p className="mt-1">
                  <span className={`badge ${selectedReceipt.receiptType === 'token' ? 'badge-info' : 'badge-warning'}`}>
                    {selectedReceipt.receiptType === 'token' ? 'Token Receipt' : 'Booking Receipt'}
                  </span>
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Status
                </label>
                <span
                  className={`badge ${getStatusBadgeClass(
                    selectedReceipt.status
                  )} mt-1`}
                >
                  {selectedReceipt.status}
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Customer Name
                </label>
                <p className="mt-1 text-sm text-gray-900">
                  {selectedReceipt.fromName}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Mobile
                </label>
                <p className="mt-1 text-sm text-gray-900">
                  {selectedReceipt.mobile}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  PAN Number
                </label>
                <p className="mt-1 text-sm text-gray-900">
                  {selectedReceipt.panNumber || 'Not provided'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Aadhar Number
                </label>
                <p className="mt-1 text-sm text-gray-900">
                  {selectedReceipt.aadharNumber || 'Not provided'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Company Name
                </label>
                <p className="mt-1 text-sm text-gray-900">
                  {selectedReceipt.companyName || 'Not specified'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Site Name
                </label>
                <p className="mt-1 text-sm text-gray-900">
                  {selectedReceipt.siteName}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Plot No
                </label>
                <p className="mt-1 text-sm text-gray-900">
                  {selectedReceipt.plotVillaNo}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Amount
                </label>
                <p className="mt-1 text-sm text-gray-900">
                  {formatCurrency(selectedReceipt.amount)}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Created By
                </label>
                <p className="mt-1 text-sm text-gray-900">
                  {selectedReceipt.createdByName}
                </p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Address
              </label>
              <p className="mt-1 text-sm text-gray-900">
                {selectedReceipt.address}
              </p>
            </div>
            {selectedReceipt.associateRemarks && (
              <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                <label className="block text-sm font-bold text-green-800 mb-1">
                  📝 Associate Remarks
                </label>
                <p className="text-sm text-green-900 font-medium">
                  "{selectedReceipt.associateRemarks}"
                </p>
                <p className="text-xs text-green-600 mt-1">
                  - {selectedReceipt.createdByName}
                </p>
              </div>
            )}
            {selectedReceipt.adminRemarks && (
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                <label className="block text-sm font-bold text-blue-800 mb-1">
                  👨‍💼 Admin Remarks
                </label>
                <p className="text-sm text-blue-900">
                  {selectedReceipt.adminRemarks}
                </p>
              </div>
            )}
            
            {/* File Attachments Section */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-bold text-gray-800">
                  📎 File Attachments
                </label>
                {(user.role === 'Admin' || selectedReceipt.createdByUserId === user.id) && (
                  <button
                    onClick={() => handleAddFiles(selectedReceipt.id)}
                    className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
                  >
                    + Add Files
                  </button>
                )}
              </div>
              
              {selectedReceipt.attachedFiles && selectedReceipt.attachedFiles.length > 0 ? (
                <div className="space-y-2">
                  {selectedReceipt.attachedFiles.map((fileUrl, index) => {
                    const fileName = fileUrl.split('/').pop() || `File ${index + 1}`;
                    const fileExtension = fileName.split('.').pop()?.toLowerCase();
                    const isImage = ['jpg', 'jpeg', 'png', 'gif'].includes(fileExtension);
                    const isPdf = fileExtension === 'pdf';
                    
                    return (
                      <div key={index} className="flex items-center justify-between bg-white p-2 rounded border">
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
                            {isImage ? (
                              <span className="text-xs text-green-600">IMG</span>
                            ) : isPdf ? (
                              <span className="text-xs text-red-600">PDF</span>
                            ) : (
                              <span className="text-xs text-gray-600">DOC</span>
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 truncate max-w-xs">
                              {fileName}
                            </p>
                            <p className="text-xs text-gray-500">
                              {fileExtension?.toUpperCase()} file
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleDownloadFile(fileUrl, fileName)}
                            className="text-blue-600 hover:text-blue-800 text-xs px-2 py-1 bg-blue-50 rounded"
                          >
                            View
                          </button>
                          <button
                            onClick={() => handleDownloadFile(fileUrl, fileName)}
                            className="text-green-600 hover:text-green-800 text-xs px-2 py-1 bg-green-50 rounded"
                          >
                            Download
                          </button>
                          {(user.role === 'Admin' || selectedReceipt.createdByUserId === user.id) && (
                            <button
                              onClick={() => handleDeleteFile(selectedReceipt.id, index)}
                              className="text-red-600 hover:text-red-800 text-xs px-2 py-1 bg-red-50 rounded"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">
                  No files attached to this receipt
                </p>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Create Receipt Form */}
      <CreateReceiptForm
        isOpen={showCreateForm}
        onClose={() => setShowCreateForm(false)}
        onSuccess={fetchReceipts}
      />

      {/* Print Receipt Modal */}
      <PrintReceipt
        receipt={printReceiptData}
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        type={printReceiptData?.receiptType || 'token'}
      />

      {/* Approval Form Modal */}
      <ApprovalForm
        receipt={approvalReceiptData}
        isOpen={showApprovalForm}
        onClose={() => setShowApprovalForm(false)}
        onSuccess={fetchReceipts}
      />

      {/* Edit Receipt Form */}
      <EditReceiptForm
        isOpen={showEditForm}
        onClose={() => {
          setShowEditForm(false);
          setEditReceiptId(null);
        }}
        onSuccess={fetchReceipts}
        receiptId={editReceiptId}
      />
    </div>
  );
};

export default Receipts;
