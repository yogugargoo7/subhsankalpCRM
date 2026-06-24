import React, { useState, useEffect } from "react";
import { 
  TrendingUp, 
  DollarSign, 
  Users, 
  MapPin, 
  Calendar,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  AlertCircle,
  CheckCircle,
  X,
  Eye,
  Download,
  Filter,
  Printer,
  FileText,
  Info
} from "lucide-react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { useAuth } from "../contexts/AuthContext";
import { dashboardAPI, receiptsAPI, plotsAPI } from "../utils/api";
import { formatCurrency, formatDate, getStatusBadgeClass } from "../utils/helpers";
import { exportReceiptsToCSV } from "../utils/csvExport";
import LoadingSpinner from "../components/UI/LoadingSpinner";
import Modal from "../components/UI/Modal";
import PrintReceipt from "../components/Receipt/PrintReceipt";
// import AnalyticsDebug from "../components/Debug/AnalyticsDebug";
import toast from "react-hot-toast";

const COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6', '#ec4899'];

const Analytics = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [showReceiptsModal, setShowReceiptsModal] = useState(false);
  const [showReceiptDetailModal, setShowReceiptDetailModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showPlotsModal, setShowPlotsModal] = useState(false);
  const [showPlotDetailsModal, setShowPlotDetailsModal] = useState(false);
  const [selectedPlot, setSelectedPlot] = useState(null);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [modalTitle, setModalTitle] = useState("");
  const [filteredReceipts, setFilteredReceipts] = useState([]);
  const [displayedReceipts, setDisplayedReceipts] = useState([]); // Receipts after modal filters
  const [loadingReceipts, setLoadingReceipts] = useState(false);
  const [allReceipts, setAllReceipts] = useState([]); // Store all receipts for filtering
  const [allPlots, setAllPlots] = useState([]); // Store all plots for filtering
  const [filteredPlots, setFilteredPlots] = useState([]);
  const [displayedPlots, setDisplayedPlots] = useState([]);
  const [loadingPlots, setLoadingPlots] = useState(false);
  const [plotModalFilters, setPlotModalFilters] = useState({
    siteName: "",
    plotNumber: "",
    plotSize: "",
    status: "",
    minPrice: "",
    maxPrice: "",
    facing: "",
    block: ""
  });
  const [modalFilters, setModalFilters] = useState({
    customerName: "",
    referenceName: "",
    siteName: "",
    plotNumber: "",
    status: "",
    receiptType: "",
    paymentType: "",
    fromDate: "",
    toDate: "",
    tokenExpiryFrom: "",
    tokenExpiryTo: "",
    minAmount: "",
    maxAmount: ""
  });
  const [stats, setStats] = useState({
    totalRevenue: 0,
    expiredRevenue: 0,
    totalReceipts: 0,
    totalPlots: 0,
    availablePlots: 0,
    tokenedPlots: 0,
    partPaymentPlots: 0,
    bookedPlots: 0,
    soldPlots: 0,
    pendingApprovals: 0,
    monthlyRevenue: [],
    siteWiseStats: [],
    associatePerformance: [],
    paymentMethodStats: []
  });
  const [dateRange, setDateRange] = useState({
    fromDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0], // Start of current year
    toDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      
      // Fetch basic stats (use main endpoint with large page size to get ALL receipts)
      const [receiptsResponse, plotsResponse] = await Promise.all([
        receiptsAPI.getReceipts({ pageSize: 100000 }), // Get ALL receipts for accurate stats
        plotsAPI.getPlots({ pageSize: 10000, page: 1 }) // Get ALL plots
      ]);

      const receipts = receiptsResponse.data.data || [];
      const plots = plotsResponse.data.data || []; // Main endpoint returns paginated data
      
      // Store all receipts and plots for modal filtering
      setAllReceipts(receipts);
      setAllPlots(plots);

      // Filter receipts by date range
      const filteredReceipts = receipts.filter(receipt => {
        try {
          const receiptDate = new Date(receipt.createdAt || receipt.date);
          const fromDate = new Date(dateRange.fromDate + 'T00:00:00');
          const toDate = new Date(dateRange.toDate + 'T23:59:59');
          

          
          return receiptDate >= fromDate && receiptDate <= toDate;
        } catch (error) {

          return true; // Include receipt if date parsing fails
        }
      });

      // Calculate stats with case-insensitive status check
      // Total Revenue: Approved + Converted (active revenue)
      const activeReceipts = filteredReceipts.filter(r => 
        r.status && (r.status.toLowerCase() === 'approved' || r.status.toLowerCase() === 'converted')
      );
      
      const totalRevenue = activeReceipts
        .reduce((sum, r) => sum + (r.totalAmount || r.amount || 0), 0);

      // Expired Revenue: Separate tracking
      const expiredRevenue = filteredReceipts
        .filter(r => r.status && r.status.toLowerCase() === 'expired')
        .reduce((sum, r) => sum + (r.totalAmount || r.amount || 0), 0);

      // Cancelled Revenue: Separate tracking
      const cancelledRevenue = filteredReceipts
        .filter(r => r.status && r.status.toLowerCase() === 'cancelled')
        .reduce((sum, r) => sum + (r.totalAmount || r.amount || 0), 0);

      const totalReceipts = filteredReceipts.length;
      const totalPlots = plots.length;
      const availablePlots = plots.filter(p => p.status === 'Available').length;
      const tokenedPlots = plots.filter(p => p.status === 'Tokened').length;
      const partPaymentPlots = plots.filter(p => p.status === 'PartPayment').length;
      const bookedPlots = plots.filter(p => p.status === 'Booked').length;
      const soldPlots = plots.filter(p => p.status === 'Sold').length;
      const pendingApprovals = receipts.filter(r => 
        r.status && r.status.toLowerCase() === 'pending'
      ).length;

      // Monthly revenue calculation
      const monthlyRevenue = calculateMonthlyRevenue(filteredReceipts);
      
      // Site-wise statistics
      const siteWiseStats = calculateSiteWiseStats(plots, receipts);
      
      // Associate performance
      const associatePerformance = calculateAssociatePerformance(filteredReceipts);
      
      // Payment method statistics
      const paymentMethodStats = calculatePaymentMethodStats(filteredReceipts);

      setStats({
        totalRevenue,
        expiredRevenue,
        totalReceipts,
        totalPlots,
        availablePlots,
        tokenedPlots,
        partPaymentPlots,
        bookedPlots,
        soldPlots,
        pendingApprovals,
        monthlyRevenue,
        siteWiseStats,
        associatePerformance,
        paymentMethodStats
      });

    } catch (error) {
      console.error("Error fetching analytics:", error);
      toast.error("Failed to fetch analytics data");
    } finally {
      setLoading(false);
    }
  };

  const calculateMonthlyRevenue = (receipts) => {
    const monthlyData = {};
    // Include Approved and Converted receipts in monthly revenue
    const approvedReceipts = receipts.filter(r => 
      r.status && (r.status.toLowerCase() === 'approved' || r.status.toLowerCase() === 'converted')
    );
    
    approvedReceipts.forEach(receipt => {
      try {
        const receiptDate = new Date(receipt.createdAt || receipt.date);
        const month = receiptDate.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short' 
        });
        
        monthlyData[month] = (monthlyData[month] || 0) + (receipt.totalAmount || receipt.amount || 0);
      } catch (error) {
        console.error('Error processing receipt date:', error, receipt);
      }
    });
    
    return Object.entries(monthlyData).map(([month, revenue]) => ({
      month,
      revenue
    }));
  };

  const calculateSiteWiseStats = (plots, receipts) => {
    const siteStats = {};
    
    plots.forEach(plot => {
      if (!siteStats[plot.siteName]) {
        siteStats[plot.siteName] = {
          siteName: plot.siteName,
          totalPlots: 0,
          availablePlots: 0,
          bookedPlots: 0,
          soldPlots: 0,
          revenue: 0
        };
      }
      
      siteStats[plot.siteName].totalPlots++;
      if (plot.status === 'Available') siteStats[plot.siteName].availablePlots++;
      if (plot.status === 'Booked') siteStats[plot.siteName].bookedPlots++;
      if (plot.status === 'Sold') siteStats[plot.siteName].soldPlots++;
    });

    // Include Approved and Converted receipts in site revenue
    receipts
      .filter(r => r.status && (r.status.toLowerCase() === 'approved' || r.status.toLowerCase() === 'converted'))
      .forEach(receipt => {
        if (siteStats[receipt.siteName]) {
          siteStats[receipt.siteName].revenue += (receipt.totalAmount || receipt.amount || 0);
        }
      });

    return Object.values(siteStats);
  };

  const calculateAssociatePerformance = (receipts) => {
    const associateStats = {};
    
    receipts.forEach(receipt => {
      const associateName = receipt.createdByName || 'Unknown';
      if (!associateStats[associateName]) {
        associateStats[associateName] = {
          name: associateName,
          totalReceipts: 0,
          approvedReceipts: 0,
          totalRevenue: 0,
          conversionRate: 0
        };
      }
      
      associateStats[associateName].totalReceipts++;
      // Include Approved and Converted receipts in associate performance
      if (receipt.status && (receipt.status.toLowerCase() === 'approved' || receipt.status.toLowerCase() === 'converted')) {
        associateStats[associateName].approvedReceipts++;
        associateStats[associateName].totalRevenue += (receipt.totalAmount || receipt.amount || 0);
      }
    });

    return Object.values(associateStats).map(associate => ({
      ...associate,
      conversionRate: associate.totalReceipts > 0 
        ? (associate.approvedReceipts / associate.totalReceipts * 100).toFixed(1)
        : 0
    }));
  };

  const calculatePaymentMethodStats = (receipts) => {
    const paymentStats = {
      cash: 0,
      cheque: 0,
      rtgs: 0
    };

    // Include Approved and Converted receipts in payment method stats
    const approvedReceipts = receipts.filter(r => 
      r.status && (r.status.toLowerCase() === 'approved' || r.status.toLowerCase() === 'converted')
    );

    
    approvedReceipts.forEach(receipt => {
      const receiptAmount = receipt.totalAmount || receipt.amount || 0;
      
      // Count payment methods - a receipt can have multiple payment methods
      let hasPaymentMethod = false;
      
      if (receipt.cashChecked === true) {
        paymentStats.cash += receiptAmount;
        hasPaymentMethod = true;
      }
      if (receipt.chequeChecked === true) {
        paymentStats.cheque += receiptAmount;
        hasPaymentMethod = true;
      }
      if (receipt.rtgsChecked === true) {
        paymentStats.rtgs += receiptAmount;
        hasPaymentMethod = true;
      }
      
      // Fallback: if no payment method is specified, assume cash
      if (!hasPaymentMethod) {
        paymentStats.cash += receiptAmount;
      }
    });



    return [
      { method: 'Cash', amount: paymentStats.cash, icon: '💵' },
      { method: 'Cheque', amount: paymentStats.cheque, icon: '📄' },
      { method: 'RTGS/NEFT/UPI', amount: paymentStats.rtgs, icon: '🏦' }
    ];
  };

  const handleDateRangeChange = (field, value) => {
    setDateRange(prev => ({ ...prev, [field]: value }));
  };

  // Function to show receipts filtered by criteria
  const showReceiptsByFilter = (title, filterFn) => {
    setLoadingReceipts(true);
    setModalTitle(title);
    
    // Filter receipts based on date range first
    const dateFiltered = allReceipts.filter(receipt => {
      try {
        const receiptDate = new Date(receipt.createdAt || receipt.date);
        const fromDate = new Date(dateRange.fromDate + 'T00:00:00');
        const toDate = new Date(dateRange.toDate + 'T23:59:59');
        return receiptDate >= fromDate && receiptDate <= toDate;
      } catch (error) {
        return true;
      }
    });
    
    // Apply additional filter
    const filtered = filterFn(dateFiltered);
    
    // Sort by receipt number descending (newest/highest first)
    const sorted = filtered.sort((a, b) => {
      // Extract the LAST numeric part from receipt number (e.g., "BR/25-26/0122" -> 122)
      const getReceiptNum = (receiptNo) => {
        if (!receiptNo) return 0;
        const matches = receiptNo.match(/\d+/g); // Get all numbers
        if (!matches || matches.length === 0) return 0;
        return parseInt(matches[matches.length - 1]); // Use the last number
      };
      return getReceiptNum(b.receiptNo) - getReceiptNum(a.receiptNo);
    });
    
    setFilteredReceipts(sorted);
    setDisplayedReceipts(sorted);
    setModalFilters({
      customerName: "",
      referenceName: "",
      siteName: "",
      plotNumber: "",
      status: "",
      receiptType: "",
      paymentType: "",
      fromDate: "",
      toDate: "",
      tokenExpiryFrom: "",
      tokenExpiryTo: "",
      minAmount: "",
      maxAmount: ""
    }); // Reset filters
    setShowReceiptsModal(true);
    setLoadingReceipts(false);
  };

  // Apply modal filters
  useEffect(() => {
    if (!showReceiptsModal) return;
    
    let filtered = [...filteredReceipts];
    
    // Text filters
    if (modalFilters.customerName) {
      filtered = filtered.filter(r => 
        r.fromName?.toLowerCase().includes(modalFilters.customerName.toLowerCase())
      );
    }
    if (modalFilters.referenceName) {
      filtered = filtered.filter(r => 
        r.referenceName?.toLowerCase().includes(modalFilters.referenceName.toLowerCase())
      );
    }
    if (modalFilters.siteName) {
      filtered = filtered.filter(r => 
        r.siteName?.toLowerCase().includes(modalFilters.siteName.toLowerCase())
      );
    }
    if (modalFilters.plotNumber) {
      filtered = filtered.filter(r => 
        r.plotVillaNo?.toLowerCase().includes(modalFilters.plotNumber.toLowerCase())
      );
    }
    
    // Dropdown filters
    if (modalFilters.status) {
      filtered = filtered.filter(r => r.status === modalFilters.status);
    }
    if (modalFilters.receiptType) {
      filtered = filtered.filter(r => r.receiptType === modalFilters.receiptType);
    }
    if (modalFilters.paymentType) {
      filtered = filtered.filter(r => {
        switch (modalFilters.paymentType) {
          case 'cash': return r.cashChecked === true;
          case 'cheque': return r.chequeChecked === true;
          case 'rtgs': return r.rtgsChecked === true;
          default: return true;
        }
      });
    }
    
    // Date filters
    if (modalFilters.fromDate) {
      filtered = filtered.filter(r => {
        const receiptDate = new Date(r.createdAt || r.date);
        return receiptDate >= new Date(modalFilters.fromDate);
      });
    }
    if (modalFilters.toDate) {
      filtered = filtered.filter(r => {
        const receiptDate = new Date(r.createdAt || r.date);
        return receiptDate <= new Date(modalFilters.toDate + 'T23:59:59');
      });
    }
    if (modalFilters.tokenExpiryFrom) {
      filtered = filtered.filter(r => {
        if (!r.tokenExpiryDate) return false;
        const expiryDate = new Date(r.tokenExpiryDate);
        return expiryDate >= new Date(modalFilters.tokenExpiryFrom);
      });
    }
    if (modalFilters.tokenExpiryTo) {
      filtered = filtered.filter(r => {
        if (!r.tokenExpiryDate) return false;
        const expiryDate = new Date(r.tokenExpiryDate);
        return expiryDate <= new Date(modalFilters.tokenExpiryTo + 'T23:59:59');
      });
    }
    
    // Amount filters
    if (modalFilters.minAmount) {
      filtered = filtered.filter(r => 
        (r.totalAmount || r.amount || 0) >= parseFloat(modalFilters.minAmount)
      );
    }
    if (modalFilters.maxAmount) {
      filtered = filtered.filter(r => 
        (r.totalAmount || r.amount || 0) <= parseFloat(modalFilters.maxAmount)
      );
    }
    
    setDisplayedReceipts(filtered);
  }, [modalFilters, filteredReceipts, showReceiptsModal]);

  // Handle CSV export for modal receipts
  const handleExportModalCSV = () => {
    if (displayedReceipts.length === 0) {
      toast.error("No receipts to export");
      return;
    }

    const filename = `${modalTitle.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    exportReceiptsToCSV(displayedReceipts, filename);
    toast.success(`Successfully exported ${displayedReceipts.length} receipts to CSV`);
  };

  // Handle view receipt details
  const handleViewReceipt = (receipt) => {
    setSelectedReceipt(receipt);
    setShowReceiptDetailModal(true);
  };

  // Handle print receipt
  const handlePrintReceipt = () => {
    setShowReceiptDetailModal(false);
    setShowPrintModal(true);
  };

  // Handlers for different filters
  const handleShowExpiredReceipts = () => {
    showReceiptsByFilter(
      "Expired Revenue Receipts",
      (receipts) => receipts.filter(r => r.status?.toLowerCase() === 'expired')
    );
  };

  const handleShowCashReceipts = () => {
    showReceiptsByFilter(
      "Cash Payment Receipts",
      (receipts) => receipts.filter(r => 
        (r.status?.toLowerCase() === 'approved' || r.status?.toLowerCase() === 'converted') && 
        r.cashChecked === true
      )
    );
  };

  const handleShowChequeReceipts = () => {
    showReceiptsByFilter(
      "Cheque Payment Receipts",
      (receipts) => receipts.filter(r => 
        (r.status?.toLowerCase() === 'approved' || r.status?.toLowerCase() === 'converted') && 
        r.chequeChecked === true
      )
    );
  };

  const handleShowRTGSReceipts = () => {
    showReceiptsByFilter(
      "RTGS/NEFT/UPI Payment Receipts",
      (receipts) => receipts.filter(r => 
        (r.status?.toLowerCase() === 'approved' || r.status?.toLowerCase() === 'converted') && 
        r.rtgsChecked === true
      )
    );
  };

  const handleShowTotalRevenueReceipts = () => {
    showReceiptsByFilter(
      "Total Revenue Receipts (Approved + Converted)",
      (receipts) => receipts.filter(r => 
        r.status?.toLowerCase() === 'approved' || r.status?.toLowerCase() === 'converted'
      )
    );
  };

  // Handler for showing receipts by associate
  const handleShowAssociateReceipts = (associateName) => {
    showReceiptsByFilter(
      `Receipts by ${associateName}`,
      (receipts) => receipts.filter(r => 
        (r.createdByName || 'Unknown') === associateName
      )
    );
  };

  // Function to show plots filtered by status
  const showPlotsByStatus = (title, status) => {
    setLoadingPlots(true);
    setModalTitle(title);
    
    const filtered = allPlots.filter(plot => plot.status === status);
    
    // Sort by plot number
    const sorted = filtered.sort((a, b) => {
      const getPlotNum = (plotNo) => {
        if (!plotNo) return 0;
        const matches = plotNo.match(/\d+/g);
        if (!matches || matches.length === 0) return 0;
        return parseInt(matches[matches.length - 1]);
      };
      return getPlotNum(a.plotNumber) - getPlotNum(b.plotNumber);
    });
    
    setFilteredPlots(sorted);
    setDisplayedPlots(sorted);
    setPlotModalFilters({
      siteName: "",
      plotNumber: "",
      plotSize: "",
      status: "",
      minPrice: "",
      maxPrice: "",
      facing: "",
      block: ""
    });
    setShowPlotsModal(true);
    setLoadingPlots(false);
  };

  // Handlers for different plot statuses
  const handleShowAvailablePlots = () => {
    showPlotsByStatus("Available Plots", "Available");
  };

  const handleShowTokenedPlots = () => {
    showPlotsByStatus("Tokened Plots", "Tokened");
  };

  const handleShowPartPaymentPlots = () => {
    showPlotsByStatus("Part Payment Plots", "PartPayment");
  };

  const handleShowBookedPlots = () => {
    showPlotsByStatus("Booked Plots", "Booked");
  };

  const handleShowSoldPlots = () => {
    showPlotsByStatus("Sold Plots", "Sold");
  };

  // Handle view plot details
  const handleViewPlotDetails = (plot) => {
    setSelectedPlot(plot);
    setShowPlotDetailsModal(true);
  };

  // Handle view plot receipts - Reuse the existing receipts modal with plot filter
  const handleViewPlotReceipts = (plot) => {
    setSelectedPlot(plot);
    setModalTitle(`Receipts for ${plot.siteName} - ${plot.plotNumber}`);
    
    // Filter all receipts by this plot
    const plotReceipts = allReceipts.filter(r => 
      r.siteName === plot.siteName && r.plotVillaNo === plot.plotNumber
    );
    
    // Sort by receipt number descending
    const sorted = plotReceipts.sort((a, b) => {
      const getReceiptNum = (receiptNo) => {
        if (!receiptNo) return 0;
        const matches = receiptNo.match(/\d+/g);
        if (!matches || matches.length === 0) return 0;
        return parseInt(matches[matches.length - 1]);
      };
      return getReceiptNum(b.receiptNo) - getReceiptNum(a.receiptNo);
    });
    
    setFilteredReceipts(sorted);
    setDisplayedReceipts(sorted);
    setModalFilters({
      customerName: "",
      referenceName: "",
      siteName: "",
      plotNumber: "",
      status: "",
      receiptType: "",
      paymentType: "",
      fromDate: "",
      toDate: "",
      tokenExpiryFrom: "",
      tokenExpiryTo: "",
      minAmount: "",
      maxAmount: ""
    });
    
    // Open receipts modal on top of plots modal
    setShowReceiptsModal(true);
  };

  // Handle export plots to CSV
  const handleExportPlotsCSV = () => {
    if (displayedPlots.length === 0) {
      toast.error("No plots to export");
      return;
    }

    const csvData = displayedPlots.map(plot => ({
      'Site Name': plot.siteName || '',
      'Plot Number': plot.plotNumber || '',
      'Plot Size': plot.plotSize || '',
      'Total Price': plot.totalPrice || '',
      'Received Amount': plot.receivedAmount || '',
      'Basic Rate': plot.basicRate || '',
      'Status': plot.status || '',
      'Facing': plot.facing || '',
      'Road': plot.road || '',
      'Block': plot.block || ''
    }));

    const headers = Object.keys(csvData[0]);
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => headers.map(header => `"${row[header]}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${modalTitle.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(`Successfully exported ${displayedPlots.length} plots to CSV`);
  };

  // Apply plot modal filters
  useEffect(() => {
    if (!showPlotsModal) return;
    
    let filtered = [...filteredPlots];
    
    // Text filters
    if (plotModalFilters.siteName) {
      filtered = filtered.filter(p => 
        p.siteName?.toLowerCase().includes(plotModalFilters.siteName.toLowerCase())
      );
    }
    if (plotModalFilters.plotNumber) {
      filtered = filtered.filter(p => 
        p.plotNumber?.toLowerCase().includes(plotModalFilters.plotNumber.toLowerCase())
      );
    }
    if (plotModalFilters.plotSize) {
      filtered = filtered.filter(p => 
        p.plotSize?.toLowerCase().includes(plotModalFilters.plotSize.toLowerCase())
      );
    }
    if (plotModalFilters.block) {
      filtered = filtered.filter(p => 
        p.block?.toLowerCase().includes(plotModalFilters.block.toLowerCase())
      );
    }
    if (plotModalFilters.facing) {
      filtered = filtered.filter(p => 
        p.facing?.toLowerCase().includes(plotModalFilters.facing.toLowerCase())
      );
    }
    
    // Status filter
    if (plotModalFilters.status) {
      filtered = filtered.filter(p => p.status === plotModalFilters.status);
    }
    
    // Price range filters
    if (plotModalFilters.minPrice) {
      filtered = filtered.filter(p => 
        (p.totalPrice || 0) >= parseFloat(plotModalFilters.minPrice)
      );
    }
    if (plotModalFilters.maxPrice) {
      filtered = filtered.filter(p => 
        (p.totalPrice || 0) <= parseFloat(plotModalFilters.maxPrice)
      );
    }
    
    setDisplayedPlots(filtered);
  }, [plotModalFilters, filteredPlots, showPlotsModal]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Debug Section - Temporarily disabled */}
      {/* <AnalyticsDebug /> */}
      
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-4 md:p-6 mb-6">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center">
              <BarChart3 className="h-6 w-6 md:h-8 md:w-8 mr-2 md:mr-3 text-blue-600" />
              Analytics Dashboard
            </h1>
            <p className="mt-2 text-sm md:text-base text-gray-600">
              Business insights and performance metrics
            </p>
          </div>
          
          {/* Date Range Filter */}
          <div className="flex flex-wrap gap-2 md:gap-3 items-end">
            <div className="flex-1 min-w-[120px]">
              <label className="block text-xs font-medium text-gray-700 mb-1">From Date</label>
              <input
                type="date"
                value={dateRange.fromDate}
                onChange={(e) => handleDateRangeChange('fromDate', e.target.value)}
                className="input text-sm border-blue-300 focus:border-blue-500 focus:ring-blue-500 w-full"
              />
            </div>
            <div className="flex-1 min-w-[120px]">
              <label className="block text-xs font-medium text-gray-700 mb-1">To Date</label>
              <input
                type="date"
                value={dateRange.toDate}
                onChange={(e) => handleDateRangeChange('toDate', e.target.value)}
                className="input text-sm border-blue-300 focus:border-blue-500 focus:ring-blue-500 w-full"
              />
            </div>
            <button
              onClick={() => setDateRange({
                fromDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
                toDate: new Date().toISOString().split('T')[0]
              })}
              className="bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium text-xs px-3 md:px-4 py-2 rounded-lg transition-colors border border-blue-200 whitespace-nowrap"
            >
              Reset
            </button>
            <button
              onClick={() => setDateRange({
                fromDate: new Date(2020, 0, 1).toISOString().split('T')[0],
                toDate: new Date(2030, 11, 31).toISOString().split('T')[0]
              })}
              className="bg-blue-600 text-white hover:bg-blue-700 font-medium text-xs px-3 md:px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
            >
              Show All
            </button>
          </div>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="flex flex-wrap gap-4">
        <div 
          onClick={handleShowTotalRevenueReceipts}
          className="flex-grow flex-shrink-0 basis-[200px] bg-gradient-to-br from-green-50 to-emerald-100 rounded-xl shadow-md hover:shadow-lg transition-all p-5 border border-green-200 cursor-pointer hover:scale-105"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1 mr-3">
              <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-1 whitespace-nowrap">Total Revenue</p>
              <p className="text-2xl font-bold text-green-900 whitespace-nowrap">
                {formatCurrency(stats.totalRevenue)}
              </p>
              <p className="text-xs text-green-600 mt-1">Click to view receipts</p>
            </div>
            <div className="bg-green-500 rounded-full p-3 flex-shrink-0">
              <Eye className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div 
          onClick={handleShowExpiredReceipts}
          className="flex-grow flex-shrink-0 basis-[200px] bg-gradient-to-br from-red-50 to-rose-100 rounded-xl shadow-md hover:shadow-lg transition-all p-5 border border-red-200 cursor-pointer hover:scale-105"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1 mr-3">
              <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-1 whitespace-nowrap">Expired Revenue</p>
              <p className="text-2xl font-bold text-red-900 whitespace-nowrap">
                {formatCurrency(stats.expiredRevenue)}
              </p>
              <p className="text-xs text-red-600 mt-1">Click to view receipts</p>
            </div>
            <div className="bg-red-500 rounded-full p-3 flex-shrink-0">
              <Eye className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="flex-grow flex-shrink-0 basis-[200px] bg-gradient-to-br from-blue-50 to-cyan-100 rounded-xl shadow-md hover:shadow-lg transition-shadow p-5 border border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex-1 mr-3">
              <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1 whitespace-nowrap">Total Receipts</p>
              <p className="text-2xl font-bold text-blue-900 whitespace-nowrap">{stats.totalReceipts}</p>
            </div>
            <div className="bg-blue-500 rounded-full p-3 flex-shrink-0">
              <Activity className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="flex-grow flex-shrink-0 basis-[200px] bg-gradient-to-br from-purple-50 to-violet-100 rounded-xl shadow-md hover:shadow-lg transition-shadow p-5 border border-purple-200">
          <div className="flex items-center justify-between">
            <div className="flex-1 mr-3">
              <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-1 whitespace-nowrap">Total Plots</p>
              <p className="text-2xl font-bold text-purple-900 whitespace-nowrap">{stats.totalPlots}</p>
            </div>
            <div className="bg-purple-500 rounded-full p-3 flex-shrink-0">
              <MapPin className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="flex-grow flex-shrink-0 basis-[200px] bg-gradient-to-br from-orange-50 to-amber-100 rounded-xl shadow-md hover:shadow-lg transition-shadow p-5 border border-orange-200">
          <div className="flex items-center justify-between">
            <div className="flex-1 mr-3">
              <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide mb-1 whitespace-nowrap">Pending Approvals</p>
              <p className="text-2xl font-bold text-orange-900 whitespace-nowrap">{stats.pendingApprovals}</p>
            </div>
            <div className="bg-orange-500 rounded-full p-3 flex-shrink-0">
              <Calendar className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
      </div>



      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Revenue Chart */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <BarChart3 className="h-5 w-5 mr-2 text-blue-600" />
              Monthly Revenue Trend
            </h3>
          </div>
          <div className="card-content">
            {stats.monthlyRevenue.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={stats.monthlyRevenue} margin={{ left: 20, right: 20, top: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis 
                    tick={{ fontSize: 11 }}
                    tickFormatter={(value) => {
                      if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
                      if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
                      if (value >= 1000) return `₹${(value / 1000).toFixed(0)}K`;
                      return `₹${value}`;
                    }}
                    width={70}
                  />
                  <Tooltip 
                    formatter={(value) => formatCurrency(value)}
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc' }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    dot={{ fill: '#3b82f6', r: 4 }}
                    activeDot={{ r: 6 }}
                    name="Revenue"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <BarChart3 className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="font-medium">No revenue data available</p>
                <p className="text-xs mt-1">Try adjusting the date range</p>
              </div>
            )}
          </div>
        </div>

        {/* Payment Methods Pie Chart */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <PieChartIcon className="h-5 w-5 mr-2 text-purple-600" />
              Payment Methods Distribution
            </h3>
          </div>
          <div className="card-content">
            {stats.paymentMethodStats.some(item => item.amount > 0) ? (
              <>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={stats.paymentMethodStats.filter(item => item.amount > 0)}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ method, percent }) => `${method}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="amount"
                      onClick={(data) => {
                        if (data.method === 'Cash') handleShowCashReceipts();
                        else if (data.method === 'Cheque') handleShowChequeReceipts();
                        else if (data.method === 'RTGS/NEFT/UPI') handleShowRTGSReceipts();
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      {stats.paymentMethodStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
                <p className="text-xs text-center text-gray-500 mt-2">Click on chart segments to view receipts</p>
              </>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <PieChartIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="font-medium">No payment method data available</p>
                <p className="text-xs mt-1">Check if receipts have payment methods selected</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Plot Status Chart */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <MapPin className="h-5 w-5 mr-2 text-green-600" />
            Plot Status Distribution
          </h3>
        </div>
        <div className="card-content">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart 
              data={[
                { status: 'Available', count: stats.availablePlots, fill: '#10b981' },
                { status: 'Tokened', count: stats.tokenedPlots, fill: '#f97316' },
                { status: 'PartPayment', count: stats.partPaymentPlots, fill: '#3b82f6' },
                { status: 'Booked', count: stats.bookedPlots, fill: '#f59e0b' },
                { status: 'Sold', count: stats.soldPlots, fill: '#ef4444' }
              ]}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="status" tick={{ fontSize: 12 }} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar 
                dataKey="count" 
                name="Number of Plots" 
                cursor="pointer"
                onClick={(data) => {
                  if (data && data.status) {
                    const status = data.status;
                    if (status === 'Available') handleShowAvailablePlots();
                    else if (status === 'Tokened') handleShowTokenedPlots();
                    else if (status === 'PartPayment') handleShowPartPaymentPlots();
                    else if (status === 'Booked') handleShowBookedPlots();
                    else if (status === 'Sold') handleShowSoldPlots();
                  }
                }}
              >
                {[
                  { status: 'Available', count: stats.availablePlots, fill: '#10b981' },
                  { status: 'Tokened', count: stats.tokenedPlots, fill: '#f97316' },
                  { status: 'PartPayment', count: stats.partPaymentPlots, fill: '#3b82f6' },
                  { status: 'Booked', count: stats.bookedPlots, fill: '#f59e0b' },
                  { status: 'Sold', count: stats.soldPlots, fill: '#ef4444' }
                ].map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} style={{ cursor: 'pointer' }} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="text-xs text-center text-gray-500 mt-2">Click on chart bars to view plots</p>
        </div>
      </div>

      {/* Site-wise Statistics */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900">Site-wise Performance</h3>
        </div>
        <div className="card-content">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Site Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Plots
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Available
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Booked
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sold
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Revenue
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stats.siteWiseStats.map((site, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {site.siteName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {site.totalPlots}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                      {site.availablePlots}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-600">
                      {site.bookedPlots}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                      {site.soldPlots}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(site.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Associate Performance */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900">Associate Performance</h3>
        </div>
        <div className="card-content">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Associate Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Receipts
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Approved
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Conversion Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Revenue
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stats.associatePerformance.map((associate, index) => (
                  <tr 
                    key={index}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => handleShowAssociateReceipts(associate.name)}
                    title={`Click to view all receipts by ${associate.name}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {associate.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {associate.totalReceipts}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                      {associate.approvedReceipts}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
                      {associate.conversionRate}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(associate.totalRevenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Receipts Detail Modal */}
      <Modal
        isOpen={showReceiptsModal}
        onClose={() => setShowReceiptsModal(false)}
        title={modalTitle}
        size="xl"
        zIndex={60}
      >
        {loadingReceipts ? (
          <div className="flex justify-center items-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : filteredReceipts.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Activity className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">No receipts found</p>
            <p className="text-sm mt-1">Try adjusting the date range</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Enhanced Filters */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="flex items-center gap-2 mb-3">
                <Filter className="h-4 w-4 text-gray-600" />
                <h4 className="text-sm font-semibold text-gray-700">Filters</h4>
              </div>
              
              {/* Row 1: Text Filters */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                <input
                  type="text"
                  placeholder="Customer Name"
                  value={modalFilters.customerName}
                  onChange={(e) => setModalFilters(prev => ({ ...prev, customerName: e.target.value }))}
                  className="input text-sm"
                />
                <input
                  type="text"
                  placeholder="Reference Name"
                  value={modalFilters.referenceName}
                  onChange={(e) => setModalFilters(prev => ({ ...prev, referenceName: e.target.value }))}
                  className="input text-sm"
                />
                <input
                  type="text"
                  placeholder="Site Name"
                  value={modalFilters.siteName}
                  onChange={(e) => setModalFilters(prev => ({ ...prev, siteName: e.target.value }))}
                  className="input text-sm"
                />
                <input
                  type="text"
                  placeholder="Plot Number"
                  value={modalFilters.plotNumber}
                  onChange={(e) => setModalFilters(prev => ({ ...prev, plotNumber: e.target.value }))}
                  className="input text-sm"
                />
              </div>

              {/* Row 2: Dropdown Filters */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                <select
                  value={modalFilters.status}
                  onChange={(e) => setModalFilters(prev => ({ ...prev, status: e.target.value }))}
                  className="input text-sm"
                >
                  <option value="">All Status</option>
                  <option value="Pending">Pending</option>
                  <option value="Approved">Approved</option>
                  <option value="Converted">Converted</option>
                  <option value="Expired">Expired</option>
                  <option value="Cancelled">Cancelled</option>
                  <option value="Rejected">Rejected</option>
                </select>
                <select
                  value={modalFilters.receiptType}
                  onChange={(e) => setModalFilters(prev => ({ ...prev, receiptType: e.target.value }))}
                  className="input text-sm"
                >
                  <option value="">All Types</option>
                  <option value="token">Token</option>
                  <option value="partpayment">Part Payment</option>
                  <option value="booking">Booking</option>
                  <option value="noc">NOC</option>
                </select>
                <select
                  value={modalFilters.paymentType}
                  onChange={(e) => setModalFilters(prev => ({ ...prev, paymentType: e.target.value }))}
                  className="input text-sm"
                >
                  <option value="">All Payment Types</option>
                  <option value="cash">Cash</option>
                  <option value="cheque">Cheque</option>
                  <option value="rtgs">RTGS/NEFT/UPI</option>
                </select>
              </div>

              {/* Row 3: Date Filters */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">From Date</label>
                  <input
                    type="date"
                    value={modalFilters.fromDate}
                    onChange={(e) => setModalFilters(prev => ({ ...prev, fromDate: e.target.value }))}
                    className="input text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">To Date</label>
                  <input
                    type="date"
                    value={modalFilters.toDate}
                    onChange={(e) => setModalFilters(prev => ({ ...prev, toDate: e.target.value }))}
                    className="input text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Token Expiry From</label>
                  <input
                    type="date"
                    value={modalFilters.tokenExpiryFrom}
                    onChange={(e) => setModalFilters(prev => ({ ...prev, tokenExpiryFrom: e.target.value }))}
                    className="input text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Token Expiry To</label>
                  <input
                    type="date"
                    value={modalFilters.tokenExpiryTo}
                    onChange={(e) => setModalFilters(prev => ({ ...prev, tokenExpiryTo: e.target.value }))}
                    className="input text-sm"
                  />
                </div>
              </div>

              {/* Row 4: Amount Filters */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  type="number"
                  placeholder="Minimum Amount"
                  value={modalFilters.minAmount}
                  onChange={(e) => setModalFilters(prev => ({ ...prev, minAmount: e.target.value }))}
                  className="input text-sm"
                />
                <input
                  type="number"
                  placeholder="Maximum Amount"
                  value={modalFilters.maxAmount}
                  onChange={(e) => setModalFilters(prev => ({ ...prev, maxAmount: e.target.value }))}
                  className="input text-sm"
                />
              </div>

              {/* Clear Filters Button */}
              {Object.values(modalFilters).some(value => value !== "") && (
                <button
                  onClick={() => setModalFilters({
                    customerName: "",
                    referenceName: "",
                    siteName: "",
                    plotNumber: "",
                    status: "",
                    receiptType: "",
                    paymentType: "",
                    fromDate: "",
                    toDate: "",
                    tokenExpiryFrom: "",
                    tokenExpiryTo: "",
                    minAmount: "",
                    maxAmount: ""
                  })}
                  className="mt-3 text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  Clear Filters
                </button>
              )}
            </div>

            {/* Summary and Export */}
            <div className="flex flex-wrap justify-between items-center gap-3">
              <div className="flex flex-col gap-1">
                <p className="text-sm text-gray-600">
                  Showing {displayedReceipts.length} of {filteredReceipts.length} receipt{filteredReceipts.length !== 1 ? 's' : ''}
                </p>
                <p className="text-sm font-semibold text-gray-900">
                  Total: {formatCurrency(displayedReceipts.reduce((sum, r) => sum + (r.totalAmount || r.amount || 0), 0))}
                </p>
              </div>
              <button
                onClick={handleExportModalCSV}
                className="btn btn-secondary flex items-center gap-2 text-sm"
                disabled={displayedReceipts.length === 0}
              >
                <Download className="h-4 w-4" />
                Export CSV
              </button>
            </div>

            {/* Table */}
            <div className="max-h-96 overflow-y-auto overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap" style={{ minWidth: '140px' }}>Receipt No</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap" style={{ minWidth: '150px' }}>Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap" style={{ minWidth: '200px' }}>Plot</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap" style={{ minWidth: '120px' }}>Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap" style={{ minWidth: '220px' }}>Payment</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap" style={{ minWidth: '100px' }}>Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap" style={{ minWidth: '120px' }}>Date</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase whitespace-nowrap" style={{ minWidth: '80px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {displayedReceipts.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="px-6 py-8 text-center text-sm text-gray-500">
                        No receipts match the current filters
                      </td>
                    </tr>
                  ) : (
                    displayedReceipts.map((receipt) => (
                      <tr 
                        key={receipt.id} 
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => handleViewReceipt(receipt)}
                        title="Click to view receipt details"
                      >
                        <td className="px-6 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">{receipt.receiptNo}</td>
                        <td className="px-6 py-3 text-sm text-gray-600">{receipt.fromName}</td>
                        <td className="px-6 py-3 text-sm text-gray-600">{receipt.siteName} - {receipt.plotVillaNo}</td>
                        <td className="px-6 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">{formatCurrency(receipt.totalAmount || receipt.amount)}</td>
                        <td className="px-6 py-3 text-sm text-gray-600">
                          <div className="flex flex-col gap-1">
                            {receipt.cashChecked && (
                              <span className="whitespace-nowrap">💵 Cash</span>
                            )}
                            {receipt.chequeChecked && (
                              <span className="whitespace-nowrap">📄 Cheque {receipt.chequeNo ? `(${receipt.chequeNo})` : ''}</span>
                            )}
                            {receipt.rtgsChecked && (
                              <span className="whitespace-nowrap">🏦 UPI {receipt.rtgsNeft ? `(${receipt.rtgsNeft})` : ''}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-3">
                          <span className={`badge ${getStatusBadgeClass(receipt.status)} whitespace-nowrap`}>
                            {receipt.status}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-600 whitespace-nowrap">{formatDate(receipt.createdAt || receipt.date)}</td>
                        <td className="px-6 py-3 text-center">
                          <Eye className="h-4 w-4 mx-auto text-blue-600" />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>

      {/* Receipt Detail Modal */}
      <Modal
        isOpen={showReceiptDetailModal}
        onClose={() => setShowReceiptDetailModal(false)}
        title="Receipt Details"
        size="lg"
        zIndex={70}
      >
        {selectedReceipt && (
          <div className="space-y-6">
            {/* Print Button */}
            <div className="flex justify-end">
              <button
                onClick={handlePrintReceipt}
                className="btn-primary flex items-center gap-2"
              >
                <Printer className="h-4 w-4" />
                Print Receipt
              </button>
            </div>

            {/* Receipt Header */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{selectedReceipt.receiptNo}</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    <span className={`badge ${getStatusBadgeClass(selectedReceipt.status)}`}>
                      {selectedReceipt.status}
                    </span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Receipt Type</p>
                  <p className="text-sm font-semibold text-gray-900">{selectedReceipt.receiptType}</p>
                </div>
              </div>
            </div>

            {/* Customer Information */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                <Users className="h-4 w-4 mr-2" />
                Customer Information
              </h4>
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                <div>
                  <p className="text-xs text-gray-500">Name</p>
                  <p className="text-sm font-medium text-gray-900">{selectedReceipt.fromName || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Mobile</p>
                  <p className="text-sm font-medium text-gray-900">{selectedReceipt.mobile || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Email</p>
                  <p className="text-sm font-medium text-gray-900">{selectedReceipt.email || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Address</p>
                  <p className="text-sm font-medium text-gray-900">{selectedReceipt.address || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Plot Information */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                <MapPin className="h-4 w-4 mr-2" />
                Plot Information
              </h4>
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                <div>
                  <p className="text-xs text-gray-500">Site Name</p>
                  <p className="text-sm font-medium text-gray-900">{selectedReceipt.siteName || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Plot/Villa No</p>
                  <p className="text-sm font-medium text-gray-900">{selectedReceipt.plotVillaNo || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Payment Information */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                <DollarSign className="h-4 w-4 mr-2" />
                Payment Information
              </h4>
              <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Amount</p>
                    <p className="text-sm font-medium text-gray-900">{formatCurrency(selectedReceipt.amount || 0)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Total Amount</p>
                    <p className="text-lg font-bold text-green-600">{formatCurrency(selectedReceipt.totalAmount || 0)}</p>
                  </div>
                </div>
                
                <div className="border-t pt-3">
                  <p className="text-xs text-gray-500 mb-2">Payment Methods</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedReceipt.cashChecked && (
                      <span className="badge bg-green-100 text-green-800">💵 Cash</span>
                    )}
                    {selectedReceipt.chequeChecked && (
                      <span className="badge bg-blue-100 text-blue-800">📄 Cheque</span>
                    )}
                    {selectedReceipt.rtgsChecked && (
                      <span className="badge bg-purple-100 text-purple-800">🏦 RTGS/NEFT/UPI</span>
                    )}
                    {!selectedReceipt.cashChecked && !selectedReceipt.chequeChecked && !selectedReceipt.rtgsChecked && (
                      <span className="text-sm text-gray-500">No payment method specified</span>
                    )}
                  </div>
                </div>

                {selectedReceipt.chequeChecked && (
                  <div className="border-t pt-3">
                    <p className="text-xs text-gray-500 mb-2">Cheque Details</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-gray-400">Cheque No</p>
                        <p className="text-sm text-gray-900">{selectedReceipt.chequeNo || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Bank Name</p>
                        <p className="text-sm text-gray-900">{selectedReceipt.bankName || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Cheque Date</p>
                        <p className="text-sm text-gray-900">{selectedReceipt.paymentDate ? formatDate(selectedReceipt.paymentDate) : 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                )}

                {selectedReceipt.rtgsChecked && (
                  <div className="border-t pt-3">
                    <p className="text-xs text-gray-500 mb-2">RTGS/NEFT/UPI Details</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-gray-400">Transaction No</p>
                        <p className="text-sm text-gray-900">{selectedReceipt.rtgsNeft || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Bank Name</p>
                        <p className="text-sm text-gray-900">{selectedReceipt.rtgsBankName || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Payment Date</p>
                        <p className="text-sm text-gray-900">{selectedReceipt.paymentDate ? formatDate(selectedReceipt.paymentDate) : 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Additional Information */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Additional Information</h4>
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                <div>
                  <p className="text-xs text-gray-500">Reference Name</p>
                  <p className="text-sm font-medium text-gray-900">{selectedReceipt.referenceName || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Created By</p>
                  <p className="text-sm font-medium text-gray-900">{selectedReceipt.createdByName || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Date</p>
                  <p className="text-sm font-medium text-gray-900">{formatDate(selectedReceipt.createdAt || selectedReceipt.date)}</p>
                </div>
                {selectedReceipt.tokenExpiryDate && (
                  <div>
                    <p className="text-xs text-gray-500">Token Expiry Date</p>
                    <p className="text-sm font-medium text-gray-900">{formatDate(selectedReceipt.tokenExpiryDate)}</p>
                  </div>
                )}
              </div>
            </div>

            {selectedReceipt.remarks && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Remarks</h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-900">{selectedReceipt.remarks}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Print Receipt Modal */}
      <PrintReceipt
        receipt={selectedReceipt}
        isOpen={showPrintModal}
        zIndex={80}
        onClose={() => {
          setShowPrintModal(false);
          // Return to receipts modal if it was open (for plot receipts), otherwise to receipt detail modal
          if (selectedPlot) {
            setShowReceiptsModal(true);
          } else {
            setShowReceiptDetailModal(true);
          }
        }}
      />

      {/* Plots Modal */}
      <Modal
        isOpen={showPlotsModal}
        onClose={() => setShowPlotsModal(false)}
        title={modalTitle}
        size="xl"
        zIndex={50}
      >
        {loadingPlots ? (
          <div className="flex justify-center items-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : filteredPlots.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <MapPin className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">No plots found</p>
            <p className="text-sm mt-1">No plots match this status</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Enhanced Plot Filters */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="flex items-center gap-2 mb-3">
                <Filter className="h-4 w-4 text-gray-600" />
                <h4 className="text-sm font-semibold text-gray-700">Filters</h4>
              </div>
              
              {/* Row 1: Basic Filters */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                <input
                  type="text"
                  placeholder="Site Name"
                  value={plotModalFilters.siteName}
                  onChange={(e) => setPlotModalFilters(prev => ({ ...prev, siteName: e.target.value }))}
                  className="input text-sm"
                />
                <input
                  type="text"
                  placeholder="Plot Number"
                  value={plotModalFilters.plotNumber}
                  onChange={(e) => setPlotModalFilters(prev => ({ ...prev, plotNumber: e.target.value }))}
                  className="input text-sm"
                />
                <input
                  type="text"
                  placeholder="Plot Size"
                  value={plotModalFilters.plotSize}
                  onChange={(e) => setPlotModalFilters(prev => ({ ...prev, plotSize: e.target.value }))}
                  className="input text-sm"
                />
                <input
                  type="text"
                  placeholder="Block"
                  value={plotModalFilters.block}
                  onChange={(e) => setPlotModalFilters(prev => ({ ...prev, block: e.target.value }))}
                  className="input text-sm"
                />
              </div>

              {/* Row 2: Status and Facing */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <select
                  value={plotModalFilters.status}
                  onChange={(e) => setPlotModalFilters(prev => ({ ...prev, status: e.target.value }))}
                  className="input text-sm"
                >
                  <option value="">All Status</option>
                  <option value="Available">Available</option>
                  <option value="Tokened">Tokened</option>
                  <option value="PartPayment">Part Payment</option>
                  <option value="Booked">Booked</option>
                  <option value="Sold">Sold</option>
                </select>
                <input
                  type="text"
                  placeholder="Facing (North, South, East, West)"
                  value={plotModalFilters.facing}
                  onChange={(e) => setPlotModalFilters(prev => ({ ...prev, facing: e.target.value }))}
                  className="input text-sm"
                />
              </div>

              {/* Row 3: Price Range */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  type="number"
                  placeholder="Minimum Price"
                  value={plotModalFilters.minPrice}
                  onChange={(e) => setPlotModalFilters(prev => ({ ...prev, minPrice: e.target.value }))}
                  className="input text-sm"
                />
                <input
                  type="number"
                  placeholder="Maximum Price"
                  value={plotModalFilters.maxPrice}
                  onChange={(e) => setPlotModalFilters(prev => ({ ...prev, maxPrice: e.target.value }))}
                  className="input text-sm"
                />
              </div>

              {/* Clear Filters Button */}
              {Object.values(plotModalFilters).some(value => value !== "") && (
                <button
                  onClick={() => setPlotModalFilters({
                    siteName: "",
                    plotNumber: "",
                    plotSize: "",
                    status: "",
                    minPrice: "",
                    maxPrice: "",
                    facing: "",
                    block: ""
                  })}
                  className="mt-3 text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  Clear Filters
                </button>
              )}
            </div>

            {/* Summary and Export */}
            <div className="flex flex-wrap justify-between items-center gap-3">
              <p className="text-sm text-gray-600">
                Showing {displayedPlots.length} of {filteredPlots.length} plot{filteredPlots.length !== 1 ? 's' : ''}
              </p>
              <button
                onClick={handleExportPlotsCSV}
                className="btn btn-secondary flex items-center gap-2 text-sm"
                disabled={displayedPlots.length === 0}
              >
                <Download className="h-4 w-4" />
                Export CSV
              </button>
            </div>

            {/* Table */}
            <div className="max-h-96 overflow-y-auto overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap" style={{ minWidth: '140px' }}>Site Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap" style={{ minWidth: '100px' }}>Plot No</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap" style={{ minWidth: '100px' }}>Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap" style={{ minWidth: '120px' }}>Total Price</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap" style={{ minWidth: '120px' }}>Received Amt</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap" style={{ minWidth: '110px' }}>Basic Rate</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap" style={{ minWidth: '110px' }}>Plot Size</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase whitespace-nowrap" style={{ minWidth: '80px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {displayedPlots.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="px-4 py-8 text-center text-sm text-gray-500">
                        No plots match the current filters
                      </td>
                    </tr>
                  ) : (
                    displayedPlots.map((plot) => (
                      <tr 
                        key={plot.id} 
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => handleViewPlotDetails(plot)}
                        title="Click to view plot details"
                      >
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{plot.siteName}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{plot.plotNumber}</td>
                        <td className="px-4 py-3">
                          <span className={`badge ${
                            plot.status === 'Available' ? 'bg-green-100 text-green-800' :
                            plot.status === 'Tokened' ? 'bg-orange-100 text-orange-800' :
                            plot.status === 'PartPayment' ? 'bg-blue-100 text-blue-800' :
                            plot.status === 'Booked' ? 'bg-yellow-100 text-yellow-800' :
                            plot.status === 'Sold' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          } whitespace-nowrap`}>
                            {plot.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">{plot.totalPrice ? formatCurrency(plot.totalPrice) : 'N/A'}</td>
                        <td className="px-4 py-3 text-sm font-medium text-green-600 whitespace-nowrap">{plot.receivedAmount ? formatCurrency(plot.receivedAmount) : '₹0'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{plot.basicRate ? formatCurrency(plot.basicRate) : 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{plot.plotSize || 'N/A'}</td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewPlotReceipts(plot);
                              }}
                              className="text-green-600 hover:text-green-800 transition-colors"
                              title="View Receipts"
                            >
                              <FileText className="h-4 w-4" />
                            </button>
                            <Eye className="h-4 w-4 text-blue-600" />
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>

      {/* Plot Details Modal */}
      <Modal
        isOpen={showPlotDetailsModal}
        onClose={() => {
          setShowPlotDetailsModal(false);
          setSelectedPlot(null);
        }}
        title="Plot Information"
        size="lg"
        zIndex={60}
      >
        {selectedPlot && (
          <div className="space-y-6">
            {/* Header with Site and Plot Number */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{selectedPlot.siteName}</h3>
                  <p className="text-lg text-gray-700 mt-1">Plot No: {selectedPlot.plotNumber}</p>
                </div>
                <span className={`badge text-lg px-4 py-2 ${
                  selectedPlot.status === 'Available' ? 'bg-green-100 text-green-800' :
                  selectedPlot.status === 'Tokened' ? 'bg-orange-100 text-orange-800' :
                  selectedPlot.status === 'PartPayment' ? 'bg-blue-100 text-blue-800' :
                  selectedPlot.status === 'Booked' ? 'bg-yellow-100 text-yellow-800' :
                  selectedPlot.status === 'Sold' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {selectedPlot.status}
                </span>
              </div>
            </div>

            {/* Financial Summary */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                <DollarSign className="h-4 w-4 mr-2" />
                Financial Summary
              </h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Total Price</p>
                  <p className="text-xl font-bold text-gray-900">{formatCurrency(selectedPlot.totalPrice || 0)}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Received Amount</p>
                  <p className="text-xl font-bold text-green-600">{formatCurrency(selectedPlot.receivedAmount || 0)}</p>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Balance</p>
                  <p className="text-xl font-bold text-red-600">{formatCurrency((selectedPlot.totalPrice || 0) - (selectedPlot.receivedAmount || 0))}</p>
                </div>
              </div>
            </div>

            {/* Plot Details */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                <MapPin className="h-4 w-4 mr-2" />
                Plot Details
              </h4>
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                <div>
                  <p className="text-xs text-gray-500">Block</p>
                  <p className="text-sm font-medium text-gray-900">{selectedPlot.block || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Plot Size</p>
                  <p className="text-sm font-medium text-gray-900">{selectedPlot.plotSize || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Area</p>
                  <p className="text-sm font-medium text-gray-900">{selectedPlot.area ? `${selectedPlot.area} sq ft` : 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Dimensions</p>
                  <p className="text-sm font-medium text-gray-900">
                    {selectedPlot.length && selectedPlot.width ? `${selectedPlot.length} × ${selectedPlot.width}` : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Basic Rate</p>
                  <p className="text-sm font-medium text-gray-900">{selectedPlot.basicRate ? formatCurrency(selectedPlot.basicRate) : 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Facing</p>
                  <p className="text-sm font-medium text-gray-900">{selectedPlot.facing || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Road</p>
                  <p className="text-sm font-medium text-gray-900">{selectedPlot.road || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">PLC Applicable</p>
                  <p className="text-sm font-medium text-gray-900">{selectedPlot.plcApplicable ? 'Yes' : 'No'}</p>
                </div>
                {selectedPlot.plcApplicable && (
                  <div>
                    <p className="text-xs text-gray-500">Type of PLC</p>
                    <p className="text-sm font-medium text-gray-900">{selectedPlot.typeofPLC || 'N/A'}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-500">Gata Khesra No</p>
                  <p className="text-sm font-medium text-gray-900">{selectedPlot.gataKhesraNo || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Registered Company</p>
                  <p className="text-sm font-medium text-gray-900">{selectedPlot.registeredCompany || 'N/A'}</p>
                </div>
              </div>
            </div>

            {selectedPlot.description && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Description</h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-900">{selectedPlot.description}</p>
                </div>
              </div>
            )}

            {/* Action Button */}
            <div className="flex justify-end pt-4 border-t">
              <button
                onClick={() => {
                  handleViewPlotReceipts(selectedPlot);
                  setShowPlotDetailsModal(false);
                }}
                className="btn btn-primary flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                View Receipts
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Analytics;