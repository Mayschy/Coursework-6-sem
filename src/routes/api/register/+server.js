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
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS
  }
});

try {
  await transporter.sendMail({
    from: 'Art Store <no-reply@artstore.com>',
    to: user.email,
    subject: 'Добро пожаловать на ArtStore!',
    text: `Здравствуйте, ${user.firstName}! Спасибо за регистрацию на нашем сайте.`
  });
} catch (error) {
  console.error('Ошибка отправки письма:', error);
}

  return json({ success: true });
}
