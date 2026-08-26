export type PreprocessImageOptions = {
  maxDimension?: number;
  maxSizeBytes?: number;
  initialQuality?: number;
};

export type PreprocessedImageResult = {
  file: File;
  previewUrl: string;
  cleanup: () => void;
};

/**
 * Loads an image from a URL into an HTMLImageElement.
 */
function loadImageElement(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Không thể đọc file ảnh.'));
    img.src = url;
  });
}

/**
 * Converts canvas to a Blob with specified MIME type and quality.
 */
function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

/**
 * Shared client helper for preprocessing images before uploading to AI scan endpoints:
 * - Resizes images to max 2048px on longest edge while preserving aspect ratio.
 * - Converts PNG to JPEG at quality ~0.82 (massively shrinking payload with no detection loss).
 * - Iteratively reduces quality & dimension if size exceeds 4.5MB threshold.
 * - Leaves small, valid MIME files (< 1.5MB JPEG/WebP with <= 2048px) untouched when possible.
 * - Returns a File, preview URL, and a cleanup callback that revokes object URLs.
 */
export async function preprocessImageForUpload(
  file: File,
  options: PreprocessImageOptions = {},
): Promise<PreprocessedImageResult> {
  const maxDimension = options.maxDimension ?? 2048;
  const maxSizeBytes = options.maxSizeBytes ?? 4.5 * 1024 * 1024; // 4.5 MB
  const initialQuality = options.initialQuality ?? 0.82;

  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('Định dạng ảnh không được hỗ trợ. Vui lòng chọn ảnh JPG, PNG hoặc WebP.');
  }

  // SSR or non-browser test environment guard
  if (
    typeof window === 'undefined' ||
    typeof document === 'undefined' ||
    typeof Image === 'undefined'
  ) {
    const previewUrl =
      typeof URL !== 'undefined' && URL.createObjectURL
        ? URL.createObjectURL(file)
        : '';
    return {
      file,
      previewUrl,
      cleanup: () => {
        if (previewUrl && typeof URL !== 'undefined' && URL.revokeObjectURL) {
          URL.revokeObjectURL(previewUrl);
        }
      },
    };
  }

  const rawObjectUrl = URL.createObjectURL(file);
  const isJpeg = file.type === 'image/jpeg';
  const isWebp = file.type === 'image/webp';
  const isPng = file.type === 'image/png';

  try {
    const img = await loadImageElement(rawObjectUrl);
    let width = img.naturalWidth || img.width;
    let height = img.naturalHeight || img.height;

    const needsResize = width > maxDimension || height > maxDimension;
    // PNGs over 800KB or any image over maxSizeBytes or needing resize must be re-encoded
    const needsConversion = isPng || file.size > maxSizeBytes || needsResize;

    if (!needsConversion && (isJpeg || isWebp)) {
      return {
        file,
        previewUrl: rawObjectUrl,
        cleanup: () => {
          URL.revokeObjectURL(rawObjectUrl);
        },
      };
    }

    // Scale dimensions keeping aspect ratio
    if (needsResize) {
      if (width >= height) {
        height = Math.max(1, Math.round((height * maxDimension) / width));
        width = maxDimension;
      } else {
        width = Math.max(1, Math.round((width * maxDimension) / height));
        height = maxDimension;
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      // Fallback to original
      return {
        file,
        previewUrl: rawObjectUrl,
        cleanup: () => URL.revokeObjectURL(rawObjectUrl),
      };
    }

    // Fill white background for transparent PNGs
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    // Iterative quality / dimension reduction
    let quality = initialQuality;
    let blob = await canvasToBlob(canvas, 'image/jpeg', quality);

    let iteration = 0;
    while (blob && blob.size > maxSizeBytes && iteration < 8) {
      iteration++;
      quality = Math.max(0.45, quality - 0.15);

      if (quality <= 0.6) {
        width = Math.max(1, Math.round(width * 0.8));
        height = Math.max(1, Math.round(height * 0.8));
        canvas.width = width;
        canvas.height = height;
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
      }

      blob = await canvasToBlob(canvas, 'image/jpeg', quality);
    }

    // Revoke initial raw object url
    URL.revokeObjectURL(rawObjectUrl);

    if (!blob) {
      throw new Error('Không thể nén dữ liệu ảnh.');
    }

    if (blob.size > maxSizeBytes) {
      throw new Error('Ảnh vẫn quá lớn sau khi tối ưu. Vui lòng chọn ảnh khác hoặc chụp ở độ phân giải thấp hơn.');
    }

    const baseName = file.name.replace(/\.[^/.]+$/, '');
    const processedFile = new File([blob], `${baseName}.jpg`, {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });

    const previewUrl = URL.createObjectURL(processedFile);

    return {
      file: processedFile,
      previewUrl,
      cleanup: () => {
        URL.revokeObjectURL(previewUrl);
      },
    };
  } catch (error) {
    // A small original can safely fall back when a browser cannot decode it.
    // Never send an oversized original after preprocessing has failed.
    if (file.size > maxSizeBytes) {
      URL.revokeObjectURL(rawObjectUrl);
      throw error instanceof Error
        ? error
        : new Error('Không thể tối ưu ảnh trước khi tải lên.');
    }
    return {
      file,
      previewUrl: rawObjectUrl,
      cleanup: () => URL.revokeObjectURL(rawObjectUrl),
    };
  }
}
