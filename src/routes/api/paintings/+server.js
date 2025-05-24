import { json } from '@sveltejs/kit';
import { connectDB } from '$lib/server/db.js';

export async function GET() {
  try {
    const db = await connectDB();
    const paintings = await db.collection('paintings').find().toArray();

    const transformed = paintings.map(p => ({
      ...p,
      _id: p._id.toString()
    }));

    return json(transformed);
  } catch (error) {
    console.error('Ошибка при получении картин:', error);
    return json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

export async function POST({ request, locals }) {
  try {
    const user = locals.user;

    // 🔒 Только админ может добавлять
    if (!user || user.role !== 'admin') {
      return json({ error: 'Доступ запрещён' }, { status: 403 });
    }

    const data = await request.json();

    // Обновляем список обязательных полей
    const requiredFields = ['title', 'price', 'dimensions', 'previewImage', 'hoverPreviewImage', 'detailImages', 'saleFileUrl'];
    for (const field of requiredFields) {
      // Проверяем, что поле не пустое и не undefined/null
      if (data[field] === undefined || data[field] === null || (typeof data[field] === 'string' && data[field].trim() === '') || (Array.isArray(data[field]) && data[field].length === 0)) {
        return json({ error: `Необходимо указать ${field}` }, { status: 400 });
      }
    }

    const painting = {
      title: data.title,
      description: data.description || '', // Описание может быть пустым
      price: Number(data.price) || 0,
      dimensions: data.dimensions, // Теперь обязательно
      previewImage: data.previewImage, // Обязательное поле
      hoverPreviewImage: data.hoverPreviewImage, // Обязательное поле
      detailImages: Array.isArray(data.detailImages) ? data.detailImages : [], // Обязательное поле, массив URL
      saleFileUrl: data.saleFileUrl, // Обязательное поле, URL файла для продажи
      createdAt: data.createdAt ? new Date(data.createdAt) : new Date()
    };

    const db = await connectDB();
    const result = await db.collection('paintings').insertOne(painting);

    return json({
      message: 'Картина успешно добавлена',
      id: result.insertedId.toString()
    });
  } catch (err) {
    console.error('Ошибка при добавлении картины:', err);
    return json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}