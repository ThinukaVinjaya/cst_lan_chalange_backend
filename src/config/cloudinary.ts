import { v2 as cloudinary } from 'cloudinary';
import { env } from './environment';

export const isCloudinaryConfigured = (): boolean => {
  return !!(
    env.CLOUDINARY_CLOUD_NAME &&
    env.CLOUDINARY_API_KEY &&
    env.CLOUDINARY_API_SECRET
  );
};

if (isCloudinaryConfigured()) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  console.log(`Cloudinary configured for cloud: ${env.CLOUDINARY_CLOUD_NAME}`);
} else {
  console.log('Cloudinary credentials not provided in .env - fallback storage will be used for demo logos.');
}

export { cloudinary };

