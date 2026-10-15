/**
 * Client-side image compressor using HTML5 Canvas.
 * Compresses heavy phone camera photos (~3-8 MB) down to lightweight WebP (~80-150 KB)
 * before uploading across mobile networks.
 *
 * Enforces strict image-only decoding: if non-image or corrupted files are supplied,
 * this function explicitly rejects to prevent uncompressed/spoofed payloads from reaching the API.
 */

const ALLOWED_INPUT_MIMES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
];

export async function compressQueuePhoto(
  file: File,
  maxDimension = 1280,
  quality = 0.75
): Promise<File> {
  if (typeof window === 'undefined') {
    return file;
  }

  // Pre-validate file type
  if (file.type && !file.type.startsWith('image/')) {
    return Promise.reject(new Error('Format file tidak didukung. Harap pilih file gambar (JPG, PNG, WebP).'));
  }

  if (file.type && !ALLOWED_INPUT_MIMES.includes(file.type.toLowerCase())) {
    return Promise.reject(new Error('Format gambar tidak didukung. Hanya JPEG, PNG, dan WebP yang diizinkan.'));
  }

  // If already a lightweight WebP, skip re-encoding
  if (file.type === 'image/webp' && file.size < 200 * 1024) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Basic sanity check on decoded image dimensions
        if (width <= 0 || height <= 0) {
          reject(new Error('Dimensi gambar tidak valid.'));
          return;
        }

        // Calculate aspect ratio scale
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Gagal menginisialisasi kanvas pengolah gambar.'));
          return;
        }

        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to WebP
        const mimeType = 'image/webp';
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Gagal mengompresi gambar ke format WebP.'));
              return;
            }

            const cleanName = file.name.replace(/\.[^/.]+$/, '');
            const compressedFile = new File([blob], `${cleanName}.webp`, {
              type: mimeType,
              lastModified: Date.now(),
            });

            resolve(compressedFile);
          },
          mimeType,
          quality
        );
      };

      img.onerror = () => {
        reject(new Error('File yang dipilih bukan gambar yang valid atau format file rusak.'));
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error('Gagal membaca file gambar dari perangkat.'));
    };

    reader.readAsDataURL(file);
  });
}
