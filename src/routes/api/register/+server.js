// D:\new store pj\artstore-svelte\src\routes\api\register\+server.js
import { json } from '@sveltejs/kit';
import bcrypt from 'bcryptjs';
import { connectDB } from '$lib/server/db';
import nodemailer from 'nodemailer';

export async function POST({ request }) {
  const user = await request.json();
  const db = await connectDB();
  const existing = await db.collection('users').findOne({ email: user.email });
  if (existing) return json({ message: 'Email already in use' }, { status: 400 });

  user.passwordHash = await bcrypt.hash(user.password, 10);
  delete user.password;
  user.role = 'customer';
  user.createdAt = new Date();

  await db.collection('users').insertOne(user);

  // Уведомление по почте (простая версия)
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465, // SSL порт
    secure: true, // использовать SSL
    auth: {
      user: process.env.GMAIL_USER, // <-- Проверь, что это не undefined
      pass: process.env.GMAIL_PASS  // <-- Проверь, что это не undefined
    }
  });

  console.log('Attempting to send registration email...');
  console.log('GMAIL_USER:', process.env.GMAIL_USER ? 'Loaded' : 'NOT LOADED'); // Логируем статус загрузки переменных

  try {
    const info = await transporter.sendMail({ // Добавил info для лога ответа
      from: 'Art Store <no-reply@artstore.com>',
      to: user.email,
      subject: 'Добро пожаловать на ArtStore!',
      text: `Здравствуйте, ${user.firstName}! Спасибо за регистрацию на нашем сайте.`
    });
    console.log('Email sent successfully:', info.messageId); // Успешная отправка
  } catch (error) {
    console.error('Ошибка отправки письма:', error); // <-- ЭТО САМЫЙ ВАЖНЫЙ ЛОГ
    // В случае ошибки отправки письма, не блокируем регистрацию, но логируем.
  }

  return json({ success: true });
}