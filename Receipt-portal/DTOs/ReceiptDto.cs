using System.ComponentModel.DataAnnotations;

namespace Subh_sankalp_estate.DTOs
{
    public class CreateReceiptDto
    {
        public string? ReceiptType { get; set; } = "token"; // token or booking
        
        [Required]
        public string FromName { get; set; } = string.Empty;
        
        public string RelationType { get; set; } = "S/O";
        
        public string RelationName { get; set; } = string.Empty;
        
        [Required]
        public string Address { get; set; } = string.Empty;
        
        public string Mobile { get; set; } = string.Empty;
        
        public string PanNumber { get; set; } = string.Empty;
        
        public string AadharNumber { get; set; } = string.Empty;
        
        public string CompanyName { get; set; } = string.Empty;
        
        public DateTime? TokenExpiryDate { get; set; }
        
        public string ReceivedAmount { get; set; } = string.Empty;
        
        public string ReferenceName { get; set; } = string.Empty;
        
        [Required]
        public string SiteName { get; set; } = string.Empty;
        
        [Required]
        public string PlotVillaNo { get; set; } = string.Empty;
        
        public decimal Amount { get; set; }
        
        public decimal? PLC { get; set; } // Preferential Location Charges
        
        public decimal? EDC { get; set; } // External Development Charges
        
        public string Other { get; set; } = string.Empty;
        
        public bool CashChecked { get; set; }
        
        public bool ChequeChecked { get; set; }
        
        public bool RtgsChecked { get; set; }
        
        public string ChequeNo { get; set; } = string.Empty;
        
        public string RtgsNeft { get; set; } = string.Empty;
        
        public DateTime? PaymentDate { get; set; } // For Cheque/RTGS/NEFT payments
        
        public string AssociateRemarks { get; set; } = string.Empty;
        
        public string AdminRemarks { get; set; } = string.Empty;
        
        public int? PlotId { get; set; } // For booking receipts
    }
    
    public class ReceiptResponseDto
    {
        public long Id { get; set; }
        public string ReceiptNo { get; set; } = string.Empty;
        public string ReceiptType { get; set; } = string.Empty;
        public DateTime Date { get; set; }
        public string FromName { get; set; } = string.Empty;
        public string RelationType { get; set; } = string.Empty;
        public string RelationName { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public string Mobile { get; set; } = string.Empty;
        public string PanNumber { get; set; } = string.Empty;
        public string AadharNumber { get; set; } = string.Empty;
        public string CompanyName { get; set; } = string.Empty;
        public DateTime? TokenExpiryDate { get; set; }
        public string ReferenceName { get; set; } = string.Empty;
        public string SiteName { get; set; } = string.Empty;
        public string PlotVillaNo { get; set; } = string.Empty;
        public string PlotSize { get; set; } = string.Empty;
        public decimal BasicRate { get; set; }
        public decimal Amount { get; set; }
        public decimal? PLC { get; set; }
        public decimal? EDC { get; set; }
        public string Other { get; set; } = string.Empty;
        public decimal TotalAmount { get; set; }
        public bool CashChecked { get; set; }
        public bool ChequeChecked { get; set; }
        public bool RtgsChecked { get; set; }
        public string ChequeNo { get; set; } = string.Empty;
        public string RtgsNeft { get; set; } = string.Empty;
        public DateTime? PaymentDate { get; set; }
        public string Status { get; set; } = string.Empty;
        public decimal? AdminDiscount { get; set; }
        public string AdminRemarks { get; set; } = string.Empty;
        public string AssociateRemarks { get; set; } = string.Empty;
        public string CreatedByName { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public List<string> AttachedFiles { get; set; } = new List<string>();
        public List<PaymentHistoryItemDto>? PaymentHistory { get; set; }
    }
    
    public class PaymentHistoryItemDto
    {
        public string ReceiptNo { get; set; } = string.Empty;
        public string ReceiptType { get; set; } = string.Empty;
        public DateTime Date { get; set; }
        public string PaymentMethod { get; set; } = string.Empty;
        public decimal Amount { get; set; }
    }
    
    public class ApproveReceiptDto
    {
        public decimal? Discount { get; set; }
        public string Remarks { get; set; } = string.Empty;
        public DateTime? ExtendedExpiryDate { get; set; }
    }
    
    public class UpdateReceiptDto
    {
        public string? FromName { get; set; }
        public string? RelationType { get; set; }
        public string? RelationName { get; set; }
        public string? Address { get; set; }
        public string? Mobile { get; set; }
        public string? PanNumber { get; set; }
        public string? AadharNumber { get; set; }
        public string? CompanyName { get; set; }
        public DateTime? TokenExpiryDate { get; set; }
        public string? ReferenceName { get; set; }
        public decimal? Amount { get; set; }
        public decimal? PLC { get; set; }
        public decimal? EDC { get; set; }
        public string? Other { get; set; }
        public bool? CashChecked { get; set; }
        public bool? ChequeChecked { get; set; }
        public bool? RtgsChecked { get; set; }
        public string? ChequeNo { get; set; }
        public string? RtgsNeft { get; set; }
        public DateTime? PaymentDate { get; set; }
        public DateTime? Date { get; set; }
        public string? Status { get; set; } // Admin only - can change status including "Transferred"
        public decimal? CustomBasicRate { get; set; } // Admin only
    }
}