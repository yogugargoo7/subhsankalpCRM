namespace Subh_sankalp_estate.DTOs
{
    public class CustomerFormDto
    {
        public string Name { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string PlotNumber { get; set; } = string.Empty;
        public string password { get; set; } = string.Empty;
    }
    public class CustomerDto
    {
        public string Name { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string PlotNumber { get; set; } =  string.Empty;
        public string SiteName { get; set; } = string.Empty;
        public string password { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.Now;
    }
}
