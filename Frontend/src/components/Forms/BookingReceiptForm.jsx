import React, { useState, useEffect } from 'react';
import { X, Calculator, Receipt } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { receiptsAPI, plotsAPI } from '../../utils/api';
import { formatCurrency } from '../../utils/helpers';
import Modal from '../UI/Modal';
import LoadingSpinner from '../UI/LoadingSpinner';
import PrintReceipt from '../Receipt/PrintReceipt';
import toast from 'react-hot-toast';

const BookingReceiptForm = ({ isOpen, onClose, plot, onSuccess }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [createdReceipt, setCreatedReceipt] = useState(null);
  const [tokenReceipt, setTokenReceipt] = useState(null);
  const [allReceipts, setAllReceipts] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [formData, setFormData] = useState({
    fromName: '',
    relationName: '',
    address: '',
    mobile: '',
    panNumber: '',
    aadharNumber: '',
    companyName: '',
    referenceName: '',
    amount: '',
    other: '',
    cashChecked: false,
    chequeChecked: false,
    rtgsChecked: false,
    chequeNo: '',
    rtgsNeft: '',
    adminRemarks: ''
  });

  // Check if plot is actually a receipt (for preview mode)
  const isReceiptPreview = plot && plot.receiptNo;

  // Fetch token receipt data when plot is selected
  useEffect(() => {
    if (plot && isOpen && !isReceiptPreview) {
      fetchTokenReceipt();
    }
  }, [plot, isOpen, isReceiptPreview]);

  // If it's a receipt preview, just show it (after all hooks)
  if (isReceiptPreview) {
    return (
      <PrintReceipt 
        receipt={plot} 
        isOpen={isOpen} 
        onClose={() => {
          if (onSuccess) onSuccess();
          onClose();
        }} 
      />
    );
  }

  const fetchTokenReceipt = async () => {
    try {
      setLoading(true);
      // Get ALL receipts for this plot
      const response = await receiptsAPI.getReceiptsByPlot(plot.id);
      const receipts = response.data || [];
      setAllReceipts(receipts);
      
      // Get the latest token receipt for pre-filling form
      const tokenReceipts = receipts.filter(r => r.receiptType === 'token');
      
      if (tokenReceipts.length > 0) {
        const latestToken = tokenReceipts[0]; // Assuming sorted by date desc
        setTokenReceipt(latestToken);
        
        // Pre-fill form with token receipt data
        setFormData(prev => ({
          ...prev,
          fromName: latestToken.fromName || '',
          relationName: latestToken.relationName || '',
          address: latestToken.address || '',
          mobile: latestToken.mobile || '',
          panNumber: latestToken.panNumber || '',
          aadharNumber: latestToken.aadharNumber || '',
          companyName: latestToken.companyName || '',
          referenceName: latestToken.referenceName || '',
          // Don't pre-fill amount - admin will enter new payment amount
        }));
      }
    } catch (error) {
      console.error('Error fetching receipts:', error);
      toast.error('Failed to load customer information');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
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
      'image/jpeg', 'image/jpg', 'image/png', 
      'application/pdf', 
      'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    for (const file of files) {
      // Check file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`File "${file.name}" is too large. Maximum size is 10MB.`);
        continue;
      }
      
      // Check file type
      if (!allowedTypes.includes(file.type)) {
        toast.error(`File "${file.name}" has unsupported format. Please use JPG, PNG, PDF, DOC, or DOCX.`);
        continue;
      }
      
      validFiles.push(file);
    }
    
    setSelectedFiles(prev => [...prev, ...validFiles]);
    
    // Clear the input
    event.target.value = '';
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const calculateTotalReceived = () => {
    const currentAmount = parseFloat(formData.amount) || 0;
    
    // Use the stored receivedAmount from the plot data (supports both PascalCase and camelCase)
    const existingTotal = plot?.receivedAmount || plot?.ReceivedAmount || 0;
    
    return currentAmount + existingTotal;
  };

  const calculatePercentage = () => {
    const totalReceived = calculateTotalReceived();
    const totalPrice = plot?.totalPrice || 0;
    return totalPrice > 0 ? ((totalReceived / totalPrice) * 100).toFixed(1) : 0;
  };

  const canMarkAsSold = () => {
    return parseFloat(calculatePercentage()) >= 60;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }

    // Payment methods are now optional - conditional validation handles required fields

    if (formData.chequeChecked && !formData.chequeNo.trim()) {
      toast.error('Please enter cheque number');
      return;
    }

    if (formData.rtgsChecked && !formData.rtgsNeft.trim()) {
      toast.error('Please enter RTGS/NEFT/UPI details');
      return;
    }

    try {
      setLoading(true);

      const receiptData = {
        receiptType: 'booking',
        fromName: formData.fromName || '',
        relationType: 'S/O', // Default value as per DTO
        relationName: formData.relationName || '',
        address: formData.address || '',
        mobile: formData.mobile || '',
        panNumber: formData.panNumber || '',
        aadharNumber: formData.aadharNumber || '',
        companyName: formData.companyName || '',
        referenceName: formData.referenceName || '',
        siteName: plot.siteName || '',
        plotVillaNo: plot.plotNumber || '',
        plotSize: plot.plotSize,
        basicRate: plot.basicRate,
        amount: parseFloat(formData.amount) || 0,
        other: formData.other || '',
        cashChecked: formData.cashChecked, // Keep as boolean
        chequeChecked: formData.chequeChecked, // Keep as boolean
        rtgsChecked: formData.rtgsChecked, // Keep as boolean
        chequeNo: formData.chequeNo || '',
        rtgsNeft: formData.rtgsNeft || '',
        associateRemarks: '', // Add this field
        adminRemarks: formData.adminRemarks || '',
        plotId: plot.id,
        status: 'Approved' // Admin creates approved receipts
      };

      let response;
      
      // First create the receipt without files
      response = await receiptsAPI.createReceipt(receiptData);
      
      // If files are selected, upload them to the created receipt
      if (selectedFiles.length > 0) {
        try {
          const formData = new FormData();
          selectedFiles.forEach(file => {
            formData.append('files', file);
          });
          
          await receiptsAPI.uploadFilesToReceipt(response.data.id, formData);
          
          // Refresh the receipt data to get updated file information
          const updatedResponse = await receiptsAPI.getReceipt(response.data.id);
          response = updatedResponse;
          
        } catch (fileError) {
          // Don't fail the entire operation if file upload fails
          toast.error('Receipt created but file upload failed: ' + (fileError.response?.data?.message || fileError.message));
        }
      }
      const newReceipt = response.data;

      // Update plot status if 60% reached
      if (canMarkAsSold()) {
        await plotsAPI.updatePlotStatus(plot.id, 'Sold');
        toast.success('Plot marked as SOLD (60% payment received)');
      }

      setCreatedReceipt(newReceipt);
      setShowPreview(true);
      
      toast.success('Booking receipt created successfully!');
      
      if (onSuccess) {
        onSuccess();
      }

    } catch (error) {
      
      let errorMessage = 'Failed to create booking receipt';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.data) {
        errorMessage = typeof error.response.data === 'string' 
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

  const handleClosePreview = () => {
    setShowPreview(false);
    setCreatedReceipt(null);
    setSelectedFiles([]); // Clear selected files
    onClose();
  };

  const handleClose = () => {
    setSelectedFiles([]); // Clear selected files when closing form
    onClose();
  };

  if (!plot) return null;

  return (
    <>
      <Modal isOpen={isOpen && !showPreview} onClose={handleClose} title="Create Booking Receipt" size="xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {loading && <LoadingSpinner />}
          
          {/* Plot Information */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h3 className="text-lg font-medium text-blue-900 mb-3">Plot Information</h3>
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
                <span className="ml-2 text-blue-900 font-medium">{formatCurrency(plot.totalPrice)}</span>
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
                <span className="font-medium text-green-700">Previous Payments:</span>
                <span className="ml-2 text-green-900">
                  {formatCurrency(calculateTotalReceived() - (parseFloat(formData.amount) || 0))}
                </span>
                <div className="text-xs text-green-600 ml-2">
                  ({allReceipts.length} receipt{allReceipts.length !== 1 ? 's' : ''})
                </div>
              </div>
              <div>
                <span className="font-medium text-green-700">Current Payment:</span>
                <span className="ml-2 text-green-900 font-medium">
                  {formData.amount ? formatCurrency(parseFloat(formData.amount)) : '₹0'}
                </span>
              </div>
              <div>
                <span className="font-medium text-green-700">Total Received:</span>
                <span className="ml-2 text-green-900 font-bold">
                  {formatCurrency(calculateTotalReceived())}
                </span>
              </div>
              <div>
                <span className="font-medium text-green-700">Percentage:</span>
                <span className={`ml-2 font-bold ${canMarkAsSold() ? 'text-green-600' : 'text-orange-600'}`}>
                  {calculatePercentage()}%
                  {canMarkAsSold() && <span className="ml-1 text-xs">(✓ Can mark as SOLD)</span>}
                </span>
              </div>
            </div>
            
            {/* Receipt Breakdown */}
            {allReceipts.length > 0 && (
              <div className="mt-3 pt-3 border-t border-green-200">
                <div className="text-xs text-green-700 font-medium mb-2">Payment History:</div>
                <div className="space-y-1">
                  {allReceipts.map((receipt, index) => (
                    <div key={receipt.id} className="flex justify-between text-xs">
                      <span className="text-green-600">
                        {receipt.receiptType === 'token' ? '🎫' : '📄'} {receipt.receiptNo} 
                        <span className="ml-1 text-green-500">({receipt.status})</span>
                      </span>
                      <span className="text-green-700 font-medium">
                        {formatCurrency(receipt.totalAmount > 0 ? receipt.totalAmount : receipt.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Customer Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Customer Name *
              </label>
              <input
                type="text"
                name="fromName"
                value={formData.fromName}
                onChange={handleInputChange}
                className="input"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Relation Name (S/O, D/O, W/O)
              </label>
              <input
                type="text"
                name="relationName"
                value={formData.relationName}
                onChange={handleInputChange}
                className="input"
                placeholder="Father's/Husband's name"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address
              </label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                rows={3}
                className="input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mobile Number (Optional)
              </label>
              <input
                type="tel"
                name="mobile"
                value={formData.mobile}
                onChange={handleInputChange}
                className="input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                PAN Number
              </label>
              <input
                type="text"
                name="panNumber"
                value={formData.panNumber}
                onChange={handleInputChange}
                className="input"
                placeholder="Enter PAN number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Aadhar Number
              </label>
              <input
                type="text"
                name="aadharNumber"
                value={formData.aadharNumber}
                onChange={handleInputChange}
                className="input"
                placeholder="Enter Aadhar number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Company Name
              </label>
              <input
                type="text"
                name="companyName"
                value={formData.companyName}
                onChange={handleInputChange}
                className="input"
                placeholder="Enter company name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reference Name
              </label>
              <input
                type="text"
                name="referenceName"
                value={formData.referenceName}
                onChange={handleInputChange}
                className="input"
              />
            </div>
          </div>

          {/* Payment Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Payment Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  Other Details (Optional)
                </label>
                <input
                  type="text"
                  name="other"
                  value={formData.other}
                  onChange={handleInputChange}
                  className="input"
                  placeholder="Additional details"
                />
              </div>
            </div>

            {/* Payment Methods */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Payment Methods *
              </label>
              <div className="space-y-3">
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

                <div className="space-y-2">
                  <div className="flex items-center">
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
                    <div className="ml-6">
                      <input
                        type="text"
                        name="chequeNo"
                        value={formData.chequeNo}
                        onChange={handleInputChange}
                        className="input border-orange-300 bg-orange-50"
                        placeholder="Cheque Number (Required)"
                        required
                      />
                      <p className="text-xs text-orange-600 mt-1">* Required when cheque payment is selected</p>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      name="rtgsChecked"
                      checked={formData.rtgsChecked}
                      onChange={handleInputChange}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 text-sm text-gray-700">RTGS/NEFT/UPI</label>
                  </div>
                  {formData.rtgsChecked && (
                    <div className="ml-6">
                      <input
                        type="text"
                        name="rtgsNeft"
                        value={formData.rtgsNeft}
                        onChange={handleInputChange}
                        className="input border-orange-300 bg-orange-50"
                        placeholder="Transaction ID / Reference Number (Required)"
                        required
                      />
                      <p className="text-xs text-orange-600 mt-1">* Required when RTGS/NEFT/UPI payment is selected</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Admin Remarks */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Admin Remarks (Optional)
              </label>
              <textarea
                name="adminRemarks"
                value={formData.adminRemarks}
                onChange={handleInputChange}
                rows={3}
                className="input"
                placeholder="Any additional remarks or notes"
              />
            </div>
          </div>

          {/* File Upload Section */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">File Attachments (Optional)</h3>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Supporting Documents
                </label>
                <p className="text-xs text-gray-500 mb-3">
                  You can upload images, PDFs, or documents related to this booking receipt (Max 5 files, 10MB each)
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
                  <h6 className="text-sm font-medium text-gray-700">Selected Files:</h6>
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between bg-white p-2 rounded border">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                          {file.type.startsWith('image/') ? (
                            <span className="text-xs text-blue-600">IMG</span>
                          ) : file.type === 'application/pdf' ? (
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
              {loading ? 'Creating...' : 'Create Booking Receipt'}
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
          type="booking"
        />
      )}
    </>
  );
};

export default BookingReceiptForm;