// D:\new store pj\artstore-svelte\src\routes\+layout.server.js
import { connectDB } from '$lib/server/db';
import { ObjectId } from 'mongodb';

export async function load({ locals }) {
  let userForSession = null; // Переименовали для ясности, чтобы не путать с locals.user
  let calculatedCartCount = 0;

  if (locals.user) {
    userForSession = locals.user;

    // В hooks.server.js мы уже включили cart в locals.user,
    // но если вдруг там его нет или он не массив, этот блок догрузит/инициализирует.
    // Если вы уверены, что hooks.server.js всегда предоставляет корректный user.cart,
    // этот `if/else` блок можно упростить или даже удалить.
    if (userForSession.cart && Array.isArray(userForSession.cart)) {
      calculatedCartCount = userForSession.cart.length;
    } else {
      const db = await connectDB();
      const userDataWithCart = await db.collection('users').findOne(
        { _id: new ObjectId(userForSession._id) },
        { projection: { cart: 1 } }
      );

      if (userDataWithCart && userDataWithCart.cart && Array.isArray(userDataWithCart.cart)) {
        // Убедимся, что cart в userForSession будет сериализуемым
        userForSession.cart = userDataWithCart.cart.map(item => ({
          ...item,
          paintingId: item.paintingId.toString()
        }));
        calculatedCartCount = userForSession.cart.length;
      } else {
        userForSession.cart = []; // Гарантируем, что корзина - это пустой массив, если не найдена
        calculatedCartCount = 0;
      }
    }
  }

  // **** ВАЖНОЕ ИЗМЕНЕНИЕ: Возвращаем объект `session` ****
  return {
    session: {
      user: userForSession,
      cartCount: calculatedCartCount
    }
  };
}