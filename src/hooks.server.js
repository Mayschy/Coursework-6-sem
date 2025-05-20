// hooks.server.js
import { getUserById } from '$lib/server/db';

/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
  const userId = event.cookies.get('user_id');

  if (userId) {
    const user = await getUserById(userId);

    if (user) {
      // 🔧 Преобразуем ObjectId в строку
      user._id = user._id.toString();

      event.locals.user = user;
    } else {
      event.locals.user = null;
    }
  } else {
    event.locals.user = null;
  }

  return resolve(event);
}
