import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { X, Save, RotateCcw } from "lucide-react";
import { receiptsAPI, plotsAPI } from "../../utils/api";
import { isAdmin } from "../../utils/auth";
import { numberToWords } from "../../utils/numberToWords";
import { calculateTokenExpiry } from "../../utils/dateUtils";
import LoadingSpinner from "../UI/LoadingSpinner";
import toast from "react-hot-toast";

const EditReceiptForm = ({ isOpen, onClose, onSuccess, receiptId }) => {
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(false);
  const [amountInWords, setAmountInWords] = useState("");
  const [customBasicRate, setCustomBasicRate] = useState("");
  const [isRateModified, setIsRateModified] = useState(false);
  const [isDateManuallyChanged, setIsDateManuallyChanged] = useState(false);
  const [originalReceiptDate, setOriginalReceiptDate] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch,
    setValue,
  } = useForm();

  const watchedAmount = watch("amount");
  const watchedDate = watch("date");
  const watchedPLC = watch("plc");
  const watchedEDC = watch("edc");

  useEffect(() => {
    if (isOpen && receiptId) {
      fetchReceipt();
    }
  }, [isOpen, receiptId]);

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

  // Auto-update expiry date only when date is manually changed (not on form load)
  useEffect(() => {
    if (
      watchedDate &&
      receipt?.receiptType === "token" &&
      isDateManuallyChanged &&
      originalReceiptDate
    ) {
      // Only recalculate if the date has actually changed from the original
      const originalDateString = originalReceiptDate.split("T")[0];
      if (watchedDate !== originalDateString) {
        const { expiryDateString } = calculateTokenExpiry(watchedDate);
        setValue("tokenExpiryDate", expiryDateString);
      }
    }
  }, [
    watchedDate,
    setValue,
    receipt,
    isDateManuallyChanged,
    originalReceiptDate,
  ]);

  const fetchReceipt = async () => {
    try {
      setLoading(true);
      const response = await receiptsAPI.getReceipt(receiptId);
      const receiptData = response.data;
      setReceipt(receiptData);

      // Populate form with receipt data
      const formData = {
        fromName: receiptData.fromName,
        mobile: receiptData.mobile,
        address: receiptData.address,
        relationType: receiptData.relationType,
        relationName: receiptData.relationName,
        panNumber: receiptData.panNumber,
        aadharNumber: receiptData.aadharNumber,
        companyName: receiptData.companyName,
        referenceName: receiptData.referenceName,
        amount: receiptData.amount,
        plc: receiptData.plc || "",
        edc: receiptData.edc || "",
        other: receiptData.other,
        cashChecked: receiptData.cashChecked,
        chequeChecked: receiptData.chequeChecked,
        rtgsChecked: receiptData.rtgsChecked,
        chequeNo: receiptData.chequeNo,
        rtgsNeft: receiptData.rtgsNeft,
        paymentDate: receiptData.paymentDate
          ? receiptData.paymentDate.split("T")[0]
          : "",
        date: receiptData.date.split("T")[0],
        associateRemarks: receiptData.associateRemarks || "",
      };

      // Only add tokenExpiryDate for token receipts
      if (receiptData.receiptType === "token") {
        formData.tokenExpiryDate = receiptData.tokenExpiryDate
          ? receiptData.tokenExpiryDate.split("T")[0]
          : "";
      }

      reset(formData);

      setCustomBasicRate(receiptData.basicRate.toString());

      // Store original date and reset manual change flag
      setOriginalReceiptDate(receiptData.date);
      setIsDateManuallyChanged(false);
    } catch (error) {
      console.error("Error fetching receipt:", error);
      toast.error("Failed to fetch receipt details");
    } finally {
      setLoading(false);
    }
  };

  const handleBasicRateChange = (value) => {
    setCustomBasicRate(value);
    if (receipt) {
      setIsRateModified(parseFloat(value) !== receipt.basicRate);
    }
  };

  const resetBasicRate = () => {
    if (receipt) {
      setCustomBasicRate(receipt.basicRate.toString());
      setIsRateModified(false);
    }
  };

  const onSubmit = async (data) => {
    try {
      setLoading(true);

      const updateData = {
        ...data,
        ...(isRateModified &&
          isAdmin() && {
            customBasicRate: parseFloat(customBasicRate),
          }),
      };

      // Remove tokenExpiryDate for booking receipts
      if (receipt?.receiptType === "booking") {
        delete updateData.tokenExpiryDate;
      }

      // Convert empty date strings to null to avoid JSON parsing errors
      if (updateData.paymentDate === "") {
        updateData.paymentDate = null;
      }
      if (updateData.date === "") {
        updateData.date = null;
      }
      if (updateData.tokenExpiryDate === "") {
        updateData.tokenExpiryDate = null;
      }

      // Convert empty PLC/EDC to null to avoid JSON parsing errors
      if (updateData.plc === "" || updateData.plc === null || updateData.plc === undefined) {
        updateData.plc = null;
      } else {
        updateData.plc = parseFloat(updateData.plc);
      }
      
      if (updateData.edc === "" || updateData.edc === null || updateData.edc === undefined) {
        updateData.edc = null;
      } else {
        updateData.edc = parseFloat(updateData.edc);
      }

      const response = await receiptsAPI.updateReceipt(receiptId, updateData);

      toast.success("Receipt updated successfully");
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error("Error updating receipt:", error);

      let errorMessage = "Failed to update receipt";
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
    reset();
    setReceipt(null);
    setAmountInWords("");
    setCustomBasicRate("");
    setIsRateModified(false);
    setIsDateManuallyChanged(false);
    setOriginalReceiptDate(null);
    onClose();
  };

  const handleAddFiles = (receiptId) => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.accept = ".jpg,.jpeg,.png,.pdf,.doc,.docx";

    input.onchange = async (event) => {
      const files = Array.from(event.target.files);

      if (files.length === 0) return;

      // Validate file count and size
      if (files.length > 5) {
        toast.error("Maximum 5 files allowed");
        return;
      }

      for (const file of files) {
        if (file.size > 10 * 1024 * 1024) {
          toast.error(
            `File "${file.name}" is too large. Maximum size is 10MB.`
          );
          return;
        }
      }

      try {
        const formData = new FormData();
        files.forEach((file) => {
          formData.append("files", file);
        });

        await receiptsAPI.uploadFilesToReceipt(receiptId, formData);
        toast.success("Files uploaded successfully");

        // Refresh the receipt data
        await fetchReceipt();
      } catch (error) {
        console.error("Error uploading files:", error);
        console.error("Error response:", error.response?.data);
        console.error("Error status:", error.response?.status);

        let errorMessage = "Failed to upload files";
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

    input.click();
  };

  const handleDeleteFile = async (receiptId, fileIndex) => {
    if (!confirm("Are you sure you want to delete this file?")) {
      return;
    }

    try {
      await receiptsAPI.deleteFileFromReceipt(receiptId, fileIndex);
      toast.success("File deleted successfully");

      // Refresh the receipt data
      await fetchReceipt();
    } catch (error) {
      console.error("Error deleting file:", error);
      console.error("Error response:", error.response?.data);
      console.error("Error status:", error.response?.status);

      let errorMessage = "Failed to delete file";
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
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("File downloaded successfully");
    } catch (error) {
      console.error("Error downloading file:", error);
      toast.error("Failed to download file");
    }
  };

  if (!isOpen) return null;

  if (loading && !receipt) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
          <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle w-full max-w-2xl">
            <div className="flex items-center justify-center p-8">
              <LoadingSpinner size="lg" />
              <span className="ml-3 text-lg">Loading receipt details...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!receipt) return null;

  // Check edit permissions based on user role and receipt status
  const canEdit =
    receipt.status === "Pending" ||
    (receipt.status === "Approved" && isAdmin()) ||
    (receipt.status === "Expired" && isAdmin());

  if (!canEdit) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
          <div
            className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
            onClick={handleClose}
          />
          <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle w-full max-w-md">
            <div className="p-6 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <X className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Cannot Edit Receipt
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                {receipt.status === "Approved"
                  ? "Only admins can edit approved receipts."
                  : `Receipts with status "${receipt.status}" cannot be edited.`}
              </p>
              <button onClick={handleClose} className="btn-primary">
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={handleClose}
        />

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle w-full max-w-2xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                Edit Receipt
              </h3>
              <div className="mt-1 flex items-center space-x-2">
                <span className="text-sm text-gray-500">Receipt No:</span>
                <span className="text-lg font-bold text-primary-600 bg-primary-50 px-3 py-1 rounded">
                  {receipt.receiptNo}
                </span>
                <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                  {receipt.status}
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

          {/* Warning Banner for Approved Receipts */}
          {receipt.status === "Approved" && (
            <div className="bg-orange-50 border-l-4 border-orange-400 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-orange-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-orange-700">
                    <strong>Warning:</strong> You are editing an approved
                    receipt. Changes will be immediately applied and may affect
                    plot calculations and reports.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
            {/* Admin: Change Receipt Status */}
            {isAdmin() && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-md font-medium text-gray-900 mb-3 flex items-center">
                  <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full mr-2">
                    Admin
                  </span>
                  Change Receipt Status
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Current Status
                    </label>
                    <input
                      type="text"
                      value={receipt.status}
                      className="input bg-gray-100"
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Change Status To
                    </label>
                    <select
                      {...register("status")}
                      className="input"
                      defaultValue={receipt.status}
                    >
                      <option value="Pending">Pending</option>
                      <option value="Approved">Approved</option>
                      <option value="Rejected">Rejected</option>
                      <option value="Expired">Expired</option>
                      <option value="Converted">Converted</option>
                      <option value="Transferred">Transferred</option>
                      <option value="Cancelled">Cancelled</option>
                      <option value="Refunded">Refunded</option>
                    </select>
                  </div>
                </div>
                <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded p-3">
                  <p className="text-xs text-gray-700 mb-2">
                    <strong>📝 Status Guide:</strong>
                  </p>
                  <ul className="text-xs text-gray-600 space-y-1.5 ml-4 list-disc">
                    <li>
                      <strong className="text-purple-700">Transferred:</strong> Customer moved to different plot.
                      <div className="mt-0.5 text-red-600 font-semibold">
                        → Plot will be set to "Available"
                      </div>
                      <div className="mt-0.5 text-gray-500">
                        → Receipt excluded from all revenue calculations
                      </div>
                      <div className="mt-0.5 text-green-600">
                        → Plot becomes available for new customers
                      </div>
                    </li>
                    <li>
                      <strong className="text-red-700">Cancelled:</strong> Transaction cancelled by customer/admin.
                      <div className="mt-0.5 text-red-600 font-semibold">
                        → Plot will be set to "Available"
                      </div>
                      <div className="mt-0.5 text-gray-500">
                        → Receipt excluded from all revenue calculations
                      </div>
                      <div className="mt-0.5 text-green-600">
                        → Plot becomes available for new customers
                      </div>
                    </li>
                    <li>
                      <strong className="text-orange-700">Expired:</strong> Token validity ended.
                      <div className="mt-0.5 text-red-600 font-semibold">
                        → Plot will be set to "Available"
                      </div>
                      <div className="mt-0.5 text-green-600">
                        → Plot becomes available for new customers
                      </div>
                    </li>
                    <li><strong>Converted:</strong> Token converted to booking. Plot status updated accordingly.</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Customer Information */}
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center">
                <span className="bg-primary-100 text-primary-800 text-xs font-medium px-2.5 py-0.5 rounded-full mr-2">
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
                        value: /^[6-9]\d{9}$/,
                        message: "Enter a valid 10-digit mobile number",
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

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company Name
                  </label>
                  <input
                    {...register("companyName")}
                    type="text"
                    className="input"
                    placeholder="Enter company name"
                  />
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
              </div>
            </div>

            {/* Plot Information */}
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center">
                <span className="bg-primary-100 text-primary-800 text-xs font-medium px-2.5 py-0.5 rounded-full mr-2">
                  2
                </span>
                Plot Information (Read-only)
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Site Name
                  </label>
                  <input
                    type="text"
                    value={receipt.siteName}
                    className="input bg-gray-50 border-gray-300"
                    readOnly
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Plot Number
                  </label>
                  <input
                    type="text"
                    value={receipt.plotVillaNo}
                    className="input bg-gray-50 border-gray-300"
                    readOnly
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Plot Size
                  </label>
                  <input
                    type="text"
                    value={receipt.plotSize}
                    className="input bg-gray-50 border-gray-300"
                    readOnly
                  />
                </div>

                {/* Basic Rate - Editable for Admin */}
                <div className="md:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Basic Rate (per sq yard)
                    {isAdmin() ? (
                      <span className="text-xs text-blue-600 ml-2">
                        (Editable)
                      </span>
                    ) : (
                      <span className="text-xs text-gray-500 ml-2">
                        (Read-only)
                      </span>
                    )}
                  </label>

                  {isAdmin() ? (
                    <div className="flex space-x-2">
                      <input
                        type="number"
                        value={customBasicRate}
                        onChange={(e) => handleBasicRateChange(e.target.value)}
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
                          className="px-3 py-2 text-xs bg-gray-100 text-gray-600 rounded border hover:bg-gray-200 flex items-center"
                          title="Reset to original rate"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={`₹${receipt.basicRate.toLocaleString()}`}
                      className="input bg-gray-50 border-gray-300"
                      readOnly
                    />
                  )}

                  {isRateModified && isAdmin() && (
                    <p className="mt-1 text-xs text-orange-600">
                      Rate modified from original ₹
                      {receipt.basicRate.toLocaleString()}
                    </p>
                  )}
                </div>

                {/* Plot Value Calculation */}
                <div className="md:col-span-3">
                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                    <h6 className="font-medium text-blue-900 mb-2">
                      Plot Value
                    </h6>
                    <div className="text-sm text-blue-800 space-y-1">
                      <div className="flex justify-between">
                        <span>Size:</span>
                        <span>{receipt.plotSize}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Rate:</span>
                        <span className={isRateModified ? "text-orange-600 font-medium" : ""}>
                          ₹{(isRateModified ? parseFloat(customBasicRate) : receipt.basicRate).toLocaleString()}/sq yard
                          {isRateModified && <span className="text-xs ml-1">(Modified)</span>}
                        </span>
                      </div>
                      <div className="flex justify-between border-t border-blue-300 pt-1">
                        <span>Base Price:</span>
                        <span>
                          ₹{(parseFloat(receipt.plotSize?.replace(/[^\d.]/g, "") || "0") * 
                            (isRateModified ? parseFloat(customBasicRate) : receipt.basicRate)).toLocaleString()}
                        </span>
                      </div>
                      {watchedPLC && parseFloat(watchedPLC) > 0 && (
                        <>
                          <div className="flex justify-between text-green-700">
                            <span>+ PLC ({watchedPLC}%):</span>
                            <span>
                              ₹{((parseFloat(receipt.plotSize?.replace(/[^\d.]/g, "") || "0") * 
                                (isRateModified ? parseFloat(customBasicRate) : receipt.basicRate) * 
                                parseFloat(watchedPLC)) / 100).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between font-bold text-lg border-t-2 border-blue-400 pt-1 text-blue-900">
                            <span>New Total Price:</span>
                            <span>
                              ₹{(parseFloat(receipt.plotSize?.replace(/[^\d.]/g, "") || "0") * 
                                (isRateModified ? parseFloat(customBasicRate) : receipt.basicRate) * 
                                (1 + parseFloat(watchedPLC) / 100)).toLocaleString()}
                            </span>
                          </div>
                        </>
                      )}
                      {(!watchedPLC || parseFloat(watchedPLC) <= 0) && (
                        <div className="flex justify-between font-semibold border-t border-blue-300 pt-1">
                          <span>Total Value:</span>
                          <span className={isRateModified ? "text-orange-600" : ""}>
                            ₹{(parseFloat(receipt.plotSize?.replace(/[^\d.]/g, "") || "0") * 
                              (isRateModified ? parseFloat(customBasicRate) : receipt.basicRate)).toLocaleString()}
                            {isRateModified && <span className="text-xs ml-1">(With modified rate)</span>}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Information */}
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center">
                <span className="bg-primary-100 text-primary-800 text-xs font-medium px-2.5 py-0.5 rounded-full mr-2">
                  3
                </span>
                Payment Information
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount *
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
                    Other Charges
                  </label>
                  <input
                    {...register("other")}
                    type="text"
                    className="input"
                    placeholder="Enter other charges"
                  />
                </div>

                {/* Amount in Words */}
                {amountInWords && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Amount in Words
                    </label>
                    <div className="p-3 bg-gray-50 border border-gray-300 rounded-md text-sm text-gray-700">
                      {amountInWords}
                    </div>
                  </div>
                )}

                {/* Payment Methods */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Payment Method *
                  </label>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-4">
                      <label className="flex items-center">
                        <input
                          {...register("cashChecked")}
                          type="checkbox"
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">Cash</span>
                      </label>
                    </div>

                    <div className="flex items-center space-x-4">
                      <label className="flex items-center">
                        <input
                          {...register("chequeChecked")}
                          type="checkbox"
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          Cheque
                        </span>
                      </label>
                      <input
                        {...register("chequeNo")}
                        type="text"
                        className="input flex-1"
                        placeholder="Cheque number"
                      />
                    </div>

                    <div className="flex items-center space-x-4">
                      <label className="flex items-center">
                        <input
                          {...register("rtgsChecked")}
                          type="checkbox"
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          NEFT/IMPS/RTGS
                        </span>
                      </label>
                      <input
                        {...register("rtgsNeft")}
                        type="text"
                        className="input flex-1"
                        placeholder="Transaction reference"
                      />
                    </div>
                  </div>
                </div>

                {/* Payment Date */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Date
                  </label>
                  <input
                    {...register("paymentDate")}
                    type="date"
                    className="input"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Enter the actual payment date (e.g., cheque date,
                    transaction date)
                  </p>
                </div>

                {/* Dates */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Receipt Date *
                  </label>
                  <input
                    {...register("date", {
                      required: "Receipt date is required",
                    })}
                    type="date"
                    className="input"
                    onChange={(e) => {
                      // Mark that date has been manually changed
                      setIsDateManuallyChanged(true);
                      // Let react-hook-form handle the value update
                      setValue("date", e.target.value);
                    }}
                  />
                  {errors.date && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.date.message}
                    </p>
                  )}
                </div>

                {receipt.receiptType === "token" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Token Expiry Date
                    </label>
                    <input
                      {...register("tokenExpiryDate")}
                      type="date"
                      className="input"
                    />
                    <p className="mt-1 text-xs text-blue-600">
                      ℹ️ Token expires at the end of this date at 12:00 AM
                      (midnight)
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Associate Remarks */}
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center">
                <span className="bg-primary-100 text-primary-800 text-xs font-medium px-2.5 py-0.5 rounded-full mr-2">
                  4
                </span>
                Associate Remarks
              </h4>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Remarks / Notes (Optional)
                </label>
                <textarea
                  {...register("associateRemarks")}
                  rows={3}
                  className="input"
                  placeholder="Add any special notes for admin review..."
                />
                <p className="mt-1 text-xs text-gray-500">
                  These remarks are for internal reference and admin review
                </p>
              </div>
            </div>

            {/* File Management Section */}
            {receipt && (
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-md font-medium text-gray-900">
                    📎 File Attachments
                  </h4>
                  <button
                    type="button"
                    onClick={() => handleAddFiles(receipt.id)}
                    className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
                  >
                    + Add Files
                  </button>
                </div>

                {receipt.attachedFiles && receipt.attachedFiles.length > 0 ? (
                  <div className="space-y-2">
                    {receipt.attachedFiles.map((fileUrl, index) => {
                      const fileName =
                        fileUrl.split("/").pop() || `File ${index + 1}`;
                      const fileExtension = fileName
                        .split(".")
                        .pop()
                        ?.toLowerCase();
                      const isImage = ["jpg", "jpeg", "png", "gif"].includes(
                        fileExtension
                      );
                      const isPdf = fileExtension === "pdf";

                      return (
                        <div
                          key={index}
                          className="flex items-center justify-between bg-white p-2 rounded border"
                        >
                          <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
                              {isImage ? (
                                <span className="text-xs text-green-600">
                                  IMG
                                </span>
                              ) : isPdf ? (
                                <span className="text-xs text-red-600">
                                  PDF
                                </span>
                              ) : (
                                <span className="text-xs text-gray-600">
                                  DOC
                                </span>
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
                              type="button"
                              onClick={() =>
                                handleDownloadFile(fileUrl, fileName)
                              }
                              className="text-blue-600 hover:text-blue-800 text-xs px-2 py-1 bg-blue-50 rounded"
                            >
                              View
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleDownloadFile(fileUrl, fileName)
                              }
                              className="text-green-600 hover:text-green-800 text-xs px-2 py-1 bg-green-50 rounded"
                            >
                              Download
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleDeleteFile(receipt.id, index)
                              }
                              className="text-red-600 hover:text-red-800 text-xs px-2 py-1 bg-red-50 rounded"
                            >
                              Delete
                            </button>
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
            )}

            {/* Action Buttons */}
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
                disabled={isSubmitting}
                className="btn-primary flex items-center"
              >
                {isSubmitting ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Update Receipt
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditReceiptForm;
