import { ObjectId } from 'mongodb';
import { connectDB } from '$lib/db';  // импортируем функцию подключения

export async function GET({ params }) {
  const id = params.id;

  try {
    const db = await connectDB();  // получаем объект базы
    const painting = await db.collection('paintings').findOne({ _id: new ObjectId(id) });

    if (!painting) {
      return new Response(JSON.stringify({ error: 'Картина не найдена' }), { status: 404 });
    }

    return new Response(JSON.stringify(painting));
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Ошибка при получении картины' }), { status: 500 });
  }
}
