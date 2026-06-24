using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;

namespace Subh_sankalp_estate.Services
{
    public class BlobStorageService : IBlobStorageService
    {
        private readonly BlobServiceClient _blobServiceClient;
        private readonly ILogger<BlobStorageService> _logger;

        public BlobStorageService(BlobServiceClient blobServiceClient, ILogger<BlobStorageService> logger)
        {
            _blobServiceClient = blobServiceClient;
            _logger = logger;
        }

        public async Task<string> UploadFileAsync(IFormFile file, string containerName = "subhsankalpimage")
        {
            try
            {
                _logger.LogInformation($"Starting upload for file: {file?.FileName}, Size: {file?.Length}");
                
                if (file == null || file.Length == 0)
                    throw new ArgumentException("File is empty or null");

                // Validate file type
                var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".pdf", ".doc", ".docx" };
                var fileExtension = Path.GetExtension(file.FileName).ToLowerInvariant();
                
                _logger.LogInformation($"File extension: {fileExtension}");
                
                if (!allowedExtensions.Contains(fileExtension))
                    throw new ArgumentException($"File type {fileExtension} is not allowed");

                // Generate unique filename
                var fileName = $"{Guid.NewGuid()}{fileExtension}";
                _logger.LogInformation($"Generated filename: {fileName}");
                
                // Get container client
                _logger.LogInformation($"Getting container client for: {containerName}");
                var containerClient = _blobServiceClient.GetBlobContainerClient(containerName);
                
                _logger.LogInformation($"Creating container if not exists...");
                await containerClient.CreateIfNotExistsAsync();
                
                // Get blob client
                var blobClient = containerClient.GetBlobClient(fileName);
                _logger.LogInformation($"Blob URI will be: {blobClient.Uri}");
                
                // Upload file
                _logger.LogInformation($"Starting blob upload...");
                using var stream = file.OpenReadStream();
                await blobClient.UploadAsync(stream, new BlobHttpHeaders 
                { 
                    ContentType = file.ContentType 
                });
                
                _logger.LogInformation($"File uploaded successfully: {fileName}");
                return blobClient.Uri.ToString();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error uploading file to blob storage");
                throw;
            }
        }

        public async Task<List<string>> UploadMultipleFilesAsync(IFormFileCollection files, string containerName = "subhsankalpimage")
        {
            var uploadedUrls = new List<string>();
            
            _logger.LogInformation($"Starting upload of {files.Count} files to container: {containerName}");
            
            foreach (var file in files)
            {
                try
                {
                    _logger.LogInformation($"Uploading file: {file.FileName}, Size: {file.Length}");
                    var url = await UploadFileAsync(file, containerName);
                    uploadedUrls.Add(url);
                    _logger.LogInformation($"Successfully uploaded: {file.FileName} -> {url}");
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, $"Failed to upload file: {file.FileName}");
                    // For debugging, let's throw the error instead of continuing
                    throw new Exception($"Failed to upload file {file.FileName}: {ex.Message}", ex);
                }
            }
            
            _logger.LogInformation($"Completed upload of {uploadedUrls.Count} files");
            return uploadedUrls;
        }

        public async Task<bool> DeleteFileAsync(string fileUrl, string containerName = "subhsankalpimage")
        {
            try
            {
                var uri = new Uri(fileUrl);
                var fileName = Path.GetFileName(uri.LocalPath);
                
                var containerClient = _blobServiceClient.GetBlobContainerClient(containerName);
                var blobClient = containerClient.GetBlobClient(fileName);
                
                var response = await blobClient.DeleteIfExistsAsync();
                
                _logger.LogInformation($"File deleted: {fileName}, Success: {response.Value}");
                return response.Value;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error deleting file from blob storage: {fileUrl}");
                return false;
            }
        }

        public async Task<Stream?> DownloadFileAsync(string fileUrl, string containerName = "subhsankalpimage")
        {
            try
            {
                _logger.LogInformation($"Starting download for file URL: {fileUrl}");
                
                var uri = new Uri(fileUrl);
                var fileName = Path.GetFileName(uri.LocalPath);
                
                _logger.LogInformation($"Extracted filename: {fileName}");
                
                var containerClient = _blobServiceClient.GetBlobContainerClient(containerName);
                var blobClient = containerClient.GetBlobClient(fileName);
                
                // Check if blob exists
                var exists = await blobClient.ExistsAsync();
                if (!exists.Value)
                {
                    _logger.LogWarning($"Blob does not exist: {fileName}");
                    return null;
                }
                
                _logger.LogInformation($"Downloading blob: {fileName}");
                var response = await blobClient.DownloadStreamingAsync();
                
                _logger.LogInformation($"Successfully downloaded blob: {fileName}");
                return response.Value.Content;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error downloading file from blob storage: {fileUrl}");
                return null;
            }
        }
    }
}