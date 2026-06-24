using System.ComponentModel.DataAnnotations;

namespace Subh_sankalp_estate.Models
{
    public class Customer
    {
        [Key]
        public int Id { get; set; }
        
        [Required]
        [StringLength(255)]
        public string Name { get; set; } = string.Empty;

        [StringLength(255)]
        public string Email { get; set; } = string.Empty;
        
        [StringLength(20)]
        public string password { get; set; } = string.Empty;

        [Required]
        [StringLength(100)]
        public string PlotNumber { get; set; } = string.Empty;

        [Required]
        [StringLength(255)]
        public string SiteName { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}