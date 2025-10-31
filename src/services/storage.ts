import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import fs from 'fs/promises';

/**
 * Cloud Storage Service using Cloudinary
 * Free tier: 25GB storage + 25GB bandwidth/month
 * 
 * Setup instructions:
 * 1. Sign up at https://cloudinary.com/users/register/free
 * 2. Get your credentials from the dashboard
 * 3. Add them to your .env file:
 *    CLOUDINARY_CLOUD_NAME=your_cloud_name
 *    CLOUDINARY_API_KEY=your_api_key
 *    CLOUDINARY_API_SECRET=your_api_secret
 */

// Configure Cloudinary
if (env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
  });
  logger.info('Cloudinary configured successfully');
} else {
  logger.warn('Cloudinary credentials not found in environment. File uploads will fail until configured.');
}

export interface UploadResult {
  publicId: string;
  url: string;
  secureUrl: string;
  format: string;
  resourceType: string;
  bytes: number;
}

/**
 * Upload a file to Cloudinary
 * @param filePath Local file path to upload
 * @param options Upload options (folder, resource_type, etc.)
 * @returns Upload result with public URL
 */
export async function uploadToCloud(
  filePath: string,
  options: {
    folder?: string;
    resourceType?: 'image' | 'video' | 'raw' | 'auto';
    publicId?: string;
    tags?: string[];
  } = {}
): Promise<UploadResult> {
  try {
    if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
      throw new Error('Cloudinary credentials not configured. Please add CLOUDINARY_* variables to .env file.');
    }

    // Default to 'auto' to handle all file types (images, PDFs, docs, etc.)
    const resourceType = options.resourceType || 'auto';
    
    const uploadOptions: any = {
      resource_type: resourceType,
      folder: options.folder || 'multimodal-chat',
      use_filename: true,
      unique_filename: true,
    };

    if (options.publicId) {
      uploadOptions.public_id = options.publicId;
    }

    if (options.tags && options.tags.length > 0) {
      uploadOptions.tags = options.tags;
    }

    // Upload to Cloudinary
    const result: UploadApiResponse = await cloudinary.uploader.upload(filePath, uploadOptions);

    logger.info({
      publicId: result.public_id,
      url: result.secure_url,
      format: result.format,
      bytes: result.bytes,
    }, 'File uploaded to Cloudinary successfully');

    return {
      publicId: result.public_id,
      url: result.url,
      secureUrl: result.secure_url,
      format: result.format,
      resourceType: result.resource_type,
      bytes: result.bytes,
    };
  } catch (error) {
    logger.error({ error, filePath }, 'Failed to upload file to Cloudinary');
    throw error;
  }
}

/**
 * Delete a file from Cloudinary
 * @param publicId The public ID of the file to delete
 * @param resourceType Type of resource (image, video, raw)
 */
export async function deleteFromCloud(
  publicId: string,
  resourceType: 'image' | 'video' | 'raw' = 'raw'
): Promise<void> {
  try {
    if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
      logger.warn('Cloudinary not configured, skipping delete operation');
      return;
    }

    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    
    logger.info({ publicId, resourceType }, 'File deleted from Cloudinary successfully');
  } catch (error) {
    logger.error({ error, publicId }, 'Failed to delete file from Cloudinary');
    throw error;
  }
}

/**
 * Get the public URL for a file
 * @param publicId The public ID of the file
 * @param options Transformation options
 * @returns Public URL
 */
export function getCloudinaryUrl(
  publicId: string,
  options: {
    width?: number;
    height?: number;
    crop?: string;
    format?: string;
  } = {}
): string {
  try {
    return cloudinary.url(publicId, {
      secure: true,
      ...options,
    });
  } catch (error) {
    logger.error({ error, publicId }, 'Failed to generate Cloudinary URL');
    throw error;
  }
}

/**
 * Clean up local file after upload
 * @param filePath Path to local file to delete
 */
export async function cleanupLocalFile(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
    logger.debug({ filePath }, 'Local file cleaned up');
  } catch (error) {
    logger.warn({ error, filePath }, 'Failed to cleanup local file (may already be deleted)');
  }
}

/**
 * Download a file from Cloudinary URL to a buffer
 * @param url The Cloudinary URL to download from
 * @returns Buffer containing the file data
 */
export async function downloadFromCloud(url: string): Promise<Buffer> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    logger.error({ error, url }, 'Failed to download file from cloud');
    throw error;
  }
}

export const storageService = {
  uploadToCloud,
  deleteFromCloud,
  getCloudinaryUrl,
  cleanupLocalFile,
  downloadFromCloud,
};
