// src/routes/api/upload-dropbox/+server.js
import { json } from '@sveltejs/kit';
import { Dropbox } from 'dropbox';

const dbx = new Dropbox({ accessToken: process.env.DROPBOX_ACCESS_TOKEN });

export async function POST({ request, locals }) {
    if (!locals.user || locals.user.role !== 'admin') {
        return json({ error: 'Access denied. Administrator rights required.' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const filePath = formData.get('path');

    if (!(file instanceof File)) {
        return json({ error: 'No file provided or file is invalid' }, { status: 400 });
    }

    const MAX_FILE_SIZE = 100 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
        return json({ error: `File size too large. Maximum ${MAX_FILE_SIZE / (1024 * 1024)} MB.` }, { status: 400 });
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());

    const destinationPath = `/${filePath || 'sales_files'}/${file.name}`; 

    try {
        const uploadResult = await dbx.filesUpload({
            path: destinationPath,
            contents: fileBuffer,
            mode: { '.tag': 'overwrite' },
            autorename: false,
        });

        const shareLinkResult = await dbx.sharingCreateSharedLinkWithSettings({
            path: destinationPath,
            settings: {}
        });

        let sharedUrl = shareLinkResult.result.url;
        if (sharedUrl.includes('?dl=0')) {
            sharedUrl = sharedUrl.replace('?dl=0', '?raw=1');
        } else if (!sharedUrl.includes('?')) {
            sharedUrl = `${sharedUrl}?raw=1`;
        }

        return json({ url: sharedUrl });

    } catch (error) {
        console.error('Dropbox upload or sharing error:', error);
        if (error.error && error.error.error_summary) {
            return json({ error: `Dropbox API error: ${error.error.error_summary}` }, { status: 500 });
        }
        return json({ error: 'Error uploading file to Dropbox' }, { status: 500 });
    }
}