import React, { useState, useEffect } from 'react';
import { FileCheck } from 'lucide-react';
import { receiptsAPI } from '../../utils/api';
import { formatCurrency } from '../../utils/helpers';
import Modal from '../UI/Modal';
import LoadingSpinner from '../UI/LoadingSpinner';
import PrintReceipt from '../Receipt/PrintReceipt';
import toast from 'react-hot-toast';

const EnhancedNOCForm = ({ isOpen, onClose, plot, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [createdReceipt, setCreatedReceipt] = useState(null);
  const [allReceipts, setAllReceipts] = useState([]);

  const [registryFeeData, setRegistryFeeData] = useState({ amount: 0, isPaid: false });
  const [edcFeeData, setEdcFeeData] = useState({ amount: 0, isPaid: false });
  const [advanceInfo, setAdvanceInfo] = useState('');

  // Paid/Pending badge — never N/A
  const StatusBadge = ({ paid }) => (
    <span className={`inline-flex items-center gap-1 font-semibold ${paid ? 'text-green-700' : 'text-red-700'}`}>
      <span className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold text-white ${paid ? 'bg-green-600' : 'bg-red-600'}`}>
        {paid ? '✓' : '✕'}
      </span>
      {paid ? 'Paid' : 'Pending'}
    </span>
  );

  useEffect(() => {
    if (plot && isOpen) {
      fetchPlotReceipts();
    }
  }, [plot, isOpen]);

  const fetchPlotReceipts = async () => {
    try {
      setLoading(true);
      const response = await receiptsAPI.getReceiptsByPlot(plot.id);
      const receipts = response.data || [];
      setAllReceipts(receipts);
      calculateFeesFromReceipts(receipts);
      loadPreviousNOCStatus(receipts);
    } catch (error) {
      console.error('Error fetching receipts:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateFeesFromReceipts = (receipts) => {
    // Registry Fee: 0 by default (no registryFee field in plot model)
    setRegistryFeeData(prev => ({ ...prev, amount: plot.registryFee || 0 }));

    // EDC: calculated from token receipt (plot size × edcPerSqYard)
    const tokenReceipt = receipts.find(r => r.receiptType === 'token' || r.receiptType === 'Token');
    if (tokenReceipt && tokenReceipt.edcPerSqYard && plot.plotSize) {
      const edcAmount = parseFloat(tokenReceipt.edcPerSqYard) * parseFloat(plot.plotSize);
      setEdcFeeData(prev => ({ ...prev, amount: edcAmount || 0 }));
    }
  };

  const loadPreviousNOCStatus = (receipts) => {
    const nocReceipts = receipts.filter(r => r.receiptType?.toLowerCase() === 'noc');
    if (nocReceipts.length === 0) return;

    const lastNOC = nocReceipts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
    if (!lastNOC.adminRemarks) return;

    try {
      const nocData = JSON.parse(lastNOC.adminRemarks);
      if (nocData.type !== 'NOC_DATA') return;

      if (nocData.registryFee !== undefined) setRegistryFeeData(prev => ({ ...prev, amount: nocData.registryFee }));
      if (nocData.isRegistryFeePaid !== undefined) setRegistryFeeData(prev => ({ ...prev, isPaid: nocData.isRegistryFeePaid }));
      if (nocData.edcAmount !== undefined) setEdcFeeData(prev => ({ ...prev, amount: nocData.edcAmount }));
      if (nocData.isEDCPaid !== undefined) setEdcFeeData(prev => ({ ...prev, isPaid: nocData.isEDCPaid }));
      if (nocData.advanceInfo) setAdvanceInfo(nocData.advanceInfo);

      toast.info('Loaded payment status from previous NOC');
    } catch (_) {}
  };

  const handleGenerateNOC = async () => {
    try {
      setLoading(true);

      const previousReceipts = allReceipts;
      const latestReceipt = previousReceipts[0] || {};

      const nocRemarks = JSON.stringify({
        type: 'NOC_DATA',
        registryFee: registryFeeData.amount,
        isRegistryFeePaid: registryFeeData.isPaid,
        IsRegistryFeePaid: registryFeeData.isPaid,
        edcAmount: edcFeeData.amount,
        isEDCPaid: edcFeeData.isPaid,
        IsEDCPaid: edcFeeData.isPaid,
        advanceInfo: advanceInfo,
        nocDate: new Date().toISOString()
      });

      const receiptData = {
        receiptType: 'noc',
        fromName: latestReceipt.fromName || plot.customerName || '',
        relationType: latestReceipt.relationType || 'S/O',
        relationName: latestReceipt.relationName || '',
        address: latestReceipt.address || '',
        mobile: latestReceipt.mobile || '',
        panNumber: latestReceipt.panNumber || '',
        aadharNumber: latestReceipt.aadharNumber || '',
        companyName: latestReceipt.companyName || '',
        referenceName: latestReceipt.referenceName || '',
        siteName: plot.siteName || '',
        plotVillaNo: plot.plotNumber || '',
        amount: 0,
        other: '',
        cashChecked: false,
        chequeChecked: false,
        rtgsChecked: false,
        chequeNo: '',
        rtgsNeft: '',
        adminRemarks: nocRemarks,
        plotId: plot.id,
        RegistryFee: registryFeeData.amount,
        IsRegistryFeePaid: registryFeeData.isPaid,
        EdcAmount: edcFeeData.amount,
        IsEDCPaid: edcFeeData.isPaid,
        AdvanceInfo: advanceInfo
      };

      const savedResponse = await receiptsAPI.createReceipt(receiptData);
      const savedReceipt = savedResponse.data;

      savedReceipt.paymentHistory = previousReceipts
        .filter(r => r.receiptType !== 'booking' && r.receiptType !== 'noc')
        .map(r => ({
          receiptNo: r.receiptNo,
          receiptType: r.receiptType,
          amount: r.totalAmount > 0 ? r.totalAmount : r.amount,
          date: r.createdAt || r.date,
          paymentMethod: r.cashChecked ? 'Cash' :
            r.chequeChecked ? `Cheque (${r.chequeNo || '-'})` :
            r.rtgsChecked ? `UPI/NEFT (${r.rtgsNeft || '-'})` : '-'
        }));
      savedReceipt.nocDate = savedReceipt.date;
      savedReceipt.RegistryFee = registryFeeData.amount;
      savedReceipt.IsRegistryFeePaid = registryFeeData.isPaid;
      savedReceipt.EdcAmount = edcFeeData.amount;
      savedReceipt.IsEDCPaid = edcFeeData.isPaid;
      savedReceipt.AdvanceInfo = advanceInfo;

      setCreatedReceipt(savedReceipt);
      setTimeout(() => setShowPreview(true), 100);
      toast.success(`NOC receipt ${savedReceipt.receiptNo} generated!`);
    } catch (error) {
      console.error('Error generating NOC:', error);
      toast.error('Failed to generate NOC receipt');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setRegistryFeeData({ amount: 0, isPaid: false });
    setEdcFeeData({ amount: 0, isPaid: false });
    setAdvanceInfo('');
    setAllReceipts([]);
    setCreatedReceipt(null);
    setShowPreview(false);
    onClose();
  };

  if (!plot) return null;

  if (showPreview && createdReceipt) {
    return (
      <PrintReceipt
        receipt={createdReceipt}
        isOpen={showPreview}
        onClose={() => {
          setShowPreview(false);
          if (onSuccess) onSuccess();
          handleClose();
        }}
      />
    );
  }

  const totalValue = plot.totalPrice || 0;
  const totalPaid = plot.totalPaid || plot.receivedAmount || 0;
  const remaining = totalValue - totalPaid;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Generate NOC Receipt" size="xl">
      {loading ? (
        <div className="flex justify-center py-12"><LoadingSpinner /></div>
      ) : (
        <div className="space-y-6">

          {/* Plot Information */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h3 className="text-lg font-medium text-blue-900 mb-3">Plot Information</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-500">Site:</span> <span className="font-medium text-gray-800"> {plot.siteName}</span></div>
              <div><span className="text-gray-500">Plot No:</span> <span className="font-medium text-gray-800"> {plot.plotNumber}</span></div>
              <div><span className="text-gray-500">Total Value:</span> <span className="font-semibold text-blue-700"> {formatCurrency(totalValue)}</span></div>
              <div><span className="text-gray-500">Total Paid:</span> <span className="font-semibold text-green-700"> {formatCurrency(totalPaid)}</span></div>
              <div className="col-span-2"><span className="text-gray-500">Remaining Balance:</span> <span className={`font-semibold ${remaining > 0 ? 'text-red-600' : 'text-green-600'}`}> {formatCurrency(remaining)}</span></div>
            </div>
          </div>

          {/* Registry Fee & EDC Payment Status */}
          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-purple-900 flex items-center">
                <FileCheck className="h-5 w-5 mr-2" />
                Registry Fee &amp; EDC Payment Status
              </h3>
              <button
                type="button"
                onClick={() => loadPreviousNOCStatus(allReceipts)}
                className="text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1 rounded-md transition-colors flex items-center space-x-1"
              >
                <span>🔄</span>
                <span>Reload from Previous NOC</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Registry Fee */}
              <div className="space-y-3">
                <h4 className="font-medium text-purple-800">Registry Fee</h4>
                <div className="space-y-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Registry Fee Amount</label>
                    <input
                      type="number"
                      value={registryFeeData.amount}
                      onChange={(e) => setRegistryFeeData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="Registry fee amount"
                    />
                    <p className="text-xs text-gray-500 mt-1">From plot table registry fee column</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="registryFeePaid"
                      checked={registryFeeData.isPaid}
                      onChange={(e) => setRegistryFeeData(prev => ({ ...prev, isPaid: e.target.checked }))}
                      className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                    />
                    <label htmlFor="registryFeePaid" className="text-sm font-medium text-gray-700">Registry Fee Paid</label>
                  </div>
                  <div className="text-sm text-gray-600">
                    Status: <StatusBadge paid={registryFeeData.isPaid} />
                  </div>
                </div>
              </div>

              {/* EDC Payment */}
              <div className="space-y-3">
                <h4 className="font-medium text-purple-800">EDC Payment</h4>
                <div className="space-y-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">EDC Amount</label>
                    <input
                      type="number"
                      value={edcFeeData.amount}
                      onChange={(e) => setEdcFeeData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="EDC amount"
                    />
                    <p className="text-xs text-gray-500 mt-1">Calculated from token receipt: Plot Size × EDC per sq yard</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="edcFeePaid"
                      checked={edcFeeData.isPaid}
                      onChange={(e) => setEdcFeeData(prev => ({ ...prev, isPaid: e.target.checked }))}
                      className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                    />
                    <label htmlFor="edcFeePaid" className="text-sm font-medium text-gray-700">EDC Payment Made</label>
                  </div>
                  <div className="text-sm text-gray-600">
                    Status: <StatusBadge paid={edcFeeData.isPaid} />
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Summary */}
            <div className="mt-4 p-3 bg-white rounded border">
              <h5 className="font-medium text-gray-800 mb-2">Payment Summary</h5>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Registry Fee:</span>
                  <span className="ml-2 font-medium">
                    {formatCurrency(registryFeeData.amount)}
                    <span className="ml-2"><StatusBadge paid={registryFeeData.isPaid} /></span>
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">EDC Payment:</span>
                  <span className="ml-2 font-medium">
                    {formatCurrency(edcFeeData.amount)}
                    <span className="ml-2"><StatusBadge paid={edcFeeData.isPaid} /></span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Information */}
          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <h3 className="text-lg font-medium text-yellow-900 mb-3">Additional Information</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Advance Info</label>
              <textarea
                value={advanceInfo}
                onChange={(e) => setAdvanceInfo(e.target.value)}
                rows={3}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                placeholder="Enter any additional information to be printed on the NOC receipt (e.g., special instructions, payment terms, etc.)"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleGenerateNOC}
              disabled={loading}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-sm font-medium transition-colors disabled:opacity-50 flex items-center space-x-2"
            >
              <FileCheck className="h-4 w-4" />
              <span>Generate NOC Receipt</span>
            </button>
          </div>

        </div>
      )}
    </Modal>
  );
};

export default EnhancedNOCForm;
