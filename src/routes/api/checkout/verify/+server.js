// D:\new store pj\artstore-svelte\src\routes\api\checkout\verify\+server.js
import { json } from '@sveltejs/kit';
import { connectDB } from '$lib/server/db.js';
import { ObjectId } from 'mongodb';
import nodemailer from 'nodemailer';

// Настройка Nodemailer (повторяем, но лучше вынести в утилиту)
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS
  }
});

// POST: Подтвердить заказ с помощью кода
export async function POST({ request, locals }) { // Теперь это просто POST
  try {
    const user = locals.user;

    if (!user) {
      return json({ error: 'Пользователь не авторизован' }, { status: 401 });
    }

    const { orderId, verificationCode } = await request.json();

    if (!ObjectId.isValid(orderId)) {
      return json({ error: 'Неверный ID заказа' }, { status: 400 });
    }

    const db = await connectDB();
    const order = await db.collection('orders').findOne({ _id: new ObjectId(orderId), userId: new ObjectId(user._id) });

    if (!order) {
      return json({ error: 'Заказ не найден' }, { status: 404 });
    }

    if (order.status !== 'pending_verification') {
      return json({ error: 'Заказ уже подтвержден или отменен' }, { status: 400 });
    }

    // Важно: сравниваем коды без учета регистра, если генерируешь HEX
    if (order.verificationCode.toLowerCase() !== verificationCode.toLowerCase()) {
      return json({ error: 'Неверный код подтверждения' }, { status: 401 });
    }

    if (new Date() > new Date(order.codeExpiresAt)) {
      await db.collection('orders').updateOne(
        { _id: new ObjectId(orderId) },
        { $set: { status: 'expired' } }
      );
      return json({ error: 'Срок действия кода истек' }, { status: 400 });
    }

    // Заказ успешно подтвержден
    await db.collection('orders').updateOne(
      { _id: new ObjectId(orderId) },
      { $set: { status: 'completed', completedAt: new Date() } }
    );

    // Отправляем письмо со ссылками на скачивание
    const userDoc = await db.collection('users').findOne({ _id: new ObjectId(user._id) });
    const productLinks = order.items.map(item => `<li><a href="${item.saleFileUrl}" target="_blank">${item.title}</a></li>`).join('');

    const mailOptions = {
      from: 'Art Store <no-reply@artstore.com>',
      to: userDoc.email,
      subject: 'Ваши ссылки на скачивание картин с ArtStore',
      html: `
        <p>Здравствуйте, ${userDoc.firstName}!</p>
        <p>Ваш заказ №${orderId.toString()} успешно подтвержден. Ниже вы найдете ссылки для скачивания ваших картин:</p>
        <ul>
          ${productLinks}
        </ul>
        <p>Спасибо за покупку на ArtStore!</p>
        <br>
        <p>С уважением,<br>Команда ArtStore</p>
      `
    };

    await transporter.sendMail(mailOptions);

    return json({ message: 'Заказ успешно подтвержден! Ссылки для скачивания отправлены на вашу почту.' }, { status: 200 });

  } catch (error) {
    console.error('Ошибка при подтверждении заказа:', error);
    return json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}