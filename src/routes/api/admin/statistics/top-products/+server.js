// src/routes/api/admin/statistics/top-products/+server.js
import { json } from '@sveltejs/kit';
import { connectDB } from '$lib/server/db.js';
import { ObjectId } from 'mongodb';

export async function GET({ locals }) {
    // Проверка прав администратора
    if (!locals.user || locals.user.role !== 'admin') {
        return json({ error: 'Access denied. Administrator rights required.' }, { status: 403 });
    }

    try {
        const db = await connectDB();
        const ordersCollection = db.collection('orders');

        // Агрегация для получения топ-10 самых продаваемых картин по выручке
        const topProducts = await ordersCollection.aggregate([
          { $match: { status: 'completed', isArchived: { $ne: true } } }, // Только завершенные заказы
            { $unwind: '$items' }, // Разворачиваем массив товаров (items) в заказах
           {
                    $group: {
                        _id: {
                            productId: '$items.productId',
                            title: '$items.title' // <-- Добавляем title в _id группы
                        },
                        totalSold: { $sum: 1 },
                        totalRevenue: { $sum: '$items.priceAtPurchase' }
                    }
                },
            { $sort: { totalRevenue: -1 } }, // Сортируем по выручке по убыванию (от самого прибыльного)
            { $limit: 10 }, // Ограничиваемся топ-10
           {
                    $project: {
                        _id: 0,
                        productId: '$_id.productId', // <-- Теперь берем из составного _id
                        title: '$_id.title',       // <-- Теперь берем из составного _id
                        totalSold: 1,
                        totalRevenue: 1
                    }
                }
        ]).toArray();

        return json(topProducts, { status: 200 });

    } catch (error) {
        console.error('Ошибка при получении топ-товаров:', error);
        return json({ error: 'Failed to fetch top products statistics' }, { status: 500 });
    }
}