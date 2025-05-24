// D:\new store pj\artstore-svelte\src\routes\cart\+page.server.js
import { redirect } from '@sveltejs/kit';

export async function load({ locals }) {
  // Проверяем авторизацию пользователя
  if (!locals.user) {
    throw redirect(302, '/login'); // Перенаправляем на страницу входа, если не авторизован
  }

  // Данные корзины будут загружаться на клиенте через fetch,
  // чтобы SvelteKit мог обработать 401, если сессия истекла после загрузки страницы.
  // Можно также загружать здесь, но тогда нужно обработать ошибки 401/403 иначе.
  return {};
}