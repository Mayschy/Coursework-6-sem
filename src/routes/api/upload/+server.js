// D:\new store pj\artstore-svelte\src\routes\api\upload\+server.js
import { json } from '@sveltejs/kit';
import cloudinary from '$lib/server/cloudinary';

export async function POST({ request }) {
  const formData = await request.formData();
  const file = formData.get('image');

  // Получаем значение 'folder' из formData.
  // Приводим его к строке, так как formData.get() может вернуть File.
  const folderValue = formData.get('folder');
  const folder = typeof folderValue === 'string' ? folderValue : 'artstore'; // Убеждаемся, что это строка

  // Проверка типа
  if (!(file instanceof File)) {
    return json({ error: 'Файл не передан или некорректен' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // Возвращаем промис, оборачивая upload_stream
  const upload = () =>
    new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: folder }, // Используем динамическую папку, теперь с гарантией типа string
        (error, result) => {
          if (error) {
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
    console.error('Ошибка загрузки в Cloudinary:', err);
    return json({ error: 'Ошибка при загрузке изображения' }, { status: 500 });
  }
}