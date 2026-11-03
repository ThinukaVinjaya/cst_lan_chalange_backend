import { cloudinary, isCloudinaryConfigured } from '../config/cloudinary';
import { ApiError } from '../utils/ApiError';

export interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
}

export const uploadTeamLogo = async (
  fileBuffer?: Buffer,
  base64String?: string,
  teamTag?: string
): Promise<CloudinaryUploadResult> => {
  // If Cloudinary is not configured yet, return a valid esports placeholder
  if (!isCloudinaryConfigured()) {
    return {
      secure_url:
        'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=200&auto=format&fit=crop&q=80',
      public_id: `fallback-team-logo-${Date.now()}`,
    };
  }

  try {
    const folder = 'cst-lan-challenge/team-logos';
    const publicId = `${teamTag?.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'team'}_${Date.now()}`;

    if (fileBuffer) {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder,
            public_id: publicId,
            resource_type: 'image',
            transformation: [{ width: 400, height: 400, crop: 'limit', quality: 'auto' }],
          },
          (error, result) => {
            if (error || !result) {
              return reject(
                ApiError.badRequest('Failed to upload image to Cloudinary: ' + (error?.message || ''))
              );
            }
            resolve({
              secure_url: result.secure_url,
              public_id: result.public_id,
            });
          }
        );
        stream.end(fileBuffer);
      });
    }

    if (base64String) {
      const result = await cloudinary.uploader.upload(base64String, {
        folder,
        public_id: publicId,
        resource_type: 'image',
        transformation: [{ width: 400, height: 400, crop: 'limit', quality: 'auto' }],
      });

      return {
        secure_url: result.secure_url,
        public_id: result.public_id,
      };
    }

    throw ApiError.badRequest('No image data provided for logo upload.');
  } catch (error: any) {
    if (error instanceof ApiError) throw error;
    throw ApiError.badRequest('Cloudinary upload failure: ' + (error.message || ''));
  }
};

export const deleteImage = async (publicId: string): Promise<boolean> => {
  if (!isCloudinaryConfigured() || !publicId || publicId.startsWith('fallback-')) {
    return true;
  }
  try {
    await cloudinary.uploader.destroy(publicId);
    return true;
  } catch (e) {
    console.warn(`Failed to delete Cloudinary asset ${publicId}:`, e);
    return false;
  }
};

