
import { API } from '../constants.js';
import { Result } from '../utils/result.js';

export class ImgBB {
    static async upload(file) {
        const formData = new FormData();
        formData.append('image', file);

        try {
            const response = await fetch(`${API.IMGBB_UPLOAD}?key=${API.IMGBB_KEY}`, {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                return Result.success(data.data);
            } else {
                return Result.failure(new Error(data.error?.message || 'Upload failed'));
            }
        } catch (e) {
            return Result.failure(e);
        }
    }
}
