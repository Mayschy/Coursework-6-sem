// src/routes/api/admin/statistics/summary/+server.js
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

        const summary = await ordersCollection.aggregate([
            { $match: { status: 'completed', isArchived: { $ne: true } } },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$totalAmount' },
                    totalOrders: { $sum: 1 }
                }
            },
            {
                $project: {
                    _id: 0,
                    totalRevenue: 1,
                    totalOrders: 1,
                    avgOrderValue: {
                        $cond: {
                            if: { $gt: ['$totalOrders', 0] },
                            then: { $divide: ['$totalRevenue', '$totalOrders'] },
                            else: 0
                        }
                    }
                }
            }
        ]).toArray();

        if (summary.length === 0) {
            return json({ totalRevenue: 0, totalOrders: 0, avgOrderValue: 0 }, { status: 200 });
        }

        return json(summary[0], { status: 200 });

    } catch (error) {
        console.error('Error fetching summary data:', error);
        return json({ error: 'Failed to fetch summary statistics' }, { status: 500 });
    }
}