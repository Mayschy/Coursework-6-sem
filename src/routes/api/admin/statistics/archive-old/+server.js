// src/routes/api/admin/statistics/archive-old/+server.js
import { json } from '@sveltejs/kit';
import { connectDB } from '$lib/server/db.js';

export async function POST({ locals }) { 

    if (!locals.user || locals.user.role !== 'admin') {
        return json({ error: 'Access denied. Administrator rights required.' }, { status: 403 });
    }

    try {
        const db = await connectDB();
        const ordersCollection = db.collection('orders');

        // Обновляем все завершенные заказы, которые еще не помечены как архивированные
        const result = await ordersCollection.updateMany(
            { status: 'completed', isArchived: { $ne: true } }, // Найти завершенные и неархивированные заказы
            { $set: { isArchived: true, archivedAt: new Date() } } // Пометить как архивированные и добавить метку времени
        );

        return json({
            message: `Успешно заархивировано ${result.modifiedCount} завершенных заказов.`,
            modifiedCount: result.modifiedCount
        }, { status: 200 });

    } catch (error) {
        console.error('Ошибка при архивировании старой статистики:', error);
        return json({ error: 'Не удалось заархивировать статистику' }, { status: 500 });
    }
}