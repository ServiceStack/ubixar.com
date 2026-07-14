using System.Security.Cryptography;
using ServiceStack;
using SkiaSharp;

namespace MyApp.ServiceInterface;

public static class ImageUtils
{
    public static string ToSha256Hash(this SKData data)
    {
        Span<byte> hash = stackalloc byte[32]; // SHA256 = 32 bytes
        SHA256.HashData(data.AsSpan(), hash);
        string hex = Convert.ToHexString(hash);
        return hex;
    }
    
    public static async Task SaveToAsync(this SKData data, string filePath)
    {
        ArgumentNullException.ThrowIfNull(data);
        if (string.IsNullOrWhiteSpace(filePath)) 
            throw new ArgumentException("File path is null or empty.", nameof(filePath));

        Path.GetDirectoryName(filePath).AssertDir();
        await using var fileStream = new FileStream(filePath, FileMode.Create, FileAccess.Write, FileShare.None, bufferSize: 4096, useAsync: true);
        await data.AsStream().CopyToAsync(fileStream);
    }
    
    public static SKData ResizeBitmapAsWebp(this SKBitmap originalBitmap, int targetWidth, int targetHeight) => 
        ResizeBitmapAsWebp(originalBitmap, targetWidth, targetHeight, out _, out _);

    public static SKData ResizeBitmapAsWebp(this SKBitmap originalBitmap, int targetWidth, int targetHeight, 
        out int sourceWidth, out int sourceHeight)
    {
        SKData? data = null;
        try
        {
            using var image = ResizeBitmap(originalBitmap, targetWidth, targetHeight, out sourceWidth, out sourceHeight);
            data = image.Encode(SKEncodedImageFormat.Webp, 90);
            return data;
        }
        catch
        {
            data?.Dispose();
            throw;
        }
    }

    public static SKData ResizeBitmapAsAvif(this SKBitmap originalBitmap, int targetWidth, int targetHeight) => 
        ResizeBitmapAsWebp(originalBitmap, targetWidth, targetHeight, out _, out _);

    public static SKData ResizeBitmapAsAvif(this SKBitmap originalBitmap, int targetWidth, int targetHeight, 
        out int sourceWidth, out int sourceHeight)
    {
        SKData? data = null;
        try
        {
            using var image = ResizeBitmap(originalBitmap, targetWidth, targetHeight, out sourceWidth, out sourceHeight);
            data = image.Encode(SKEncodedImageFormat.Avif, 90);
            return data;
        }
        catch
        {
            data?.Dispose();
            throw;
        }
    }

    public static SKImage ResizeBitmap(this SKBitmap originalBitmap, int targetWidth, int targetHeight) => 
        ResizeBitmap(originalBitmap, targetWidth, targetHeight, out _, out _);

    public static SKImage ResizeBitmap(SKBitmap originalBitmap, int targetWidth, int targetHeight, 
        out int sourceWidth, out int sourceHeight)
    {
        SKImage? image = null;
        try
        {
            sourceWidth = originalBitmap.Width;
            sourceHeight = originalBitmap.Height;

            // Calculate the scale factor to fill the target size (crop mode)
            var scale = Math.Max((float)targetWidth / sourceWidth, (float)targetHeight / sourceHeight);
            var scaledWidth = (int)(sourceWidth * scale);
            var scaledHeight = (int)(sourceHeight * scale);

            // Calculate crop position to center the image
            var cropX = (scaledWidth - targetWidth) / 2;
            var cropY = (scaledHeight - targetHeight) / 2;

            // Create the output bitmap
            using var outputBitmap = new SKBitmap(targetWidth, targetHeight);
            using var canvas = new SKCanvas(outputBitmap);
            using var paint = new SKPaint { IsAntialias = true };

            // Clear the canvas
            canvas.Clear(SKColors.Transparent);

            // Calculate source and destination rectangles for center crop
            var sourceRect = new SKRect(0, 0, sourceWidth, sourceHeight);
            var destRect = new SKRect(-cropX, -cropY, scaledWidth - cropX, scaledHeight - cropY);

            // Draw the scaled and cropped image
            canvas.DrawBitmap(originalBitmap, sourceRect, destRect, paint);

            image = SKImage.FromBitmap(outputBitmap);
            return image;
        }
        catch
        {
            image?.Dispose();
            throw;
        }
    }
}