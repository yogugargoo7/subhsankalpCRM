using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc;

namespace Subh_sankalp_estate.DTOs
{
    public class ReceiptFilterDto
    {
        [FromQuery(Name = "customerName")]
        public string? CustomerName { get; set; }
        
        [FromQuery(Name = "referenceName")]
        public string? ReferenceName { get; set; }
        
        [FromQuery(Name = "siteName")]
        public string? SiteName { get; set; }
        
        [FromQuery(Name = "plotNumber")]
        public string? PlotNumber { get; set; }
        
        [FromQuery(Name = "mobile")]
        public string? Mobile { get; set; }
        
        [FromQuery(Name = "status")]
        public string? Status { get; set; } // Pending, Approved, Rejected
        
        [FromQuery(Name = "receiptType")]
        public string? ReceiptType { get; set; } // token, booking
        
        [FromQuery(Name = "companyName")]
        public string? CompanyName { get; set; } // Subhsankalp, Golden City
        
        [FromQuery(Name = "fromDate")]
        public DateTime? FromDate { get; set; }
        
        [FromQuery(Name = "toDate")]
        public DateTime? ToDate { get; set; }
        [FromQuery(Name = "tokenExpiryFromDate")]
        public DateTime? TokenExpiryFromDate { get; set; }
        
        [FromQuery(Name = "tokenExpiryToDate")]
        public DateTime? TokenExpiryToDate { get; set; }
        
        [FromQuery(Name = "minAmount")]
        public decimal? MinAmount { get; set; }
        
        [FromQuery(Name = "maxAmount")]
        public decimal? MaxAmount { get; set; }
        
        [FromQuery(Name = "createdByUserId")]
        public int? CreatedByUserId { get; set; }
        
        [FromQuery(Name = "cashPayment")]
        public bool? CashPayment { get; set; }
        
        [FromQuery(Name = "chequePayment")]
        public bool? ChequePayment { get; set; }
        
        [FromQuery(Name = "chequeNo")]
        public string? ChequeNo { get; set; }
        
        [FromQuery(Name = "paymentType")]
        public string? PaymentType { get; set; } // Cash, Cheque, RTGS
        
        // Pagination
        [FromQuery(Name = "page")]
        public int Page { get; set; } = 1;
        
        [FromQuery(Name = "pageSize")]
        public int PageSize { get; set; } = 10;
        
        // Sorting
        [FromQuery(Name = "sortBy")]
        public string? SortBy { get; set; } = "CreatedAt";
        
        [FromQuery(Name = "sortOrder")]
        public string? SortOrder { get; set; } = "desc"; // asc, desc
    }
    
    public class PlotFilterDto
    {
        public string? SiteName { get; set; }
        public string? PlotNumber { get; set; }
        public string? RegisteredCompany { get; set; }
        public string? Status { get; set; } // Available, Booked, Sold
        public string? PlotSize { get; set; }
        public decimal? MinBasicRate { get; set; }
        public decimal? MaxBasicRate { get; set; }
        public decimal? MinTotalPrice { get; set; }
        public decimal? MaxTotalPrice { get; set; }
        public string? CustomerName { get; set; }
        public string? AssociateName { get; set; }
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }
        
        // Pagination
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 10;
        
        // Sorting
        public string? SortBy { get; set; } = "CreatedAt";
        public string? SortOrder { get; set; } = "desc";
    }
    
    public class PaymentFilterDto
    {
        public string? PaymentMethod { get; set; } // Cash, Cheque, NEFT/RTGS, UPI
        public string? TransactionReference { get; set; }
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }
        public decimal? MinAmount { get; set; }
        public decimal? MaxAmount { get; set; }
        public long? ReceiptId { get; set; }
        public int? PlotId { get; set; }
        public string? CustomerName { get; set; }
        
        // Pagination
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 10;
        
        // Sorting
        public string? SortBy { get; set; } = "PaymentDate";
        public string? SortOrder { get; set; } = "desc";
    }
    
    public class PaginatedResult<T>
    {
        public IEnumerable<T> Data { get; set; } = new List<T>();
        public int TotalRecords { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalPages { get; set; }
        public bool HasNextPage { get; set; }
        public bool HasPreviousPage { get; set; }
    }
}