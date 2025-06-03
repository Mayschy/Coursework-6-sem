// D:\new store pj\artstore-svelte\src\routes\api\upload\+server.js
import { json } from '@sveltejs/kit';
import cloudinary from '$lib/server/cloudinary';

export async function POST({ request, locals }) {
    if (!locals.user || locals.user.role !== 'admin') {
        return json({ error: 'Access denied. Administrator rights required.' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('image');

    const folderValue = formData.get('folder');
    const folder = typeof folderValue === 'string' ? folderValue : 'artstore';

    if (!(file instanceof File)) {
        return json({ error: 'No file provided or file is invalid' }, { status: 400 });
    }

    const MAX_FILE_SIZE = 5 * 1024 * 1024; 
    if (file.size > MAX_FILE_SIZE) {
        return json({ error: `File size too large. Maximum ${MAX_FILE_SIZE / (1024 * 1024)} MB.` }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const upload = () =>
        new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
                { folder: folder },
                (error, result) => {
                    if (error) {
                        console.error('Cloudinary upload error:', error);
                        reject(error);
                    } else {
                        resolve(result);
                    }
                }
            );
            stream.end(buffer);
        });

    try {
        const result = await upload();
        return json({ url: result.secure_url });
    } catch (err) {
        console.error('Error uploading to Cloudinary:', err);
        return json({ error: 'Error uploading image to server' }, { status: 500 });
    }
}