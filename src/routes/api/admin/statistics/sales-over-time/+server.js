// src/routes/api/admin/statistics/sales-over-time/+server.js
import { json } from '@sveltejs/kit';
import { connectDB } from '$lib/server/db.js';

export async function GET({ locals }) {
    // Проверка прав администратора
    if (!locals.user || locals.user.role !== 'admin') {
        return json({ error: 'Access denied. Administrator rights required.' }, { status: 403 });
    }

    try {
        const db = await connectDB();
        const ordersCollection = db.collection('orders');

        // Агрегация для получения выручки и количества заказов по месяцам
        const salesData = await ordersCollection.aggregate([
           { $match: { status: 'completed', isArchived: { $ne: true } } }, // Только завершенные заказы
            {
                $group: {
                    _id: { // Группируем по году и месяцу
                        year: { $year: '$orderDate' },
                        month: { $month: '$orderDate' }
                    },
                    totalRevenue: { $sum: '$totalAmount' }, // Суммируем выручку за этот месяц
                    totalOrders: { $sum: 1 } // Считаем количество заказов за этот месяц
                }
            },
            {
                $sort: { // Сортируем по году и месяцу для правильного отображения на графике
                    '_id.year': 1,
                    '_id.month': 1
                }
            },
            {
                $project: {
                    _id: { // Форматируем _id для читаемости (например, "1/2023", "2/2023")
                        $concat: [
                            { $toString: '$_id.month' },
                            '/',
                            { $toString: '$_id.year' }
                        ]
                    },
                    totalRevenue: 1,
                    totalOrders: 1
                }
            }
        ]).toArray();

        return json(salesData, { status: 200 });

    } catch (error) {
        console.error('Ошибка при получении данных о продажах по времени:', error);
        return json({ error: 'Failed to fetch sales over time statistics' }, { status: 500 });
    }
}