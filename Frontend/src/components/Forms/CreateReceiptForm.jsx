import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { X } from "lucide-react";
import { receiptsAPI, plotsAPI } from "../../utils/api";
import { isAdmin } from "../../utils/auth";
import { numberToWords } from "../../utils/numberToWords";
import { calculateTokenExpiry } from "../../utils/dateUtils";
import LoadingSpinner from "../UI/LoadingSpinner";
import toast from "react-hot-toast";

const CreateReceiptForm = ({ isOpen, onClose, onSuccess }) => {
  const [availablePlots, setAvailablePlots] = useState([]);
  const [selectedPlot, setSelectedPlot] = useState(null);
  const [loading, setLoading] = useState(false);
  const [amountInWords, setAmountInWords] = useState("");
  const [plotSearch, setPlotSearch] = useState("");
  const [showPlotDropdown, setShowPlotDropdown] = useState(false);
  const [nextReceiptNo, setNextReceiptNo] = useState("0001");
  const [customBasicRate, setCustomBasicRate] = useState("");
  const [isRateModified, setIsRateModified] = useState(false);
  const [updatePlotRate, setUpdatePlotRate] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch,
    setValue,
  } = useForm({
    defaultValues: {
      receiptType: "token",
      date: new Date().toISOString().split("T")[0], // Today's date
      tokenExpiryDate: calculateTokenExpiry(new Date()).expiryDateString, // 7 days from today
      panNumber: "",
      aadharNumber: "",
      companyName: "",
    },
  });

  const watchedSiteName = watch("siteName");
  const watchedPlotVillaNo = watch("plotVillaNo");
  const watchedAmount = watch("amount");
  const watchedDate = watch("date");
  const watchedChequeChecked = watch("chequeChecked");
  const watchedRtgsChecked = watch("rtgsChecked");
  const watchedPLC = watch("plc");
  const watchedEDC = watch("edc");

  useEffect(() => {
    if (isOpen) {
      fetchAvailablePlots();
      fetchNextReceiptNumber();
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest(".plot-search-container")) {
        setShowPlotDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (watchedSiteName && watchedPlotVillaNo) {
      const plot = availablePlots.find(
        (p) =>
          p.siteName === watchedSiteName && p.plotNumber === watchedPlotVillaNo
      );
      setSelectedPlot(plot);
      if (plot) {
        setPlotSearch(plot.plotNumber);

        // Reset custom rate when plot changes
        setCustomBasicRate(plot.basicRate.toString());
        setIsRateModified(false);

        // Auto-fill company name from plot's registered company
        if (plot.registeredCompany) {
          setValue("companyName", plot.registeredCompany);
        }

        // Fetch previous receipt data to auto-fill company name
        fetchPreviousReceiptData(watchedSiteName, watchedPlotVillaNo);
      }
    }
  }, [watchedSiteName, watchedPlotVillaNo, availablePlots, setValue]);

  // Auto-calculate amount in words
  useEffect(() => {
    if (watchedAmount && !isNaN(watchedAmount) && watchedAmount > 0) {
      const words = numberToWords(parseFloat(watchedAmount));
      setAmountInWords(words);
    } else {
      setAmountInWords("");
    }
  }, [watchedAmount]);

  // Auto-populate "Other Charges" field based on PLC and EDC
  useEffect(() => {
    const parts = [];
    
    // Add PLC if provided
    if (watchedPLC && parseFloat(watchedPLC) > 0) {
      parts.push(`PLC ${watchedPLC}%`);
    }
    
    // Add EDC if provided
    if (watchedEDC && parseFloat(watchedEDC) > 0) {
      const edcValue = parseFloat(watchedEDC);
      // Check if EDC looks like a percentage (typically < 100) or an amount
      if (edcValue < 100 && edcValue % 1 !== 0) {
        // Likely a percentage
        parts.push(`EDC ${edcValue}%`);
      } else if (edcValue < 100) {
        // Could be percentage or small amount, show as percentage
        parts.push(`EDC ${edcValue}%`);
      } else {
        // Likely a fixed amount
        parts.push(`EDC ${edcValue}`);
      }
    }
    
    // Update the "other" field with formatted string
    if (parts.length > 0) {
      setValue("other", parts.join(", "));
    } else {
      setValue("other", "");
    }
  }, [watchedPLC, watchedEDC, setValue]);

  // Auto-update expiry date when date changes - expires after 7 days at midnight
  useEffect(() => {
    if (watchedDate) {
      const { expiryDateString } = calculateTokenExpiry(watchedDate);
      setValue("tokenExpiryDate", expiryDateString);
    }
  }, [watchedDate, setValue]);

  const fetchAvailablePlots = async () => {
    try {
      const response = await plotsAPI.getAvailablePlots();
      setAvailablePlots(response.data);
    } catch (error) {
      console.error("Error fetching plots:", error);
      toast.error("Failed to fetch available plots");
    }
  };

  const fetchPreviousReceiptData = async (siteName, plotNumber) => {
    try {
      // Fetch receipts for this specific plot
      const response = await receiptsAPI.getReceipts({
        siteName: siteName,
        plotNumber: plotNumber,
        page: 1,
        pageSize: 1,
        sortBy: "createdAt",
        sortOrder: "desc"
      });

      if (response.data && response.data.data && response.data.data.length > 0) {
        const previousReceipt = response.data.data[0];
        
        // Auto-fill company name if it exists in previous receipt
        if (previousReceipt.companyName && !watch("companyName")) {
          setValue("companyName", previousReceipt.companyName);
        }
      }
    } catch (error) {
      console.error("Error fetching previous receipt data:", error);
      // Don't show error toast as this is a background operation
    }
  };

  const fetchNextReceiptNumber = async () => {
    try {
      const currentFY = getCurrentFinancialYear();

      // Get the latest receipt to determine next number
      const response = await receiptsAPI.getReceipts({
        pageSize: 100, // Get more receipts to find the latest for current FY
        sortBy: "createdAt",
        sortOrder: "desc",
      });
      const receipts = response.data.data || [];

      // Filter receipts for current financial year
      const currentFYReceipts = receipts.filter(
        (receipt) =>
          receipt.receiptNo && receipt.receiptNo.includes(`/${currentFY}/`)
      );

      if (currentFYReceipts.length > 0) {
        // Extract the sequential number from the latest receipt
        const lastReceiptNo = currentFYReceipts[0].receiptNo;
        const parts = lastReceiptNo.split("/");
        const lastNumber = parseInt(parts[parts.length - 1]) || 0;
        const nextNumber = (lastNumber + 1).toString().padStart(4, "0");
        setNextReceiptNo(`BR/${currentFY}/${nextNumber}`);
      } else {
        // First receipt for this financial year
        setNextReceiptNo(`BR/${currentFY}/0001`);
      }
    } catch (error) {
      console.error("Error fetching next receipt number:", error);
      const currentFY = getCurrentFinancialYear();
      setNextReceiptNo(`BR/${currentFY}/0001`); // Default for current FY
    }
  };

  const handlePlotSearch = (searchValue) => {
    setPlotSearch(searchValue);
    setShowPlotDropdown(true);

    // Clear any previously selected plot when searching
    if (searchValue !== selectedPlot?.plotNumber) {
      setSelectedPlot(null);
      setCustomBasicRate("");
      setIsRateModified(false);
      setValue("companyName", "");
    }

    // Don't auto-select plots, just show the dropdown for manual selection
    // Users should manually click on the plot they want
  };

  const selectPlot = (plot) => {
    setSelectedPlot(plot);
    setPlotSearch(plot.plotNumber);
    setValue("plotVillaNo", plot.plotNumber);

    // Reset custom rate when plot changes
    setCustomBasicRate(plot.basicRate.toString());
    setIsRateModified(false);

    // Auto-fill company name from plot's registered company
    if (plot.registeredCompany) {
      setValue("companyName", plot.registeredCompany);
    }

    setShowPlotDropdown(false);
  };

  const handleSiteChange = (siteName) => {
    // Reset plot selection when site changes
    setSelectedPlot(null);
    setPlotSearch("");
    setValue("plotVillaNo", "");
    setValue("companyName", ""); // Clear company name when site changes
    setValue("siteName", siteName);

    // Reset custom rate
    setCustomBasicRate("");
    setIsRateModified(false);
  };

  const handleBasicRateChange = (value) => {
    setCustomBasicRate(value);
    if (selectedPlot) {
      setIsRateModified(parseFloat(value) !== selectedPlot.basicRate);
    }
  };

  const resetBasicRate = () => {
    if (selectedPlot) {
      setCustomBasicRate(selectedPlot.basicRate.toString());
      setIsRateModified(false);
    }
  };

  const getCurrentBasicRate = () => {
    return customBasicRate
      ? parseFloat(customBasicRate)
      : selectedPlot?.basicRate || 0;
  };

  const getCurrentFinancialYear = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // JavaScript months are 0-indexed

    // Financial year starts from April (month 4)
    if (currentMonth >= 4) {
      // April to March of next year
      const startYear = currentYear.toString().slice(-2);
      const endYear = (currentYear + 1).toString().slice(-2);
      return `${startYear}-${endYear}`;
    } else {
      // January to March of current year (belongs to previous financial year)
      const startYear = (currentYear - 1).toString().slice(-2);
      const endYear = currentYear.toString().slice(-2);
      return `${startYear}-${endYear}`;
    }
  };

  const handleFileChange = (event) => {
    const files = Array.from(event.target.files);

    // Validate file count
    if (selectedFiles.length + files.length > 5) {
      toast.error("Maximum 5 files allowed per receipt");
      return;
    }

    // Validate file size and type
    const validFiles = [];
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    for (const file of files) {
      // Check file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`File "${file.name}" is too large. Maximum size is 10MB.`);
        continue;
      }

      // Check file type
      if (!allowedTypes.includes(file.type)) {
        toast.error(
          `File "${file.name}" has unsupported format. Please use JPG, PNG, PDF, DOC, or DOCX.`
        );
        continue;
      }

      validFiles.push(file);
    }

    setSelectedFiles((prev) => [...prev, ...validFiles]);

    // Clear the input
    event.target.value = "";
  };

  const removeFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const matchesPlotSearch = (plotNumber, searchValue) => {
    if (searchValue === "") return true;

    const searchLower = searchValue.toLowerCase();
    const plotNumberLower = plotNumber.toLowerCase();

    // Direct match (starts with)
    if (plotNumberLower.startsWith(searchLower)) {
      return true;
    }

    // Flexible matching for zero-padded numbers
    // Extract letter part and number part from search (e.g., "A24" -> ["A", "24"])
    const searchMatch = searchLower.match(/^([a-z]+)(\d+)$/);
    if (searchMatch) {
      const [, searchLetter, searchNumber] = searchMatch;

      // Extract letter and number from plot number (e.g., "A024" -> ["A", "024"])
      const plotMatch = plotNumberLower.match(/^([a-z]+)(\d+)$/);
      if (plotMatch) {
        const [, plotLetter, plotNumber] = plotMatch;

        // Check if letters match and numbers match (ignoring leading zeros)
        // parseInt("024", 10) === parseInt("24", 10) = true
        return (
          plotLetter === searchLetter &&
          parseInt(plotNumber, 10) === parseInt(searchNumber, 10)
        );
      }
    }

    return false;
  };

  const updatePlotBasicRate = async (plotId, newRate) => {
    try {
      await plotsAPI.updatePlot(plotId, { basicRate: newRate });
      toast.success("Plot basic rate updated successfully");

      // Update the selected plot in state
      setSelectedPlot((prev) =>
        prev ? { ...prev, basicRate: newRate } : null
      );

      // Update the available plots list
      setAvailablePlots((prev) =>
        prev.map((plot) =>
          plot.id === plotId ? { ...plot, basicRate: newRate } : plot
        )
      );

      setIsRateModified(false);
      setCustomBasicRate(newRate.toString());
    } catch (error) {
      console.error("Error updating plot basic rate:", error);
      toast.error("Failed to update plot basic rate");
    }
  };

  const onSubmit = async (data) => {
    try {
      setLoading(true);

      // Update plot basic rate if admin chose to do so
      if (isRateModified && isAdmin() && updatePlotRate && selectedPlot) {
        await updatePlotBasicRate(selectedPlot.id, parseFloat(customBasicRate));
      }

      // Include custom basic rate if modified by admin
      const submitData = {
        ...data,
        receiptNo: nextReceiptNo, // Full receipt number with BR/FY/sequence format
        ...(isRateModified &&
          isAdmin() && {
            customBasicRate: parseFloat(customBasicRate),
            originalBasicRate: selectedPlot?.basicRate,
            rateModifiedBy: "admin",
            plotRateUpdated: updatePlotRate,
          }),
      };

      // Convert empty PLC/EDC to null to avoid JSON parsing errors
      if (submitData.plc === "" || submitData.plc === null || submitData.plc === undefined) {
        submitData.plc = null;
      } else {
        submitData.plc = parseFloat(submitData.plc);
      }
      
      if (submitData.edc === "" || submitData.edc === null || submitData.edc === undefined) {
        submitData.edc = null;
      } else {
        submitData.edc = parseFloat(submitData.edc);
      }

      let response;

      // Test basic form submission first
      if (selectedFiles.length > 0) {
        try {
          const testFormData = new FormData();
          testFormData.append("testField", "test value");
          if (selectedFiles.length > 0) {
            selectedFiles.forEach((file) => {
              testFormData.append("files", file);
            });
          }

          const testResponse = await receiptsAPI.testFormData(testFormData);
        } catch (testError) {
          toast.error("Basic form data test failed: " + testError.message);
          return;
        }
      }

      // Use different API endpoint based on whether files are attached
      if (selectedFiles.length > 0) {
        // Create FormData for file upload
        const formData = new FormData();

        // Append all form fields with proper type conversion
        Object.keys(submitData).forEach((key) => {
          const value = submitData[key];
          let finalValue;

          // Handle different value types
          if (value === null || value === undefined) {
            finalValue = ""; // Send empty string for null/undefined
          } else if (typeof value === "boolean") {
            finalValue = value.toString();
          } else if (typeof value === "number") {
            finalValue = value.toString();
          } else {
            finalValue = value.toString(); // Ensure it's a string
          }

          formData.append(key, finalValue);
        });

        // Append files
        selectedFiles.forEach((file) => {
          formData.append("files", file);
        });

        response = await receiptsAPI.createReceiptWithFiles(formData);
      } else {
        // Use regular API without files
        response = await receiptsAPI.createReceipt(submitData);
      }

      toast.success("Receipt created successfully");
      reset();
      setSelectedFiles([]); // Clear selected files
      fetchNextReceiptNumber(); // Refresh receipt number for next receipt
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error("Error creating receipt:", error);

      let errorMessage = "Failed to create receipt";
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data) {
        errorMessage =
          typeof error.response.data === "string"
            ? error.response.data
            : JSON.stringify(error.response.data);
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    reset({
      receiptType: "token",
      date: new Date().toISOString().split("T")[0],
      tokenExpiryDate: calculateTokenExpiry(new Date()).expiryDateString,
      panNumber: "",
      aadharNumber: "",
      companyName: "",
    });
    setSelectedPlot(null);
    setAmountInWords("");
    setPlotSearch("");
    setShowPlotDropdown(false);
    setSelectedFiles([]); // Clear selected files
    const currentFY = getCurrentFinancialYear();
    setNextReceiptNo(`BR/${currentFY}/0001`);
    setCustomBasicRate("");
    setIsRateModified(false);
    setUpdatePlotRate(false);
    onClose();
  };

  if (!isOpen) return null;

  const uniqueSites = [...new Set(availablePlots.map((p) => p.siteName))];
  const availablePlotsForSite = availablePlots.filter(
    (p) => p.siteName === watchedSiteName
  );

  // Add fallback sites if no plots loaded yet
  const allSites =
    uniqueSites.length > 0 ? uniqueSites : ["Hare Krishna Township Phase 2"];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          //onClick={handleClose}
        />

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle w-full max-w-2xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                Create Token Receipt
              </h3>
              <div className="mt-1 flex items-center space-x-2">
                <span className="text-sm text-gray-500">Receipt No:</span>
                <span className="text-lg font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded">
                  {nextReceiptNo}
                </span>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
            {/* Customer Information */}
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center">
                <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full mr-2">
                  1
                </span>
                Customer Information
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer Name *
                  </label>
                  <input
                    {...register("fromName", {
                      required: "Customer name is required",
                    })}
                    type="text"
                    className="input"
                    placeholder="Enter customer name"
                  />
                  {errors.fromName && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.fromName.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mobile Number
                  </label>
                  <input
                    {...register("mobile", {
                      pattern: {
                        value: /^$|^[6-9]\d{9}$/,
                        message:
                          "Enter a valid 10-digit mobile number or leave empty",
                      },
                    })}
                    type="tel"
                    className="input"
                    placeholder="Enter mobile number (optional)"
                  />
                  {errors.mobile && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.mobile.message}
                    </p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address *
                  </label>
                  <textarea
                    {...register("address", {
                      required: "Address is required",
                    })}
                    rows={3}
                    className="input"
                    placeholder="Enter complete address"
                  />
                  {errors.address && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.address.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Relation Type
                  </label>
                  <select {...register("relationType")} className="input">
                    <option value="S/O">S/O (Son of)</option>
                    <option value="D/O">D/O (Daughter of)</option>
                    <option value="W/O">W/O (Wife of)</option>
                    <option value="H/O">H/O (Husband of)</option>
                    <option value="H/O">C/O (Care of)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Relation Name
                  </label>
                  <input
                    {...register("relationName")}
                    type="text"
                    className="input"
                    placeholder="Enter relation name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    PAN Number
                  </label>
                  <input
                    {...register("panNumber")}
                    type="text"
                    className="input"
                    placeholder="Enter PAN number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Aadhar Number
                  </label>
                  <input
                    {...register("aadharNumber")}
                    type="text"
                    className="input"
                    placeholder="Enter Aadhar number"
                  />
                </div>
              </div>
            </div>

            {/* Plot Information */}
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center">
                <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full mr-2">
                  2
                </span>
                Plot Information
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Site Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Site Name *
                  </label>
                  <select
                    {...register("siteName", {
                      required: "Site name is required",
                    })}
                    onChange={(e) => handleSiteChange(e.target.value)}
                    className="input"
                  >
                    <option value="">Select Site</option>
                    {allSites.map((site) => (
                      <option key={site} value={site}>
                        {site}
                      </option>
                    ))}
                  </select>
                  {errors.siteName && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.siteName.message}
                    </p>
                  )}
                </div>

                {/* Plot Number with Search */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Plot Number *
                  </label>
                  <div className="relative plot-search-container">
                    <input
                      type="text"
                      {...register("plotVillaNo", {
                        required: "Plot number is required",
                      })}
                      value={plotSearch}
                      onChange={(e) => {
                        const value = e.target.value;
                        setPlotSearch(value);
                        // Don't set plotVillaNo until user actually selects a plot
                        handlePlotSearch(value);
                      }}
                      onFocus={() => setShowPlotDropdown(true)}
                      className="input"
                      placeholder={
                        watchedSiteName
                          ? `Search in ${watchedSiteName} (e.g., A001)`
                          : "Select site first"
                      }
                      disabled={!watchedSiteName}
                    />

                    {/* Search Results Dropdown */}
                    {showPlotDropdown &&
                      watchedSiteName &&
                      (plotSearch.length >= 1 || plotSearch === "") && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-80 overflow-y-auto">
                          {availablePlotsForSite
                            .filter((plot) =>
                              matchesPlotSearch(plot.plotNumber, plotSearch)
                            )

                            .map((plot) => (
                              <div
                                key={plot.id}
                                onClick={() => {
                                  setSelectedPlot(plot);
                                  setPlotSearch(plot.plotNumber);
                                  setValue("plotVillaNo", plot.plotNumber);

                                  // Reset custom rate when plot changes
                                  setCustomBasicRate(plot.basicRate.toString());
                                  setIsRateModified(false);

                                  // Auto-fill company name from plot's registered company
                                  if (plot.registeredCompany) {
                                    setValue(
                                      "companyName",
                                      plot.registeredCompany
                                    );
                                  }

                                  setShowPlotDropdown(false);
                                }}
                                className="px-4 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100"
                              >
                                <div className="font-medium text-gray-900">
                                  {plot.plotNumber}
                                </div>
                                <div className="text-sm text-gray-600">
                                  {plot.plotSize} • ₹
                                  {plot.basicRate.toLocaleString()}/sq yard
                                </div>
                              </div>
                            ))}
                          {availablePlotsForSite.filter((plot) =>
                            matchesPlotSearch(plot.plotNumber, plotSearch)
                          ).length === 0 &&
                            plotSearch !== "" && (
                              <div className="px-4 py-2 text-gray-500 text-sm">
                                No plots found starting with "{plotSearch}" in{" "}
                                {watchedSiteName}
                              </div>
                            )}
                          {plotSearch === "" &&
                            availablePlotsForSite.length > 0 && (
                              <div className="px-4 py-2 text-blue-600 text-sm border-b border-gray-100 font-medium">
                                {availablePlotsForSite.length} available plots
                                in {watchedSiteName} - click to select
                              </div>
                            )}
                        </div>
                      )}
                  </div>
                  {errors.plotVillaNo && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.plotVillaNo.message}
                    </p>
                  )}
                </div>

                {/* Company Name - Right after Plot Number */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company Name
                    {selectedPlot && selectedPlot.registeredCompany && (
                      <span className="text-xs text-green-600 ml-2 bg-green-100 px-2 py-0.5 rounded-full">
                        ✓ Auto-filled from plot
                      </span>
                    )}
                  </label>
                  <input
                    {...register("companyName")}
                    type="text"
                    className={`input ${
                      selectedPlot && selectedPlot.registeredCompany
                        ? "border-green-300 bg-green-50 focus:border-green-500 focus:ring-green-500"
                        : ""
                    }`}
                    placeholder="Enter company name or select a plot to auto-fill"
                  />
                  {selectedPlot && selectedPlot.registeredCompany && (
                    <p className="mt-1 text-xs text-green-600">
                      Automatically filled from plot's registered company. You
                      can edit if needed.
                    </p>
                  )}
                </div>

                {/* Plot Details - Auto-filled when plot is selected */}
                {selectedPlot && (
                  <>
                    {/* Plot Size - Auto-filled */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Plot Size
                      </label>
                      <input
                        type="text"
                        value={selectedPlot?.plotSize || ""}
                        className={`input ${
                          selectedPlot
                            ? "bg-green-50 border-green-300"
                            : "bg-gray-50"
                        }`}
                        readOnly
                        placeholder="Auto-filled"
                      />
                    </div>

                    {/* Basic Rate - Editable for Admin, Read-only for Associates */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Basic Rate (per sq yard)
                        {isAdmin() ? (
                          <span className="text-xs text-blue-600 ml-2">
                            (Editable)
                          </span>
                        ) : (
                          <span className="text-xs text-gray-500 ml-2">
                            (Auto-filled)
                          </span>
                        )}
                      </label>

                      {isAdmin() ? (
                        // Admin: Editable input with reset option
                        <div className="flex space-x-2">
                          <input
                            type="number"
                            value={customBasicRate}
                            onChange={(e) =>
                              handleBasicRateChange(e.target.value)
                            }
                            className={`input flex-1 ${
                              isRateModified
                                ? "bg-orange-50 border-orange-300 focus:border-orange-500 focus:ring-orange-500"
                                : "bg-blue-50 border-blue-300 focus:border-blue-500 focus:ring-blue-500"
                            }`}
                            placeholder="Enter basic rate"
                            step="0.01"
                            min="0"
                          />
                          {isRateModified && (
                            <button
                              type="button"
                              onClick={resetBasicRate}
                              className="px-3 py-2 text-xs bg-gray-100 text-gray-600 rounded border hover:bg-gray-200"
                              title="Reset to original rate"
                            >
                              Reset
                            </button>
                          )}
                        </div>
                      ) : (
                        // Associate: Read-only display
                        <input
                          type="text"
                          value={
                            selectedPlot
                              ? `₹${selectedPlot.basicRate.toLocaleString()}`
                              : ""
                          }
                          className="input bg-green-50 border-green-300"
                          readOnly
                          placeholder="Auto-filled from plot"
                        />
                      )}

                      {/* Admin-only rate information */}
                      {isAdmin() && (
                        <div className="mt-2 space-y-2">
                          <p className="text-xs text-gray-500">
                            Original: ₹{selectedPlot.basicRate.toLocaleString()}
                            /sq yard
                            {isRateModified && (
                              <span className="text-orange-600 ml-2 font-medium">
                                → Modified: ₹
                                {parseFloat(
                                  customBasicRate || 0
                                ).toLocaleString()}
                                /sq yard
                              </span>
                            )}
                          </p>

                          {isRateModified && (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                              <label className="flex items-start space-x-3">
                                <input
                                  type="checkbox"
                                  checked={updatePlotRate}
                                  onChange={(e) =>
                                    setUpdatePlotRate(e.target.checked)
                                  }
                                  className="mt-0.5 rounded border-yellow-300 text-yellow-600 focus:ring-yellow-500"
                                />
                                <div>
                                  <span className="text-sm font-medium text-yellow-900">
                                    Update plot's basic rate permanently
                                  </span>
                                  <p className="text-xs text-yellow-700 mt-1">
                                    This will change the basic rate for plot{" "}
                                    {selectedPlot.plotNumber} in the database.
                                    Future receipts for this plot will use the
                                    new rate (₹
                                    {parseFloat(
                                      customBasicRate || 0
                                    ).toLocaleString()}
                                    /sq yard).
                                  </p>
                                </div>
                              </label>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Plot Value Calculation */}
                    <div className="md:col-span-2">
                      <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                        <h6 className="font-medium text-blue-900 mb-2">
                          Plot Value
                        </h6>
                        <div className="text-sm text-blue-800 space-y-1">
                          <div className="flex justify-between">
                            <span>Size:</span>
                            <span>{selectedPlot.plotSize}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Rate:</span>
                            <span
                              className={
                                isRateModified
                                  ? "text-orange-600 font-medium"
                                  : ""
                              }
                            >
                              ₹{getCurrentBasicRate().toLocaleString()}/sq yard
                              {isRateModified && (
                                <span className="text-xs ml-1">(Modified)</span>
                              )}
                            </span>
                          </div>
                          <div className="flex justify-between border-t border-blue-300 pt-1">
                            <span>Base Price:</span>
                            <span>
                              ₹
                              {(
                                parseFloat(
                                  selectedPlot.plotSize?.replace(
                                    /[^\d.]/g,
                                    ""
                                  ) || "0"
                                ) * getCurrentBasicRate()
                              ).toLocaleString()}
                            </span>
                          </div>
                          {watchedPLC && parseFloat(watchedPLC) > 0 && (
                            <>
                              <div className="flex justify-between text-green-700">
                                <span>+ PLC ({watchedPLC}%):</span>
                                <span>
                                  ₹
                                  {(
                                    (parseFloat(
                                      selectedPlot.plotSize?.replace(
                                        /[^\d.]/g,
                                        ""
                                      ) || "0"
                                    ) *
                                      getCurrentBasicRate() *
                                      parseFloat(watchedPLC)) /
                                    100
                                  ).toLocaleString()}
                                </span>
                              </div>
                              <div className="flex justify-between font-bold text-lg border-t-2 border-blue-400 pt-1 text-blue-900">
                                <span>New Total Price:</span>
                                <span>
                                  ₹
                                  {(
                                    parseFloat(
                                      selectedPlot.plotSize?.replace(
                                        /[^\d.]/g,
                                        ""
                                      ) || "0"
                                    ) *
                                      getCurrentBasicRate() *
                                      (1 + parseFloat(watchedPLC) / 100)
                                  ).toLocaleString()}
                                </span>
                              </div>
                            </>
                          )}
                          {(!watchedPLC || parseFloat(watchedPLC) <= 0) && (
                            <div className="flex justify-between font-semibold border-t border-blue-300 pt-1">
                              <span>Total Value:</span>
                              <span
                                className={
                                  isRateModified ? "text-orange-600" : ""
                                }
                              >
                                ₹
                                {(
                                  parseFloat(
                                    selectedPlot.plotSize?.replace(
                                      /[^\d.]/g,
                                      ""
                                    ) || "0"
                                  ) * getCurrentBasicRate()
                                ).toLocaleString()}
                                {isRateModified && (
                                  <span className="text-xs ml-1">
                                    (With modified rate)
                                  </span>
                                )}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Payment Information */}
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center">
                <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full mr-2">
                  3
                </span>
                Payment Information
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Date Field */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Receipt Date *
                  </label>
                  <input
                    {...register("date", { required: "Date is required" })}
                    type="date"
                    className="input"
                  />
                  {errors.date && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.date.message}
                    </p>
                  )}
                </div>

                {/* Token Expiry Date - Auto calculated but editable */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Token Expiry Date *
                  </label>
                  <input
                    {...register("tokenExpiryDate", {
                      required: "Expiry date is required",
                    })}
                    type="date"
                    className="input bg-blue-50 border-blue-300"
                  />
                  {errors.tokenExpiryDate && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.tokenExpiryDate.message}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-blue-600">
                    ℹ️ Token expires at the end of this date at 12:00 AM
                    (midnight)
                  </p>
                </div>

                {/* Amount Field */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount (₹) *
                  </label>
                  <input
                    {...register("amount", {
                      required: "Amount is required",
                      min: {
                        value: 1,
                        message: "Amount must be greater than 0",
                      },
                    })}
                    type="number"
                    step="0.01"
                    className="input"
                    placeholder="Enter amount"
                  />
                  {errors.amount && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.amount.message}
                    </p>
                  )}
                </div>

                {/* PLC Field */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    PLC (%) <span className="text-gray-500 text-xs">(Preferential Location Charges - Enter % value)</span>
                  </label>
                  <input
                    {...register("plc", {
                      min: {
                        value: 0,
                        message: "PLC cannot be negative",
                      },
                    })}
                    type="number"
                    step="0.01"
                    className="input"
                    placeholder="Enter PLC percentage (e.g., 10 for 10%)"
                  />
                  {errors.plc && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.plc.message}
                    </p>
                  )}
                </div>

                {/* EDC Field */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    EDC (₹) <span className="text-gray-500 text-xs">(External Development Charges)</span>
                  </label>
                  <input
                    {...register("edc", {
                      min: {
                        value: 0,
                        message: "EDC cannot be negative",
                      },
                    })}
                    type="number"
                    step="0.01"
                    className="input"
                    placeholder="Enter EDC amount (optional)"
                  />
                  {errors.edc && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.edc.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Other Charges (Optional)
                  </label>
                  <input
                    {...register("other")}
                    type="text"
                    className="input"
                    placeholder="Enter other charges"
                  />
                </div>

                {/* Amount in Words - Auto calculated */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Received Sum of Rupees (In Words)
                  </label>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-green-800 font-medium text-sm">
                      {amountInWords || "Amount in words will appear here"}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reference Name
                  </label>
                  <input
                    {...register("referenceName")}
                    type="text"
                    className="input"
                    placeholder="Enter reference name"
                  />
                </div>

                {/* Payment Method Section */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Payment Method (Optional)
                  </label>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    {/* Payment Method Checkboxes */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <label className="flex items-center p-2 bg-white rounded border hover:bg-gray-50">
                        <input
                          {...register("cashChecked")}
                          type="checkbox"
                          className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                        />
                        <span className="ml-2 text-sm font-medium text-gray-700">
                          Cash
                        </span>
                      </label>
                      <label className="flex items-center p-2 bg-white rounded border hover:bg-gray-50">
                        <input
                          {...register("chequeChecked")}
                          type="checkbox"
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm font-medium text-gray-700">
                          Cheque
                        </span>
                      </label>
                      <label className="flex items-center p-2 bg-white rounded border hover:bg-gray-50">
                        <input
                          {...register("rtgsChecked")}
                          type="checkbox"
                          className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        />
                        <span className="ml-2 text-sm font-medium text-gray-700">
                          RTGS/NEFT/UPI
                        </span>
                      </label>
                    </div>

                    {/* Payment Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Cheque Number{" "}
                          {watchedChequeChecked && (
                            <span className="text-red-500">*</span>
                          )}
                        </label>
                        <input
                          {...register("chequeNo", {
                            required: watchedChequeChecked
                              ? "Cheque number is required when cheque payment is selected"
                              : false,
                          })}
                          type="text"
                          className={`input text-sm ${
                            watchedChequeChecked
                              ? "border-orange-300 bg-orange-50"
                              : ""
                          }`}
                          placeholder={
                            watchedChequeChecked
                              ? "Enter cheque number (required)"
                              : "Enter cheque number"
                          }
                        />
                        {errors.chequeNo && (
                          <p className="mt-1 text-xs text-red-600">
                            {errors.chequeNo.message}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          RTGS/NEFT/UPI Reference{" "}
                          {watchedRtgsChecked && (
                            <span className="text-red-500">*</span>
                          )}
                        </label>
                        <input
                          {...register("rtgsNeft", {
                            required: watchedRtgsChecked
                              ? "Transaction reference is required when RTGS/NEFT/UPI payment is selected"
                              : false,
                          })}
                          type="text"
                          className={`input text-sm ${
                            watchedRtgsChecked
                              ? "border-orange-300 bg-orange-50"
                              : ""
                          }`}
                          placeholder={
                            watchedRtgsChecked
                              ? "Enter transaction reference (required)"
                              : "Enter transaction reference"
                          }
                        />
                        {errors.rtgsNeft && (
                          <p className="mt-1 text-xs text-red-600">
                            {errors.rtgsNeft.message}
                          </p>
                        )}
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Payment Date
                        </label>
                        <input
                          {...register("paymentDate")}
                          type="date"
                          className="input text-sm"
                          placeholder="Enter payment date"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          Enter the actual payment date (e.g., cheque date, transaction date)
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Associate Remarks */}
                <div className="md:col-span-2">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <label className="block text-sm font-bold text-yellow-900 mb-2">
                      Associate Remarks (Optional)
                    </label>
                    <textarea
                      {...register("associateRemarks")}
                      rows={3}
                      className="input border-yellow-300 focus:border-yellow-500 focus:ring-yellow-500"
                      placeholder="Add any special notes for admin review..."
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* File Upload Section */}
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center">
                <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full mr-2">
                  4
                </span>
                File Attachments (Optional)
              </h4>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload Supporting Documents
                  </label>
                  <p className="text-xs text-gray-500 mb-3">
                    You can upload images, PDFs, or documents related to this
                    receipt (Max 5 files, 10MB each)
                  </p>
                  <input
                    type="file"
                    multiple
                    accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"
                    onChange={handleFileChange}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>

                {/* File Preview */}
                {selectedFiles.length > 0 && (
                  <div className="space-y-2">
                    <h6 className="text-sm font-medium text-gray-700">
                      Selected Files:
                    </h6>
                    {selectedFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between bg-white p-2 rounded border"
                      >
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                            {file.type.startsWith("image/") ? (
                              <span className="text-xs text-blue-600">IMG</span>
                            ) : file.type === "application/pdf" ? (
                              <span className="text-xs text-red-600">PDF</span>
                            ) : (
                              <span className="text-xs text-gray-600">DOC</span>
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 truncate max-w-xs">
                              {file.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="text-red-500 hover:text-red-700 p-1"
                          title="Remove file"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* File Upload Guidelines */}
                <div className="mt-3 text-xs text-gray-500">
                  <p>• Supported formats: JPG, PNG, PDF, DOC, DOCX</p>
                  <p>• Maximum file size: 10MB per file</p>
                  <p>• Maximum files: 5 files per receipt</p>
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={handleClose}
                className="btn-secondary"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={isSubmitting || loading}
              >
                {isSubmitting || loading ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Creating...
                  </>
                ) : (
                  "Create Receipt"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateReceiptForm;
