
export const IMAGE_CONFIG = {
    maxWidth: 1200,           
    maxHeight: 16000,         
    quality: 0.82,            
    coverMaxWidth: 400,       
    coverMaxHeight: 600,      
    coverQuality: 0.85        
};


export async function processImage(file, type = 'page') {
    return new Promise((resolve, reject) => {
        const img = new Image();

        img.onload = () => {
            const config = type === 'cover'
                ? { maxW: IMAGE_CONFIG.coverMaxWidth, maxH: IMAGE_CONFIG.coverMaxHeight, quality: IMAGE_CONFIG.coverQuality }
                : { maxW: IMAGE_CONFIG.maxWidth, maxH: IMAGE_CONFIG.maxHeight, quality: IMAGE_CONFIG.quality };

            let { width, height } = img;

            
            if (width > config.maxW) {
                const ratio = config.maxW / width;
                width = config.maxW;
                height = Math.round(height * ratio);
            }

            
            if (height > config.maxH) {
                
                const parts = [];
                const numParts = Math.ceil(height / config.maxH);
                const partHeight = Math.ceil(height / numParts);

                for (let i = 0; i < numParts; i++) {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');

                    const srcY = Math.round((i * img.naturalHeight) / numParts);
                    const srcH = Math.round(img.naturalHeight / numParts);

                    canvas.width = width;
                    canvas.height = partHeight;

                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';

                    
                    ctx.drawImage(
                        img,
                        0, srcY, img.naturalWidth, srcH,  
                        0, 0, width, partHeight            
                    );

                    const base64 = canvas.toDataURL('image/webp', config.quality).split(',')[1];
                    parts.push({
                        data: base64,
                        suffix: `_part${i + 1}`
                    });
                }

                resolve(parts);

            } else {
                
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                canvas.width = width;
                canvas.height = height;

                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(img, 0, 0, width, height);

                const base64 = canvas.toDataURL('image/webp', config.quality).split(',')[1];

                resolve([{ data: base64, suffix: '' }]);
            }
        };

        img.onerror = () => reject(new Error(`Failed to load image: ${file.name}`));
        img.src = URL.createObjectURL(file);
    });
}
