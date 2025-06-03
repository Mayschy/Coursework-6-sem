// D:\new store pj\artstore-svelte\src\routes\api\checkout\verify\+server.js
import { json } from '@sveltejs/kit';
import { connectDB } from '$lib/server/db.js';
import { ObjectId } from 'mongodb';
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS
    }
});

export async function POST({ request, locals }) {
    try {
        const user = locals.user;

        if (!user) {
            return json({ error: 'User not authorized' }, { status: 401 });
        }

        const { orderId, verificationCode } = await request.json();

        if (!ObjectId.isValid(orderId)) {
            return json({ error: 'Invalid order ID' }, { status: 400 });
        }

        const db = await connectDB();
        const order = await db.collection('orders').findOne({ _id: new ObjectId(orderId), userId: new ObjectId(user._id) });

        if (!order) {
            return json({ error: 'Order not found' }, { status: 404 });
        }

        if (order.status !== 'pending_verification') {
            return json({ error: 'Order already confirmed or cancelled' }, { status: 400 });
        }

        if (order.verificationCode.toLowerCase() !== verificationCode.toLowerCase()) {
            return json({ error: 'Invalid verification code' }, { status: 401 });
        }

        if (new Date() > new Date(order.codeExpiresAt)) {
            await db.collection('orders').updateOne(
                { _id: new ObjectId(orderId) },
                { $set: { status: 'expired' } }
            );
            return json({ error: 'Verification code has expired' }, { status: 400 });
        }

        await db.collection('orders').updateOne(
            { _id: new ObjectId(orderId) },
            { $set: { status: 'completed', completedAt: new Date() } }
        );

        const userDoc = await db.collection('users').findOne({ _id: new ObjectId(user._id) });
        const productLinks = order.items.map(item => `<li><a href="${item.saleFileUrl}" target="_blank">${item.title}</a></li>`).join('');

        const userMailOptions = {
            from: 'Art Store <no-reply@artstore.com>',
            to: userDoc.email,
            subject: 'Your ArtStore Download Links',
            html: `
                <p>Hello, ${userDoc.firstName}!</p>
                <p>Your order №${orderId.toString()} has been successfully confirmed. Below you will find links to download your paintings:</p>
                <ul>
                    ${productLinks}
                </ul>
                <p>Thank you for your purchase at ArtStore!</p>
                <br>
                <p>Sincerely,<br>The ArtStore Team</p>
            `
        };

        await transporter.sendMail(userMailOptions);

        const admins = await db.collection('users').find({ role: 'admin' }).project({ email: 1, _id: 0 }).toArray();
        const adminEmailList = admins.map(admin => admin.email);

        // Compose admin email
        const adminMailOptions = {
            from: 'Art Store <no-reply@artstore.com>',
            to: adminEmailList.join(','),
            subject: 'New Order Notification',
            html: `
                <p>A new order has been placed on ArtStore.</p>
                <p>Order ID: ${orderId.toString()}</p>
                <p>User Email: ${userDoc.email}</p>
                <p>User Name: ${userDoc.firstName} ${userDoc.lastName || ''}</p>
                <p>Total Amount: ${order.totalAmount} USDT</p>
                <p>Items Purchased:</p>
                <ul>
                    ${order.items.map(item => `<li>${item.title} - ${item.priceAtPurchase} USDT</li>`).join('')}
                </ul>
                <p>Order Date: ${order.orderDate.toLocaleString()}</p>
                <p>Thank you,<br>The ArtStore Team</p>
            `
        };

        await transporter.sendMail(adminMailOptions);

        return json({ message: 'Order successfully confirmed! Download links sent to your email.' }, { status: 200 });

    } catch (error) {
        console.error('Error confirming order:', error);
        return json({ error: 'Server error' }, { status: 500 });
    }
}