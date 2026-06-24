using System.ComponentModel.DataAnnotations;

namespace Subh_sankalp_estate.DTOs
{
    public class CreateReceiptWithFilesDto
    {
        public string FromName { get; set; } = string.Empty;
        
        public string RelationType { get; set; } = "S/O";
        
        public string? RelationName { get; set; } = string.Empty;
        
        public string Address { get; set; } = string.Empty;
        
        public string? Mobile { get; set; } = string.Empty;
        
        public string? PanNumber { get; set; } = string.Empty;
        
        public string? AadharNumber { get; set; } = string.Empty;
        
        public string? CompanyName { get; set; } = string.Empty;
        
        public string? TokenExpiryDate { get; set; }
        
        public string? Date { get; set; }
        
        public string? ReceivedAmount { get; set; } = string.Empty;
        
        public string? ReferenceName { get; set; } = string.Empty;
        
        public string SiteName { get; set; } = string.Empty;
        
        public string PlotVillaNo { get; set; } = string.Empty;
        
        public string Amount { get; set; } = "0";
        
        public string? Other { get; set; } = string.Empty;
        
        public string CashChecked { get; set; } = "false";
        
        public string ChequeChecked { get; set; } = "false";
        
        public string RtgsChecked { get; set; } = "false";
        
        public string? ChequeNo { get; set; } = string.Empty;
        
        public string? RtgsNeft { get; set; } = string.Empty;
        
        public string? AssociateRemarks { get; set; } = string.Empty;
        
        public string? AdminRemarks { get; set; } = string.Empty;
        
        public string? ReceiptType { get; set; } = "token";
        
        // File upload properties
        public IFormFileCollection? Files { get; set; }
    }
}