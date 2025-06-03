// src/routes/api/upload-dropbox/+server.js
import { json } from '@sveltejs/kit';
import { Dropbox } from 'dropbox';
// import { env } from '$env/dynamic/private'; // Эту строку больше не используем

// Используем process.env напрямую
const dbx = new Dropbox({ accessToken: process.env.DROPBOX_ACCESS_TOKEN });

export async function POST({ request, locals }) {
    // Проверка прав администратора
    if (!locals.user || locals.user.role !== 'admin') {
        return json({ error: 'Access denied. Administrator rights required.' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file'); // Имя поля должно соответствовать 'file' из FormData на фронтенде
    const filePath = formData.get('path'); // Опционально: путь в Dropbox, если хотите указывать

    if (!(file instanceof File)) {
        return json({ error: 'No file provided or file is invalid' }, { status: 400 });
    }

    const MAX_FILE_SIZE = 100 * 1024 * 1024; // Например, 100 MB для файлов продаж
    if (file.size > MAX_FILE_SIZE) {
        return json({ error: `File size too large. Maximum ${MAX_FILE_SIZE / (1024 * 1024)} MB.` }, { status: 400 });
    }

    // Чтение файла в Buffer
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    // Формируем путь файла в Dropbox
    // Например: /YourAppFolder/paintings/filename.pdf
    const destinationPath = `/${filePath || 'sales_files'}/${file.name}`; 

    try {
        // 1. Загрузка файла на Dropbox
        const uploadResult = await dbx.filesUpload({
            path: destinationPath,
            contents: fileBuffer,
            mode: { '.tag': 'overwrite' }, // Перезаписать, если файл с таким именем уже существует
            autorename: false, // Не переименовывать автоматически
        });

        // 2. Создание общей ссылки на загруженный файл
        const shareLinkResult = await dbx.sharingCreateSharedLinkWithSettings({
            path: destinationPath,
            settings: {
                // Если вам нужен только прямой доступ к файлу (без предпросмотра на Dropbox),
                // можете добавить '.dl=1' или '.dl=0' к ссылке.
                // Dropbox API обычно возвращает ссылку для предпросмотра,
                // для прямой загрузки нужно модифицировать ее.
                // См. https://www.dropbox.com/developers/reference/tour#shared-links
                // Если 'resolved_visibility' не 'public', то ссылка может быть не общей.
            }
        });

        let sharedUrl = shareLinkResult.result.url;
        // Dropbox ссылки для файлов обычно выглядят так: https://www.dropbox.com/s/abcdef/file.pdf?dl=0
        // Для прямой загрузки часто меняют ?dl=0 на ?dl=1
        if (sharedUrl.includes('?dl=0')) {
            sharedUrl = sharedUrl.replace('?dl=0', '?raw=1'); // or ?dl=1 for direct download behavior
        } else if (!sharedUrl.includes('?')) {
            sharedUrl = `${sharedUrl}?raw=1`;
        }

        return json({ url: sharedUrl });

    } catch (error) {
        console.error('Dropbox upload or sharing error:', error);
        // Проверка типа ошибки для более детального сообщения
        if (error.error && error.error.error_summary) {
            return json({ error: `Dropbox API error: ${error.error.error_summary}` }, { status: 500 });
        }
        return json({ error: 'Error uploading file to Dropbox' }, { status: 500 });
    }
}