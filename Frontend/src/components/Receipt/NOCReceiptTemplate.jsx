import React from 'react';
import { formatCurrency, formatDate } from '../../utils/helpers';

const NOCReceiptTemplate = ({ receipt }) => {
  console.log('NOCReceiptTemplate received:', receipt);
  console.log('Payment history in NOC template:', receipt.paymentHistory);
  
  return (
    <>
      <style>
        {`
          @media print {
            @page {
              size: A4;
              margin: 0;
            }
            
            body {
              margin: 0;
              padding: 0;
            }
            
            .noc-template {
              width: 210mm !important;
              height: 297mm !important;
              max-height: 297mm !important;
              margin: 0 !important;
              padding: 0 !important;
              box-sizing: border-box !important;
              font-size: 12px !important;
              -webkit-print-color-adjust: exact !important;
              color-adjust: exact !important;
              display: flex;
              flex-direction: column;
              position: relative;
              overflow: hidden;
            }
            
            .letterhead-header {
              width: 100%;
              flex-shrink: 0;
            }
            
            .noc-content {
              flex: 1;
              padding: 5mm 12mm 0 12mm;
              box-sizing: border-box;
              overflow: hidden;
              font-size: 9px !important;
            }
            
            .noc-content * {
              font-size: 9px !important;
            }
            
            .noc-content h1 {
              font-size: 14px !important;
              margin: 0 !important;
              margin-bottom: 4px !important;
            }
            
            .noc-content h3 {
              font-size: 11px !important;
              margin: 0 !important;
              margin-bottom: 4px !important;
            }
            
            .noc-content p {
              margin: 0 !important;
              line-height: 1.3 !important;
            }
            
            .noc-content .space-y-6,
            .noc-content .space-y-4,
            .noc-content .space-y-2 {
              margin: 0 !important;
            }
            
            .noc-content .space-y-6 > * + *,
            .noc-content .space-y-4 > * + *,
            .noc-content .space-y-2 > * + * {
              margin-top: 3px !important;
            }
            
            .noc-content .mb-6,
            .noc-content .mb-8 {
              margin-bottom: 4px !important;
            }
            
            .noc-content .mb-4,
            .noc-content .mb-2 {
              margin-bottom: 3px !important;
            }
            
            .noc-content .mt-8,
            .noc-content .mt-12 {
              margin-top: 6px !important;
            }
            
            .noc-content .p-6,
            .noc-content .p-4 {
              padding: 6px !important;
            }
            
            .noc-content .py-4,
            .noc-content .py-2 {
              padding-top: 4px !important;
              padding-bottom: 4px !important;
            }
            
            .noc-content .gap-4 {
              gap: 6px !important;
            }
            
            .noc-content .leading-relaxed {
              line-height: 1.3 !important;
            }
            
            .noc-content .mb-16 {
              margin-bottom: 20px !important;
            }
            
            .noc-content .rounded-lg {
              border-radius: 4px !important;
            }
            
            .noc-content .border-t-2 {
              border-top-width: 1px !important;
            }
            
            .noc-content .pt-8 {
              padding-top: 4px !important;
            }
            
            .noc-content .pt-2 {
              padding-top: 2px !important;
            }
            
            .noc-content .pb-2 {
              padding-bottom: 2px !important;
            }
            
            .letterhead-footer {
              width: 100%;
              flex-shrink: 0;
              position: absolute;
              bottom: 0;
              left: 0;
            }
            
            .no-print {
              display: none !important;
            }
          }
          
          @media screen {
            .noc-template {
              box-shadow: 0 4px 20px rgba(0,0,0,0.15);
              margin: 20px auto;
              background: white;
              display: flex;
              flex-direction: column;
              min-height: 297mm;
            }
            
            .letterhead-header {
              width: 100%;
              flex-shrink: 0;
            }
            
            .noc-content {
              flex: 1;
              padding: 30px;
            }
            
            .letterhead-footer {
              width: 100%;
              flex-shrink: 0;
              margin-top: auto;
            }
          }
        `}
      </style>
      <div className="noc-template">
        {/* Letterhead Header */}
        <div className="letterhead-header">
          <img
            src="/Header-gold.jpg"
            alt="Company Letterhead Header"
            style={{
              width: "100%",
              height: "auto",
              display: "block",
            }}
          />
        </div>

        {/* NOC Content */}
        <div className="noc-content">
          {/* Title */}
          <div className="text-center mb-6" style={{ marginBottom: '8px' }}>
            <h1 className="text-2xl font-bold text-gray-900 mb-2" style={{ fontSize: '16px', marginBottom: '4px' }}>NO OBJECTION CERTIFICATE</h1>
            {receipt.companyName && <h3 className="text-lg font-semibold" style={{ fontSize: '12px', marginBottom: '4px' }}>{receipt.companyName}</h3>}
          </div>

      {/* Receipt Number and Date - Only show NOC number if not temporary */}
      {!receipt.receiptNo?.includes('TEMP') ? (
        <div className="flex justify-between mb-6">
          <div>
            <p className="text-sm text-gray-600">NOC No:</p>
            <p className="text-lg font-semibold text-gray-900">{receipt.receiptNo}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Date:</p>
            <p className="text-lg font-semibold text-gray-900">
              {receipt.nocDate ? formatDate(receipt.nocDate) : formatDate(receipt.createdAt)}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex justify-end mb-6">
          <div className="text-right">
            <p className="text-sm text-gray-600">Date:</p>
            <p className="text-lg font-semibold text-gray-900">
              {receipt.nocDate ? formatDate(receipt.nocDate) : formatDate(receipt.createdAt)}
            </p>
          </div>
        </div>
      )}

      {/* NOC Content */}
      <div className="space-y-6 mb-8">
        <p className="text-gray-800 leading-relaxed">
          This is to certify that <strong>{receipt.fromName}</strong>
          {receipt.relationName && ` ${receipt.relationType || 'S/O'} ${receipt.relationName}`}
          {receipt.address && `, residing at ${receipt.address}`}
          , has successfully completed all payment obligations for the property described below:
        </p>

        {/* Property Details */}
        <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Property Details</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Site Name</p>
              <p className="font-medium text-gray-900">{receipt.siteName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Plot/Villa Number</p>
              <p className="font-medium text-gray-900">{receipt.plotVillaNo}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Plot Size</p>
              <p className="font-medium text-gray-900">{receipt.plotSize}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Value</p>
              <p className="font-medium text-gray-900">{formatCurrency(receipt.totalAmount || 0)}</p>
            </div>
          </div>
        </div>

        {/* Customer Details */}
        <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Name</p>
              <p className="font-medium text-gray-900">{receipt.fromName}</p>
            </div>
            {receipt.relationName && (
              <div>
                <p className="text-sm text-gray-600">Father's/Husband's Name</p>
                <p className="font-medium text-gray-900">{receipt.relationName}</p>
              </div>
            )}
            {receipt.mobile && (
              <div>
                <p className="text-sm text-gray-600">Mobile</p>
                <p className="font-medium text-gray-900">{receipt.mobile}</p>
              </div>
            )}
            {receipt.panNumber && (
              <div>
                <p className="text-sm text-gray-600">PAN Number</p>
                <p className="font-medium text-gray-900">{receipt.panNumber}</p>
              </div>
            )}
            {receipt.aadharNumber && (
              <div>
                <p className="text-sm text-gray-600">Aadhar Number</p>
                <p className="font-medium text-gray-900">{receipt.aadharNumber}</p>
              </div>
            )}
            {receipt.address && (
              <div className="col-span-2">
                <p className="text-sm text-gray-600">Address</p>
                <p className="font-medium text-gray-900">{receipt.address}</p>
              </div>
            )}
          </div>
        </div>

        {/* NOC Statement */}
        <div className="border-l-4 border-green-500 pl-4 py-2 bg-green-50">
          <p className="text-gray-800 leading-relaxed">
            We hereby confirm that all financial obligations related to the above-mentioned property have been 
            fulfilled. The company has <strong>NO OBJECTION</strong> to the transfer, sale, or any other legal 
            transaction involving this property by the customer.
          </p>
        </div>

        {/* Payment History */}
        {receipt.paymentHistory && receipt.paymentHistory.length > 0 && (
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment History</h3>
            <div className="space-y-2">
              <div className="grid grid-cols-5 gap-4 text-sm font-semibold text-gray-700 border-b pb-2">
                <div>Receipt No</div>
                <div>Type</div>
                <div>Date</div>
                <div>Payment Method</div>
                <div className="text-right">Amount</div>
              </div>
              {receipt.paymentHistory.map((payment, index) => (
                <div key={index} className="grid grid-cols-5 gap-4 text-sm text-gray-800">
                  <div>{payment.receiptNo}</div>
                  <div className="capitalize">{payment.receiptType}</div>
                  <div>{formatDate(payment.date)}</div>
                  <div>{payment.paymentMethod || 'N/A'}</div>
                  <div className="text-right font-medium">{formatCurrency(payment.amount)}</div>
                </div>
              ))}
              <div className="grid grid-cols-5 gap-4 text-sm font-bold text-gray-900 border-t pt-2 mt-2">
                <div className="col-span-4 text-right">Total Paid:</div>
                <div className="text-right">
                  {formatCurrency(receipt.paymentHistory.reduce((sum, p) => sum + p.amount, 0))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Additional Information */}
        {receipt.nocNumber && (
          <div>
            <p className="text-sm text-gray-600">Reference Number</p>
            <p className="font-medium text-gray-900">{receipt.nocNumber}</p>
          </div>
        )}

        {receipt.adminRemarks && (
          <div>
            <p className="text-sm text-gray-600">Remarks</p>
            <p className="text-gray-800">{receipt.adminRemarks}</p>
          </div>
        )}
      </div>

          {/* Signature Section */}
          <div className="mt-8 flex justify-between items-end">
            <div>
              <div className="mb-16"></div>
              <div className="border-t-2 border-gray-800 pt-2">
                <p className="font-semibold text-gray-900">Customer Signature</p>
              </div>
            </div>
            <div className="text-right">
              <div className="mb-16" style={{
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "center",
                paddingBottom: "5px",
              }}>
                <img
                  src="/signsubh.png"
                  alt="Authorized Signature"
                  style={{
                    maxHeight: "157px",
                    maxWidth: "100%",
                    objectFit: "contain",
                    position: "relative",
                    top: "40px",
                  }}
                />
              </div>
              <div className="border-t-2 border-gray-800 pt-2">
                <p className="font-semibold text-gray-900">Authorized Signatory</p>
                <p className="text-sm text-gray-600">SUBHSANKALP INFRATECH PVT. LTD.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Letterhead Footer */}
        <div className="letterhead-footer">
          <img
            src="/Footer-Gold.jpg"
            alt="Company Letterhead Footer"
            style={{
              width: "100%",
              height: "auto",
              display: "block",
            }}
          />
        </div>
      </div>
    </>
  );
};

export default NOCReceiptTemplate;
