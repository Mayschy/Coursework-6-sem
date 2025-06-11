// src/routes/api/admin/statistics/top-products/+server.js
import { json } from '@sveltejs/kit';
import { connectDB } from '$lib/server/db.js';
import { ObjectId } from 'mongodb';

export async function GET({ locals }) {
    if (!locals.user || locals.user.role !== 'admin') {
        return json({ error: 'Access denied. Administrator rights required.' }, { status: 403 });
    }

    try {
        const db = await connectDB();
        const ordersCollection = db.collection('orders');

        const topProducts = await ordersCollection.aggregate([
            { $match: { status: 'completed', isArchived: { $ne: true } } },
            { $unwind: '$items' },
            {
                $group: {
                    _id: {
                        productId: '$items.productId',
                        title: '$items.title'
                    },
                    totalSold: { $sum: 1 },
                    totalRevenue: { $sum: '$items.priceAtPurchase' }
                }
            },
            { $sort: { totalRevenue: -1 } },
            { $limit: 10 },
            {
                $project: {
                    _id: 0,
                    productId: '$_id.productId',
                    title: '$_id.title',
                    totalSold: 1,
                    totalRevenue: 1
                }
            }
        ]).toArray();

        return json(topProducts, { status: 200 });

    } catch (error) {
        console.error('Error fetching top products data:', error);
        return json({ error: 'Failed to fetch top products statistics' }, { status: 500 });
    }
}