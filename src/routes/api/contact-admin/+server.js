// src/routes/api/contact-admin/+server.js
import { json } from '@sveltejs/kit';
import nodemailer from 'nodemailer';
// import { GMAIL_USER, GMAIL_PASS } from '$env/static/private'; // Эту строку УДАЛЯЕМ!

import { connectDB } from '$lib/server/db'; 

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // For port 587, use false
  auth: {
    user: process.env.GMAIL_USER, // ИСПОЛЬЗУЕМ process.env
    pass: process.env.GMAIL_PASS  // ИСПОЛЬЗУЕМ process.env
  },
  tls: {
    rejectUnauthorized: false
  }
});

export async function POST({ request, locals }) {

  let database;
  try {
    database = await connectDB();
  } catch (error) {
    console.error('Failed to connect to DB for admin emails:', error);
    return json({ error: 'Сервер не смог подключиться к базе данных.' }, { status: 500 });
  }


  if (!locals.user) {
    return json({ error: 'Потрібна авторизація для відправки повідомлення.' }, { status: 401 });
  }

  const { userName, userEmail, subject, message } = await request.json();

  if (!userName || !userEmail || !subject || !message) {
    return json({ error: 'Будь ласка, заповніть усі поля.' }, { status: 400 });
  }

  let adminEmailList = [];
  try {
    const usersCollection = database.collection('users');
    const admins = await usersCollection.find({ role: 'admin' })
                                        .project({ email: 1, _id: 0 })
                                        .toArray();

    adminEmailList = admins.map(admin => admin.email);

    if (adminEmailList.length === 0) {
      console.warn("Не знайдено адміністраторів з роллю 'admin' у базі даних для відправки повідомлень.");
      return json({ error: 'Наразі немає адміністраторів для отримання повідомлень.' }, { status: 503 });
    }

  } catch (dbError) {
    console.error('Помилка при отриманні email-ів адміністраторів з БД:', dbError);
    return json({ error: 'Не вдалося отримати список адміністраторів. Спробуйте пізніше.' }, { status: 500 });
  }

  const mailOptions = {
    // ИСПОЛЬЗУЕМ process.env
    from: process.env.GMAIL_USER, 
    to: adminEmailList.join(','),
    subject: `Нове повідомлення з ArtStore від: ${userName} - ${subject}`,
    html: `
      <p>**Повідомлення від користувача ArtStore**</p>
      <p><strong>Ім'я:</strong> ${userName}</p>
      <p><strong>Email:</strong> ${userEmail}</p>
      <p><strong>Тема:</strong> ${subject}</p>
      <p><strong>Повідомлення:</strong></p>
      <p>${message.replace(/\n/g, '<br>')}</p>
      <hr>
      <p>Це автоматичне повідомлення. Будь ласка, не відповідайте на нього.</p>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    return json({ message: 'Повідомлення успішно відправлено.' }, { status: 200 });
  } catch (error) {
    console.error('Помилка відправки email:', error);
    return json({ error: 'Не вдалося відправити повідомлення. Спробуйте пізніше.' }, { status: 500 });
  }
}