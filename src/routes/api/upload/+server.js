// D:\new store pj\artstore-svelte\src\routes\api\upload\+server.js
import { json } from '@sveltejs/kit';
import cloudinary from '$lib/server/cloudinary'; // Переконайтеся, що цей шлях правильний

export async function POST({ request, locals }) {
  // 1. ПЕРЕВІРКА АВТОРИЗАЦІЇ ТА РОЛІ
  if (!locals.user || locals.user.role !== 'admin') {
    return json({ error: 'Доступ заборонено. Потрібні права адміністратора.' }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get('image');

  const folderValue = formData.get('folder');
  const folder = typeof folderValue === 'string' ? folderValue : 'artstore';

  if (!(file instanceof File)) {
    return json({ error: 'Файл не надано або файл недійсний' }, { status: 400 });
  }

  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
  if (file.size > MAX_FILE_SIZE) {
    return json({ error: `Розмір файлу завеликий. Максимум ${MAX_FILE_SIZE / (1024 * 1024)} MB.` }, { status: 400 });
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
    console.error('Помилка при завантаженні на Cloudinary:', err);
    return json({ error: 'Помилка при завантаженні зображення на сервер' }, { status: 500 });
  }
}