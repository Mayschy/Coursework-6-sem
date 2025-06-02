// D:\new store pj\artstore-svelte\src\hooks.server.js
import { getUserById } from '$lib/server/db'; // Предполагается, что эта функция корректно получает пользователя по ID и возвращает его без пароля.

/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
  const userId = event.cookies.get('user_id');

  if (userId) {
    try {
      const user = await getUserById(userId);

      if (user) {
        // Если user.cart уже массив из getUserById, то map не повредит,
        // но убедитесь, что paintingId - это ObjectId, иначе .toString() может быть излишним.
        // Я оставляю, как есть, предполагая, что paintingId - это ObjectId в БД.
        if (user.cart && Array.isArray(user.cart)) {
          user.cart = user.cart.map(item => ({
            ...item,
            paintingId: item.paintingId.toString()
          }));
        }

        // Установка locals.user
        event.locals.user = {
          _id: user._id.toString(), // Важно: ObjectId в строку
          email: user.email,
          name: user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.email, // Используем name для Footer
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          cart: user.cart || [] // Убедимся, что cart всегда массив
        };
      } else {
        event.cookies.delete('user_id', { path: '/' }); // Очищаем куку, если пользователь не найден
        event.locals.user = null;
      }
    } catch (e) {
      console.error('Hooks: Error fetching user from DB:', e);
      event.cookies.delete('user_id', { path: '/' });
      event.locals.user = null;
    }
  } else {
    event.locals.user = null;
  }

  return resolve(event);
}