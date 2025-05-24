// D:\new store pj\artstore-svelte\src\routes\api\login\+server.js
import { json, error } from '@sveltejs/kit';
import { connectDB } from '$lib/server/db';
import bcrypt from 'bcryptjs';

export async function POST({ request, cookies }) {
  const { email, password } = await request.json();
  const db = await connectDB();
  const user = await db.collection('users').findOne({ email });

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw error(401, 'Invalid credentials');
  }

  // --- ИСПРАВЛЕНИЕ ЗДЕСЬ ---
  cookies.set('user_id', user._id.toString(), {
    path: '/',
    httpOnly: true, // <-- ДОБАВЛЕНО: кука доступна только по HTTP
    secure: process.env.NODE_ENV === 'production', // <-- ДОБАВЛЕНО: только по HTTPS в продакшене
    sameSite: 'lax', // <-- ДОБАВЛЕНО: защита от CSRF
    maxAge: 60 * 60 * 24 * 7 // <-- ИЗМЕНЕНО: 1 неделя (60 сек * 60 мин * 24 часа * 7 дней)
  });
  // --- КОНЕЦ ИСПРАВЛЕНИЯ ---

  return json({ success: true });
}