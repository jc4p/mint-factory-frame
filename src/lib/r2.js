import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { nanoid } from 'nanoid';

// Initialize R2 client
const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

/**
 * Uploads a file to Cloudflare R2 storage
 * 
 * @param {Buffer} buffer - The file buffer to upload
 * @param {string} path - The path/folder to store the file in
 * @param {string} fileName - The name to use for the file
 * @param {string} contentType - The content type of the file
 * @returns {Promise<string>} - The URL of the uploaded file
 */
export async function uploadToR2(buffer, path, fileName, contentType) {
  try {
    const fullPath = path ? `${path}/${fileName}` : fileName;
    
    await s3Client.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: fullPath,
        Body: buffer,
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000',
      })
    );

    // Return the public URL where the image will be accessible
    return `${process.env.R2_PUBLIC_URL}/${fullPath}`;
  } catch (error) {
    console.error('Error uploading to R2:', error);
    throw new Error('Failed to upload file to storage');
  }
}

/**
 * Generate a random hash for unique identification using nanoid
 * @param {number} length - Length of the hash (default: 16)
 * @returns {string} - Random hash
 */
export function generateHash(length = 16) {
  return nanoid(length);
}