using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Subh_sankalp_estate.Models
{
    public class Receipt
    {
        [Key]
        public long Id { get; set; }
        
        [StringLength(50)]
        public string ReceiptNo { get; set; } = string.Empty;
        
        [StringLength(20)]
        public string ReceiptType { get; set; } = "token"; // token, booking
        
        public DateTime Date { get; set; } = DateTime.UtcNow;
        
        [Required]
        [StringLength(255)]
        public string FromName { get; set; } = string.Empty;
        
        [StringLength(10)]
        public string RelationType { get; set; } = "S/O";
        
        [StringLength(255)]
        public string RelationName { get; set; } = string.Empty;
        
        public string Address { get; set; } = string.Empty;
        
        [StringLength(20)]
        public string Mobile { get; set; } = string.Empty;
        
        [StringLength(20)]
        public string PanNumber { get; set; } = string.Empty;
        
        [StringLength(20)]
        public string AadharNumber { get; set; } = string.Empty;
        
        [StringLength(100)]
        public string CompanyName { get; set; } = string.Empty;
        
        public DateTime? TokenExpiryDate { get; set; }
        
        [StringLength(255)]
        public string ReceivedAmount { get; set; } = string.Empty;
        
        [StringLength(255)]
        public string ReferenceName { get; set; } = string.Empty;
        
        [Required]
        [StringLength(255)]
        public string SiteName { get; set; } = string.Empty;
        
        [Required]
        [StringLength(100)]
        public string PlotVillaNo { get; set; } = string.Empty;
        
        [StringLength(100)]
        public string PlotSize { get; set; } = string.Empty;
        
        [Column(TypeName = "decimal(18,2)")]
        public decimal BasicRate { get; set; } = 0;
        
        [StringLength(255)]
        public string Other { get; set; } = string.Empty;
        
        [StringLength(255)]
        public string RtgsNeft { get; set; } = string.Empty;
        
        [Column(TypeName = "decimal(18,2)")]
        public decimal Amount { get; set; } = 0;
        
        // PLC (Preferential Location Charges) and EDC (External Development Charges)
        [Column(TypeName = "decimal(18,2)")]
        public decimal? PLC { get; set; }
        
        [Column(TypeName = "decimal(18,2)")]
        public decimal? EDC { get; set; }
        
        public bool CashChecked { get; set; } = false;
        
        public bool ChequeChecked { get; set; } = false;
        
        public bool RtgsChecked { get; set; } = false;
        
        [StringLength(100)]
        public string ChequeNo { get; set; } = string.Empty;
        
        // Payment Date - for any payment method (Cash/Cheque/RTGS)
        public DateTime? PaymentDate { get; set; }
        
        // Additional fields for approval workflow
        public string Status { get; set; } = "Pending"; // Pending, Approved, Rejected
        
        [Column(TypeName = "decimal(18,2)")]
        public decimal? AdminDiscount { get; set; }
        
        public string AdminRemarks { get; set; } = string.Empty;
        
        public string AssociateRemarks { get; set; } = string.Empty;
        
        public DateTime? ApprovedAt { get; set; }
        
        [Column(TypeName = "decimal(18,2)")]
        public decimal TotalAmount { get; set; } = 0;
        
        // File attachments stored as JSON array of URLs
        public string AttachedFiles { get; set; } = "[]"; // JSON array of file URLs
        
        // Payment history snapshot for booking receipts (stored as JSON)
        public string? PaymentHistorySnapshot { get; set; }
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        
        // Foreign Keys
        public int CreatedByUserId { get; set; }
        public int? ApprovedByUserId { get; set; }
        public int? PlotId { get; set; }
        
        // Navigation properties
        [ForeignKey("CreatedByUserId")]
        public virtual User CreatedBy { get; set; } = null!;
        
        [ForeignKey("ApprovedByUserId")]
        public virtual User? ApprovedBy { get; set; }
        
        [ForeignKey("PlotId")]
        public virtual Plot? Plot { get; set; }
        
        public virtual ICollection<Payment> Payments { get; set; } = new List<Payment>();
    }
}