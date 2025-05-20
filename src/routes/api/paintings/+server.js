import { json } from '@sveltejs/kit';
import { connectDB } from '$lib/server/db.js';

export async function GET() {
  try {
    console.log('API /api/paintings: получение данных');
    const db = await connectDB();

    if (!db) {
      console.error('Соединение с БД не установлено');
      return json({ error: 'Нет соединения с базой данных' }, { status: 500 });
    }

    const paintings = await db.collection('paintings').find().toArray();
    console.log(`Найдено картин: ${paintings.length}`);

    if (!paintings.length) {
      return json([], { status: 200 });
    }

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

// Добавляем POST метод для сохранения новой картины
export async function POST({ request }) {
  try {
    const data = await request.json();

    // Простая валидация
    if (!data.title || !data.image) {
      return json({ error: 'Необходимо указать title и image' }, { status: 400 });
    }

    const db = await connectDB();

    if (!db) {
      return json({ error: 'Нет соединения с базой данных' }, { status: 500 });
    }

    const painting = {
      title: data.title,
      description: data.description || '',
      image: data.image,
      price: Number(data.price) || 0,
      author: data.author || '',
      createdAt: data.createdAt ? new Date(data.createdAt) : new Date()
    };

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
