import { formatDate } from "../../utils/helpers";
import { numberToWords } from "../../utils/numberToWords";

const BookingReceiptTemplate = ({ receipt }) => {
  console.log("BookingReceiptTemplate received:", receipt);
  console.log("Payment history in template:", receipt.paymentHistory);

  // Format receipt number as BR/25-26/0001
  const getReceiptNumber = (receiptNo) => {
    if (!receiptNo) return "BR/25-26/0001";

    // If receiptNo is just a number, format it properly
    if (/^\d+$/.test(receiptNo)) {
      const paddedNumber = receiptNo.padStart(4, "0");
      return `BR/25-26/${paddedNumber}`;
    }

    // If it's already formatted, return as is
    return receiptNo;
  };

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
            
            .receipt-template {
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
            
            .receipt-content {
              flex: 1;
              padding: 15mm 15mm 0 15mm;
              box-sizing: border-box;
              overflow: hidden;
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
            .receipt-template {
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
            
            .receipt-content {
              flex: 1;
              padding: 30px;
            }
            
            .letterhead-footer {
              width: 100%;
              flex-shrink: 0;
              margin-top: auto;
            }
          }
          
          .receipt-title {
            text-align: center;
            margin: 17px 0;
          }
          
          .receipt-title h2 {
            font-size: 16px;
            font-weight: bold;
            margin: 0;
            text-transform: uppercase;
          }
          
          .receipt-title h3 {
            font-size: 14px;
            font-weight: bold;
            margin: 5px 0 0 0;
            text-transform: uppercase;
          }
          
          .receipt-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            border: 1px solid #000;
          }
          
          .receipt-table td {
            border: 1px solid #000;
            padding: 8px 10px;
            vertical-align: top;
          }
          
          .receipt-table .label-cell {
            background-color: #f5f5f5;
            font-weight: bold;
            width: 120px;
            font-size: 11px;
          }
          
          .receipt-table .value-cell {
            background-color: transparent;
            font-size: 11px;
          }
          
          .payment-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            border: 1px solid #000;
          }
          
          .payment-table th {
            border: 1px solid #000;
            padding: 8px;
            background-color: #f5f5f5;
            font-weight: bold;
            text-align: center;
          }
          
          .payment-table td {
            border: 1px solid #000;
            padding: 8px;
            text-align: center;
            background-color: transparent;
          }
          
          .payment-header {
            text-align: center;
            font-weight: bold;
            margin: 20px 0 10px 0;
            text-transform: uppercase;
          }
          
          .signature-section {
            margin-top: 20px;
            display: flex;
            justify-content: space-between;
          }
          
          .signature-box {
            width: 250px;
            text-align: center;
          }
          
          .signature-line {
            border-bottom: 1px solid #000;
            height: 80px;
            margin-bottom: 15px;
          }
          

        `}
      </style>
      <div className="receipt-template">
        {/* Letterhead Header - Fixed at top */}
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

        {/* Receipt Content - Flexible middle section */}
        <div className="receipt-content" style={{ position: 'relative' }}>
          {/* Watermark */}
          <div style={{
            position: 'absolute',
            top: '45%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            opacity: 0.18,
            zIndex: 0,
            pointerEvents: 'none',
            width: '100%',
            height: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <img
              src="/receipt-logo1.jpg"
              alt="Watermark"
              style={{
                width: '600px',
                height: 'auto',
                maxWidth: '90%',
                objectFit: 'contain'
              }}
            />
          </div>

          {/* Receipt Title */}
          <div className="receipt-title" style={{ position: 'relative', zIndex: 1 }}>
            <h2>BOOKING RECEIPT</h2>
            {receipt.companyName && <h3>{receipt.companyName}</h3>}
          </div>

          {/* Main Receipt Information Table */}
          <table className="receipt-table" style={{ position: 'relative', zIndex: 1 }}>
            <tbody>
              {/* Only show receipt number if it's not a temporary receipt */}
              {!receipt.receiptNo?.includes("TEMP") && (
                <tr>
                  <td className="label-cell">Receipt No.</td>
                  <td className="value-cell">
                    {getReceiptNumber(receipt.receiptNo)}
                  </td>
                  <td className="label-cell">Date</td>
                  <td className="value-cell" colSpan="3">
                    {formatDate(receipt.date)}
                  </td>
                </tr>
              )}
              {/* If temporary receipt, show date in full width */}
              {receipt.receiptNo?.includes("TEMP") && (
                <tr>
                  <td className="label-cell">Date</td>
                  <td className="value-cell" colSpan="5">
                    {formatDate(receipt.date)}
                  </td>
                </tr>
              )}
              <tr>
                <td className="label-cell">Plot No.</td>
                <td className="value-cell">{receipt.plotVillaNo}</td>
                <td className="label-cell">Plot Size</td>
                <td className="value-cell">{receipt.plotSize} sq yard</td>
                <td className="label-cell">Basic Rate</td>
                <td className="value-cell">
                  ₹
                  {receipt.basicRate
                    ? receipt.basicRate.toLocaleString()
                    : "N/A"}
                  /sq yard
                </td>
              </tr>

              <tr>
                <td className="label-cell">Client Name</td>
                <td className="value-cell" colSpan="5">
                  {receipt.fromName}
                </td>
              </tr>
              <tr>
                <td className="label-cell">Relation Name</td>
                <td className="value-cell">
                  {receipt.relationType} {receipt.relationName}
                </td>
                <td className="label-cell">Reference Name</td>
                <td className="value-cell" colSpan="3">
                  {receipt.referenceName || "N/A"}
                </td>
              </tr>
              <tr>
                <td className="label-cell">Client Address</td>
                <td className="value-cell" colSpan="5">
                  {receipt.address}
                </td>
              </tr>
              <tr>
                <td className="label-cell">PAN</td>
                <td className="value-cell">{receipt.panNumber || ""}</td>
                <td className="label-cell">Mobile</td>
                <td className="value-cell" colSpan="3">
                  {receipt.mobile}
                </td>
              </tr>
              <tr>
                <td className="label-cell">AADHAR</td>
                <td className="value-cell" colSpan="5">
                  {receipt.aadharNumber || ""}
                </td>
              </tr>
              <tr>
                <td className="label-cell">Total Amount</td>
                <td className="value-cell" colSpan="5">
                  ₹
                  {receipt.totalAmount > 0
                    ? receipt.totalAmount.toLocaleString()
                    : receipt.amount.toLocaleString()}
                </td>
              </tr>
              <tr>
                <td className="label-cell">Total(Words)</td>
                <td className="value-cell" colSpan="5">
                  {numberToWords(
                    receipt.totalAmount > 0
                      ? receipt.totalAmount
                      : receipt.amount
                  )}
                </td>
              </tr>
              <tr>
                <td className="label-cell">Other Charges</td>
                <td className="value-cell" colSpan="5">
                  {receipt.other || "N/A"}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Payment History Section - Exclude Cash payments */}
          {receipt.paymentHistory && receipt.paymentHistory.length > 0 && (() => {
            // Filter out Cash payments, only show RTGS/NEFT/UPI and Cheque
            const filteredPayments = receipt.paymentHistory.filter(
              payment => {
                if (!payment.paymentMethod) return false;
                const method = payment.paymentMethod.toLowerCase().trim();
                return method !== 'cash';
              }
            );
            
            return filteredPayments.length > 0 ? (
              <>
                <div className="payment-header" style={{ marginTop: "20px", position: 'relative', zIndex: 1 }}>
                  Payment History
                </div>
                <table className="payment-table" style={{ position: 'relative', zIndex: 1 }}>
                  <thead>
                    <tr>
                      <th>Receipt No</th>
                      <th>Type</th>
                      <th>Date</th>
                      <th>Payment Method</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayments.map((payment, index) => (
                      <tr key={index}>
                        <td>{payment.receiptNo}</td>
                        <td style={{ textTransform: "capitalize" }}>
                          {payment.receiptType}
                        </td>
                        <td>{formatDate(payment.date)}</td>
                        <td>{payment.paymentMethod || "N/A"}</td>
                        <td>₹{payment.amount.toLocaleString()}</td>
                      </tr>
                    ))}
                    <tr
                      style={{ fontWeight: "bold", borderTop: "2px solid #000" }}
                    >
                      <td colSpan="4" style={{ textAlign: "right" }}>
                        Total Paid:
                      </td>
                      <td>
                        ₹
                        {filteredPayments
                          .reduce((sum, p) => sum + p.amount, 0)
                          .toLocaleString()}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </>
            ) : null;
          })()}

          {/* Payment Receipt Validity Note */}
          <div style={{ fontWeight: "bold", margin: "14px 0px 70px", position: 'relative', zIndex: 1 }}>
            PAYMENT RECEIPT VALID SUBJECT TO CHEQUE REALIZATION
          </div>

          {/* Signature Section */}
          <div className="signature-section" style={{ position: 'relative', zIndex: 1 }}>
            <div className="signature-box">
              <div className="signature-line"></div>
              <div>CLIENT SIGNATURE</div>
            </div>
            <div className="signature-box">
              <div
                className="signature-line"
                style={{
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "center",
                  paddingBottom: "5px",
                }}
              >
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
              <div>AUTHORIZED SIGNATURE</div>
            </div>
          </div>
        </div>

        {/* Letterhead Footer - Fixed at bottom */}
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

export default BookingReceiptTemplate;
