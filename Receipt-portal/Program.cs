using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Subh_sankalp_estate.Data;
using Subh_sankalp_estate.Services;
using Swashbuckle.AspNetCore.Annotations;
using System.Text;

namespace Subh_sankalp_estate
{
    public class Program
    {
        public static void Main(string[] args)
        {
            try
            {
                Console.WriteLine("Application starting...");
                var builder = WebApplication.CreateBuilder(args);
                
                // Azure App Service specific configuration
                if (builder.Environment.IsProduction())
                {
                    builder.Services.Configure<ForwardedHeadersOptions>(options =>
                    {
                        options.ForwardedHeaders = Microsoft.AspNetCore.HttpOverrides.ForwardedHeaders.XForwardedFor | 
                                                 Microsoft.AspNetCore.HttpOverrides.ForwardedHeaders.XForwardedProto;
                        options.KnownNetworks.Clear();
                        options.KnownProxies.Clear();
                    });
                }

                // Configure for Azure App Service - Use PORT environment variable
                var port = Environment.GetEnvironmentVariable("PORT") ?? "8080";
                Console.WriteLine($"Environment: {builder.Environment.EnvironmentName}");
                Console.WriteLine($"Binding to port: {port}");
                
                // Configure URLs for Azure App Service
                if (builder.Environment.IsProduction())
                {
                    builder.WebHost.UseUrls($"http://*:{port}");
                    Console.WriteLine("Production mode: Using Azure App Service configuration");
                }
                else
                {
                    builder.WebHost.UseUrls($"http://0.0.0.0:{port}");
                    Console.WriteLine("Development mode: Using local configuration");
                }

                // Add services to the container with error handling
                try
                {
                    var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
                    Console.WriteLine($"Using connection string: {connectionString?.Substring(0, Math.Min(50, connectionString?.Length ?? 0))}...");
                    
                    builder.Services.AddDbContext<ApplicationDbContext>(options =>
                        options.UseSqlServer(connectionString,
                            o => o.UseQuerySplittingBehavior(QuerySplittingBehavior.SplitQuery)));
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Database configuration error: {ex.Message}");
                    throw;
                }

            // JWT Configuration with error handling
            try
            {
                var jwtSettings = builder.Configuration.GetSection("Jwt");
                var jwtKey = jwtSettings["Key"];
                if (string.IsNullOrEmpty(jwtKey))
                {
                    throw new InvalidOperationException("JWT Key is missing from configuration");
                }
                var key = Encoding.UTF8.GetBytes(jwtKey);
                Console.WriteLine("JWT configuration loaded successfully");

                builder.Services.AddAuthentication(options =>
                {
                    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
                    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
                })
                .AddJwtBearer(options =>
                {
                    options.TokenValidationParameters = new TokenValidationParameters
                    {
                        ValidateIssuer = true,
                        ValidateAudience = true,
                        ValidateLifetime = true,
                        ValidateIssuerSigningKey = true,
                        ValidIssuer = jwtSettings["Issuer"],
                        ValidAudience = jwtSettings["Audience"],
                        IssuerSigningKey = new SymmetricSecurityKey(key),
                        ClockSkew = TimeSpan.Zero
                    };
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"JWT configuration error: {ex.Message}");
                throw;
            }

            builder.Services.AddAuthorization();

            // Register services
            builder.Services.AddScoped<IJwtService, JwtService>();
            builder.Services.AddScoped<IReceiptService, ReceiptService>();
            builder.Services.AddScoped<IPlotStatusService, PlotStatusService>();
            builder.Services.AddHostedService<TokenExpiryBackgroundService>();
            
            // Register Azure Blob Storage
            builder.Services.AddSingleton(x =>
            {
                var connectionString = builder.Configuration["AzureBlobStorage:ConnectionString"];
                return new Azure.Storage.Blobs.BlobServiceClient(connectionString);
            });
            builder.Services.AddScoped<IBlobStorageService, BlobStorageService>();

            // CORS - Enhanced for all environments
            builder.Services.AddCors(options =>
            {
                options.AddPolicy("AllowReactApp", policy =>
                {
                    policy.AllowAnyOrigin()
                          .AllowAnyHeader()
                          .AllowAnyMethod();
                });
                
                // Additional permissive policy for troubleshooting
                options.AddPolicy("AllowAll", policy =>
                {
                    policy.SetIsOriginAllowed(_ => true)
                          .AllowAnyHeader()
                          .AllowAnyMethod()
                          .AllowCredentials();
                });
            });

            // Configure route options for case-insensitive routing
            builder.Services.Configure<RouteOptions>(options =>
            {
                options.LowercaseUrls = true;
                options.LowercaseQueryStrings = false; // Keep query strings as-is for now
            });

            builder.Services.AddControllers()
                .AddJsonOptions(options =>
                {
                    options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
                    options.JsonSerializerOptions.WriteIndented = true;
                });
            builder.Services.AddEndpointsApiExplorer();

            // ✅ Enhanced Swagger Configuration for Production
            builder.Services.AddSwaggerGen(c =>
            {
                // API Information
                c.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo
                {
                    Title = "Subh Sankalp Estate API",
                    Version = "v1",
                    Description = "API for Subh Sankalp Estate Management System - Real Estate CRM",
                    Contact = new Microsoft.OpenApi.Models.OpenApiContact
                    {
                        Name = "Subh Sankalp Estate",
                        Email = "admin@subhsankalp.com"
                    },
                    License = new Microsoft.OpenApi.Models.OpenApiLicense
                    {
                        Name = "Private License"
                    }
                });

                // JWT Bearer Authentication
                c.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
                {
                    Description = "JWT Authorization header using the Bearer scheme. Example: \"Authorization: Bearer {token}\"",
                    Name = "Authorization",
                    In = Microsoft.OpenApi.Models.ParameterLocation.Header,
                    Type = Microsoft.OpenApi.Models.SecuritySchemeType.ApiKey,
                    Scheme = "Bearer",
                    BearerFormat = "JWT"
                });

                c.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
                {
                    {
                        new Microsoft.OpenApi.Models.OpenApiSecurityScheme
                        {
                            Reference = new Microsoft.OpenApi.Models.OpenApiReference
                            {
                                Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                                Id = "Bearer"
                            }
                        },
                        Array.Empty<string>()
                    }
                });

                // Add XML comments if available
                try
                {
                    var xmlFile = $"{System.Reflection.Assembly.GetExecutingAssembly().GetName().Name}.xml";
                    var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
                    if (File.Exists(xmlPath))
                    {
                        c.IncludeXmlComments(xmlPath);
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Swagger: Could not load XML comments: {ex.Message}");
                }

                // Group endpoints by controller
                c.TagActionsBy(api => new[] { api.GroupName ?? api.ActionDescriptor.RouteValues["controller"] });
                c.DocInclusionPredicate((name, api) => true);

                // Enable annotations
                c.EnableAnnotations();
            });

            var app = builder.Build();

            // ✅ Always enable Swagger (Production & Development)
            try
            {
                // Configure Swagger JSON endpoint
                app.UseSwagger(c =>
                {
                    c.RouteTemplate = "swagger/{documentName}/swagger.json";
                    c.PreSerializeFilters.Add((swaggerDoc, httpReq) =>
                    {
                        // Ensure HTTPS URLs in production
                        if (app.Environment.IsProduction())
                        {
                            swaggerDoc.Servers = new List<Microsoft.OpenApi.Models.OpenApiServer>
                            {
                                new Microsoft.OpenApi.Models.OpenApiServer 
                                { 
                                    Url = "https://subhsankalp-backend-new.azurewebsites.net",
                                    Description = "Production Server"
                                }
                            };
                        }
                    });
                });
                
                // Configure Swagger UI
                app.UseSwaggerUI(c =>
                {
                    c.SwaggerEndpoint("/swagger/v1/swagger.json", "Subh Sankalp Estate API v1");
                    c.RoutePrefix = "swagger"; // URL will be /swagger
                    
                    // Enhanced UI Configuration for Production
                    c.DocumentTitle = "Subh Sankalp Estate API Documentation";
                    c.DefaultModelsExpandDepth(-1); // Hide models section by default
                    c.DefaultModelExpandDepth(1);
                    c.DisplayOperationId();
                    c.DisplayRequestDuration();
                    
                    // Enable core features
                    c.EnableDeepLinking();
                    c.EnableFilter();
                    c.ShowExtensions();
                    
                    // Enable "Try it out" for all environments
                    c.EnableTryItOutByDefault();
                    
                    // Production-specific configuration
                    if (app.Environment.IsProduction())
                    {
                        c.ConfigObject.AdditionalItems.Add("persistAuthorization", "true");
                        c.ConfigObject.AdditionalItems.Add("displayRequestDuration", "true");
                    }
                    
                    // Custom styling with production branding
                    c.HeadContent = @"
                        <style>
                            .swagger-ui .topbar { 
                                background-color: #2c3e50 !important; 
                            }
                            .swagger-ui .topbar .download-url-wrapper { 
                                display: none !important; 
                            }
                            .swagger-ui .info .title {
                                color: #2c3e50;
                                font-size: 36px;
                            }
                            .swagger-ui .info .description {
                                color: #34495e;
                            }
                            .swagger-ui .scheme-container {
                                background: #f8f9fa;
                                border: 1px solid #dee2e6;
                                border-radius: 4px;
                                padding: 10px;
                                margin: 10px 0;
                            }
                            .swagger-ui .info {
                                margin: 50px 0;
                            }
                            .swagger-ui .info .title small {
                                font-size: 10px;
                                position: relative;
                                top: -5px;
                                background: #27ae60;
                                color: white;
                                padding: 2px 6px;
                                border-radius: 3px;
                                margin-left: 15px;
                            }
                        </style>
                        <script>
                            window.onload = function() {
                                console.log('Swagger UI loaded successfully for Subh Sankalp Estate API');
                            }
                        </script>";
                    
                    // Add custom footer
                    c.InjectJavascript("/swagger-custom.js");
                });
                
                // Add custom JavaScript endpoint
                app.MapGet("/swagger-custom.js", () => 
                {
                    var js = @"
                        // Custom Swagger enhancements
                        window.addEventListener('load', function() {
                            // Add production indicator
                            const title = document.querySelector('.info .title');
                            if (title && window.location.hostname !== 'localhost') {
                                title.innerHTML += '<small>PRODUCTION</small>';
                            }
                            
                            // Auto-expand authentication section
                            setTimeout(() => {
                                const authButton = document.querySelector('.auth-wrapper .authorize');
                                if (authButton) {
                                    authButton.style.backgroundColor = '#27ae60';
                                    authButton.style.borderColor = '#27ae60';
                                }
                            }, 1000);
                        });";
                    return Results.Content(js, "application/javascript");
                });
                
                Console.WriteLine($"Swagger: Successfully configured for {app.Environment.EnvironmentName}");
                Console.WriteLine($"Swagger URL: /swagger");
                Console.WriteLine($"Swagger JSON: /swagger/v1/swagger.json");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Swagger: Error during configuration: {ex.Message}");
                Console.WriteLine($"Swagger: Stack trace: {ex.StackTrace}");
            }

            // Add manual CORS headers middleware with Swagger support
            app.Use(async (context, next) =>
            {
                var path = context.Request.Path.Value?.ToLower() ?? "";
                
                // Special handling for Swagger endpoints
                if (path.StartsWith("/swagger") || path.Contains("swagger.json") || path.StartsWith("/docs"))
                {
                    context.Response.Headers["Access-Control-Allow-Origin"] = "*";
                    context.Response.Headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS";
                    context.Response.Headers["Access-Control-Allow-Headers"] = "*";
                    context.Response.Headers["Cache-Control"] = "no-cache, no-store, must-revalidate";
                    context.Response.Headers["Pragma"] = "no-cache";
                    context.Response.Headers["Expires"] = "0";
                }
                else
                {
                    context.Response.Headers["Access-Control-Allow-Origin"] = "*";
                    context.Response.Headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS";
                    context.Response.Headers["Access-Control-Allow-Headers"] = "*";
                    context.Response.Headers["Access-Control-Allow-Credentials"] = "true";
                }
                
                if (context.Request.Method == "OPTIONS")
                {
                    context.Response.StatusCode = 200;
                    return;
                }
                
                await next();
            });

            // Configure forwarded headers for Azure App Service
            if (app.Environment.IsProduction())
            {
                app.UseForwardedHeaders();
            }
            
            // app.UseHttpsRedirection(); // optional: enable if SSL works
            app.UseCors("AllowReactApp");
            app.UseAuthentication();
            app.UseAuthorization();

            // Add API information endpoints
            app.MapGet("/", () => new { 
                message = "Subh Sankalp Estate API is running",
                status = "healthy", 
                timestamp = DateTime.UtcNow,
                environment = app.Environment.EnvironmentName,
                version = "v1",
                documentation = "/swagger",
                health = "/health",
                swaggerJson = "/swagger/v1/swagger.json",
                endpoints = new {
                    auth = "/api/auth",
                    receipts = "/api/receipts", 
                    plots = "/api/plots",
                    users = "/api/users",
                    payments = "/api/payments",
                    dashboard = "/api/dashboard"
                }
            })
            .WithName("GetApiInfo")
            .WithTags("API Info")
            .WithSummary("Get API information and available endpoints")
            .WithDescription("Returns basic information about the API, its status, and available endpoints");
            
            // Add direct Swagger redirect endpoint
            app.MapGet("/docs", () => Results.Redirect("/swagger"))
            .WithName("RedirectToDocs")
            .WithTags("API Info")
            .WithSummary("Redirect to API documentation")
            .WithDescription("Redirects to the Swagger UI documentation page");
            
            // Add health check endpoint
            app.MapGet("/health", () => new { 
                status = "healthy", 
                timestamp = DateTime.UtcNow,
                environment = app.Environment.EnvironmentName,
                uptime = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm:ss UTC")
            })
            .WithName("HealthCheck")
            .WithTags("Health")
            .WithSummary("Health check endpoint")
            .WithDescription("Returns the health status of the API");
            
            // Add API version endpoint
            app.MapGet("/api/version", () => new {
                version = "1.0.0",
                apiVersion = "v1",
                buildDate = DateTime.UtcNow.ToString("yyyy-MM-dd"),
                environment = app.Environment.EnvironmentName,
                framework = ".NET 8.0"
            })
            .WithName("GetVersion")
            .WithTags("API Info")
            .WithSummary("Get API version information")
            .WithDescription("Returns detailed version information about the API");

            app.MapControllers();

            Console.WriteLine("Application configured successfully. Starting server...");
            app.Run();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Application failed to start: {ex.Message}");
                Console.WriteLine($"Stack trace: {ex.StackTrace}");
                throw;
            }
        }
    }
}


//  "ConnectionStrings": {
//     "DefaultConnection": "Server=(localdb)\\mssqllocaldb;Database=SubhSankalpLocal;Trusted_Connection=true;MultipleActiveResultSets=true"
//   },

