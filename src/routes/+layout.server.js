// D:\new store pj\artstore-svelte\src\routes\+layout.server.js
import { connectDB } from '$lib/server/db';
import { ObjectId } from 'mongodb';

export async function load({ locals }) {
  let user = null;
  let cartCount = 0;

  if (locals.user) {
    user = locals.user;

    // Вариант 1: Если locals.user.cart УЖЕ ПРЕОБРАЗОВАН в hooks.server.js, просто используй его
    if (user.cart && Array.isArray(user.cart)) {
      cartCount = user.cart.length;
    } else {
      // Вариант 2: Если cart не загружается в hooks.server.js или не преобразуется там,
      // то делаем запрос и преобразуем здесь.
      const db = await connectDB();
      const userDataWithCart = await db.collection('users').findOne(
        { _id: new ObjectId(user._id) },
        { projection: { cart: 1 } }
      );

      if (userDataWithCart && userDataWithCart.cart && Array.isArray(userDataWithCart.cart)) {
        // --- ИСПРАВЛЕНИЕ ЗДЕСЬ ---
        // Преобразуем ObjectId в строки
        const serializableCart = userDataWithCart.cart.map(item => ({
          ...item,
          paintingId: item.paintingId.toString()
        }));
        cartCount = serializableCart.length;

        // Также обнови locals.user.cart, если ты его используешь на клиенте
        // user.cart = serializableCart; // Если нужно, чтобы в user на клиенте была корзина
        // --- КОНЕЦ ИСПРАВЛЕНИЯ ---
      }
    }
  }

  return {
    user: user, // user должен содержать сериализуемые данные
    cartCount: cartCount
  };
}