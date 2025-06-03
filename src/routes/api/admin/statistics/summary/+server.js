// src/routes/api/admin/statistics/summary/+server.js
import { json } from '@sveltejs/kit';
import { connectDB } from '$lib/server/db.js'; // Убедитесь, что этот путь верен
import { ObjectId } from 'mongodb'; // Возможно, ObjectId не нужен для этой агрегации, но оставим на всякий случай

export async function GET({ locals }) {
    // Проверка прав администратора
    if (!locals.user || locals.user.role !== 'admin') {
        return json({ error: 'Access denied. Administrator rights required.' }, { status: 403 });
    }

    try {
        const db = await connectDB();
        const ordersCollection = db.collection('orders');

        // Агрегация для получения общей выручки, количества заказов и среднего чека
        const summary = await ordersCollection.aggregate([
          { $match: { status: 'completed', isArchived: { $ne: true } } }, // Только завершенные заказы
            {
                $group: {
                    _id: null, // Группируем все документы в одну группу
                    totalRevenue: { $sum: '$totalAmount' }, // Суммируем общую выручку
                    totalOrders: { $sum: 1 } // Считаем количество заказов
                }
            },
            {
                $project: {
                    _id: 0, // Убираем поле _id
                    totalRevenue: 1,
                    totalOrders: 1,
                    avgOrderValue: {
                        $cond: {
                            if: { $gt: ['$totalOrders', 0] }, // Если есть заказы, считаем средний чек
                            then: { $divide: ['$totalRevenue', '$totalOrders'] },
                            else: 0 // Иначе 0
                        }
                    }
                }
            }
        ]).toArray();

        // Возвращаем пустые значения, если нет завершенных заказов
        if (summary.length === 0) {
            return json({ totalRevenue: 0, totalOrders: 0, avgOrderValue: 0 }, { status: 200 });
        }

        return json(summary[0], { status: 200 });

    } catch (error) {
        console.error('Ошибка при получении сводных данных:', error);
        return json({ error: 'Failed to fetch summary statistics' }, { status: 500 });
    }
}