// D:\new store pj\artstore-svelte\src\routes\login\+page.server.js
import { fail, redirect } from '@sveltejs/kit';
import { connectDB } from '$lib/server/db';
import bcrypt from 'bcryptjs';
import { ObjectId } from 'mongodb'; // Не забудь импортировать

/** @type {import('./$types').Actions} */
export const actions = {
  default: async ({ request, cookies }) => {
    const data = await request.formData();
    const email = data.get('email');
    const password = data.get('password');

    // --- ИСПРАВЛЕНИЕ ЗДЕСЬ ---
    // Проверяем, что email и password - это строки, и они не пустые
    if (typeof email !== 'string' || !email) {
      return fail(400, { email: '', error: 'Пожалуйста, введите корректный email.' });
    }
    if (typeof password !== 'string' || !password) {
      return fail(400, { email, error: 'Пожалуйста, введите пароль.' });
    }
    // --- КОНЕЦ ИСПРАВЛЕНИЯ ---

    const db = await connectDB();
    const user = await db.collection('users').findOne({ email });

    // Проверяем, что user.passwordHash существует и является строкой
    if (!user || typeof user.passwordHash !== 'string' || !(await bcrypt.compare(password, user.passwordHash))) {
      return fail(400, { email, error: 'Неверный email или пароль.' });
    }

    // Пользователь успешно аутентифицирован
    cookies.set('user_id', user._id.toString(), {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // true в продакшене, false для localhost по HTTP
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 1 неделя
    });

    // Редирект на сервере после успешной аутентификации
    throw redirect(303, '/');
  }
};