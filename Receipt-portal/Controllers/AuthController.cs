using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Subh_sankalp_estate.Data;
using Subh_sankalp_estate.DTOs;
using Subh_sankalp_estate.Models;
using Subh_sankalp_estate.Services;
using System.ComponentModel.DataAnnotations;

namespace Subh_sankalp_estate.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IJwtService _jwtService;
        private readonly IConfiguration _configuration;
        
        public AuthController(ApplicationDbContext context, IJwtService jwtService, IConfiguration configuration)
        {
            _context = context;
            _jwtService = jwtService;
            _configuration = configuration;
        }
        
        [HttpPost("login")]
        public async Task<ActionResult<LoginResponseDto>> Login(LoginDto loginDto)
        {
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Username == loginDto.Username && u.IsActive);
                
            if (user == null || !BCrypt.Net.BCrypt.Verify(loginDto.Password, user.PasswordHash))
            {
                return Unauthorized("Invalid credentials");
            }
            
            var token = _jwtService.GenerateToken(user);
            
            return Ok(new LoginResponseDto
            {
                Token = token,
                Role = user.Role,
                FullName = user.FullName,
                UserId = user.Id
            });
        }
        
        [HttpPost("customer-login")]
        public async Task<ActionResult<LoginResponseDto>> CustomerLogin(CustomerLoginDto loginDto)
        {
            // Find receipt with matching site name and plot number
          var customer = await _context.Customers
                .FirstOrDefaultAsync(r => 
                    r.SiteName == loginDto.SiteName && 
                    r.PlotNumber == loginDto.PlotNumber );
                    
            if (customer == null)
            {
                return Unauthorized("No customer found for this site and plot");
            }
            
            // For demo purposes, using a simple password format: Plot{PlotNumber}
            // In production, you'd want a more secure approach

            var expectedPassword = customer.password;
            
            if (loginDto.Password != expectedPassword)
            {
                return Unauthorized("Invalid password");
            }
            
            var token = _jwtService.GenerateCustomerToken(
                loginDto.SiteName, 
                loginDto.PlotNumber, 
                customer.Name
            );
            
            return Ok(new LoginResponseDto
            {
                Token = token,
                Role = "Customer",
                FullName = customer.Name,
                UserId = customer.Id // Use customer's ID instead of 0
            });
        }
        
        [HttpPost("signup")]
        public async Task<ActionResult<LoginResponseDto>> Signup(SignupDto signupDto)
        {
            try
            {

                
                // Validate model state
                if (!ModelState.IsValid)
                {
                    var errors = ModelState.Values
                        .SelectMany(v => v.Errors)
                        .Select(e => e.ErrorMessage)
                        .ToList();

                    return BadRequest(new { message = "Validation failed", errors = errors });
                }

                // Verify company secret key
                var companySecretKey = _configuration.GetValue<string>("CompanySettings:SecretKey");

                
                if (string.IsNullOrEmpty(companySecretKey))
                {
                    return BadRequest(new { message = "Company secret key not configured" });
                }
                
                if (signupDto.CompanySecretKey != companySecretKey)
                {

                    
                    // Add a small delay to prevent rapid brute force attempts
                    await Task.Delay(2000); // 2 second delay
                    
                    return BadRequest(new { message = "Invalid company secret key provided" });
                }
                
                // Check if username already exists
                if (await _context.Users.AnyAsync(u => u.Username == signupDto.Username))
                {
                    return BadRequest(new { message = "Username already exists" });
                }
                
                // Check if email already exists
                if (await _context.Users.AnyAsync(u => u.Email == signupDto.Email))
                {
                    return BadRequest(new { message = "Email already exists" });
                }
                
                // Validate role
                if (signupDto.Role != "Associate" && signupDto.Role != "Admin")
                {
                    return BadRequest(new { message = "Invalid role. Only Associate and Admin roles are allowed for signup." });
                }
            
            // Create new user
            var user = new User
            {
                Username = signupDto.Username,
                Email = signupDto.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(signupDto.Password),
                FullName = signupDto.FullName,
                Mobile = signupDto.Mobile,
                Role = signupDto.Role,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            
            _context.Users.Add(user);
            await _context.SaveChangesAsync();
            
                // Generate token for the new user
                var token = _jwtService.GenerateToken(user);
                
                return Ok(new LoginResponseDto
                {
                    Token = token,
                    Role = user.Role,
                    FullName = user.FullName,
                    UserId = user.Id
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = "Signup failed", error = ex.Message });
            }
        }

        [HttpPost("admin/reset-password")]
        [Microsoft.AspNetCore.Authorization.Authorize(Roles = "Admin")]
        public async Task<ActionResult> AdminResetPassword(AdminResetPasswordDto resetDto)
        {
            try
            {
                var adminUserId = int.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "0");
                var adminUser = await _context.Users.FindAsync(adminUserId);
                

                
                // Find the target user
                var targetUser = await _context.Users.FindAsync(resetDto.UserId);
                if (targetUser == null)
                {
                    return NotFound(new { message = "User not found" });
                }
                
                // Log admin-to-admin password resets for security monitoring
                if (targetUser.Role == "Admin" && targetUser.Id != adminUserId)
                {

                }
                
                // Hash the provided custom password
                var newPasswordHash = BCrypt.Net.BCrypt.HashPassword(resetDto.NewPassword);

                // Update user's password
                targetUser.PasswordHash = newPasswordHash;
                targetUser.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                return Ok(new {
                    message = "Password changed successfully",
                    username = targetUser.Username,
                    fullName = targetUser.FullName
                });
            }
            catch (Exception ex)
            {

                return BadRequest(new { message = "Password reset failed", error = ex.Message });
            }
        }

        private string GenerateTemporaryPassword()
        {
            // Generate a secure 8-character temporary password
            const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
            var random = new Random();
            var password = new char[8];
            
            for (int i = 0; i < password.Length; i++)
            {
                password[i] = chars[random.Next(chars.Length)];
            }
            
            return new string(password);
        }
    }
}