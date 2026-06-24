using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Subh_sankalp_estate.Data;

namespace Subh_sankalp_estate.Controllers
{
    [Route("api/public/plots")]
    [ApiController]
    public class PublicPlotsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public PublicPlotsController(ApplicationDbContext context)
        {
            _context = context;
        }

        // GET: api/public/plots
        [HttpGet]
        public async Task<ActionResult<object>> GetPublicPlots()
        {
            try
            {
                var plots = await _context.Plots
                    .OrderBy(p => p.PlotNumber)
                    .Select(p => new
                    {
                        p.Id,
                        PlotNumber = p.PlotNumber,
                        p.PlotSize,
                        p.SiteName,
                        p.Status,
                        p.BasicRate,
                        p.TotalPrice,
                        p.Block,
                        p.Facing
                    })
                    .ToListAsync();

                // Group by status for easy display
                var summary = new
                {
                    TotalPlots = plots.Count,
                    Available = plots.Count(p => p.Status == "Available"),
                    Token = plots.Count(p => p.Status == "Tokened"), // Database uses "Tokened"
                    PartPayment = plots.Count(p => p.Status == "PartPayment"),
                    Booked = plots.Count(p => p.Status == "Booked"),
                    Sold = plots.Count(p => p.Status == "Sold"),
                    Plots = plots
                };

                return Ok(summary);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error fetching plots data", error = ex.Message });
            }
        }

        // GET: api/public/plots/summary
        [HttpGet("summary")]
        public async Task<ActionResult<object>> GetPlotsSummary()
        {
            try
            {
                var plots = await _context.Plots.ToListAsync();

                var summary = new
                {
                    TotalPlots = plots.Count,
                    Available = plots.Count(p => p.Status == "Available"),
                    Token = plots.Count(p => p.Status == "Tokened"), // Database uses "Tokened"
                    PartPayment = plots.Count(p => p.Status == "PartPayment"),
                    Booked = plots.Count(p => p.Status == "Booked"),
                    Sold = plots.Count(p => p.Status == "Sold"),
                    LastUpdated = DateTime.UtcNow
                };

                return Ok(summary);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error fetching summary", error = ex.Message });
            }
        }

        // GET: api/public/plots/by-site
        [HttpGet("by-site")]
        public async Task<ActionResult<object>> GetPlotsBySite()
        {
            try
            {
                var plots = await _context.Plots.ToListAsync();

                var groupedBySite = plots
                    .GroupBy(p => p.SiteName)
                    .Select(g => new
                    {
                        SiteName = g.Key,
                        TotalPlots = g.Count(),
                        Available = g.Count(p => p.Status == "Available"),
                        Token = g.Count(p => p.Status == "Tokened"), // Database uses "Tokened"
                        PartPayment = g.Count(p => p.Status == "PartPayment"),
                        Booked = g.Count(p => p.Status == "Booked"),
                        Sold = g.Count(p => p.Status == "Sold"),
                        Plots = g.Select(p => new
                        {
                            PlotNumber = p.PlotNumber,
                            p.PlotSize,
                            p.Status,
                            p.BasicRate
                        }).OrderBy(p => p.PlotNumber)
                    })
                    .ToList();

                return Ok(groupedBySite);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error fetching plots by site", error = ex.Message });
            }
        }
    }
}
