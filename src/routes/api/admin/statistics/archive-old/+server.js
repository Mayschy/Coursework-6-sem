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

        const result = await ordersCollection.updateMany(
            { status: 'completed', isArchived: { $ne: true } },
            { $set: { isArchived: true, archivedAt: new Date() } }
        );

        return json({
            message: `Successfully archived ${result.modifiedCount} completed orders.`,
            modifiedCount: result.modifiedCount
        }, { status: 200 });

    } catch (error) {
        console.error('Error archiving old statistics:', error);
        return json({ error: 'Failed to archive statistics' }, { status: 500 });
    }
}