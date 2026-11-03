import fs from 'fs';
import path from 'path';
import { cloudinary, isCloudinaryConfigured } from '../config/cloudinary';
import { ApiError } from '../utils/ApiError';

export interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
}

// Fallback directory in frontend public assets
const LOCAL_UPLOADS_DIR = path.resolve(__dirname, '../../../frontend/public/uploads/team-logos');

export const uploadTeamLogo = async (
  fileBuffer?: Buffer,
  base64String?: string,
  teamTag?: string
): Promise<CloudinaryUploadResult> => {
  const cleanTag = teamTag?.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'team';
  const timestamp = Date.now();
  const publicId = `${cleanTag}_${timestamp}`;

  // Helper for safe local storage fallback
  const saveLocally = (): CloudinaryUploadResult => {
    try {
      if (!fs.existsSync(LOCAL_UPLOADS_DIR)) {
        fs.mkdirSync(LOCAL_UPLOADS_DIR, { recursive: true });
      }

      if (fileBuffer) {
        const filename = `${publicId}.png`;
        const filePath = path.join(LOCAL_UPLOADS_DIR, filename);
        fs.writeFileSync(filePath, fileBuffer);
        console.log(`[Storage] Saved team logo locally to: ${filePath}`);
        return {
          secure_url: `/uploads/team-logos/${filename}`,
          public_id: `local-${publicId}`,
        };
      }

      if (base64String) {
        const matches = base64String.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches[2]) {
          const buffer = Buffer.from(matches[2], 'base64');
          const filename = `${publicId}.png`;
          const filePath = path.join(LOCAL_UPLOADS_DIR, filename);
          fs.writeFileSync(filePath, buffer);
          console.log(`[Storage] Saved base64 team logo locally to: ${filePath}`);
          return {
            secure_url: `/uploads/team-logos/${filename}`,
            public_id: `local-${publicId}`,
          };
        }
      }
    } catch (fsErr) {
      console.warn('[Storage] Local write fallback warning:', fsErr);
    }

    // Ultimate fallback if local filesystem write is prevented
    return {
      secure_url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=200&auto=format&fit=crop&q=80',
      public_id: `fallback-${publicId}`,
    };
  };

  // If Cloudinary is not configured at all, use local fallback
  if (!isCloudinaryConfigured()) {
    console.log('[Storage] Cloudinary not configured. Using local uploads.');
    return saveLocally();
  }

  // Attempt Cloudinary upload
  try {
    const folder = 'cst-lan-challenge/team-logos';

    if (fileBuffer) {
      try {
        const result: any = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            {
              folder,
              public_id: publicId,
              resource_type: 'image',
              transformation: [{ width: 400, height: 400, crop: 'limit', quality: 'auto' }],
            },
            (error, res) => {
              if (error || !res) return reject(error);
              resolve(res);
            }
          );
          stream.end(fileBuffer);
        });

        return {
          secure_url: result.secure_url,
          public_id: result.public_id,
        };
      } catch (uploadErr: any) {
        console.warn(
          `[Cloudinary Notice] Upload stream failed (${uploadErr?.message || 'unknown'}). ` +
          `Falling back to local storage so registration succeeds without interruption.`
        );
        return saveLocally();
      }
    }

    if (base64String) {
      try {
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
      } catch (uploadErr: any) {
        console.warn(
          `[Cloudinary Notice] Base64 upload failed (${uploadErr?.message || 'unknown'}). ` +
          `Falling back to local storage so registration succeeds without interruption.`
        );
        return saveLocally();
      }
    }

    throw ApiError.badRequest('No image data provided for logo upload.');
  } catch (error: any) {
    if (error instanceof ApiError) throw error;
    console.warn('[Cloudinary Warning] Falling back to local storage:', error.message);
    return saveLocally();
  }
};

export const deleteImage = async (publicId: string): Promise<boolean> => {
  if (!publicId || publicId.startsWith('fallback-') || publicId.startsWith('local-')) {
    return true;
  }
  if (!isCloudinaryConfigured()) {
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
