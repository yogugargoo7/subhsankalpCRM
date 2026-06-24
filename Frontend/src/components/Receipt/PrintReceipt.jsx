import React, { useRef } from "react";
import { Printer, Download, Share2, FileText } from "lucide-react";
import TokenReceiptTemplate from "./TokenReceiptTemplate";
import BookingReceiptTemplate from "./BookingReceiptTemplate";
import PartPaymentReceiptTemplate from "./PartPaymentReceiptTemplate";
import NOCReceiptTemplate from "./NOCReceiptTemplate";
import Modal from "../UI/Modal";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const PrintReceipt = ({ receipt, isOpen, onClose, zIndex = 50 }) => {
  const componentRef = useRef();

  // Detect if user is on mobile device
  const isMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           window.innerWidth <= 768;
  };

  // Direct PDF generation using jsPDF and html2canvas
  const generatePDF = async () => {
    try {
      // Show loading message
      const loadingToast = document.createElement('div');
      loadingToast.innerHTML = `
        <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                    background: rgba(0,0,0,0.8); color: white; padding: 20px; border-radius: 8px; 
                    z-index: 10000; font-family: Arial, sans-serif;">
          <div style="text-align: center;">
            <div style="margin-bottom: 10px;">📄 Generating PDF...</div>
            <div style="font-size: 12px;">Please wait, this may take a few seconds</div>
          </div>
        </div>
      `;
      document.body.appendChild(loadingToast);

      // Create a hidden full-size version for PDF generation
      const hiddenContainer = document.createElement('div');
      hiddenContainer.style.position = 'absolute';
      hiddenContainer.style.left = '-9999px';
      hiddenContainer.style.top = '0';
      hiddenContainer.style.width = '210mm'; // A4 width
      hiddenContainer.style.backgroundColor = '#ffffff';
      hiddenContainer.style.fontFamily = 'Arial, sans-serif';
      hiddenContainer.style.fontSize = '12px';
      hiddenContainer.style.lineHeight = '1.4';
      hiddenContainer.style.color = '#000';
      
      // Clone the receipt content without mobile scaling
      const originalContent = componentRef.current.innerHTML;
      hiddenContainer.innerHTML = originalContent;
      
      // Fix watermark positioning and ensure it's visible
      const watermarks = hiddenContainer.querySelectorAll('[style*="position: fixed"], [style*="watermark"]');
      watermarks.forEach(watermark => {
        watermark.style.position = 'absolute';
        watermark.style.top = '50%';
        watermark.style.left = '50%';
        watermark.style.transform = 'translate(-50%, -50%)';
        watermark.style.opacity = '0.15';
        watermark.style.zIndex = '0';
        watermark.style.pointerEvents = 'none';
        
        // Ensure watermark image is properly sized
        const watermarkImg = watermark.querySelector('img');
        if (watermarkImg) {
          watermarkImg.style.width = '400px';
          watermarkImg.style.height = 'auto';
          watermarkImg.style.maxWidth = '400px';
        }
      });
      
      // Remove any mobile-specific classes and styles
      const receiptTemplate = hiddenContainer.querySelector('.receipt-template');
      if (receiptTemplate) {
        receiptTemplate.style.transform = 'none';
        receiptTemplate.style.width = '100%';
        receiptTemplate.style.fontSize = '12px';
        receiptTemplate.style.padding = '15mm';
        receiptTemplate.style.backgroundColor = '#ffffff';
        receiptTemplate.style.position = 'relative';
        // Remove height constraints to allow full content
        receiptTemplate.style.minHeight = 'auto';
        receiptTemplate.style.maxHeight = 'none';
        receiptTemplate.style.overflow = 'visible';
      }
      
      // Ensure all table content is visible
      const tables = hiddenContainer.querySelectorAll('table');
      tables.forEach(table => {
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';
        table.style.pageBreakInside = 'avoid';
      });
      
      // Ensure all table cells are visible
      const cells = hiddenContainer.querySelectorAll('td, th');
      cells.forEach(cell => {
        cell.style.padding = '8px';
        cell.style.border = '1px solid #000';
        cell.style.fontSize = '11px';
        cell.style.lineHeight = '1.3';
        cell.style.wordWrap = 'break-word';
        cell.style.overflow = 'visible';
      });
      
      // Remove mobile preview classes
      hiddenContainer.classList.remove('receipt-mobile-preview');
      const mobileElements = hiddenContainer.querySelectorAll('.receipt-mobile-preview');
      mobileElements.forEach(el => el.classList.remove('receipt-mobile-preview'));
      
      document.body.appendChild(hiddenContainer);
      
      // Wait a moment for images to load and layout to settle
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Get the actual content height
      const actualHeight = hiddenContainer.scrollHeight;
      const actualWidth = hiddenContainer.scrollWidth;
      
      // Configure html2canvas options for better quality
      const canvas = await html2canvas(hiddenContainer, {
        scale: 2, // Good balance of quality and performance
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: actualWidth,
        height: actualHeight, // Use actual height to capture all content
        scrollX: 0,
        scrollY: 0,
        windowWidth: 794, // A4 width in pixels at 96 DPI
        windowHeight: Math.max(1123, actualHeight), // Ensure enough height
        ignoreElements: (element) => {
          // Skip elements that might cause issues
          return element.classList.contains('no-print') || 
                 element.style.display === 'none';
        },
        onclone: (clonedDoc) => {
          // Ensure proper styling in cloned document
          const clonedElement = clonedDoc.querySelector('.receipt-template');
          if (clonedElement) {
            clonedElement.style.width = '100%';
            clonedElement.style.padding = '15mm';
            clonedElement.style.backgroundColor = '#ffffff';
            clonedElement.style.fontSize = '12px';
            clonedElement.style.lineHeight = '1.4';
            clonedElement.style.transform = 'none';
            clonedElement.style.overflow = 'visible';
          }
          
          // Fix watermarks in cloned document
          const clonedWatermarks = clonedDoc.querySelectorAll('[style*="position: fixed"], [style*="watermark"]');
          clonedWatermarks.forEach(watermark => {
            watermark.style.position = 'absolute';
            watermark.style.top = '50%';
            watermark.style.left = '50%';
            watermark.style.transform = 'translate(-50%, -50%)';
            watermark.style.opacity = '0.15';
            watermark.style.zIndex = '0';
            
            const watermarkImg = watermark.querySelector('img');
            if (watermarkImg) {
              watermarkImg.style.width = '400px';
              watermarkImg.style.height = 'auto';
            }
          });
          
          // Ensure all table content is visible in clone
          const clonedTables = clonedDoc.querySelectorAll('table');
          clonedTables.forEach(table => {
            table.style.width = '100%';
            table.style.borderCollapse = 'collapse';
          });
          
          const clonedCells = clonedDoc.querySelectorAll('td, th');
          clonedCells.forEach(cell => {
            cell.style.padding = '8px';
            cell.style.border = '1px solid #000';
            cell.style.fontSize = '11px';
            cell.style.overflow = 'visible';
          });
          
          // Remove any mobile scaling
          const mobileElements = clonedDoc.querySelectorAll('.receipt-mobile-preview');
          mobileElements.forEach(el => {
            el.style.transform = 'none';
            el.style.width = '100%';
          });
        }
      });

      // Remove the hidden container
      document.body.removeChild(hiddenContainer);

      // Calculate PDF dimensions (A4 size)
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // Create PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      // Add the image to PDF
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      
      if (imgHeight <= pageHeight - 20) { // Leave 20mm margin for safety
        // Single page - fits comfortably
        pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);
      } else if (imgHeight <= pageHeight + 50) { // Slightly over A4 but manageable
        // Compress to fit single page
        const compressedHeight = pageHeight - 10; // 10mm margin
        pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, compressedHeight);
      } else {
        // Multiple pages needed
        let heightLeft = imgHeight;
        let position = 0;
        
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
        
        while (heightLeft >= 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }
      }

      // Generate filename
      const filename = `Receipt_${receipt?.receiptNo || 'download'}_${new Date().toISOString().split('T')[0]}.pdf`;
      
      // Save the PDF
      pdf.save(filename);
      
      // Remove loading message
      document.body.removeChild(loadingToast);
      
      // Show success message
      setTimeout(() => {
        alert('✅ PDF downloaded successfully! Check your Downloads folder.');
      }, 500);
      
    } catch (error) {
      console.error('PDF generation error:', error);
      
      // Remove loading message if it exists
      const loadingElement = document.querySelector('[style*="position: fixed"]');
      if (loadingElement) {
        document.body.removeChild(loadingElement);
      }
      
      // Remove hidden container if it exists
      const hiddenContainer = document.querySelector('[style*="left: -9999px"]');
      if (hiddenContainer) {
        document.body.removeChild(hiddenContainer);
      }
      
      alert('❌ PDF generation failed. Please try the HTML download option.');
    }
  };

  // Convert images to base64 for embedding in HTML
  const convertImageToBase64 = (imagePath) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = function() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = this.naturalWidth;
        canvas.height = this.naturalHeight;
        ctx.drawImage(this, 0, 0);
        
        try {
          const dataURL = canvas.toDataURL('image/jpeg', 0.8);
          resolve(dataURL);
        } catch (e) {
          console.warn('Could not convert image to base64:', imagePath);
          resolve(imagePath); // Fallback to original path
        }
      };
      
      img.onerror = function() {
        console.warn('Could not load image:', imagePath);
        resolve(imagePath); // Fallback to original path
      };
      
      // Handle relative paths
      const fullPath = imagePath.startsWith('/') ? window.location.origin + imagePath : imagePath;
      img.src = fullPath;
    });
  };

  // Convert all images in HTML content to base64
  const convertImagesToBase64 = async (htmlContent) => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    
    const images = tempDiv.querySelectorAll('img');
    const imagePromises = Array.from(images).map(async (img) => {
      const originalSrc = img.src || img.getAttribute('src');
      if (originalSrc && !originalSrc.startsWith('data:')) {
        const base64Src = await convertImageToBase64(originalSrc);
        img.src = base64Src;
      }
    });
    
    await Promise.all(imagePromises);
    return tempDiv.innerHTML;
  };

  // Enhanced mobile print function with image embedding
  const handleMobilePrint = async () => {
    try {
      // Get receipt content and convert images to base64
      const receiptContent = componentRef.current.innerHTML;
      const contentWithImages = await convertImagesToBase64(receiptContent);
      
      // Create a blob with the HTML content
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Receipt - ${receipt?.receiptNo || 'Print'}</title>
            <style>
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              body {
                font-family: Arial, sans-serif;
                font-size: 12px;
                line-height: 1.4;
                color: #000;
                background: white;
                padding: 10px;
              }
              .receipt-template {
                max-width: 800px;
                margin: 0 auto;
                background: white;
                padding: 20px;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin: 10px 0;
              }
              th, td {
                border: 1px solid #000;
                padding: 8px;
                text-align: left;
              }
              th {
                background-color: #f0f0f0;
                font-weight: bold;
              }
              .text-center { text-align: center; }
              .text-right { text-align: right; }
              .font-bold { font-weight: bold; }
              .text-lg { font-size: 16px; }
              .text-xl { font-size: 18px; }
              .text-2xl { font-size: 20px; }
              .mb-2 { margin-bottom: 8px; }
              .mb-4 { margin-bottom: 16px; }
              .mt-4 { margin-top: 16px; }
              .border { border: 1px solid #000; }
              .border-t { border-top: 1px solid #000; }
              .border-b { border-bottom: 1px solid #000; }
              .p-2 { padding: 8px; }
              .p-4 { padding: 16px; }
              .grid { display: grid; }
              .grid-cols-2 { grid-template-columns: 1fr 1fr; }
              .grid-cols-3 { grid-template-columns: 1fr 1fr 1fr; }
              .gap-4 { gap: 16px; }
              .flex { display: flex; }
              .justify-between { justify-content: space-between; }
              .items-center { align-items: center; }
              .company-header { margin-bottom: 20px; }
              .letterhead-header, .letterhead-footer { width: 100%; }
              .letterhead-header img, .letterhead-footer img { width: 100%; height: auto; }
              .watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); opacity: 0.1; z-index: 0; }
              .signature-box { margin-top: 20px; text-align: center; }
              .signature-line img { max-height: 60px; width: auto; }
              @media print {
                body { margin: 0; padding: 10px; }
                .no-print { display: none !important; }
                @page { size: A4; margin: 15mm; }
              }
            </style>
          </head>
          <body>
            ${contentWithImages}
          </body>
        </html>
      `;

      // Create blob and download
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      
      // Create download link
      const link = document.createElement('a');
      link.href = url;
      link.download = `Receipt_${receipt?.receiptNo || 'download'}.html`;
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up
      URL.revokeObjectURL(url);
      
      // Show success message
      alert('Receipt downloaded successfully with all images! Open the HTML file to print or save as PDF.');
      
    } catch (error) {
      console.error('Mobile print error:', error);
      alert('Download failed. Please try the Share option.');
    }
  };

  // Share function for mobile devices with image embedding
  const handleShare = async () => {
    try {
      if (navigator.share) {
        const receiptContent = componentRef.current.innerHTML;
        const contentWithImages = await convertImagesToBase64(receiptContent);
        
        const htmlContent = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Receipt - ${receipt?.receiptNo}</title>
              <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                table { width: 100%; border-collapse: collapse; margin: 10px 0; }
                th, td { border: 1px solid #000; padding: 8px; text-align: left; }
                th { background-color: #f0f0f0; font-weight: bold; }
                .text-center { text-align: center; }
                .font-bold { font-weight: bold; }
                .company-header { margin-bottom: 20px; }
                .letterhead-header img, .letterhead-footer img { width: 100%; height: auto; }
                .signature-box { margin-top: 20px; text-align: center; }
                .signature-line img { max-height: 60px; width: auto; }
              </style>
            </head>
            <body>${contentWithImages}</body>
          </html>
        `;

        const blob = new Blob([htmlContent], { type: 'text/html' });
        const file = new File([blob], `Receipt_${receipt?.receiptNo}.html`, { type: 'text/html' });

        await navigator.share({
          title: `Receipt - ${receipt?.receiptNo}`,
          text: `Receipt for ${receipt?.fromName}`,
          files: [file]
        });
      } else {
        // Fallback to copy text
        const receiptText = componentRef.current.innerText;
        await navigator.clipboard.writeText(receiptText);
        alert('Receipt text copied to clipboard!');
      }
    } catch (error) {
      console.error('Share error:', error);
      alert('Share failed. Please try the download option.');
    }
  };

  // Desktop print function
  const handleDesktopPrint = () => {
    try {
      const printContent = componentRef.current.innerHTML;

      const printStyles = `
        <style>
          @page {
            size: A4;
            margin: 15mm;
          }
          
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          
          body {
            margin: 0;
            padding: 0;
            font-family: Arial, sans-serif;
            background: white;
            font-size: 11px;
            line-height: 1.4;
          }
          
          .no-print {
            display: none !important;
          }
          
          .receipt-template {
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            box-shadow: none !important;
          }
          
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 8px 0;
          }
          
          th, td {
            border: 1px solid #000;
            padding: 6px;
            font-size: 10px;
          }
          
          th {
            background-color: #f0f0f0 !important;
            font-weight: bold;
          }
          
          @media print {
            body {
              margin: 0;
              padding: 0;
            }
            .no-print {
              display: none !important;
            }
          }
        </style>
      `;

      const printWindow = window.open("", "_blank", "width=800,height=600");
      
      if (!printWindow) {
        alert("Please allow pop-ups to print receipts");
        return;
      }

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Receipt - ${receipt?.receiptNo || 'Print'}</title>
            ${printStyles}
          </head>
          <body>
            ${printContent}
            <script>
              window.onload = function() {
                setTimeout(function() {
                  window.print();
                  window.onafterprint = function() {
                    window.close();
                  };
                }, 500);
              };
            </script>
          </body>
        </html>
      `);

      printWindow.document.close();
    } catch (error) {
      console.error('Print error:', error);
      alert('Print failed. Please try again.');
    }
  };

  // Main print handler
  const handlePrint = async () => {
    if (isMobileDevice()) {
      await handleMobilePrint();
    } else {
      handleDesktopPrint();
    }
  };

  // PDF download handler
  const handleDownloadPDF = async () => {
    if (isMobileDevice()) {
      await handleMobilePrint();
    } else {
      handleDesktopPrint();
    }
  };

  if (!receipt) return null;

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      size={isMobileDevice() ? "full" : "xl"} 
      title="Receipt Preview" 
      zIndex={zIndex}
    >
      <div className={`space-y-4 ${isMobileDevice() ? 'h-full flex flex-col' : ''}`}>
        {/* Action Buttons */}
        <div className={`flex ${isMobileDevice() ? 'flex-col space-y-2' : 'justify-end space-x-2'} no-print`}>
          {isMobileDevice() ? (
            <>
              <button
                onClick={generatePDF}
                className="btn-primary flex items-center justify-center text-sm px-4 py-3 w-full"
              >
                <FileText className="h-4 w-4 mr-2" />
                Download PDF
              </button>
              <button
                onClick={handleMobilePrint}
                className="btn-secondary flex items-center justify-center text-sm px-4 py-3 w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                HTML File
              </button>
              {navigator.share && (
                <button
                  onClick={handleShare}
                  className="btn-secondary flex items-center justify-center text-sm px-4 py-3 w-full"
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </button>
              )}
            </>
          ) : (
            <>
              <button
                onClick={generatePDF}
                className="btn-primary flex items-center"
              >
                <FileText className="h-4 w-4 mr-2" />
                Generate PDF
              </button>
              <button
                onClick={handleDesktopPrint}
                className="btn-secondary flex items-center"
              >
                <Printer className="h-4 w-4 mr-2" />
                Print Receipt
              </button>
            </>
          )}
        </div>

        {/* Receipt Preview */}
        <div
          className={`border border-gray-300 rounded-lg overflow-hidden ${
            isMobileDevice() 
              ? 'h-[65vh] overflow-auto bg-gray-100 p-2' 
              : 'max-h-[70vh] overflow-y-auto'
          }`}
        >
          <div 
            ref={componentRef}
            className={isMobileDevice() ? 'receipt-mobile-preview' : ''}
          >
            <style>
              {isMobileDevice() && `
                .receipt-mobile-preview {
                  transform: scale(0.85);
                  transform-origin: top center;
                  width: 117.65%; /* Compensate for 0.85 scale (100/0.85) */
                  margin: 0 auto;
                  background: white;
                  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                  border-radius: 8px;
                  overflow: hidden;
                }
                .receipt-mobile-preview .receipt-template {
                  min-width: 100% !important;
                  width: 100% !important;
                  font-size: 11px !important;
                  line-height: 1.3 !important;
                  padding: 12mm !important;
                  background: white !important;
                  margin: 0 !important;
                }
                .receipt-mobile-preview table {
                  font-size: 10px !important;
                  width: 100% !important;
                }
                .receipt-mobile-preview th,
                .receipt-mobile-preview td {
                  padding: 6px 4px !important;
                  font-size: 9px !important;
                  line-height: 1.2 !important;
                  border: 1px solid #000 !important;
                }
                .receipt-mobile-preview .company-header {
                  margin-bottom: 15px !important;
                }
                .receipt-mobile-preview .company-header img {
                  max-height: 60px !important;
                  width: auto !important;
                }
                .receipt-mobile-preview .letterhead-header img,
                .receipt-mobile-preview .letterhead-footer img {
                  width: 100% !important;
                  height: auto !important;
                  max-height: 80px !important;
                }
                .receipt-mobile-preview .signature-line img {
                  max-height: 40px !important;
                  width: auto !important;
                }
                .receipt-mobile-preview .watermark img {
                  width: 300px !important;
                  height: auto !important;
                  opacity: 0.1 !important;
                }
                /* Ensure A4 aspect ratio */
                .receipt-mobile-preview::before {
                  content: '';
                  display: block;
                  width: 100%;
                  aspect-ratio: 210/297; /* A4 aspect ratio */
                }
                .receipt-mobile-preview .receipt-template {
                  position: relative;
                  min-height: calc(100vw * 0.85 * 297/210 - 24mm); /* A4 height minus padding */
                }
              `}
            </style>
            {receipt.receiptType === "token" && <TokenReceiptTemplate receipt={receipt} />}
            {receipt.receiptType === "partpayment" && <PartPaymentReceiptTemplate receipt={receipt} />}
            {receipt.receiptType === "booking" && <BookingReceiptTemplate receipt={receipt} />}
            {receipt.receiptType === "noc" && <NOCReceiptTemplate receipt={receipt} />}
            {!["token", "partpayment", "booking", "noc"].includes(receipt.receiptType) && (
              <TokenReceiptTemplate receipt={receipt} />
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className={`bg-blue-50 p-3 rounded-lg no-print ${isMobileDevice() ? 'mt-auto' : ''}`}>
          <h4 className="text-sm font-medium text-blue-800 mb-2">
            {isMobileDevice() ? '📱 Mobile Instructions:' : '💻 Desktop Instructions:'}
          </h4>
          <ul className="text-xs text-blue-700 space-y-1">
            {isMobileDevice() ? (
              <>
                <li>• <strong>Download PDF:</strong> Generates high-quality PDF file</li>
                <li>• <strong>HTML File:</strong> Downloads receipt as HTML with embedded images</li>
                <li>• <strong>Share:</strong> Share receipt with other apps on your device</li>
              </>
            ) : (
              <>
                <li>• <strong>Generate PDF:</strong> Creates a PDF file for download</li>
                <li>• <strong>Print Receipt:</strong> Direct print to connected printer</li>
                <li>• Receipt is optimized for A4 paper size</li>
                <li>• PDF generation may take a few seconds</li>
              </>
            )}
          </ul>
          
          {isMobileDevice() && (
            <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
              <p className="text-xs text-green-800">
                <strong>✓ A4 Preview:</strong> The preview shows how your receipt will look when printed on A4 paper.
              </p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default PrintReceipt;
