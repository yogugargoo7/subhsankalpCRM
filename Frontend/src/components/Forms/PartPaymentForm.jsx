import React, { useState, useEffect } from "react";
import { X, Calculator, Receipt } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { receiptsAPI } from "../../utils/api";
import { formatCurrency } from "../../utils/helpers";
import Modal from "../UI/Modal";
import LoadingSpinner from "../UI/LoadingSpinner";
import PrintReceipt from "../Receipt/PrintReceipt";
import toast from "react-hot-toast";

const PartPaymentForm = ({ isOpen, onClose, plot, onSuccess }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [createdReceipt, setCreatedReceipt] = useState(null);
  const [allReceipts, setAllReceipts] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [formData, setFormData] = useState({
    fromName: "",
    relationName: "",
    address: "",
    mobile: "",
    panNumber: "",
    aadharNumber: "",
    companyName: "",
    referenceName: "",
    amount: "",
    other: "",
    cashChecked: false,
    chequeChecked: false,
    rtgsChecked: false,
    chequeNo: "",
    rtgsNeft: "",
    paymentDate: "",
    adminRemarks: "",
  });

  // Fetch previous receipts when plot is selected
  useEffect(() => {
    if (plot && isOpen) {
      fetchPreviousReceipts();
    }
  }, [plot, isOpen]);

  const fetchPreviousReceipts = async () => {
    try {
      setLoading(true);
      const response = await receiptsAPI.getReceiptsByPlot(plot.id);
      const receipts = response.data || [];
      setAllReceipts(receipts);

      // Get the latest receipt for pre-filling form
      if (receipts.length > 0) {
        const latestReceipt = receipts[0];

        setFormData((prev) => ({
          ...prev,
          fromName: latestReceipt.fromName || "",
          relationName: latestReceipt.relationName || "",
          address: latestReceipt.address || "",
          mobile: latestReceipt.mobile || "",
          panNumber: latestReceipt.panNumber || "",
          aadharNumber: latestReceipt.aadharNumber || "",
          companyName: latestReceipt.companyName || "",
          referenceName: latestReceipt.referenceName || "",
          other: latestReceipt.other || "", // Auto-populate Other Charges from previous receipt
        }));
      }
    } catch (error) {
      console.error("Error fetching receipts:", error);
      toast.error("Failed to load customer information");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleFileChange = (event) => {
    const files = Array.from(event.target.files);

    if (selectedFiles.length + files.length > 5) {
      toast.error("Maximum 5 files allowed per receipt");
      return;
    }

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
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`File "${file.name}" is too large. Maximum size is 10MB.`);
        continue;
      }

      if (!allowedTypes.includes(file.type)) {
        toast.error(`File "${file.name}" has unsupported format.`);
        continue;
      }

      validFiles.push(file);
    }

    setSelectedFiles((prev) => [...prev, ...validFiles]);
    event.target.value = "";
  };

  const removeFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const calculateTotalReceived = () => {
    const currentAmount = parseFloat(formData.amount) || 0;
    const existingTotal = plot?.receivedAmount || plot?.ReceivedAmount || 0;
    return currentAmount + existingTotal;
  };

  const calculatePercentage = () => {
    const totalReceived = calculateTotalReceived();
    const totalPrice = plot?.totalPrice || 0;
    return totalPrice > 0 ? ((totalReceived / totalPrice) * 100).toFixed(1) : 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast.error("Please enter a valid payment amount");
      return;
    }

    if (formData.chequeChecked && !formData.chequeNo.trim()) {
      toast.error("Please enter cheque number");
      return;
    }

    if (formData.rtgsChecked && !formData.rtgsNeft.trim()) {
      toast.error("Please enter RTGS/NEFT/UPI details");
      return;
    }

    try {
      setLoading(true);

      const receiptData = {
        receiptType: "partpayment",
        fromName: formData.fromName || "",
        relationType: "S/O",
        relationName: formData.relationName || "",
        address: formData.address || "",
        mobile: formData.mobile || "",
        panNumber: formData.panNumber || "",
        aadharNumber: formData.aadharNumber || "",
        companyName: formData.companyName || "",
        referenceName: formData.referenceName || "",
        siteName: plot.siteName || "",
        plotVillaNo: plot.plotNumber || "",
        plotSize: plot.plotSize,
        basicRate: plot.basicRate,
        amount: parseFloat(formData.amount) || 0,
        other: formData.other || "",
        cashChecked: formData.cashChecked,
        chequeChecked: formData.chequeChecked,
        chequeNo: formData.chequeNo || "",
        rtgsChecked: formData.rtgsChecked,
        rtgsNeft: formData.rtgsNeft || "",
        paymentDate: formData.paymentDate || "",
        associateRemarks: "",
        adminRemarks: formData.adminRemarks || "",
        plotId: plot.id,
        status: "Approved",
      };

      let response = await receiptsAPI.createReceipt(receiptData);

      if (selectedFiles.length > 0) {
        try {
          const formDataFiles = new FormData();
          selectedFiles.forEach((file) => {
            formDataFiles.append("files", file);
          });

          await receiptsAPI.uploadFilesToReceipt(
            response.data.id,
            formDataFiles
          );
          const updatedResponse = await receiptsAPI.getReceipt(
            response.data.id
          );
          response = updatedResponse;
        } catch (fileError) {
          toast.error("Receipt created but file upload failed");
        }
      }

      const newReceipt = response.data;
      setCreatedReceipt(newReceipt);
      setShowPreview(true);

      toast.success("payment receipt created successfully!");

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      let errorMessage = "Failed to create part payment receipt";
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClosePreview = () => {
    setShowPreview(false);
    setCreatedReceipt(null);
    setSelectedFiles([]);
    onClose();
  };

  const handleClose = () => {
    setSelectedFiles([]);
    onClose();
  };

  if (!plot) return null;

  return (
    <>
      <Modal
        isOpen={isOpen && !showPreview}
        onClose={handleClose}
        title="Create Part Payment Receipt"
        size="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {loading && <LoadingSpinner />}

          {/* Plot Information */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h3 className="text-lg font-medium text-blue-900 mb-3">
              Plot Information
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-blue-700">Site:</span>
                <span className="ml-2 text-blue-900">{plot.siteName}</span>
              </div>
              <div>
                <span className="font-medium text-blue-700">Plot No:</span>
                <span className="ml-2 text-blue-900">{plot.plotNumber}</span>
              </div>
              <div>
                <span className="font-medium text-blue-700">Size:</span>
                <span className="ml-2 text-blue-900">{plot.plotSize}</span>
              </div>
              <div>
                <span className="font-medium text-blue-700">Total Price:</span>
                <span className="ml-2 text-blue-900 font-medium">
                  {formatCurrency(plot.totalPrice)}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Summary */}
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <h3 className="text-lg font-medium text-green-900 mb-3 flex items-center">
              <Calculator className="h-5 w-5 mr-2" />
              Payment Summary
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-green-700">
                  Previous Payments:
                </span>
                <span className="ml-2 text-green-900">
                  {formatCurrency(
                    calculateTotalReceived() -
                      (parseFloat(formData.amount) || 0)
                  )}
                </span>
                <div className="text-xs text-green-600 ml-2">
                  ({allReceipts.length} receipt
                  {allReceipts.length !== 1 ? "s" : ""})
                </div>
              </div>
              <div>
                <span className="font-medium text-green-700">
                  Current Payment:
                </span>
                <span className="ml-2 text-green-900 font-medium">
                  {formData.amount
                    ? formatCurrency(parseFloat(formData.amount))
                    : "₹0"}
                </span>
              </div>
              <div>
                <span className="font-medium text-green-700">
                  Total Received:
                </span>
                <span className="ml-2 text-green-900 font-bold">
                  {formatCurrency(calculateTotalReceived())}
                </span>
              </div>
              <div>
                <span className="font-medium text-green-700">Percentage:</span>
                <span
                  className={`ml-2 font-bold ${
                    parseFloat(calculatePercentage()) >= 30
                      ? "text-green-600"
                      : "text-orange-600"
                  }`}
                >
                  {calculatePercentage()}%
                  {parseFloat(calculatePercentage()) >= 30 && (
                    <span className="ml-1 text-xs">(✓ Ready for Booking)</span>
                  )}
                </span>
              </div>
            </div>

            {/* Receipt Breakdown */}
            {allReceipts.length > 0 && (
              <div className="mt-3 pt-3 border-t border-green-200">
                <div className="text-xs text-green-700 font-medium mb-2">
                  Payment History:
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {allReceipts.map((receipt) => (
                    <div
                      key={receipt.id}
                      className="flex justify-between text-xs"
                    >
                      <span className="text-green-600">
                        {receipt.receiptType === "token"
                          ? "🎫"
                          : receipt.receiptType === "partpayment"
                          ? "💰"
                          : "📄"}{" "}
                        {receipt.receiptNo}
                        <span className="ml-1 text-green-500">
                          ({receipt.status})
                        </span>
                      </span>
                      <span className="text-green-700 font-medium">
                        {formatCurrency(
                          receipt.totalAmount > 0
                            ? receipt.totalAmount
                            : receipt.amount
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Customer Information - Read-Only Display */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-3">
              Customer Information (Auto-filled)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">
                  Customer Name:
                </span>
                <span className="ml-2 text-gray-900">
                  {formData.fromName || "N/A"}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-700">
                  Relation Name:
                </span>
                <span className="ml-2 text-gray-900">
                  {formData.relationName || "N/A"}
                </span>
              </div>
              <div className="md:col-span-2">
                <span className="font-medium text-gray-700">Address:</span>
                <span className="ml-2 text-gray-900">
                  {formData.address || "N/A"}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Mobile:</span>
                <span className="ml-2 text-gray-900">
                  {formData.mobile || "N/A"}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-700">PAN:</span>
                <span className="ml-2 text-gray-900">
                  {formData.panNumber || "N/A"}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Aadhar:</span>
                <span className="ml-2 text-gray-900">
                  {formData.aadharNumber || "N/A"}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Company:</span>
                <span className="ml-2 text-gray-900">
                  {formData.companyName || "N/A"}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Reference:</span>
                <span className="ml-2 text-gray-900">
                  {formData.referenceName || "N/A"}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Details - Compact */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">
              Payment Details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Amount *
                </label>
                <input
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleInputChange}
                  className="input"
                  min="1"
                  step="0.01"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Other Charges <span className="text-gray-500 text-xs">(Auto-filled from previous receipt)</span>
                </label>
                <input
                  type="text"
                  name="other"
                  value={formData.other}
                  onChange={handleInputChange}
                  className="input"
                  placeholder="Other charges"
                />
              </div>
            </div>

            {/* Payment Methods - Compact */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Methods *
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="cashChecked"
                    checked={formData.cashChecked}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 text-sm text-gray-700">Cash</label>
                </div>
                <div>
                  <div className="flex items-center mb-1">
                    <input
                      type="checkbox"
                      name="chequeChecked"
                      checked={formData.chequeChecked}
                      onChange={handleInputChange}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 text-sm text-gray-700">Cheque</label>
                  </div>
                  {formData.chequeChecked && (
                    <input
                      type="text"
                      name="chequeNo"
                      value={formData.chequeNo}
                      onChange={handleInputChange}
                      className="input text-sm"
                      placeholder="Cheque Number"
                      required
                    />
                  )}
                </div>
                <div>
                  <div className="flex items-center mb-1">
                    <input
                      type="checkbox"
                      name="rtgsChecked"
                      checked={formData.rtgsChecked}
                      onChange={handleInputChange}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 text-sm text-gray-700">
                      RTGS/NEFT/UPI
                    </label>
                  </div>
                  {formData.rtgsChecked && (
                    <input
                      type="text"
                      name="rtgsNeft"
                      value={formData.rtgsNeft}
                      onChange={handleInputChange}
                      className="input text-sm"
                      placeholder="Transaction ID"
                      required
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Single Payment Date field */}
            {(formData.cashChecked || formData.chequeChecked || formData.rtgsChecked) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Date
                </label>
                <input
                  type="date"
                  name="paymentDate"
                  value={formData.paymentDate}
                  onChange={handleInputChange}
                  className="input"
                  placeholder="Enter payment date"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Enter the actual payment date (e.g., cheque date, transaction date)
                </p>
              </div>
            )}

            {/* File Attachments */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Attach Files (Optional)
              </label>
              <div className="space-y-2">
                <input
                  type="file"
                  onChange={handleFileChange}
                  multiple
                  accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"
                  className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-semibold
                    file:bg-primary-50 file:text-primary-700
                    hover:file:bg-primary-100
                    cursor-pointer"
                />
                <p className="text-xs text-gray-500">
                  Supported formats: JPG, PNG, PDF, DOC, DOCX (Max 5 files, 10MB each)
                </p>

                {/* Selected Files List */}
                {selectedFiles.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-sm font-medium text-gray-700">
                      Selected Files ({selectedFiles.length}/5):
                    </p>
                    {selectedFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200"
                      >
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-700">
                            📎 {file.name}
                          </span>
                          <span className="text-xs text-gray-500">
                            ({(file.size / 1024).toFixed(1)} KB)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Admin Remarks */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Admin Remarks
              </label>
              <textarea
                name="adminRemarks"
                value={formData.adminRemarks}
                onChange={handleInputChange}
                rows={2}
                className="input"
                placeholder="Any additional remarks"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-6 border-t">
            <button
              type="button"
              onClick={handleClose}
              className="btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary flex items-center"
              disabled={loading}
            >
              <Receipt className="h-4 w-4 mr-2" />
              {loading ? "Creating..." : "Create Payment Receipt"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Receipt Preview */}
      {showPreview && createdReceipt && (
        <PrintReceipt
          receipt={createdReceipt}
          isOpen={showPreview}
          onClose={handleClosePreview}
        />
      )}
    </>
  );
};

export default PartPaymentForm;
