// D:\new store pj\artstore-svelte\src\routes\api\cart\+server.js
import { json } from '@sveltejs/kit';
import { connectDB } from '$lib/server/db.js';
import { ObjectId } from 'mongodb';

// GET: Получить содержимое корзины текущего пользователя
export async function GET({ locals }) {
  try {
    const user = locals.user;

    if (!user) {
      return json({ error: 'Пользователь не авторизован' }, { status: 401 });
    }

    const db = await connectDB();
    const userData = await db.collection('users').findOne(
      { _id: new ObjectId(user._id) },
      { projection: { cart: 1 } } // Получаем только поле 'cart'
    );

    if (!userData || !userData.cart) {
      return json({ cart: [] }); // Возвращаем пустую корзину, если нет или пуста
    }

    // Обогащаем информацию о картинах в корзине
    const paintingIds = userData.cart.map(item => new ObjectId(item.paintingId));
    const paintings = await db.collection('paintings').find({ _id: { $in: paintingIds } }).toArray();

    const cartWithDetails = userData.cart.map(item => {
      const paintingDetail = paintings.find(p => p._id.equals(item.paintingId));
      return paintingDetail ? {
        // Убираем quantity, так как картины поштучные
        paintingId: item.paintingId.toString(), // Приводим ObjectId к строке
        addedAt: item.addedAt,
        painting: { // Добавляем полную информацию о картине
          _id: paintingDetail._id.toString(),
          title: paintingDetail.title,
          price: paintingDetail.price,
          previewImage: paintingDetail.previewImage,
          dimensions: paintingDetail.dimensions
        }
      } : null;
    }).filter(Boolean); // Удаляем null, если картина не найдена (удалена)

    return json({ cart: cartWithDetails });
  } catch (error) {
    console.error('Ошибка при получении корзины:', error);
    return json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

// POST: Добавить картину в корзину
export async function POST({ request, locals }) {
  try {
    const user = locals.user;

    if (!user) {
      return json({ error: 'Пользователь не авторизован' }, { status: 401 });
    }

    const { paintingId } = await request.json();

    if (!ObjectId.isValid(paintingId)) {
      return json({ error: 'Неверный ID картины' }, { status: 400 });
    }

    const db = await connectDB();

    // Проверяем, существует ли картина
    const painting = await db.collection('paintings').findOne({ _id: new ObjectId(paintingId) });
    if (!painting) {
      return json({ error: 'Картина не найдена' }, { status: 404 });
    }

    // Проверяем, нет ли уже этой картины в корзине пользователя
    const userDoc = await db.collection('users').findOne({ _id: new ObjectId(user._id) });
    const itemInCart = userDoc?.cart?.find(item => item.paintingId.equals(new ObjectId(paintingId)));

    if (itemInCart) {
      return json({ message: 'Картина уже в корзине' }, { status: 200 });
    }

    // Добавляем картину в корзину (без quantity)
    await db.collection('users').updateOne(
      { _id: new ObjectId(user._id) },
      {
        $push: {
          cart: {
            paintingId: new ObjectId(paintingId),
            addedAt: new Date()
          }
        }
      }
    );

    return json({ message: 'Картина добавлена в корзину' }, { status: 200 });
  } catch (error) {
    console.error('Ошибка при добавлении в корзину:', error);
    return json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

// DELETE: Удалить картину из корзины
export async function DELETE({ request, locals }) {
  try {
    const user = locals.user;

    if (!user) {
      return json({ error: 'Пользователь не авторизован' }, { status: 401 });
    }

    const { paintingId } = await request.json(); // Принимаем ID картины для удаления

    if (!ObjectId.isValid(paintingId)) {
      return json({ error: 'Неверный ID картины' }, { status: 400 });
    }

    const db = await connectDB();

    await db.collection('users').updateOne(
      { _id: new ObjectId(user._id) },
      {
        $pull: {
          cart: {
            paintingId: new ObjectId(paintingId)
          }
        }
      }
    );

    return json({ message: 'Картина удалена из корзины' }, { status: 200 });
  } catch (error) {
    console.error('Ошибка при удалении из корзины:', error);
    return json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}