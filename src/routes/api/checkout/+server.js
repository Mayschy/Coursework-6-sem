// D:\new store pj\artstore-svelte\src\routes\api\checkout\+server.js
import { json } from '@sveltejs/kit';
import { connectDB } from '$lib/server/db.js';
import { ObjectId } from 'mongodb';
import nodemailer from 'nodemailer';
import crypto from 'crypto'; // Для генерации кода

// Настройка Nodemailer (перенеси это в отдельный утилитарный файл, если уже есть)
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS
  }
});

// POST: Создать заказ и отправить код подтверждения
export async function POST({ request, locals }) {
  try {
    const user = locals.user;

    if (!user) {
      return json({ error: 'Пользователь не авторизован' }, { status: 401 });
    }

    const db = await connectDB();
    const userDoc = await db.collection('users').findOne({ _id: new ObjectId(user._id) });

    if (!userDoc || !userDoc.cart || userDoc.cart.length === 0) {
      return json({ error: 'Корзина пуста' }, { status: 400 });
    }

    // Получаем детали картин из корзины
    const paintingIdsInCart = userDoc.cart.map(item => new ObjectId(item.paintingId));
    const paintingsInCart = await db.collection('paintings').find({ _id: { $in: paintingIdsInCart } }).toArray();

    if (paintingsInCart.length !== userDoc.cart.length) {
      // Некоторые картины могли быть удалены
      return json({ error: 'Некоторые товары в корзине недоступны. Обновите корзину.', refreshCart: true }, { status: 400 });
    }

    // Формируем элементы заказа (без quantity)
    const orderItems = paintingsInCart.map(painting => ({
      paintingId: painting._id,
      priceAtPurchase: painting.price, // Фиксируем цену на момент покупки
      title: painting.title,
      saleFileUrl: painting.saleFileUrl
    }));

    const totalAmount = orderItems.reduce((sum, item) => sum + item.priceAtPurchase, 0);

    // Генерируем код подтверждения (6 цифр)
    const verificationCode = crypto.randomBytes(3).toString('hex').toUpperCase(); // 3 байта = 6 символов HEX
    const codeExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // Код действителен 10 минут

    const newOrder = {
      _id: new ObjectId(), // Генерируем новый ID для заказа
      userId: new ObjectId(user._id),
      items: orderItems,
      totalAmount: totalAmount,
      orderDate: new Date(),
      status: 'pending_verification',
      verificationCode: verificationCode,
      codeExpiresAt: codeExpiresAt,
      // В дальнейшем можно добавить: deliveryAddress, paymentStatus и т.д.
    };

    // Сохраняем заказ в коллекцию 'orders' (нужно создать эту коллекцию)
    await db.collection('orders').insertOne(newOrder);

    // Очищаем корзину пользователя
    await db.collection('users').updateOne(
      { _id: new ObjectId(user._id) },
      { $set: { cart: [] } }
    );

    // Отправляем email с кодом подтверждения
    const mailOptions = {
      from: 'Art Store <no-reply@artstore.com>',
      to: userDoc.email,
      subject: 'Ваш код подтверждения заказа на ArtStore',
      html: `
        <p>Здравствуйте, ${userDoc.firstName}!</p>
        <p>Для подтверждения вашего заказа на сумму ${totalAmount} руб. используйте следующий код:</p>
        <h2 style="color: #007bff;">${verificationCode}</h2>
        <p>Этот код действителен в течение 10 минут.</p>
        <p>Если вы не совершали этот заказ, проигнорируйте это письмо.</p>
        <br>
        <p>С уважением,<br>Команда ArtStore</p>
      `
    };

    await transporter.sendMail(mailOptions);

    return json({ message: 'Заказ создан. Код подтверждения отправлен на вашу почту.', orderId: newOrder._id.toString() }, { status: 200 });

  } catch (error) {
    console.error('Ошибка при оформлении заказа:', error);
    return json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}