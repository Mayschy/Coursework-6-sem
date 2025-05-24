import { json } from '@sveltejs/kit';
import { connectDB } from '$lib/server/db.js';
import { ObjectId } from 'mongodb';

export async function GET({ params }) {
  try {
    const db = await connectDB();
    const id = params.id;

    if (!ObjectId.isValid(id)) {
      return json({ error: 'Неверный ID' }, { status: 400 });
    }

    const painting = await db.collection('paintings').findOne({ _id: new ObjectId(id) });

    if (!painting) {
      return json({ error: 'Картина не найдена' }, { status: 404 });
    }

    painting._id = painting._id.toString();

    return json(painting);
  } catch (error) {
    console.error('Ошибка при получении картины:', error);
    return json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

export async function PUT({ params, request, locals }) {
  try {
    const user = locals.user;

    if (!user || user.role !== 'admin') {
      return json({ error: 'Доступ запрещён' }, { status: 403 });
    }

    const id = params.id;

    if (!ObjectId.isValid(id)) {
      return json({ error: 'Неверный ID' }, { status: 400 });
    }

    const data = await request.json();

    const update = {
      ...(data.title !== undefined && { title: data.title }), // Добавлено undefined для возможности очистки
      ...(data.description !== undefined && { description: data.description }),
      ...(data.price !== undefined && { price: Number(data.price) }),
      ...(data.dimensions !== undefined && { dimensions: data.dimensions }),
      // Новые поля для изображений и файла продажи
      ...(data.previewImage !== undefined && { previewImage: data.previewImage }),
      ...(data.hoverPreviewImage !== undefined && { hoverPreviewImage: data.hoverPreviewImage }),
      ...(Array.isArray(data.detailImages) && { detailImages: data.detailImages }),
      ...(data.saleFileUrl !== undefined && { saleFileUrl: data.saleFileUrl })
    };

    // Если update пустой, нет смысла обновлять
    if (Object.keys(update).length === 0) {
      return json({ message: 'Нет данных для обновления' }, { status: 200 });
    }

    const db = await connectDB();
    const result = await db.collection('paintings').updateOne(
      { _id: new ObjectId(id) },
      { $set: update }
    );

    if (result.matchedCount === 0) {
      return json({ error: 'Картина не найдена' }, { status: 404 });
    }

    return json({ message: 'Картина успешно обновлена' });
  } catch (error) {
    console.error('Ошибка при обновлении картины:', error);
    return json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

export async function DELETE({ params, locals }) {
  try {
    const user = locals.user;

    if (!user || user.role !== 'admin') {
      return json({ error: 'Доступ запрещён' }, { status: 403 });
    }

    const id = params.id;

    if (!ObjectId.isValid(id)) {
      return json({ error: 'Неверный ID' }, { status: 400 });
    }

    const db = await connectDB();
    const result = await db.collection('paintings').deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return json({ error: 'Картина не найдена' }, { status: 404 });
    }

    return json({ message: 'Картина успешно удалена' });
  } catch (error) {
    console.error('Ошибка при удалении картины:', error);
    return json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}