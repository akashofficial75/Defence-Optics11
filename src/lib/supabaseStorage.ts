import { initSupabase, getSupabaseCredentials } from './supabase';

export interface UploadResult {
  url?: string;
  error?: string;
}

const DEFAULT_BUCKET = 'product-images';

/**
 * Attempts to ensure a public bucket exists in Supabase Storage.
 * Catches and ignores permission errors if the anon key cannot create buckets,
 * allowing subsequent upload to proceed if the bucket already exists.
 */
async function ensureBucket(bucketName: string): Promise<void> {
  const client = initSupabase();
  if (!client) return;

  try {
    const { data: buckets, error } = await client.storage.listBuckets();
    if (!error && buckets) {
      const exists = buckets.some((b) => b.name === bucketName);
      if (!exists) {
        await client.storage.createBucket(bucketName, {
          public: true,
          fileSizeLimit: 10485760, // 10MB
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'],
        });
      }
    }
  } catch (err) {
    // Non-fatal: Bucket listing/creation may require service_role key,
    // but client.storage.from(bucket).upload() can still succeed if the bucket exists.
  }
}

/**
 * Uploads an image file to Supabase Storage and returns its public URL.
 * Accepts JPG, PNG, WEBP only.
 */
export async function uploadImageToSupabase(
  file: File,
  bucketName: string = DEFAULT_BUCKET
): Promise<UploadResult> {
  const { isConnected } = getSupabaseCredentials();
  const client = initSupabase();

  if (!isConnected || !client) {
    return {
      error: 'Supabase is not connected. Please configure your Supabase URL & Anon Key in the Settings tab, or paste a direct image URL.',
    };
  }

  // 1. File Type Validation
  const validExtensions = ['jpg', 'jpeg', 'png', 'webp'];
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const isImageMime = file.type.startsWith('image/') && ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'].includes(file.type.toLowerCase());

  if (!isImageMime && !validExtensions.includes(ext)) {
    return {
      error: 'Only image files are allowed (.jpg, .jpeg, .png, .webp). Please select a valid image file.',
    };
  }

  // 2. File Size Validation (Max 10MB)
  const MAX_SIZE = 10 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    return {
      error: `Image size is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Maximum allowed size is 10MB.`,
    };
  }

  try {
    // 3. Try to ensure bucket exists
    await ensureBucket(bucketName);

    // 4. Clean and format filename with timestamp + random token to avoid collisions
    const safeBase = file.name
      .replace(/\.[^/.]+$/, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .substring(0, 32);
    const uniqueToken = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const finalExt = ext || 'jpg';
    const filePath = `uploads/${safeBase}_${uniqueToken}.${finalExt}`;

    // 5. Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await client.storage
      .from(bucketName)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type || 'image/jpeg',
      });

    if (uploadError) {
      console.error('Supabase Storage upload error:', uploadError);
      const msg = uploadError.message || '';

      if (msg.toLowerCase().includes('bucket not found') || (uploadError as any).statusCode === 404) {
        // Attempt to create bucket directly and retry upload
        try {
          const { error: createErr } = await client.storage.createBucket(bucketName, { public: true });
          if (!createErr) {
            const retry = await client.storage.from(bucketName).upload(filePath, file, {
              cacheControl: '3600',
              upsert: true,
              contentType: file.type || 'image/jpeg',
            });
            if (!retry.error) {
              const { data: pub } = client.storage.from(bucketName).getPublicUrl(filePath);
              if (pub?.publicUrl) {
                return { url: pub.publicUrl };
              }
            }
          }
        } catch {
          // continue to informative error
        }

        return {
          error: `Bucket '${bucketName}' was not found in your Supabase project. Please create a public bucket named '${bucketName}' in Supabase Dashboard > Storage, or paste a direct image URL.`,
        };
      }

      if (msg.toLowerCase().includes('row-level security') || msg.toLowerCase().includes('policy')) {
        return {
          error: `Storage RLS Policy Error: Supabase Storage requires an insert policy for bucket '${bucketName}'. You can run the schema in Settings or make '${bucketName}' public in Supabase Storage.`,
        };
      }

      return {
        error: msg || 'Failed to upload image to Supabase Storage.',
      };
    }

    // 6. Get Public URL
    const { data: publicUrlData } = client.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    if (!publicUrlData || !publicUrlData.publicUrl) {
      return {
        error: 'Upload succeeded but failed to generate a public URL for the file.',
      };
    }

    return {
      url: publicUrlData.publicUrl,
    };
  } catch (err: any) {
    console.error('Upload exception:', err);
    return {
      error: err?.message || 'An unexpected error occurred while uploading. Please try pasting a direct image URL.',
    };
  }
}
