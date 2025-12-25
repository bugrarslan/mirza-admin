import { createClient } from './supabase/client';

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
  path?: string;
}

export interface UploadOptions {
  bucket: 'vehicle-images' | 'campaign-images' | 'documents';
  folder?: string;
  maxSizeInMB?: number;
  allowedTypes?: string[];
}

/**
 * Dosya boyutunu MB cinsinden kontrol eder
 */
export function validateFileSize(file: File, maxSizeInMB: number): boolean {
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
  return file.size <= maxSizeInBytes;
}

/**
 * Dosya tipini kontrol eder
 */
export function validateFileType(file: File, allowedTypes: string[]): boolean {
  return allowedTypes.some(type => {
    if (type.endsWith('/*')) {
      return file.type.startsWith(type.replace('/*', ''));
    }
    return file.type === type;
  });
}

/**
 * Benzersiz dosya adı oluşturur
 */
export function generateUniqueFileName(originalName: string): string {
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 9);
  const ext = originalName.split('.').pop();
  const nameWithoutExt = originalName.replace(`.${ext}`, '').replace(/[^a-zA-Z0-9]/g, '_');
  return `${nameWithoutExt}_${timestamp}_${randomStr}.${ext}`;
}

/**
 * Supabase Storage'a dosya yükler
 */
export async function uploadFile(
  file: File,
  options: UploadOptions
): Promise<UploadResult> {
  const {
    bucket,
    folder = '',
    maxSizeInMB = 10,
    allowedTypes = ['image/*', 'application/pdf'],
  } = options;

  try {
    // Validasyon
    if (!validateFileSize(file, maxSizeInMB)) {
      return {
        success: false,
        error: `Dosya boyutu ${maxSizeInMB}MB'dan küçük olmalıdır.`,
      };
    }

    if (!validateFileType(file, allowedTypes)) {
      const types = allowedTypes.map(t => t.replace('/*', '')).join(', ');
      return {
        success: false,
        error: `Sadece ${types} dosyaları yüklenebilir.`,
      };
    }

    const supabase = createClient();
    const fileName = generateUniqueFileName(file.name);
    const filePath = folder ? `${folder}/${fileName}` : fileName;

    // Upload to Supabase Storage
    const { error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Storage upload error:', error);
      return {
        success: false,
        error: 'Dosya yüklenirken hata oluştu.',
      };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return {
      success: true,
      url: urlData.publicUrl,
      path: filePath,
    };
  } catch (error) {
    console.error('Upload error:', error);
    return {
      success: false,
      error: 'Beklenmeyen bir hata oluştu.',
    };
  }
}

/**
 * URL'den dosya yolunu çıkarır
 */
export function extractPathFromUrl(url: string, bucket: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split(`/storage/v1/object/public/${bucket}/`);
    return pathParts[1] || null;
  } catch {
    return null;
  }
}

/**
 * Supabase Storage'dan dosya siler
 */
export async function deleteFile(
  bucket: 'vehicle-images' | 'campaign-images' | 'documents',
  path: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient();
    const { error } = await supabase.storage.from(bucket).remove([path]);

    if (error) {
      console.error('Storage delete error:', error);
      return {
        success: false,
        error: 'Dosya silinirken hata oluştu.',
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Delete error:', error);
    return {
      success: false,
      error: 'Beklenmeyen bir hata oluştu.',
    };
  }
}

/**
 * Eski dosyayı siler ve yeni dosya yükler (update için)
 */
export async function replaceFile(
  oldUrl: string | null,
  newFile: File,
  options: UploadOptions
): Promise<UploadResult> {
  // Önce yeni dosyayı yükle
  const uploadResult = await uploadFile(newFile, options);

  if (!uploadResult.success) {
    return uploadResult;
  }

  // Yeni dosya başarıyla yüklendiyse, eski dosyayı sil
  if (oldUrl) {
    const oldPath = extractPathFromUrl(oldUrl, options.bucket);
    if (oldPath) {
      await deleteFile(options.bucket, oldPath);
    }
  }

  return uploadResult;
}
