// D:\new store pj\artstore-svelte\src\routes\api\checkout\+server.js
import { json } from '@sveltejs/kit';
import { connectDB } from '$lib/server/db.js';
import { ObjectId } from 'mongodb';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

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

        const db = await connectDB();
        const userDoc = await db.collection('users').findOne({ _id: new ObjectId(user._id) });

        if (!userDoc || !userDoc.cart || userDoc.cart.length === 0) {
            return json({ error: 'Cart is empty' }, { status: 400 });
        }

        const paintingIdsInCart = userDoc.cart.map(item => new ObjectId(item.paintingId));
        const paintingsInCart = await db.collection('paintings').find({ _id: { $in: paintingIdsInCart } }).toArray();

        if (paintingsInCart.length !== userDoc.cart.length) {
            return json({ error: 'Some items in the cart are unavailable. Please refresh your cart.', refreshCart: true }, { status: 400 });
        }

       const orderItems = paintingsInCart.map(painting => ({
            paintingId: painting._id,
            priceAtPurchase: Number(painting.price), 
            title: painting.title,
            saleFileUrl: painting.saleFileUrl
        }));

        const totalAmount = orderItems.reduce((sum, item) => sum + item.priceAtPurchase, 0);

        const verificationCode = crypto.randomBytes(3).toString('hex').toUpperCase();
        const codeExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

        const newOrder = {
            _id: new ObjectId(),
            userId: new ObjectId(user._id),
            items: orderItems,
            totalAmount: totalAmount,
            orderDate: new Date(),
            status: 'pending_verification',
            verificationCode: verificationCode,
            codeExpiresAt: codeExpiresAt,
        };

        await db.collection('orders').insertOne(newOrder);

        await db.collection('users').updateOne(
            { _id: new ObjectId(user._id) },
            { $set: { cart: [] } }
        );

        const mailOptions = {
            from: 'Art Store <no-reply@artstore.com>',
            to: userDoc.email,
            subject: 'Your ArtStore Order Confirmation Code',
            html: `
                <p>Hello, ${userDoc.firstName}!</p>
                <p>To confirm your order for ${totalAmount} $, please use the following code:</p>
                <h2 style="color: #007bff;">${verificationCode}</h2>
                <p>This code is valid for 10 minutes.</p>
                <p>If you did not place this order, please ignore this email.</p>
                <br>
                <p>Sincerely,<br>The ArtStore Team</p>
            `
        };

        await transporter.sendMail(mailOptions);

        return json({ message: 'Order created. Confirmation code sent to your email.', orderId: newOrder._id.toString() }, { status: 200 });

    } catch (error) {
        console.error('Error processing checkout:', error);
        return json({ error: 'Server error' }, { status: 500 });
    }
}