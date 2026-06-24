using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Subh_sankalp_estate.Data;
using Subh_sankalp_estate.DTOs;
using Subh_sankalp_estate.Models;
using Subh_sankalp_estate.Services;
using System.Security.Claims;

namespace Subh_sankalp_estate.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ReceiptsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IReceiptService _receiptService;
        private readonly IPlotStatusService _plotStatusService;
        private readonly IBlobStorageService _blobStorageService;
        
        public ReceiptsController(ApplicationDbContext context, IReceiptService receiptService, IPlotStatusService plotStatusService, IBlobStorageService blobStorageService)
        {
            _context = context;
            _receiptService = receiptService;
            _plotStatusService = plotStatusService;
            _blobStorageService = blobStorageService;
        }
        
        [HttpPost]
        [Authorize(Roles = "Associate,Admin")]
        public async Task<ActionResult<ReceiptResponseDto>> CreateReceipt(CreateReceiptDto createReceiptDto)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            var userRole = User.FindFirst(ClaimTypes.Role)?.Value;
            
            // Get plot information
            var plot = await _context.Plots
                .FirstOrDefaultAsync(p => p.SiteName == createReceiptDto.SiteName && 
                                        p.PlotNumber == createReceiptDto.PlotVillaNo);
            
            if (plot == null)
            {
                return BadRequest("Plot not found");
            }

            // Determine receipt type - default to token, but allow booking for admin
            var receiptType = createReceiptDto.ReceiptType ?? "token";
            
            // Only admin can create booking receipts
            if (receiptType == "booking" && userRole != "Admin")
            {
                return Forbid("Only admin can create booking receipts");
            }
            
            // Auto-populate customer information from previous receipts if not provided
            if (string.IsNullOrEmpty(createReceiptDto.PanNumber) || string.IsNullOrEmpty(createReceiptDto.AadharNumber) || string.IsNullOrEmpty(createReceiptDto.CompanyName))
            {
                var previousReceipt = await _context.Receipts
                    .Where(r => r.SiteName == createReceiptDto.SiteName && r.PlotVillaNo == createReceiptDto.PlotVillaNo)
                    .OrderByDescending(r => r.CreatedAt)
                    .FirstOrDefaultAsync();
                
                if (previousReceipt != null)
                {
                    // Use previous receipt's PAN, AADHAR, and CompanyName if current ones are empty
                    if (string.IsNullOrEmpty(createReceiptDto.PanNumber) && !string.IsNullOrEmpty(previousReceipt.PanNumber))
                    {
                        createReceiptDto.PanNumber = previousReceipt.PanNumber;
                    }
                    if (string.IsNullOrEmpty(createReceiptDto.AadharNumber) && !string.IsNullOrEmpty(previousReceipt.AadharNumber))
                    {
                        createReceiptDto.AadharNumber = previousReceipt.AadharNumber;
                    }
                    if (string.IsNullOrEmpty(createReceiptDto.CompanyName) && !string.IsNullOrEmpty(previousReceipt.CompanyName))
                    {
                        createReceiptDto.CompanyName = previousReceipt.CompanyName;
                    }
                }
            }
            
            // Generate receipt number
            var receiptNo = await _receiptService.GenerateReceiptNumberAsync(receiptType);
            
            var receipt = new Receipt
            {
                ReceiptNo = receiptNo,
                ReceiptType = receiptType,
                Date = DateTime.UtcNow,
                FromName = createReceiptDto.FromName,
                RelationType = createReceiptDto.RelationType,
                RelationName = createReceiptDto.RelationName,
                Address = createReceiptDto.Address,
                Mobile = createReceiptDto.Mobile,
                PanNumber = createReceiptDto.PanNumber,
                AadharNumber = createReceiptDto.AadharNumber,
                CompanyName = createReceiptDto.CompanyName,
                TokenExpiryDate = receiptType == "token" ? (createReceiptDto.TokenExpiryDate ?? DateTime.UtcNow.AddDays(30)) : null,
                ReceivedAmount = createReceiptDto.ReceivedAmount,
                ReferenceName = createReceiptDto.ReferenceName,
                SiteName = createReceiptDto.SiteName,
                PlotVillaNo = createReceiptDto.PlotVillaNo,
                PlotSize = plot.PlotSize,
                BasicRate = plot.BasicRate,
                Amount = createReceiptDto.Amount,
                PLC = createReceiptDto.PLC,
                EDC = createReceiptDto.EDC,
                Other = createReceiptDto.Other,
                CashChecked = createReceiptDto.CashChecked,
                ChequeChecked = createReceiptDto.ChequeChecked,
                RtgsChecked = createReceiptDto.RtgsChecked,
                ChequeNo = createReceiptDto.ChequeNo,
                RtgsNeft = createReceiptDto.RtgsNeft,
                PaymentDate = createReceiptDto.PaymentDate,
                AssociateRemarks = createReceiptDto.AssociateRemarks,
                AdminRemarks = createReceiptDto.AdminRemarks,
                CreatedByUserId = userId,
                PlotId = plot.Id,
                // Special status for booking and NOC receipts, otherwise normal approval flow
                Status = receiptType == "booking" ? "Booking" : 
                        receiptType == "noc" ? "NOC" : 
                        (userRole == "Admin" ? "Approved" : "Pending")
            };
            
            // Calculate TotalAmount for admin-created receipts (auto-approved)
            if (userRole == "Admin")
            {
                var otherAmount = 0m;
                if (!string.IsNullOrEmpty(receipt.Other))
                {
                    if (!decimal.TryParse(receipt.Other, out otherAmount))
                    {
                        var numbers = System.Text.RegularExpressions.Regex.Match(receipt.Other, @"\d+\.?\d*");
                        if (numbers.Success)
                        {
                            decimal.TryParse(numbers.Value, out otherAmount);
                        }
                    }
                }
                receipt.TotalAmount = receipt.Amount; // Other charges are separate, not added to total
                
                // Verify user exists before setting ApprovedByUserId
                var userExists = await _context.Users.AnyAsync(u => u.Id == userId);
                if (userExists)
                {
                    receipt.ApprovedByUserId = userId;
                    receipt.ApprovedAt = DateTime.UtcNow;
                }
                else
                {
                    receipt.ApprovedAt = DateTime.UtcNow;
                    // ApprovedByUserId remains null
                }
            }
            
            // Capture payment history snapshot for booking receipts
            if (receiptType == "booking")
            {
                var paymentHistory = await _context.Receipts
                    .Where(r => r.SiteName == createReceiptDto.SiteName && 
                               r.PlotVillaNo == createReceiptDto.PlotVillaNo &&
                               (r.Status == "Approved" || r.Status == "Converted") &&
                               r.ReceiptType != "booking") // Exclude other booking receipts, include token and partpayment
                    .OrderBy(r => r.Date)
                    .Select(r => new
                    {
                        ReceiptNo = r.ReceiptNo,
                        ReceiptType = r.ReceiptType,
                        Date = r.Date,
                        PaymentMethod = r.CashChecked ? "Cash" : 
                                      r.ChequeChecked ? "Cheque (" + r.ChequeNo + ")" :
                                      r.RtgsChecked ? "RTGS/NEFT/UPI" : "N/A",
                        Amount = r.TotalAmount > 0 ? r.TotalAmount : r.Amount
                    })
                    .ToListAsync();
                
                receipt.PaymentHistorySnapshot = System.Text.Json.JsonSerializer.Serialize(paymentHistory);
            }
            
            _context.Receipts.Add(receipt);
            await _context.SaveChangesAsync();
            
            // Update plot's total price if PLC is provided (for token receipts)
            if (receiptType == "token" && createReceiptDto.PLC.HasValue && createReceiptDto.PLC.Value > 0)
            {
                await UpdatePlotTotalPriceWithPLCAsync(plot.Id, createReceiptDto.PLC.Value);
            }
            
            // Update plot status only if receipt is approved immediately (receipts created by admin)
            if (receipt.Status == "Approved")
            {
                await _plotStatusService.UpdatePlotStatusAsync(plot.Id, receiptType, receipt.TotalAmount);
                
                // If this is a booking receipt, convert any existing approved token receipts to "Converted" status
                if (receiptType == "booking")
                {
                    await ConvertTokenReceiptsToConvertedStatusAsync(plot.Id);
                }
            }
            
            // Update plot received amount after creating receipt
            await UpdatePlotReceivedAmountByPlotNumberAsync(createReceiptDto.SiteName, createReceiptDto.PlotVillaNo);
            
            return Ok(await GetReceiptResponse(receipt.Id));
        }
        
        [HttpGet]
        public async Task<ActionResult<PaginatedResult<ReceiptResponseDto>>> GetReceipts([FromQuery] ReceiptFilterDto filter)
        {
            try
            {
                var userRole = User.FindFirst(ClaimTypes.Role)?.Value;
                var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
                
                IQueryable<Receipt> query = _context.Receipts
                    .Include(r => r.CreatedBy);
            
            // Role-based filtering
            if (userRole == "Associate")
            {
                query = query.Where(r => r.CreatedByUserId == userId);
            }
            
            // Apply filters
            if (!string.IsNullOrEmpty(filter.CustomerName))
            {
                query = query.Where(r => r.FromName.Contains(filter.CustomerName));
            }
            
            if (!string.IsNullOrEmpty(filter.ReferenceName))
            {
                query = query.Where(r => r.ReferenceName.Contains(filter.ReferenceName));
            }
            
            if (!string.IsNullOrEmpty(filter.SiteName))
            {
                query = query.Where(r => r.SiteName.Contains(filter.SiteName));
            }
            
            if (!string.IsNullOrEmpty(filter.PlotNumber))
            {
                query = query.Where(r => r.PlotVillaNo.Contains(filter.PlotNumber));
            }
            
            if (!string.IsNullOrEmpty(filter.Mobile))
            {
                query = query.Where(r => r.Mobile.Contains(filter.Mobile));
            }
            
            if (!string.IsNullOrEmpty(filter.Status))
            {
                query = query.Where(r => r.Status == filter.Status);
            }
            
            if (!string.IsNullOrEmpty(filter.ReceiptType))
            {
                query = query.Where(r => r.ReceiptType == filter.ReceiptType);
            }
            
            if (!string.IsNullOrEmpty(filter.CompanyName))
            {
                query = query.Where(r => r.CompanyName == filter.CompanyName);
            }
            
            if (filter.FromDate.HasValue)
            {
                query = query.Where(r => r.Date >= filter.FromDate.Value);
            }
            
            if (filter.ToDate.HasValue)
            {
                query = query.Where(r => r.Date <= filter.ToDate.Value);
            }
            
            if (filter.TokenExpiryFromDate.HasValue)
            {
                query = query.Where(r => r.TokenExpiryDate >= filter.TokenExpiryFromDate.Value);
            }
            
            if (filter.TokenExpiryToDate.HasValue)
            {
                query = query.Where(r => r.TokenExpiryDate <= filter.TokenExpiryToDate.Value);
            }
            
            if (filter.MinAmount.HasValue)
            {
                query = query.Where(r => r.Amount >= filter.MinAmount.Value);
            }
            
            if (filter.MaxAmount.HasValue)
            {
                query = query.Where(r => r.Amount <= filter.MaxAmount.Value);
            }
            
            if (filter.CreatedByUserId.HasValue)
            {
                query = query.Where(r => r.CreatedByUserId == filter.CreatedByUserId.Value);
            }
            
            if (filter.CashPayment.HasValue)
            {
                query = query.Where(r => r.CashChecked == filter.CashPayment.Value);
            }
            
            // Payment Type filter (Cash, Cheque, RTGS)
            if (!string.IsNullOrEmpty(filter.PaymentType))
            {
                switch (filter.PaymentType.ToLower())
                {
                    case "cash":
                        query = query.Where(r => r.CashChecked == true);
                        break;
                    case "cheque":
                        query = query.Where(r => r.ChequeChecked == true);
                        break;
                    case "rtgs":
                        query = query.Where(r => r.RtgsChecked == true);
                        break;
                }
            }
            
            if (filter.ChequePayment.HasValue)
            {
                query = query.Where(r => r.ChequeChecked == filter.ChequePayment.Value);
            }
            
            if (!string.IsNullOrEmpty(filter.ChequeNo))
            {
                query = query.Where(r => r.ChequeNo.Contains(filter.ChequeNo));
            }
            
            // Get total count before pagination
            var totalRecords = await query.CountAsync();
            
            // Apply sorting (except for receiptno which needs in-memory sorting)
            var sortBy = filter.SortBy?.ToLower();
            var isReceiptNoSort = sortBy == "receiptno";
            
            if (!isReceiptNoSort)
            {
                query = ApplyReceiptSorting(query, filter.SortBy, filter.SortOrder);
            }
            else
            {
                // For receipt number sorting, use default CreatedAt sorting in DB, then sort in memory
                var isDescending = filter.SortOrder?.ToLower() == "desc";
                query = isDescending ? query.OrderByDescending(r => r.CreatedAt) : query.OrderBy(r => r.CreatedAt);
            }
            
            // Apply pagination
            var receipts = await query
                .Skip((filter.Page - 1) * filter.PageSize)
                .Take(filter.PageSize)
                .ToListAsync();
            
            // Apply in-memory sorting for receipt numbers if needed
            if (isReceiptNoSort)
            {
                var isDescending = filter.SortOrder?.ToLower() == "desc";
                receipts = isDescending 
                    ? receipts.OrderByDescending(r => ExtractReceiptNumber(r.ReceiptNo)).ToList()
                    : receipts.OrderBy(r => ExtractReceiptNumber(r.ReceiptNo)).ToList();
            }
            
            var result = receipts.Select(r => new ReceiptResponseDto
            {
                Id = r.Id,
                ReceiptNo = r.ReceiptNo,
                ReceiptType = r.ReceiptType,
                Date = r.Date,
                FromName = r.FromName,
                RelationType = r.RelationType,
                RelationName = r.RelationName,
                Address = r.Address,
                Mobile = r.Mobile,
                PanNumber = r.PanNumber,
                AadharNumber = r.AadharNumber,
                CompanyName = r.CompanyName,
                TokenExpiryDate = r.TokenExpiryDate,
                ReferenceName = r.ReferenceName,
                SiteName = r.SiteName,
                PlotVillaNo = r.PlotVillaNo,
                PlotSize = r.PlotSize,
                BasicRate = r.BasicRate,
                Amount = r.Amount,
                Other = r.Other,
                TotalAmount = r.TotalAmount,
                CashChecked = r.CashChecked,
                ChequeChecked = r.ChequeChecked,
                RtgsChecked = r.RtgsChecked,
                ChequeNo = r.ChequeNo,
                RtgsNeft = r.RtgsNeft,
                PaymentDate = r.PaymentDate,
                Status = r.Status,
                AdminDiscount = r.AdminDiscount,
                AdminRemarks = r.AdminRemarks,
                AssociateRemarks = r.AssociateRemarks,
                CreatedByName = r.CreatedBy.FullName,
                CreatedAt = r.CreatedAt,
                AttachedFiles = string.IsNullOrEmpty(r.AttachedFiles) ? new List<string>() : 
                    System.Text.Json.JsonSerializer.Deserialize<List<string>>(r.AttachedFiles) ?? new List<string>(),
                PaymentHistory = string.IsNullOrEmpty(r.PaymentHistorySnapshot) ? null :
                    System.Text.Json.JsonSerializer.Deserialize<List<PaymentHistoryItemDto>>(r.PaymentHistorySnapshot)
            });
            
            var totalPages = (int)Math.Ceiling((double)totalRecords / filter.PageSize);
            
            return Ok(new PaginatedResult<ReceiptResponseDto>
            {
                Data = result,
                TotalRecords = totalRecords,
                Page = filter.Page,
                PageSize = filter.PageSize,
                TotalPages = totalPages,
                HasNextPage = filter.Page < totalPages,
                HasPreviousPage = filter.Page > 1
            });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }
        
        [HttpGet("{id}")]
        public async Task<ActionResult<ReceiptResponseDto>> GetReceipt(long id)
        {
            var receipt = await GetReceiptResponse(id);
            if (receipt == null)
            {
                return NotFound();
            }
            
            return Ok(receipt);
        }
        
        [HttpPut("{id}")]
        [Authorize(Roles = "Associate,Admin")]
        public async Task<ActionResult<ReceiptResponseDto>> UpdateReceipt(long id, UpdateReceiptDto updateReceiptDto)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            var userRole = User.FindFirst(ClaimTypes.Role)?.Value;
            
            var receipt = await _context.Receipts
                .Include(r => r.Plot)
                .FirstOrDefaultAsync(r => r.Id == id);
                
            if (receipt == null)
            {
                return NotFound("Receipt not found");
            }
            
            // Check permissions - Associates can only edit their own receipts, Admins can edit any
            if (userRole == "Associate" && receipt.CreatedByUserId != userId)
            {
                return Forbid("You can only edit receipts you created");
            }
            
            // Permission-based editing rules:
            // Associates: Can only edit their own pending receipts
            // Admins: Can edit any pending receipt OR any approved receipt
            if (userRole == "Associate" && receipt.Status != "Pending")
            {
                return BadRequest("Associates can only edit pending receipts");
            }
            
            if (userRole == "Admin" && receipt.Status != "Pending" && receipt.Status != "Approved" && receipt.Status != "Expired")
            {
                return BadRequest("Admins can only edit pending, approved, or Expired receipts");
            }
            
            //Update receipt fields 
            receipt.FromName = updateReceiptDto.FromName ?? receipt.FromName;
            receipt.Mobile = updateReceiptDto.Mobile ?? receipt.Mobile;
            receipt.Address = updateReceiptDto.Address ?? receipt.Address;
            receipt.RelationType = updateReceiptDto.RelationType ?? receipt.RelationType;
            receipt.RelationName = updateReceiptDto.RelationName ?? receipt.RelationName;
            receipt.PanNumber = updateReceiptDto.PanNumber ?? receipt.PanNumber;
            receipt.AadharNumber = updateReceiptDto.AadharNumber ?? receipt.AadharNumber;
            receipt.CompanyName = updateReceiptDto.CompanyName ?? receipt.CompanyName;
            receipt.ReferenceName = updateReceiptDto.ReferenceName ?? receipt.ReferenceName;
            receipt.Other = updateReceiptDto.Other ?? receipt.Other;
            
            // Update payment details if provided 
            if (updateReceiptDto.Amount.HasValue)
            {
                receipt.Amount = updateReceiptDto.Amount.Value;
                receipt.TotalAmount = updateReceiptDto.Amount.Value;
            }
            
            // Track if PLC changed to update plot total price
            bool plcChanged = false;
            decimal? newPLC = null;
            
            if (updateReceiptDto.PLC.HasValue)
            {
                if (receipt.PLC != updateReceiptDto.PLC.Value)
                {
                    plcChanged = true;
                    newPLC = updateReceiptDto.PLC.Value;
                }
                receipt.PLC = updateReceiptDto.PLC.Value;
            }
                
            if (updateReceiptDto.EDC.HasValue)
                receipt.EDC = updateReceiptDto.EDC.Value;
            
            // Update payment methods
            if (updateReceiptDto.CashChecked.HasValue)
                receipt.CashChecked = updateReceiptDto.CashChecked.Value;
            if (updateReceiptDto.ChequeChecked.HasValue)
                receipt.ChequeChecked = updateReceiptDto.ChequeChecked.Value;
            if (updateReceiptDto.RtgsChecked.HasValue)
                receipt.RtgsChecked = updateReceiptDto.RtgsChecked.Value;
                
            receipt.ChequeNo = updateReceiptDto.ChequeNo ?? receipt.ChequeNo;
            receipt.RtgsNeft = updateReceiptDto.RtgsNeft ?? receipt.RtgsNeft;
            
            // Update dates if provided
            if (updateReceiptDto.Date.HasValue)
                receipt.Date = updateReceiptDto.Date.Value;
            if (updateReceiptDto.TokenExpiryDate.HasValue)
                receipt.TokenExpiryDate = updateReceiptDto.TokenExpiryDate.Value;
            if (updateReceiptDto.PaymentDate.HasValue)
                receipt.PaymentDate = updateReceiptDto.PaymentDate.Value;
            
            // Update status if admin and provided
            if (userRole == "Admin" && !string.IsNullOrEmpty(updateReceiptDto.Status))
            {
                var oldStatus = receipt.Status;
                receipt.Status = updateReceiptDto.Status;
                
                Console.WriteLine($"=== RECEIPT STATUS CHANGE ===");
                Console.WriteLine($"Receipt ID: {receipt.Id}");
                Console.WriteLine($"Receipt No: {receipt.ReceiptNo}");
                Console.WriteLine($"Old Status: {oldStatus}");
                Console.WriteLine($"New Status: {receipt.Status}");
                Console.WriteLine($"Changed by Admin: {User.FindFirst(ClaimTypes.Name)?.Value}");
                
                // If status changed to "Transferred", "Cancelled", or "Expired", check if plot should be freed
                if ((receipt.Status == "Transferred" || receipt.Status == "Cancelled" || receipt.Status == "Expired") && receipt.Plot != null)
                {
                    var plot = receipt.Plot;
                    var oldPlotStatus = plot.Status;
                    
                    var reason = receipt.Status == "Transferred" 
                        ? "Receipt marked as Transferred (customer moved to different plot)"
                        : receipt.Status == "Cancelled"
                        ? "Receipt marked as Cancelled (transaction cancelled by customer/admin)"
                        : "Receipt marked as Expired (token validity ended)";
                    
                    Console.WriteLine($"=== CHECKING IF PLOT SHOULD BE FREED DUE TO {receipt.Status.ToUpper()} ===");
                    Console.WriteLine($"Plot: {plot.SiteName} - {plot.PlotNumber}");
                    Console.WriteLine($"Old Plot Status: {oldPlotStatus}");
                    
                    // Check if there are any other active (Approved) receipts for this plot
                    var hasOtherActiveReceipts = await _context.Receipts
                        .AnyAsync(r => r.PlotId == plot.Id && 
                                      r.Id != receipt.Id && 
                                      r.Status == "Approved");
                    
                    if (hasOtherActiveReceipts)
                    {
                        Console.WriteLine($"Plot has other active receipts - NOT freeing the plot");
                        Console.WriteLine($"Plot will remain in status: {plot.Status}");
                    }
                    else
                    {
                        // No other active receipts - free the plot
                        plot.Status = "Available";
                        plot.ReceivedAmount = 0;
                        plot.UpdatedAt = DateTime.UtcNow;
                        
                        Console.WriteLine($"No other active receipts found");
                        Console.WriteLine($"New Plot Status: {plot.Status}");
                        Console.WriteLine($"Received Amount Reset: ₹{plot.ReceivedAmount}");
                        Console.WriteLine($"Reason: {reason}");
                    }
                    
                    Console.WriteLine($"=== PLOT CHECK END ===");
                }
                
                Console.WriteLine($"=== RECEIPT STATUS CHANGE END ===");
            }
            
            // Update basic rate if admin and provided
            if (userRole == "Admin" && updateReceiptDto.CustomBasicRate.HasValue)
            {
                var newBasicRate = updateReceiptDto.CustomBasicRate.Value;
                var oldReceiptBasicRate = receipt.BasicRate;
                
                // Update receipt basic rate
                receipt.BasicRate = newBasicRate;
                
                // Also update the plot's basic rate to keep them in sync
                if (receipt.Plot != null)
                {
                    var oldPlotBasicRate = receipt.Plot.BasicRate;
                    
                    // Check if this receipt has the most recent date for this plot
                    var mostRecentReceipt = await _context.Receipts
                        .Where(r => r.PlotId == receipt.PlotId && r.Status == "Approved")
                        .OrderByDescending(r => r.Date)
                        .FirstOrDefaultAsync();
                    
                    // Update plot basic rate if this is the most recent receipt or if we're editing the most recent one
                    if (mostRecentReceipt?.Id == receipt.Id)
                    {
                        receipt.Plot.BasicRate = newBasicRate;
                        receipt.Plot.UpdatedAt = DateTime.UtcNow;
                        
                        // Recalculate plot total price based on new basic rate
                        var plotSizeText = receipt.Plot.PlotSize?.Replace("sq yard", "").Replace("sq ft", "").Trim();
                        if (decimal.TryParse(plotSizeText, out var plotSize))
                        {
                            receipt.Plot.TotalPrice = plotSize * newBasicRate;
                        }
                        
                        Console.WriteLine($"=== BASIC RATE UPDATE (MOST RECENT RECEIPT) ===");
                        Console.WriteLine($"Plot: {receipt.Plot.SiteName} - {receipt.Plot.PlotNumber}");
                        Console.WriteLine($"Receipt Basic Rate: {oldReceiptBasicRate} → {newBasicRate}");
                        Console.WriteLine($"Plot Basic Rate: {oldPlotBasicRate} → {receipt.Plot.BasicRate}");
                        Console.WriteLine($"Plot Total Price: {receipt.Plot.TotalPrice}");
                        Console.WriteLine($"This receipt is the most recent for this plot");
                        Console.WriteLine($"=== BASIC RATE UPDATE END ===");
                    }
                    else
                    {
                        Console.WriteLine($"=== BASIC RATE UPDATE (OLDER RECEIPT) ===");
                        Console.WriteLine($"Plot: {receipt.Plot.SiteName} - {receipt.Plot.PlotNumber}");
                        Console.WriteLine($"Receipt Basic Rate: {oldReceiptBasicRate} → {newBasicRate}");
                        Console.WriteLine($"Plot Basic Rate: {oldPlotBasicRate} (unchanged - this is not the most recent receipt)");
                        Console.WriteLine($"Most recent receipt ID: {mostRecentReceipt?.Id}, Current receipt ID: {receipt.Id}");
                        Console.WriteLine($"=== BASIC RATE UPDATE END ===");
                    }
                }
            }
            
            receipt.UpdatedAt = DateTime.UtcNow;
            
            // Log the edit for approved receipts (important for audit trail)
            if (receipt.Status == "Approved")
            {
                Console.WriteLine($"=== APPROVED RECEIPT EDITED ===");
                Console.WriteLine($"Receipt ID: {receipt.Id}");
                Console.WriteLine($"Receipt No: {receipt.ReceiptNo}");
                Console.WriteLine($"Edited by Admin: {User.FindFirst(ClaimTypes.Name)?.Value}");
                Console.WriteLine($"Edit timestamp: {DateTime.UtcNow}");
                Console.WriteLine($"=== APPROVED RECEIPT EDITED END ===");
            }
            
            try
            {
                await _context.SaveChangesAsync();
                
                // Update plot's total price if PLC was changed (for token receipts)
                if (plcChanged && receipt.ReceiptType == "token" && receipt.Plot != null && newPLC.HasValue && newPLC.Value > 0)
                {
                    await UpdatePlotTotalPriceWithPLCAsync(receipt.Plot.Id, newPLC.Value);
                }
                
                // Update plot received amount after editing receipt (important for approved receipts)
                await UpdatePlotReceivedAmountByPlotNumberAsync(receipt.SiteName, receipt.PlotVillaNo);
                
                return Ok(await GetReceiptResponse(receipt.Id));
            }
            catch (Exception ex)
            {
                return BadRequest($"Error updating receipt: {ex.Message}");
            }
        }
        
        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult> DeleteReceipt(long id)
        {
            var receipt = await _context.Receipts
                .Include(r => r.Plot)
                .FirstOrDefaultAsync(r => r.Id == id);
                
            if (receipt == null)
            {
                return NotFound("Receipt not found");
            }
            
            // Only allow deletion of booking and NOC receipts
            if (receipt.ReceiptType != "booking" && receipt.ReceiptType != "noc")
            {
                return BadRequest("Only booking and NOC receipts can be deleted. Token and PartPayment receipts cannot be deleted.");
            }
            
            // Store plot info before deletion for updating plot status
            var plotId = receipt.PlotId;
            var siteName = receipt.SiteName;
            var plotNumber = receipt.PlotVillaNo;
            
            try
            {
                // Delete the receipt
                _context.Receipts.Remove(receipt);
                await _context.SaveChangesAsync();
                
                // Update plot status after deletion
                if (plotId.HasValue)
                {
                    // Recalculate plot status based on remaining receipts
                    await _plotStatusService.RecalculatePlotStatusAsync(plotId.Value);
                }
                
                // Update plot received amount
                await UpdatePlotReceivedAmountByPlotNumberAsync(siteName, plotNumber);
                
                return Ok(new { message = "Receipt deleted successfully" });
            }
            catch (Exception ex)
            {
                return BadRequest($"Error deleting receipt: {ex.Message}");
            }
        }
        
        [HttpPost("{id}/approve")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult> ApproveReceipt(long id, ApproveReceiptDto approveDto)
        {
            var receipt = await _context.Receipts
                .Include(r => r.Plot)
                .FirstOrDefaultAsync(r => r.Id == id);
                
            if (receipt == null)
            {
                return NotFound();
            }
            
            // DEBUG: Log the receipt state BEFORE approval
            Console.WriteLine($"=== BEFORE APPROVAL ===");
            Console.WriteLine($"Receipt ID: {receipt.Id}");
            Console.WriteLine($"Receipt Amount: ₹{receipt.Amount}");
            Console.WriteLine($"Receipt TotalAmount: ₹{receipt.TotalAmount}");
            Console.WriteLine($"Receipt Other: {receipt.Other}");
            Console.WriteLine($"=== BEFORE APPROVAL END ===");
            
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            
            receipt.Status = "Approved";
            receipt.AdminDiscount = approveDto.Discount ?? 0;
            receipt.AdminRemarks = approveDto.Remarks;
            
            // Verify user exists before setting ApprovedByUserId
            var userExists = await _context.Users.AnyAsync(u => u.Id == userId);
            if (userExists)
            {
                receipt.ApprovedByUserId = userId;
            }
            else
            {
                Console.WriteLine($"Warning: User ID {userId} not found in database. Receipt will be approved without ApprovedByUserId.");
                // ApprovedByUserId remains null
            }
            
            receipt.ApprovedAt = DateTime.UtcNow;
            receipt.UpdatedAt = DateTime.UtcNow;
            
            // Update expiry date if extended
            if (approveDto.ExtendedExpiryDate.HasValue)
            {
                var oldExpiryDate = receipt.TokenExpiryDate;
                receipt.TokenExpiryDate = approveDto.ExtendedExpiryDate;
                
                Console.WriteLine($"=== EXPIRY DATE UPDATE ===");
                Console.WriteLine($"Original Expiry Date: {oldExpiryDate}");
                Console.WriteLine($"New Expiry Date: {receipt.TokenExpiryDate}");
                Console.WriteLine($"=== EXPIRY DATE UPDATE END ===");
            }
            
            // STEP 1: Handle receipt amount (NO DISCOUNT APPLIED HERE)
            // Keep the original receipt amount exactly as entered by the associate
            var originalReceiptAmount = receipt.Amount; // Always use the original Amount field
            
            // Parse Other field for additional charges only
            var otherAmount = 0m;
            if (!string.IsNullOrEmpty(receipt.Other))
            {
                if (!decimal.TryParse(receipt.Other, out otherAmount))
                {
                    var numbers = System.Text.RegularExpressions.Regex.Match(receipt.Other, @"\d+\.?\d*");
                    if (numbers.Success)
                    {
                        decimal.TryParse(numbers.Value, out otherAmount);
                    }
                }
            }
            
            // Set receipt TotalAmount = Original Amount (Other charges are separate, not added to total)
            receipt.TotalAmount = originalReceiptAmount;
            
            // DEBUG: Log the receipt state AFTER setting TotalAmount
            Console.WriteLine($"=== AFTER SETTING TOTALAMOUNT ===");
            Console.WriteLine($"Receipt TotalAmount set to: ₹{receipt.TotalAmount}");
            Console.WriteLine($"Original Receipt Amount: ₹{originalReceiptAmount}");
            Console.WriteLine($"Other Amount: ₹{otherAmount} (NOT added to total)");
            Console.WriteLine($"=== AFTER SETTING TOTALAMOUNT END ===");
            
            Console.WriteLine($"=== RECEIPT AMOUNT (NO DISCOUNT) ===");
            Console.WriteLine($"Original Receipt Amount: ₹{originalReceiptAmount}");
            Console.WriteLine($"Other Charges: ₹{otherAmount} (separate, not added to total)");
            Console.WriteLine($"Final Receipt Amount: ₹{receipt.TotalAmount}");
            Console.WriteLine($"IMPORTANT: Receipt amount is NOT affected by discount or other charges");
            Console.WriteLine($"=== RECEIPT AMOUNT END ===");
            
            // STEP 2: Apply BASIC RATE DISCOUNT to PLOT ONLY (separate from receipt)
            if (receipt.Plot != null && approveDto.Discount.HasValue && approveDto.Discount.Value > 0)
            {
                Console.WriteLine($"=== PLOT DISCOUNT (SEPARATE FROM RECEIPT) ===");
                
                var plotSize = ParsePlotSize(receipt.Plot.PlotSize);
                var basicRateDiscount = approveDto.Discount.Value;
                
                // Get current plot values
                var currentBasicRate = receipt.Plot.BasicRate;
                var currentTotalPrice = receipt.Plot.TotalPrice > 0 ? receipt.Plot.TotalPrice : (plotSize * currentBasicRate);
                
                Console.WriteLine($"Plot: {receipt.Plot.SiteName} - {receipt.Plot.PlotNumber}");
                Console.WriteLine($"Plot Size: {plotSize} sq yard");
                Console.WriteLine($"Current Basic Rate: ₹{currentBasicRate}/sq yard");
                Console.WriteLine($"Current Total Price: ₹{currentTotalPrice}");
                Console.WriteLine($"Discount to Apply: ₹{basicRateDiscount}/sq yard");
                
                // Calculate new basic rate after discount
                var newBasicRate = Math.Max(0, currentBasicRate - basicRateDiscount);
                var newTotalPrice = plotSize * newBasicRate;
                var totalDiscountAmount = currentTotalPrice - newTotalPrice;
                
                // Update BOTH the plot AND the receipt's basic rate
                receipt.Plot.BasicRate = newBasicRate;
                receipt.Plot.TotalPrice = newTotalPrice;
                receipt.Plot.UpdatedAt = DateTime.UtcNow;
                
                // Also update the receipt's basic rate to reflect the discount
                receipt.BasicRate = newBasicRate;
                
                Console.WriteLine($"NEW Basic Rate: ₹{newBasicRate}/sq yard");
                Console.WriteLine($"NEW Total Price: ₹{newTotalPrice}");
                Console.WriteLine($"Total Discount Applied: ₹{totalDiscountAmount}");
                Console.WriteLine($"Receipt Amount Unchanged: ₹{receipt.TotalAmount}");
                Console.WriteLine($"Receipt Basic Rate Updated: ₹{receipt.BasicRate}/sq yard");
                
                // Verify the receipt entity state
                var receiptEntityEntry = _context.Entry(receipt);
                Console.WriteLine($"Receipt Entity State: {receiptEntityEntry.State}");
                Console.WriteLine($"Receipt BasicRate Property Modified: {receiptEntityEntry.Property(r => r.BasicRate).IsModified}");
                
                Console.WriteLine($"=== PLOT DISCOUNT END ===");
            }
            
            // Explicitly mark receipt and specific properties as modified to ensure changes are saved
            var receiptEntry = _context.Entry(receipt);
            receiptEntry.State = EntityState.Modified;
            
            // Explicitly mark the fields we want to update
            receiptEntry.Property(r => r.Status).IsModified = true;
            receiptEntry.Property(r => r.AdminDiscount).IsModified = true;
            receiptEntry.Property(r => r.AdminRemarks).IsModified = true;
            receiptEntry.Property(r => r.ApprovedByUserId).IsModified = true;
            receiptEntry.Property(r => r.ApprovedAt).IsModified = true;
            receiptEntry.Property(r => r.TotalAmount).IsModified = true;
            receiptEntry.Property(r => r.UpdatedAt).IsModified = true;
            
            // Mark BasicRate as modified if discount was applied
            if (approveDto.Discount.HasValue && approveDto.Discount.Value > 0)
            {
                receiptEntry.Property(r => r.BasicRate).IsModified = true;
                Console.WriteLine($"Explicitly marked BasicRate as modified: ₹{receipt.BasicRate}");
            }
            
            // Mark TokenExpiryDate as modified if extended
            if (approveDto.ExtendedExpiryDate.HasValue)
            {
                receiptEntry.Property(r => r.TokenExpiryDate).IsModified = true;
                Console.WriteLine($"Explicitly marked TokenExpiryDate as modified: {receipt.TokenExpiryDate}");
            }
            
            // Save changes to the existing receipt (no new receipt created)
            await _context.SaveChangesAsync();
            
            Console.WriteLine($"=== RECEIPT UPDATES SAVED ===");
            Console.WriteLine($"Receipt ID: {receipt.Id}");
            Console.WriteLine($"Updated Basic Rate: ₹{receipt.BasicRate}");
            Console.WriteLine($"Updated Expiry Date: {receipt.TokenExpiryDate}");
            
            // Verify the receipt was actually saved to database
            var savedReceipt = await _context.Receipts.AsNoTracking().FirstOrDefaultAsync(r => r.Id == receipt.Id);
            Console.WriteLine($"Database Verification - Receipt BasicRate: ₹{savedReceipt?.BasicRate}");
            Console.WriteLine($"Database Verification - Receipt TokenExpiryDate: {savedReceipt?.TokenExpiryDate}");
            Console.WriteLine($"Database Verification - Receipt Status: {savedReceipt?.Status}");
            Console.WriteLine($"Database Verification - Receipt AdminDiscount: ₹{savedReceipt?.AdminDiscount}");
            Console.WriteLine($"Database Verification - Receipt UpdatedAt: {savedReceipt?.UpdatedAt}");
            
            Console.WriteLine($"=== RECEIPT UPDATES SAVED END ===");
            
            Console.WriteLine($"=== AFTER SAVE - BEFORE UPDATE ===");
            Console.WriteLine($"Receipt TotalAmount after save: ₹{receipt.TotalAmount}");
            Console.WriteLine($"Plot TotalPrice after save: ₹{receipt.Plot?.TotalPrice}");
            Console.WriteLine($"=== CALLING UPDATE METHOD ===");
            
            // Update plot received amount after approval
            await UpdatePlotReceivedAmountByPlotNumberAsync(receipt.SiteName, receipt.PlotVillaNo);
            
            // Update plot status after approval using PlotStatusService
            if (receipt.Plot != null)
            {
                await _plotStatusService.UpdatePlotStatusAsync(receipt.Plot.Id, receipt.ReceiptType, receipt.TotalAmount);
            }
            
            // Check values after update
            var updatedReceipt = await _context.Receipts.FindAsync(receipt.Id);
            var updatedPlot = await _context.Plots.FindAsync(receipt.Plot?.Id);
            
            Console.WriteLine($"=== AFTER UPDATE METHOD ===");
            Console.WriteLine($"Receipt TotalAmount after update: ₹{updatedReceipt?.TotalAmount}");
            Console.WriteLine($"Receipt BasicRate after update: ₹{updatedReceipt?.BasicRate}");
            Console.WriteLine($"Plot TotalPrice after update: ₹{updatedPlot?.TotalPrice}");
            Console.WriteLine($"Plot BasicRate after update: ₹{updatedPlot?.BasicRate}");
            Console.WriteLine($"Plot ReceivedAmount after update: ₹{updatedPlot?.ReceivedAmount}");
            Console.WriteLine($"=== FINAL VALUES ===");
            
            return Ok();
        }
        
        [HttpPost("{id}/reject")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult> RejectReceipt(long id, ApproveReceiptDto rejectDto)
        {
            var receipt = await _context.Receipts
                .Include(r => r.Plot)
                .FirstOrDefaultAsync(r => r.Id == id);
                
            if (receipt == null)
            {
                return NotFound();
            }
            
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            
            receipt.Status = "Rejected";
            receipt.AdminRemarks = rejectDto.Remarks;
            
            // Verify user exists before setting ApprovedByUserId
            var userExists = await _context.Users.AnyAsync(u => u.Id == userId);
            if (userExists)
            {
                receipt.ApprovedByUserId = userId;
            }
            else
            {
                Console.WriteLine($"Warning: User ID {userId} not found in database. Receipt will be rejected without ApprovedByUserId.");
                // ApprovedByUserId remains null
            }
            
            receipt.ApprovedAt = DateTime.UtcNow;
            

            
            await _context.SaveChangesAsync();
            
            // Update plot received amount after rejection
            await UpdatePlotReceivedAmountByPlotNumberAsync(receipt.SiteName, receipt.PlotVillaNo);
            
            // Recalculate plot status after rejection
            if (receipt.Plot != null)
            {
                var currentStatus = await _plotStatusService.CalculatePlotStatusAsync(receipt.Plot.Id);
                receipt.Plot.Status = currentStatus;
                receipt.Plot.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
            }
            
            return Ok();
        }
        
        [HttpGet("customer")]
        [Authorize(Roles = "Customer")]
        public async Task<ActionResult<IEnumerable<ReceiptResponseDto>>> GetCustomerReceipts()
        {
            var siteName = User.FindFirst("SiteName")?.Value;
            var plotNumber = User.FindFirst("PlotNumber")?.Value;
             Console.WriteLine($"site name {siteName}")  ;  
                Console.WriteLine($"plot number {plotNumber}")  ;   
            
            if (string.IsNullOrEmpty(siteName) || string.IsNullOrEmpty(plotNumber))
            {
                return BadRequest("Invalid customer token");
            }
            
            var receipts = await _context.Receipts
                .Include(r => r.CreatedBy)
                .Include(r => r.Payments)
                .Where(r => r.SiteName == siteName && r.PlotVillaNo == plotNumber && (r.Status == "Approved" || r.Status == "Converted"))
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync();

            // Console.WriteLine($"B15 receipts : {receipts}")  ;  
            
            var result = receipts.Select(r => new ReceiptResponseDto
            {
                Id = r.Id,
                ReceiptNo = r.ReceiptNo,
                ReceiptType = r.ReceiptType,
                Date = r.Date,
                FromName = r.FromName,
                PanNumber = r.PanNumber,
                AadharNumber = r.AadharNumber,
                CompanyName = r.CompanyName,
                ReferenceName = r.ReferenceName,
                SiteName = r.SiteName,
                PlotVillaNo = r.PlotVillaNo,
                PlotSize = r.PlotSize,
                BasicRate = r.BasicRate,
                Amount = r.Amount,
                Other = r.Other,
                TotalAmount = r.TotalAmount,
                CashChecked = r.CashChecked,
                ChequeChecked = r.ChequeChecked,
                RtgsChecked = r.RtgsChecked,
                ChequeNo = r.ChequeNo,
                RtgsNeft = r.RtgsNeft,
                PaymentDate = r.PaymentDate,
                Status = r.Status,
                AdminDiscount = r.AdminDiscount,
                CreatedByName = r.CreatedBy.FullName,
                CreatedAt = r.CreatedAt
            });
            
            return Ok(result);
        }
        
        [HttpGet("search")]
        public async Task<ActionResult<IEnumerable<ReceiptResponseDto>>> SearchReceipts([FromQuery] string searchTerm)
        {
            if (string.IsNullOrEmpty(searchTerm))
            {
                return BadRequest("Search term is required");
            }
            
            var userRole = User.FindFirst(ClaimTypes.Role)?.Value;
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            
            IQueryable<Receipt> query = _context.Receipts
                .Include(r => r.CreatedBy)
                .Include(r => r.Plot);
            
            // Role-based filtering
            if (userRole == "Associate")
            {
                query = query.Where(r => r.CreatedByUserId == userId);
            }
            
            // Search across multiple fields
            query = query.Where(r => 
                r.ReceiptNo.Contains(searchTerm) ||
                r.FromName.Contains(searchTerm) ||
                r.Mobile.Contains(searchTerm) ||
                r.SiteName.Contains(searchTerm) ||
                r.PlotVillaNo.Contains(searchTerm) ||
                r.ReferenceName.Contains(searchTerm) ||
                r.ChequeNo.Contains(searchTerm) ||
                r.RtgsNeft.Contains(searchTerm)
            );
            
            var receipts = await query
                .OrderByDescending(r => r.CreatedAt)
                .Take(20) // Limit search results
                .ToListAsync();
            
            var result = receipts.Select(r => new ReceiptResponseDto
            {
                Id = r.Id,
                ReceiptNo = r.ReceiptNo,
                ReceiptType = r.ReceiptType,
                Date = r.Date,
                FromName = r.FromName,
                Mobile = r.Mobile,
                PanNumber = r.PanNumber,
                AadharNumber = r.AadharNumber,
                CompanyName = r.CompanyName,
                ReferenceName = r.ReferenceName,
                SiteName = r.SiteName,
                PlotVillaNo = r.PlotVillaNo,
                Amount = r.Amount,
                Status = r.Status,
                CreatedByName = r.CreatedBy.FullName,
                CreatedAt = r.CreatedAt
            });
            
            return Ok(result);
        }
        
        [HttpGet("expiring-tokens")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<IEnumerable<ReceiptResponseDto>>> GetExpiringTokens([FromQuery] int days = 7)
        {
            var currentDate = DateTime.UtcNow;
            var expiryDate = currentDate.AddDays(days);
            
            // Show APPROVED tokens that expire from TOMORROW to next X days (excluding today's expiring tokens)
            var currentDateOnly = currentDate.Date;
            var tomorrowDateOnly = currentDateOnly.AddDays(1);
            var expiryDateOnly = currentDateOnly.AddDays(days);
            
            var receipts = await _context.Receipts
                .Include(r => r.CreatedBy)
                .Where(r => r.ReceiptType.ToLower() == "token" && 
                           r.Status == "Approved" &&
                           r.TokenExpiryDate.HasValue &&
                           r.TokenExpiryDate.Value.Date >= tomorrowDateOnly &&
                           r.TokenExpiryDate.Value.Date <= expiryDateOnly)
                .OrderBy(r => r.TokenExpiryDate)
                .ToListAsync();
            
            var result = receipts.Select(r => new ReceiptResponseDto
            {
                Id = r.Id,
                ReceiptNo = r.ReceiptNo,
                FromName = r.FromName,
                Mobile = r.Mobile,
                PanNumber = r.PanNumber,
                AadharNumber = r.AadharNumber,
                CompanyName = r.CompanyName,
                ReferenceName = r.ReferenceName,
                SiteName = r.SiteName,
                PlotVillaNo = r.PlotVillaNo,
                TokenExpiryDate = r.TokenExpiryDate,
                Amount = r.Amount,
                Status = r.Status,
                CreatedByName = r.CreatedBy.FullName,
                CreatedAt = r.CreatedAt
            });
            
            return Ok(result);
        }

        [HttpGet("todays-expiring-tokens")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<IEnumerable<ReceiptResponseDto>>> GetTodaysExpiringTokens()
        {
            var currentDate = DateTime.UtcNow;
            var currentDateOnly = currentDate.Date;
            
            // Show APPROVED tokens that expire TODAY only
            var receipts = await _context.Receipts
                .Include(r => r.CreatedBy)
                .Where(r => r.ReceiptType.ToLower() == "token" && 
                           r.Status == "Approved" &&
                           r.TokenExpiryDate.HasValue &&
                           r.TokenExpiryDate.Value.Date == currentDateOnly)
                .OrderBy(r => r.TokenExpiryDate)
                .ToListAsync();
            
            var result = receipts.Select(r => new ReceiptResponseDto
            {
                Id = r.Id,
                ReceiptNo = r.ReceiptNo,
                FromName = r.FromName,
                Mobile = r.Mobile,
                PanNumber = r.PanNumber,
                AadharNumber = r.AadharNumber,
                CompanyName = r.CompanyName,
                ReferenceName = r.ReferenceName,
                SiteName = r.SiteName,
                PlotVillaNo = r.PlotVillaNo,
                TokenExpiryDate = r.TokenExpiryDate,
                Amount = r.Amount,
                Status = r.Status,
                CreatedByName = r.CreatedBy.FullName,
                CreatedAt = r.CreatedAt
            });
            
            return Ok(result);
        }

        [HttpGet("expired-tokens")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<IEnumerable<ReceiptResponseDto>>> GetExpiredTokens()
        {
            // Show ALL tokens that have "Expired", "Converted", "Transferred", or "Cancelled" status
            // This is simpler and more reliable than date-based logic
            var receipts = await _context.Receipts
                .Include(r => r.CreatedBy)
                .Where(r => r.ReceiptType.ToLower() == "token" && 
                           (r.Status == "Expired" || r.Status == "Converted" || r.Status == "Transferred" || r.Status == "Cancelled" || r.Status == "Refunded"))
                .OrderByDescending(r => r.TokenExpiryDate ?? r.CreatedAt)
                .ToListAsync();
            
            var result = receipts.Select(r => new ReceiptResponseDto
            {
                Id = r.Id,
                ReceiptNo = r.ReceiptNo,
                FromName = r.FromName,
                Mobile = r.Mobile,
                PanNumber = r.PanNumber,
                AadharNumber = r.AadharNumber,
                CompanyName = r.CompanyName,
                ReferenceName = r.ReferenceName,
                SiteName = r.SiteName,
                PlotVillaNo = r.PlotVillaNo,
                TokenExpiryDate = r.TokenExpiryDate,
                Amount = r.Amount,
                Status = r.Status,
                CreatedByName = r.CreatedBy.FullName,
                CreatedAt = r.CreatedAt
            });
            
            return Ok(result);
        }

        [HttpGet("converted-tokens")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<IEnumerable<ReceiptResponseDto>>> GetConvertedTokens()
        {
            var receipts = await _context.Receipts
                .Include(r => r.CreatedBy)
                .Where(r => r.ReceiptType == "token" && r.Status == "Converted")
                .OrderByDescending(r => r.UpdatedAt)
                .ToListAsync();
            
            var result = receipts.Select(r => new ReceiptResponseDto
            {
                Id = r.Id,
                ReceiptNo = r.ReceiptNo,
                FromName = r.FromName,
                Mobile = r.Mobile,
                PanNumber = r.PanNumber,
                AadharNumber = r.AadharNumber,
                CompanyName = r.CompanyName,
                ReferenceName = r.ReferenceName,
                SiteName = r.SiteName,
                PlotVillaNo = r.PlotVillaNo,
                TokenExpiryDate = r.TokenExpiryDate,
                Amount = r.Amount,
                Status = r.Status,
                CreatedByName = r.CreatedBy.FullName,
                CreatedAt = r.CreatedAt
            });
            
            return Ok(result);
        }

        [HttpPost("process-expired-tokens")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult> ProcessExpiredTokens()
        {
            try
            {
                await _plotStatusService.CheckAndUpdateExpiredTokensAsync();
                return Ok(new { message = "Expired tokens processed successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error processing expired tokens", error = ex.Message });
            }
        }

        [HttpGet("plot/{plotId}")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<IEnumerable<ReceiptResponseDto>>> GetReceiptsByPlot(int plotId)
        {
            var receipts = await _context.Receipts
                .Include(r => r.CreatedBy)
                .Where(r => r.PlotId == plotId)
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync();
            
            var result = receipts.Select(r => new ReceiptResponseDto
            {
                Id = r.Id,
                ReceiptNo = r.ReceiptNo,
                ReceiptType = r.ReceiptType,
                Date = r.Date,
                FromName = r.FromName,
                RelationType = r.RelationType,
                RelationName = r.RelationName,
                Address = r.Address,
                Mobile = r.Mobile,
                PanNumber = r.PanNumber,
                AadharNumber = r.AadharNumber,
                CompanyName = r.CompanyName,
                TokenExpiryDate = r.TokenExpiryDate,
                ReferenceName = r.ReferenceName,
                SiteName = r.SiteName,
                PlotVillaNo = r.PlotVillaNo,
                PlotSize = r.PlotSize,
                BasicRate = r.BasicRate,
                Amount = r.Amount,
                Other = r.Other,
                TotalAmount = r.TotalAmount,
                CashChecked = r.CashChecked,
                ChequeChecked = r.ChequeChecked,
                RtgsChecked = r.RtgsChecked,
                ChequeNo = r.ChequeNo,
                RtgsNeft = r.RtgsNeft,
                PaymentDate = r.PaymentDate,
                Status = r.Status,
                AdminDiscount = r.AdminDiscount,
                AdminRemarks = r.AdminRemarks,
                AssociateRemarks = r.AssociateRemarks,
                CreatedByName = r.CreatedBy.FullName,
                CreatedAt = r.CreatedAt
            });
            
            return Ok(result);
        }
        
        private async Task<ReceiptResponseDto?> GetReceiptResponse(long id)
        {
            var receipt = await _context.Receipts
                .Include(r => r.CreatedBy)
                .FirstOrDefaultAsync(r => r.Id == id);
                
            if (receipt == null) return null;
            
            return MapToReceiptResponseDto(receipt);
        }

        private static ReceiptResponseDto MapToReceiptResponseDto(Receipt receipt)
        {
            return new ReceiptResponseDto
            {
                Id = receipt.Id,
                ReceiptNo = receipt.ReceiptNo,
                ReceiptType = receipt.ReceiptType,
                Date = receipt.Date,
                FromName = receipt.FromName,
                RelationType = receipt.RelationType,
                RelationName = receipt.RelationName,
                Address = receipt.Address,
                Mobile = receipt.Mobile,
                PanNumber = receipt.PanNumber,
                AadharNumber = receipt.AadharNumber,
                CompanyName = receipt.CompanyName,
                TokenExpiryDate = receipt.TokenExpiryDate,
                ReferenceName = receipt.ReferenceName,
                SiteName = receipt.SiteName,
                PlotVillaNo = receipt.PlotVillaNo,
                PlotSize = receipt.PlotSize,
                BasicRate = receipt.BasicRate,
                Amount = receipt.Amount,
                PLC = receipt.PLC,
                EDC = receipt.EDC,
                Other = receipt.Other,
                TotalAmount = receipt.TotalAmount,
                CashChecked = receipt.CashChecked,
                ChequeChecked = receipt.ChequeChecked,
                RtgsChecked = receipt.RtgsChecked,
                ChequeNo = receipt.ChequeNo,
                RtgsNeft = receipt.RtgsNeft,
                PaymentDate = receipt.PaymentDate,
                Status = receipt.Status,
                AdminDiscount = receipt.AdminDiscount,
                AdminRemarks = receipt.AdminRemarks,
                AssociateRemarks = receipt.AssociateRemarks,
                CreatedByName = receipt.CreatedBy?.FullName ?? "",
                CreatedAt = receipt.CreatedAt,
                AttachedFiles = string.IsNullOrEmpty(receipt.AttachedFiles) ? new List<string>() : 
                    System.Text.Json.JsonSerializer.Deserialize<List<string>>(receipt.AttachedFiles) ?? new List<string>()
            };
        }
        
        /// <summary>
        /// Helper method to safely parse plot size from string
        /// </summary>
        private static decimal ParsePlotSize(string? plotSize)
        {
            if (string.IsNullOrEmpty(plotSize))
                return 0m;
                
            try
            {
                var parts = plotSize.Split(' ');
                if (parts.Length > 0 && decimal.TryParse(parts[0], out var size))
                {
                    return size;
                }
            }
            catch
            {
                // Ignore parsing errors and return 0
            }
            
            return 0m;
        }

        /// <summary>
        /// Helper method to update plot's received amount and status based on all approved receipts
        /// Uses plot number (SiteName + PlotNumber) for mapping instead of PlotId
        /// </summary>
        private async Task UpdatePlotReceivedAmountByPlotNumberAsync(string siteName, string plotNumber)
        {
            Console.WriteLine($"=== UPDATE PLOT RECEIVED AMOUNT START ===");
            Console.WriteLine($"Plot: {siteName} - {plotNumber}");
            
            var plot = await _context.Plots
                .FirstOrDefaultAsync(p => p.SiteName == siteName && p.PlotNumber == plotNumber);
            
            if (plot == null) 
            {
                Console.WriteLine($"Plot not found!");
                return;
            }

            Console.WriteLine($"Plot found - Current ReceivedAmount: ₹{plot.ReceivedAmount}");
            Console.WriteLine($"Plot found - Current TotalPrice: ₹{plot.TotalPrice}");

            // Get all receipts for debugging
            var allReceipts = await _context.Receipts
                .Where(r => r.SiteName == siteName && r.PlotVillaNo == plotNumber)
                .ToListAsync();

            Console.WriteLine($"Found {allReceipts.Count} receipts for this plot:");
            foreach (var r in allReceipts)
            {
                Console.WriteLine($"  Receipt {r.ReceiptNo}: Status={r.Status}, Amount=₹{r.Amount}, TotalAmount=₹{r.TotalAmount}");
            }

            // Calculate total received amount from APPROVED and CONVERTED RECEIPTS ONLY
            // Exclude: Pending, Expired, Rejected, Transferred, Cancelled, Booking, and NOC receipts
            // - Transferred: moved to different plot
            // - Cancelled: transaction cancelled
            // - Booking & NOC: summary receipts, not new payments (they show sum of previous receipts)
            var totalReceivedAmount = await _context.Receipts
                .Where(r => r.SiteName == siteName && r.PlotVillaNo == plotNumber &&
                           (r.Status == "Approved" || r.Status == "Converted") &&
                           r.ReceiptType != "booking" && r.ReceiptType != "noc" &&
                           r.Status != "Booking" && r.Status != "NOC")
                .SumAsync(r => r.TotalAmount > 0 ? r.TotalAmount : r.Amount);

            Console.WriteLine($"Calculated total received amount: ₹{totalReceivedAmount}");

            // Update plot's received amount
            plot.ReceivedAmount = totalReceivedAmount;
            Console.WriteLine($"Updated plot ReceivedAmount to: ₹{plot.ReceivedAmount}");

            // Calculate total plot price ONLY if not set (don't override discounted prices)
            if (plot.TotalPrice <= 0)
            {
                var plotSize = ParsePlotSize(plot.PlotSize);
                plot.TotalPrice = plotSize * plot.BasicRate;
            }
            // Note: If TotalPrice is already set (e.g., after discount), we keep it as-is

            // Note: Plot status is now managed by PlotStatusService, not here
            // This method only updates the received amount

            plot.UpdatedAt = DateTime.UtcNow;
            
            Console.WriteLine($"Final plot state before save:");
            Console.WriteLine($"  ReceivedAmount: ₹{plot.ReceivedAmount}");
            Console.WriteLine($"  TotalPrice: ₹{plot.TotalPrice}");
            Console.WriteLine($"  BasicRate: ₹{plot.BasicRate}");
            Console.WriteLine($"=== UPDATE PLOT RECEIVED AMOUNT END ===");
            
            await _context.SaveChangesAsync();
        }

        /// <summary>
        /// Legacy method for backward compatibility - converts PlotId to PlotNumber and calls the new method
        /// </summary>
        private async Task UpdatePlotReceivedAmountAsync(int plotId)
        {
            var plot = await _context.Plots.FindAsync(plotId);
            if (plot == null) return;
            
            await UpdatePlotReceivedAmountByPlotNumberAsync(plot.SiteName, plot.PlotNumber);
        }

        /// <summary>
        /// Updates plot's total price by applying PLC percentage
        /// Formula: Total Price = (Plot Size × Basic Rate) + (Base Price × PLC%)
        /// </summary>
        private async Task UpdatePlotTotalPriceWithPLCAsync(int plotId, decimal plcPercentage)
        {
            var plot = await _context.Plots.FindAsync(plotId);
            if (plot == null) return;

            Console.WriteLine($"=== UPDATE PLOT TOTAL PRICE WITH PLC ===");
            Console.WriteLine($"Plot: {plot.SiteName} - {plot.PlotNumber}");
            Console.WriteLine($"PLC Percentage: {plcPercentage}%");

            // Parse plot size to get numeric value
            var plotSizeText = plot.PlotSize?.Replace("sq yard", "").Replace("sq ft", "").Trim();
            if (!decimal.TryParse(plotSizeText, out var plotSize))
            {
                Console.WriteLine($"Could not parse plot size: {plot.PlotSize}");
                return;
            }

            // Calculate base price
            var basePrice = plotSize * plot.BasicRate;
            Console.WriteLine($"Base Price: {plotSize} × ₹{plot.BasicRate} = ₹{basePrice}");

            // Calculate PLC amount
            var plcAmount = basePrice * (plcPercentage / 100);
            Console.WriteLine($"PLC Amount: ₹{basePrice} × {plcPercentage}% = ₹{plcAmount}");

            // Calculate final total price
            var finalTotalPrice = basePrice + plcAmount;
            Console.WriteLine($"Final Total Price: ₹{basePrice} + ₹{plcAmount} = ₹{finalTotalPrice}");

            // Update plot's total price
            var oldTotalPrice = plot.TotalPrice;
            plot.TotalPrice = finalTotalPrice;
            plot.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            Console.WriteLine($"Plot Total Price updated: ₹{oldTotalPrice} → ₹{finalTotalPrice}");
            Console.WriteLine($"=== UPDATE PLOT TOTAL PRICE WITH PLC END ===");
        }

        /// <summary>
        /// Converts all approved token receipts for a plot to "Converted" status when a booking receipt is created
        /// </summary>
        private async Task ConvertTokenReceiptsToConvertedStatusAsync(int plotId)
        {
            var tokenReceipts = await _context.Receipts
                .Where(r => r.PlotId == plotId && 
                           r.ReceiptType.ToLower() == "token" && 
                           r.Status == "Approved")
                .ToListAsync();

            foreach (var tokenReceipt in tokenReceipts)
            {
                tokenReceipt.Status = "Converted";
                tokenReceipt.UpdatedAt = DateTime.UtcNow;
                
                Console.WriteLine($"Token receipt {tokenReceipt.ReceiptNo} converted to 'Converted' status due to booking receipt creation");
            }

            if (tokenReceipts.Any())
            {
                await _context.SaveChangesAsync();
                Console.WriteLine($"Converted {tokenReceipts.Count} token receipts to 'Converted' status for plot ID {plotId}");
            }
        }

        private static IQueryable<Receipt> ApplyReceiptSorting(IQueryable<Receipt> query, string? sortBy, string? sortOrder)
        {
            var isDescending = sortOrder?.ToLower() == "desc";
            
            return sortBy?.ToLower() switch
            {
                // Note: "receiptno" is handled separately with in-memory sorting
                "customername" or "fromname" => isDescending ? query.OrderByDescending(r => r.FromName) : query.OrderBy(r => r.FromName),
                "sitename" => isDescending ? query.OrderByDescending(r => r.SiteName) : query.OrderBy(r => r.SiteName),
                "plotnumber" => isDescending ? query.OrderByDescending(r => r.PlotVillaNo) : query.OrderBy(r => r.PlotVillaNo),
                "amount" => isDescending ? query.OrderByDescending(r => r.Amount) : query.OrderBy(r => r.Amount),
                "totalamount" => isDescending ? query.OrderByDescending(r => r.TotalAmount) : query.OrderBy(r => r.TotalAmount),
                "status" => isDescending ? query.OrderByDescending(r => r.Status) : query.OrderBy(r => r.Status),
                "date" => isDescending ? query.OrderByDescending(r => r.Date) : query.OrderBy(r => r.Date),
                "tokenexpirydate" => isDescending ? query.OrderByDescending(r => r.TokenExpiryDate) : query.OrderBy(r => r.TokenExpiryDate),
                "referencename" => isDescending ? query.OrderByDescending(r => r.ReferenceName) : query.OrderBy(r => r.ReferenceName),
                _ => isDescending ? query.OrderByDescending(r => r.CreatedAt) : query.OrderBy(r => r.CreatedAt)
            };
        }

        // Helper method to extract numeric part from receipt number for proper sorting
        private static int ExtractReceiptNumber(string receiptNo)
        {
            if (string.IsNullOrEmpty(receiptNo)) return 0;
            
            // Extract all numbers from the receipt number (e.g., "BR/25-26/0122" -> ["25", "26", "0122"])
            var matches = System.Text.RegularExpressions.Regex.Matches(receiptNo, @"\d+");
            if (matches.Count == 0) return 0;
            
            // Use the last number as the sorting key (the actual receipt sequence number)
            var lastNumber = matches[matches.Count - 1].Value;
            return int.TryParse(lastNumber, out int result) ? result : 0;
        }

        [HttpPost("test-form")]
        [Authorize(Roles = "Associate,Admin")]
        public async Task<ActionResult> TestFormData([FromForm] string testField, [FromForm] IFormFileCollection? files)
        {
            return Ok(new { 
                testField = testField, 
                filesCount = files?.Count ?? 0,
                message = "Form data received successfully" 
            });
        }

        [HttpPost("with-files-simple")]
        [Authorize(Roles = "Associate,Admin")]
        public async Task<ActionResult<ReceiptResponseDto>> CreateReceiptWithFilesSimple(
            [FromForm] string fromName,
            [FromForm] string siteName,
            [FromForm] string plotVillaNo,
            [FromForm] string address,
            [FromForm] string amount,
            [FromForm] IFormFileCollection? files)
        {
            try
            {
                Console.WriteLine($"=== SIMPLE FILE UPLOAD TEST ===");
                Console.WriteLine($"FromName: {fromName}");
                Console.WriteLine($"SiteName: {siteName}");
                Console.WriteLine($"PlotVillaNo: {plotVillaNo}");
                Console.WriteLine($"Address: {address}");
                Console.WriteLine($"Amount: {amount}");
                Console.WriteLine($"Files Count: {files?.Count ?? 0}");
                Console.WriteLine($"=== END SIMPLE TEST ===");

                return Ok(new { 
                    message = "Simple form data received successfully",
                    fromName,
                    siteName,
                    plotVillaNo,
                    address,
                    amount,
                    filesCount = files?.Count ?? 0
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in simple test: {ex.Message}");
                return BadRequest($"Error: {ex.Message}");
            }
        }

        [HttpPost("with-files")]
        [Authorize(Roles = "Associate,Admin")]
        public async Task<ActionResult<ReceiptResponseDto>> CreateReceiptWithFiles([FromForm] CreateReceiptWithFilesDto createReceiptDto)
        {
            try
            {


                // Check model state
                if (!ModelState.IsValid)
                {
                    var errors = ModelState
                        .Where(x => x.Value.Errors.Count > 0)
                        .Select(x => new { Field = x.Key, Errors = x.Value.Errors.Select(e => e.ErrorMessage) })
                        .ToList();
                    
                    var errorMessage = $"Validation errors: {string.Join(", ", errors.Select(e => $"{e.Field}: {string.Join(", ", e.Errors)}"))}";
                    return BadRequest(new { message = errorMessage, errors = errors });
                }
                var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
                var userRole = User.FindFirst(ClaimTypes.Role)?.Value;
                

                
                // Get plot information
                var plot = await _context.Plots
                    .FirstOrDefaultAsync(p => p.SiteName == createReceiptDto.SiteName && 
                                            p.PlotNumber == createReceiptDto.PlotVillaNo);
                
                if (plot == null)
                {
                    return BadRequest($"Plot not found with SiteName: '{createReceiptDto.SiteName}' and PlotNumber: '{createReceiptDto.PlotVillaNo}'");
                }

                // Determine receipt type - default to token, but allow booking for admin
                var receiptType = createReceiptDto.ReceiptType ?? "token";
                
                // Only admin can create booking receipts
                if (receiptType == "booking" && userRole != "Admin")
                {
                    return Forbid("Only admin can create booking receipts");
                }
                
                // Upload files to Azure Blob Storage
                var fileUrls = new List<string>();
                if (createReceiptDto.Files != null && createReceiptDto.Files.Count > 0)
                {
                    try
                    {
                        fileUrls = await _blobStorageService.UploadMultipleFilesAsync(createReceiptDto.Files);
                    }
                    catch (Exception fileEx)
                    {
                        throw new Exception($"File upload failed: {fileEx.Message}", fileEx);
                    }
                }
                
                // Generate receipt number
                var receiptNo = await _receiptService.GenerateReceiptNumberAsync(receiptType);
                
                var receipt = new Receipt
                {
                    ReceiptNo = receiptNo,
                    ReceiptType = receiptType,
                    Date = string.IsNullOrEmpty(createReceiptDto.Date) ? DateTime.UtcNow : DateTime.Parse(createReceiptDto.Date),
                    FromName = createReceiptDto.FromName,
                    RelationType = createReceiptDto.RelationType ?? "S/O",
                    RelationName = createReceiptDto.RelationName ?? string.Empty,
                    Address = createReceiptDto.Address ?? string.Empty,
                    Mobile = createReceiptDto.Mobile ?? string.Empty,
                    PanNumber = createReceiptDto.PanNumber ?? string.Empty,
                    AadharNumber = createReceiptDto.AadharNumber ?? string.Empty,
                    CompanyName = createReceiptDto.CompanyName ?? string.Empty,
                    TokenExpiryDate = receiptType == "token" ? 
                        (string.IsNullOrEmpty(createReceiptDto.TokenExpiryDate) ? 
                            DateTime.UtcNow.AddDays(30) : 
                            DateTime.Parse(createReceiptDto.TokenExpiryDate)) : null,
                    ReceivedAmount = createReceiptDto.ReceivedAmount ?? string.Empty,
                    ReferenceName = createReceiptDto.ReferenceName ?? string.Empty,
                    SiteName = createReceiptDto.SiteName,
                    PlotVillaNo = createReceiptDto.PlotVillaNo,
                    PlotSize = plot.PlotSize,
                    BasicRate = plot.BasicRate,
                    Amount = decimal.Parse(createReceiptDto.Amount ?? "0"),
                    Other = createReceiptDto.Other ?? string.Empty,
                    CashChecked = bool.Parse(createReceiptDto.CashChecked ?? "false"),
                    ChequeChecked = bool.Parse(createReceiptDto.ChequeChecked ?? "false"),
                    RtgsChecked = bool.Parse(createReceiptDto.RtgsChecked ?? "false"),
                    ChequeNo = createReceiptDto.ChequeNo ?? string.Empty,
                    RtgsNeft = createReceiptDto.RtgsNeft ?? string.Empty,
                    AssociateRemarks = createReceiptDto.AssociateRemarks ?? string.Empty,
                    AdminRemarks = createReceiptDto.AdminRemarks,
                    AttachedFiles = System.Text.Json.JsonSerializer.Serialize(fileUrls),
                    CreatedByUserId = userId,
                    PlotId = plot.Id,
                    Status = userRole == "Admin" ? "Approved" : "Pending"
                };
                
                // Calculate TotalAmount for admin-created receipts (auto-approved)
                if (userRole == "Admin")
                {
                    receipt.TotalAmount = receipt.Amount;
                    
                    // Verify user exists before setting ApprovedByUserId
                    var userExists = await _context.Users.AnyAsync(u => u.Id == userId);
                    if (userExists)
                    {
                        receipt.ApprovedByUserId = userId;
                        receipt.ApprovedAt = DateTime.UtcNow;
                    }
                    else
                    {
                        Console.WriteLine($"Warning: User ID {userId} not found in database. Receipt will be approved without ApprovedByUserId.");
                        receipt.ApprovedAt = DateTime.UtcNow;
                        // ApprovedByUserId remains null
                    }
                }
                
                _context.Receipts.Add(receipt);
                await _context.SaveChangesAsync();
                
                // Update plot status only if receipt is approved immediately
                if (receipt.Status == "Approved")
                {
                    await _plotStatusService.UpdatePlotStatusAsync(plot.Id, receiptType, receipt.TotalAmount);
                    
                    if (receiptType == "booking")
                    {
                        await ConvertTokenReceiptsToConvertedStatusAsync(plot.Id);
                    }
                }
                
                // Update plot received amount
                await UpdatePlotReceivedAmountByPlotNumberAsync(createReceiptDto.SiteName, createReceiptDto.PlotVillaNo);
                
                return Ok(await GetReceiptResponse(receipt.Id));
            }
            catch (Exception ex)
            {
                return BadRequest($"Error creating receipt with files: {ex.Message}");
            }
        }

        [HttpPost("{id}/upload-files")]
        [Authorize(Roles = "Associate,Admin")]
        public async Task<ActionResult> UploadFilesToReceipt(long id, [FromForm] UploadFilesDto uploadDto)
        {
            try
            {
                // Check if receipt exists
                var receipt = await _context.Receipts.FindAsync(id);
                if (receipt == null)
                {
                    return NotFound("Receipt not found");
                }

                // Validate files
                if (uploadDto.Files == null || uploadDto.Files.Count == 0)
                {
                    return BadRequest("No files provided");
                }

                if (uploadDto.Files.Count > 5)
                {
                    return BadRequest("Maximum 5 files allowed");
                }

                foreach (var file in uploadDto.Files)
                {
                    if (file.Length > 10 * 1024 * 1024) // 10MB
                    {
                        return BadRequest($"File '{file.FileName}' is too large. Maximum size is 10MB.");
                    }
                }

                // Get existing files
                var existingFiles = string.IsNullOrEmpty(receipt.AttachedFiles) 
                    ? new List<string>() 
                    : System.Text.Json.JsonSerializer.Deserialize<List<string>>(receipt.AttachedFiles) ?? new List<string>();

                // Check total file count
                if (existingFiles.Count + uploadDto.Files.Count > 5)
                {
                    return BadRequest($"Cannot add {uploadDto.Files.Count} files. Maximum 5 files allowed per receipt. Current files: {existingFiles.Count}");
                }

                // Upload new files
                var newFileUrls = await _blobStorageService.UploadMultipleFilesAsync(uploadDto.Files);

                // Combine existing and new files
                existingFiles.AddRange(newFileUrls);

                // Update receipt
                receipt.AttachedFiles = System.Text.Json.JsonSerializer.Serialize(existingFiles);
                await _context.SaveChangesAsync();

                return Ok(new { 
                    message = "Files uploaded successfully",
                    filesUploaded = newFileUrls.Count,
                    totalFiles = existingFiles.Count,
                    newFileUrls = newFileUrls
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { 
                    error = "Error uploading files", 
                    message = ex.Message,
                    details = ex.InnerException?.Message 
                });
            }
        }

        [HttpDelete("{id}/files/{fileIndex}")]
        [Authorize(Roles = "Associate,Admin")]
        public async Task<ActionResult> DeleteFileFromReceipt(long id, int fileIndex)
        {
            try
            {
                // Check if receipt exists
                var receipt = await _context.Receipts.FindAsync(id);
                if (receipt == null)
                {
                    return NotFound("Receipt not found");
                }

                // Get existing files
                var existingFiles = string.IsNullOrEmpty(receipt.AttachedFiles) 
                    ? new List<string>() 
                    : System.Text.Json.JsonSerializer.Deserialize<List<string>>(receipt.AttachedFiles) ?? new List<string>();

                // Validate file index
                if (fileIndex < 0 || fileIndex >= existingFiles.Count)
                {
                    return BadRequest("Invalid file index");
                }

                // Get the file URL to delete
                var fileUrlToDelete = existingFiles[fileIndex];

                // Delete from blob storage
                try
                {
                    await _blobStorageService.DeleteFileAsync(fileUrlToDelete);
                }
                catch (Exception blobEx)
                {
                    // Continue with database update even if blob deletion fails
                }

                // Remove from list
                existingFiles.RemoveAt(fileIndex);

                // Update receipt
                receipt.AttachedFiles = existingFiles.Count > 0 
                    ? System.Text.Json.JsonSerializer.Serialize(existingFiles)
                    : "[]"; // Use empty JSON array instead of null
                
                await _context.SaveChangesAsync();

                return Ok(new { 
                    message = "File deleted successfully",
                    remainingFiles = existingFiles.Count
                });
            }
            catch (Exception ex)
            {
                return BadRequest($"Error deleting file: {ex.Message}");
            }
        }

        [HttpGet("download-file")]
        [Authorize]
        public async Task<ActionResult> DownloadFile([FromQuery] string fileUrl)
        {
            try
            {
                Console.WriteLine($"=== DOWNLOAD FILE REQUEST ===");
                Console.WriteLine($"File URL: {fileUrl}");

                if (string.IsNullOrEmpty(fileUrl))
                {
                    return BadRequest("File URL is required");
                }

                // Get file stream from blob storage
                var fileStream = await _blobStorageService.DownloadFileAsync(fileUrl);
                
                if (fileStream == null)
                {
                    return NotFound("File not found");
                }

                // Extract filename from URL
                var fileName = fileUrl.Split('/').LastOrDefault() ?? "download";
                
                // Determine content type based on file extension
                var extension = Path.GetExtension(fileName).ToLowerInvariant();
                var contentType = extension switch
                {
                    ".pdf" => "application/pdf",
                    ".jpg" or ".jpeg" => "image/jpeg",
                    ".png" => "image/png",
                    ".gif" => "image/gif",
                    ".doc" => "application/msword",
                    ".docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                    _ => "application/octet-stream"
                };

                Console.WriteLine($"Serving file: {fileName}, Content-Type: {contentType}");

                return File(fileStream, contentType, fileName);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error downloading file: {ex.Message}");
                Console.WriteLine($"Stack trace: {ex.StackTrace}");
                return BadRequest($"Error downloading file: {ex.Message}");
            }
        }
    }
}
