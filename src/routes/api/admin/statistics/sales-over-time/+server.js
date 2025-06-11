// src/routes/api/admin/statistics/sales-over-time/+server.js
import { json } from '@sveltejs/kit';
import { connectDB } from '$lib/server/db.js';

export async function GET({ locals }) {
    if (!locals.user || locals.user.role !== 'admin') {
        return json({ error: 'Access denied. Administrator rights required.' }, { status: 403 });
    }

    try {
        const db = await connectDB();
        const ordersCollection = db.collection('orders');

        const salesData = await ordersCollection.aggregate([
            { $match: { status: 'completed', isArchived: { $ne: true } } },
            {
                $group: {
                    _id: {
                        year: { $year: '$orderDate' },
                        month: { $month: '$orderDate' }
                    },
                    totalRevenue: { $sum: '$totalAmount' },
                    totalOrders: { $sum: 1 }
                }
            },
            {
                $sort: {
                    '_id.year': 1,
                    '_id.month': 1
                }
            },
            {
                $project: {
                    _id: {
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
        console.error('Error fetching sales over time data:', error);
        return json({ error: 'Failed to fetch sales over time statistics' }, { status: 500 });
    }
}