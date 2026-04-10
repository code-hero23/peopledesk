/**
 * Compresses an image file using HTML5 Canvas
 * @param {File} file - The original image file
 * @param {Object} options - Compression options
 * @param {number} options.maxWidth - Max width of the resulting image
 * @param {number} options.maxHeight - Max height of the resulting image
 * @param {number} options.quality - Compression quality (0 to 1)
 * @returns {Promise<File>} - A promise that resolves to the compressed File object
 */
export const compressImage = (file, options = { maxWidth: 1200, maxHeight: 1200, quality: 0.7 }) => {
    return new Promise((resolve, reject) => {
        // Skip compression for non-image files (e.g. PDFs)
        if (!file.type.startsWith('image/')) {
            console.log('Skipping compression for non-image file:', file.name);
            return resolve(file);
        }

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Calculate new dimensions while maintaining aspect ratio
                if (width > height) {
                    if (width > options.maxWidth) {
                        height *= options.maxWidth / width;
                        width = options.maxWidth;
                    }
                } else {
                    if (height > options.maxHeight) {
                        width *= options.maxHeight / height;
                        height = options.maxHeight;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob(
                    (blob) => {
                        if (!blob) {
                            return reject(new Error('Canvas to Blob conversion failed'));
                        }
                        const compressedFile = new File([blob], file.name, {
                            type: 'image/jpeg',
                            lastModified: Date.now(),
                        });
                        console.log(`Original size: ${(file.size / 1024).toFixed(2)} KB`);
                        console.log(`Compressed size: ${(compressedFile.size / 1024).toFixed(2)} KB`);
                        resolve(compressedFile);
                    },
                    'image/jpeg',
                    options.quality
                );
            };
            img.onerror = (error) => reject(error);
        };
        reader.onerror = (error) => reject(error);
    });
};
