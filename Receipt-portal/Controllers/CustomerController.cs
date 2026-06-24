
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Subh_sankalp_estate.Data;
using Subh_sankalp_estate.DTOs;
using Subh_sankalp_estate.Models;

namespace Subh_sankalp_estate.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CustomerController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        public CustomerController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetCustomers()
        {
            var customers = await _context.Customers.ToListAsync();
            return Ok(customers);
        }

      [HttpPost]
public async Task<IActionResult> CreateCustomer([FromBody] CustomerFormDto customer)
{
    if (customer == null)
        return BadRequest(new ApiError { Message = "Customer data is required." });

    var existingCustomer = await _context.Customers.AnyAsync(c => c.PlotNumber == customer.PlotNumber);

    if (existingCustomer)
        return BadRequest(new ApiError { Message = "Customer already exists." });

    var existingPlot = await _context.Plots.FirstOrDefaultAsync(p => p.PlotNumber == customer.PlotNumber);

    if (existingPlot == null)
        return BadRequest(new ApiError { Message = "Plot number does not exist." });

    var newCustomer = new Customer
    {
        Name = customer.Name,
        Email = customer.Email,
        PlotNumber = customer.PlotNumber,
        password = customer.password,
        SiteName = "Golden City Township",
        CreatedAt = DateTime.UtcNow
    };

    try
    {
        _context.Customers.Add(newCustomer);
        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = "Customer created successfully",
            customer = newCustomer
        });
    }
    catch (Exception ex)
    {
        return StatusCode(500, new ApiError
        {
            Message = "Database error occurred."
        });
    }
}

        [HttpDelete]
        [Route("{id}")]
        public async Task<IActionResult> DeleteCustomer(int id)
        {
            var customer = await _context.Customers.FindAsync(id);
            if (customer == null)
            {
                return NotFound(new {message = "Customer not found"});
            }
            try
            {
                _context.Customers.Remove(customer);
                await _context.SaveChangesAsync();
                return Ok(new {message = "Customer deleted successfully"});
            }
            catch (Exception ex)
            {
                return BadRequest(new {message = "Error deleting customer", error = ex.Message});
            }
        }

    }
    public class ApiError
    {
        public string Message { get; set; }
    }
}
