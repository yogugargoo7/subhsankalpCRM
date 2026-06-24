namespace Subh_sankalp_estate.Services
{
    public interface IBlobStorageService
    {
        Task<string> UploadFileAsync(IFormFile file, string containerName = "subhsankalpimage");
        Task<bool> DeleteFileAsync(string fileUrl, string containerName = "subhsankalpimage");
        Task<List<string>> UploadMultipleFilesAsync(IFormFileCollection files, string containerName = "subhsankalpimage");
        Task<Stream?> DownloadFileAsync(string fileUrl, string containerName = "subhsankalpimage");
    }
}