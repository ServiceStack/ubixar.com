using System.Security.Cryptography;
using ServiceStack;
using ServiceStack.Text;
using ServiceStack.Web;

namespace MyApp.ServiceInterface;

public class AssetManager
{
    /// <summary>
    /// Calculates the SHA256 hash of an uploaded file and saves it to disk
    /// with the hash as its name (plus original extension).
    /// </summary>
    /// <param name="uploadedFile">The IFormFile to process.</param>
    /// <returns>The final filename (hash + extension) or null if an error occurred.</returns>
    public static async Task<string> SaveFileAsync(IHttpFile uploadedFile, string assetsDir)
    {
        if (uploadedFile == null || uploadedFile.ContentLength == 0)
            throw new ArgumentException("File is null or empty.", nameof(uploadedFile));

        var tempFilePath = Path.GetTempFileName(); // Get a unique temporary file path
        byte[] hashBytes;

        try
        {
            using (var sha256 = SHA256.Create())
            {
                // Open the destination temporary file stream
                await using (var tempFileStream = new FileStream(tempFilePath, FileMode.Create, FileAccess.Write, FileShare.None, bufferSize: 4096, useAsync: true))
                {
                    // Wrap the temp file stream with a CryptoStream to compute hash while writing
                    await using (var cryptoStream = new CryptoStream(tempFileStream, sha256, CryptoStreamMode.Write))
                    {
                        // Get the stream from the uploaded file
                        await using (var inputStream = uploadedFile.InputStream)
                        {
                            await inputStream.CopyToAsync(cryptoStream);
                        }
                        // cryptoStream.FlushFinalBlock(); // Ensure all data is written and hash is finalized
                        // Closing/disposing cryptoStream automatically calls FlushFinalBlock
                    }
                }
                // Hash is now computed
                hashBytes = sha256.Hash;
            }

            // Convert hash to hexadecimal string
            var sb = StringBuilderCache.Allocate();
            foreach (var b in hashBytes)
            {
                sb.Append(b.ToString("x2"));
            }
            string hashString = sb.ToString();

            // Determine original file extension
            string originalExtension = Path.GetExtension(uploadedFile.FileName); // e.g., ".txt"

            // Construct final file name and path
            string finalFileName = hashString + originalExtension;
            var hashDir = hashString[..2];
            string finalFilePath = Path.Combine(assetsDir, hashDir, finalFileName);

            // Ensure the specific target directory within _storagePath exists (if any subdirectories in finalFileName)
            Path.GetDirectoryName(finalFilePath).AssertDir();

            // Move the temporary file to the final location
            // If a file with the same hash already exists, File.Move will throw an IOException.
            if (File.Exists(finalFilePath))
            {
                // File with this hash already exists. Delete temp file and return existing name.
                File.Delete(tempFilePath);
                return finalFileName; // Or handle as an error/different logic
            }

            File.Move(tempFilePath, finalFilePath);

            return finalFileName;
        }
        catch (Exception ex)
        {
            // Log the exception (ex)
            // Clean up the temporary file if an error occurs
            if (File.Exists(tempFilePath))
            {
                File.Delete(tempFilePath);
            }
            throw;
        }
    }    
}