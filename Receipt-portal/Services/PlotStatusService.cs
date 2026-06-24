using Microsoft.EntityFrameworkCore;
using Subh_sankalp_estate.Data;
using Subh_sankalp_estate.Models;

namespace Subh_sankalp_estate.Services
{
    public class PlotStatusService : IPlotStatusService
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<PlotStatusService> _logger;

        public PlotStatusService(ApplicationDbContext context, ILogger<PlotStatusService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task UpdatePlotStatusAsync(int plotId, string receiptType, decimal amount)
        {
            var plot = await _context.Plots.FindAsync(plotId);
            if (plot == null) return;

            var oldStatus = plot.Status;
            
            // Update plot status based on receipt type and payment percentage
            if (receiptType.ToLower() == "token")
            {
                // Token receipt - move to Tokened status
                plot.Status = "Tokened";
                _logger.LogInformation($"Plot {plot.PlotNumber} status changed from {oldStatus} to Tokened due to token receipt");
            }
            else if (receiptType.ToLower() == "partpayment" || receiptType.ToLower() == "booking" || receiptType.ToLower() == "noc")
            {
                // If plot was Tokened, convert the token receipt to "Converted" status
                if (oldStatus == "Tokened")
                {
                    await ConvertTokenReceiptsAsync(plotId);
                }
                
                // Part Payment, Booking, or NOC receipt - check payment percentage
                var paymentPercentage = await GetPlotPaymentPercentageAsync(plotId);
                
                _logger.LogInformation($"Plot {plot.PlotNumber} payment percentage: {paymentPercentage:F1}%");
                
                if (paymentPercentage >= 100)
                {
                    // 100% payment - Sold
                    plot.Status = "Sold";
                    _logger.LogInformation($"Plot {plot.PlotNumber} status changed from {oldStatus} to Sold (Payment: {paymentPercentage:F1}%)");
                }
                else if (paymentPercentage >= 30)
                {
                    // 30-99% payment - Booked (stays booked until fully paid)
                    plot.Status = "Booked";
                    _logger.LogInformation($"Plot {plot.PlotNumber} status changed from {oldStatus} to Booked (Payment: {paymentPercentage:F1}%)");
                }
                else if (paymentPercentage > 0)
                {
                    // 0-29% payment - Part Payment
                    plot.Status = "PartPayment";
                    _logger.LogInformation($"Plot {plot.PlotNumber} status changed from {oldStatus} to PartPayment (Payment: {paymentPercentage:F1}%)");
                }
            }

            plot.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }

        private async Task ConvertTokenReceiptsAsync(int plotId)
        {
            // Find all approved token receipts for this plot
            var tokenReceipts = await _context.Receipts
                .Where(r => r.PlotId == plotId && 
                           r.ReceiptType.ToLower() == "token" && 
                           r.Status == "Approved")
                .ToListAsync();

            foreach (var tokenReceipt in tokenReceipts)
            {
                tokenReceipt.Status = "Converted";
                tokenReceipt.UpdatedAt = DateTime.UtcNow;
                
                _logger.LogInformation($"Token receipt {tokenReceipt.Id} for plot ID {plotId} marked as Converted - plot moving to PartPayment/Booked/Sold");
            }
        }

        public async Task CheckAndUpdateExpiredTokensAsync()
        {
            var currentDate = DateTime.UtcNow;
            
            _logger.LogInformation("Starting manual token expiry check at {CurrentDate}", currentDate);

            // Find all approved token receipts that have expired
            // NOTE: Converted tokens are excluded - they never expire
            var expiredTokenReceipts = await _context.Receipts
                .Include(r => r.Plot)
                .Where(r => r.ReceiptType.ToLower() == "token" && 
                           r.Status == "Approved" &&
                           r.TokenExpiryDate.HasValue && 
                           r.TokenExpiryDate.Value.AddDays(1) < currentDate)
                .ToListAsync();

            if (!expiredTokenReceipts.Any())
            {
                _logger.LogInformation("No expired tokens found");
                return;
            }

            _logger.LogInformation("Found {Count} expired token receipts", expiredTokenReceipts.Count);

            foreach (var tokenReceipt in expiredTokenReceipts)
            {
                if (tokenReceipt.Plot == null) continue;

                var plot = tokenReceipt.Plot;
                
                // Check if there are any booking/partpayment receipts for this plot after the token was created
                var hasPaymentAfterToken = await _context.Receipts
                    .AnyAsync(r => r.PlotId == plot.Id && 
                                  (r.ReceiptType.ToLower() == "booking" || r.ReceiptType.ToLower() == "partpayment") && 
                                  r.Status == "Approved" &&
                                  r.CreatedAt > tokenReceipt.CreatedAt);

                if (hasPaymentAfterToken)
                {
                    // Token should get special "Converted" status instead of expiring
                    tokenReceipt.Status = "Converted";
                    tokenReceipt.UpdatedAt = DateTime.UtcNow;
                    
                    _logger.LogInformation("Token receipt {ReceiptId} for plot {PlotNumber} marked as Converted - payment receipt exists", 
                        tokenReceipt.Id, plot.PlotNumber);
                    continue;
                }

                // Mark token receipt as expired
                tokenReceipt.Status = "Expired";
                tokenReceipt.UpdatedAt = DateTime.UtcNow;
                
                _logger.LogInformation("Token receipt {ReceiptId} for plot {PlotNumber} marked as expired", 
                    tokenReceipt.Id, plot.PlotNumber);

                // Update plot status back to Available if it was Tokened
                if (plot.Status == "Tokened")
                {
                    // Double-check: ensure no other active tokens exist for this plot
                    var hasOtherActiveTokens = await _context.Receipts
                        .AnyAsync(r => r.PlotId == plot.Id && 
                                      r.ReceiptType.ToLower() == "token" && 
                                      r.Status == "Approved" &&
                                      r.Id != tokenReceipt.Id &&
                                      r.TokenExpiryDate.HasValue && 
                                      r.TokenExpiryDate.Value.AddDays(1) > DateTime.UtcNow);

                    if (!hasOtherActiveTokens)
                    {
                        plot.Status = "Available";
                        plot.UpdatedAt = DateTime.UtcNow;
                        
                        _logger.LogInformation("Plot {PlotNumber} status changed from Tokened to Available due to token expiry", 
                            plot.PlotNumber);
                    }
                }

                // Recalculate plot received amount (expired receipts don't count)
                await RecalculatePlotReceivedAmountAsync(plot);
                
                // Log the updated received amount
                _logger.LogInformation("Plot {PlotNumber} received amount after token expiry: {ReceivedAmount}", 
                    plot.PlotNumber, plot.ReceivedAmount);
            }

            await _context.SaveChangesAsync();
            _logger.LogInformation("Manual token expiry processing completed");
        }

        private async Task RecalculatePlotReceivedAmountAsync(Models.Plot plot)
        {
            // Calculate total received amount from APPROVED and CONVERTED receipts ONLY (excluding Expired, Pending, Rejected)
            var totalReceivedAmount = await _context.Receipts
                .Where(r => r.PlotId == plot.Id && (r.Status == "Approved" || r.Status == "Converted"))
                .SumAsync(r => r.TotalAmount > 0 ? r.TotalAmount : r.Amount);

            var oldAmount = plot.ReceivedAmount;
            plot.ReceivedAmount = totalReceivedAmount;
            
            _logger.LogInformation("Plot {PlotNumber} received amount recalculated: {OldAmount} -> {NewAmount} (Approved + Converted receipts only)", 
                plot.PlotNumber, oldAmount, totalReceivedAmount);
        }

        public async Task<string> CalculatePlotStatusAsync(int plotId)
        {
            var plot = await _context.Plots
                .Include(p => p.Receipts)
                .FirstOrDefaultAsync(p => p.Id == plotId);

            if (plot == null) return "Available";

            var activeReceipts = plot.Receipts.Where(r => r.Status == "Approved" || r.Status == "Converted").ToList();
            
            // Check for token receipts
            var tokenReceipts = activeReceipts.Where(r => r.ReceiptType.ToLower() == "token").ToList();
            var bookingReceipts = activeReceipts.Where(r => r.ReceiptType.ToLower() == "booking").ToList();

            // If has booking receipts, calculate payment percentage
            if (bookingReceipts.Any())
            {
                var paymentPercentage = await GetPlotPaymentPercentageAsync(plotId);
                return paymentPercentage >= 60 ? "Sold" : "Booked";
            }

            // If has token receipts, check expiry
            if (tokenReceipts.Any())
            {
                var latestToken = tokenReceipts.OrderByDescending(r => r.CreatedAt).First();
                if (latestToken.TokenExpiryDate.HasValue && latestToken.TokenExpiryDate.Value.AddDays(1) > DateTime.UtcNow)
                {
                    return "Tokened";
                }
            }

            return "Available";
        }

        public async Task<decimal> GetPlotPaymentPercentageAsync(int plotId)
        {
            var plot = await _context.Plots
                .Include(p => p.Receipts)
                .FirstOrDefaultAsync(p => p.Id == plotId);

            if (plot == null || plot.TotalPrice == 0) return 0;

            // Calculate total approved and converted payments
            var totalPaid = plot.Receipts
                .Where(r => r.Status == "Approved" || r.Status == "Converted")
                .Sum(r => r.TotalAmount);

            return (totalPaid / plot.TotalPrice) * 100;
        }
        
        public async Task RecalculatePlotStatusAsync(int plotId)
        {
            var plot = await _context.Plots
                .Include(p => p.Receipts)
                .FirstOrDefaultAsync(p => p.Id == plotId);

            if (plot == null) return;

            var oldStatus = plot.Status;
            
            // Get all approved and converted receipts
            var activeReceipts = plot.Receipts
                .Where(r => r.Status == "Approved" || r.Status == "Converted")
                .ToList();

            // Check for different receipt types
            var hasBooking = activeReceipts.Any(r => r.ReceiptType.ToLower() == "booking");
            var hasNOC = activeReceipts.Any(r => r.ReceiptType.ToLower() == "noc");
            var hasPartPayment = activeReceipts.Any(r => r.ReceiptType.ToLower() == "partpayment");
            var hasToken = activeReceipts.Any(r => r.ReceiptType.ToLower() == "token");

            // Determine new status based on remaining receipts
            if (hasBooking || hasNOC || hasPartPayment)
            {
                // Calculate payment percentage
                var paymentPercentage = await GetPlotPaymentPercentageAsync(plotId);
                
                if (paymentPercentage >= 100)
                {
                    plot.Status = "Sold";
                }
                else if (paymentPercentage >= 30)
                {
                    plot.Status = "Booked";
                }
                else if (paymentPercentage > 0)
                {
                    plot.Status = "PartPayment";
                }
                else
                {
                    plot.Status = "Available";
                }
            }
            else if (hasToken)
            {
                // Only token receipts remain
                plot.Status = "Tokened";
            }
            else
            {
                // No active receipts
                plot.Status = "Available";
            }

            plot.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            
            _logger.LogInformation($"Plot {plot.PlotNumber} status recalculated from {oldStatus} to {plot.Status}");
        }
    }
}