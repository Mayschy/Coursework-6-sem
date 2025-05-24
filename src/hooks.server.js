// src/hooks.server.js
import { getUserById } from '$lib/server/db';

/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
  const userId = event.cookies.get('user_id');
  // console.log('Hooks: Reading user_id cookie:', userId);

  if (userId) {
    try {
      const user = await getUserById(userId);

      if (user) {
        // 🔧 Преобразуем ObjectId в строку для клиента
        // user._id = user._id.toString(); // Это уже делалось, но повторю на всякий случай

        // Если user.cart передается, то нужно преобразовать paintingId
        if (user.cart && Array.isArray(user.cart)) {
          user.cart = user.cart.map(item => ({
            ...item, // Копируем другие свойства
            paintingId: item.paintingId.toString() // Преобразуем ObjectId в строку
          }));
        }

        event.locals.user = {
            _id: user._id.toString(), // Убедиться, что это строка
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            cart: user.cart || [] // Передаем преобразованную корзину
        };
        // console.log('Hooks: User found and set in locals:', event.locals.user.email);
      } else {
        event.cookies.delete('user_id', { path: '/' });
        event.locals.user = null;
        // console.log('Hooks: User ID cookie found but user not in DB. Clearing cookie.');
      }
    } catch (e) {
      console.error('Hooks: Error fetching user from DB:', e);
      event.cookies.delete('user_id', { path: '/' });
      event.locals.user = null;
    }
  } else {
    event.locals.user = null;
    // console.log('Hooks: No user_id cookie found.');
  }

  return resolve(event);
}