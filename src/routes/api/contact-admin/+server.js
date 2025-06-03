// src/routes/api/contact-admin/+server.js
import { json } from '@sveltejs/kit';
import nodemailer from 'nodemailer';
import { connectDB } from '$lib/server/db';

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS
    },
    tls: {
        rejectUnauthorized: false
    }
});

export async function POST({ request, locals }) {
    let database;
    try {
        database = await connectDB();
    } catch (error) {
        console.error('Failed to connect to DB for admin emails:', error);
        return json({ error: 'Server could not connect to the database.' }, { status: 500 });
    }

    if (!locals.user) {
        return json({ error: 'Authorization required to send a message.' }, { status: 401 });
    }

    const { userName, userEmail, subject, message } = await request.json();

    if (!userName || !userEmail || !subject || !message) {
        return json({ error: 'Please fill in all fields.' }, { status: 400 });
    }

    let adminEmailList = [];
    try {
        const usersCollection = database.collection('users');
        const admins = await usersCollection.find({ role: 'admin' })
            .project({ email: 1, _id: 0 })
            .toArray();

        adminEmailList = admins.map(admin => admin.email);

        if (adminEmailList.length === 0) {
            console.warn("No administrators with 'admin' role found in the database for sending messages.");
            return json({ error: 'Currently no administrators available to receive messages.' }, { status: 503 });
        }

    } catch (dbError) {
        console.error('Error retrieving admin emails from DB:', dbError);
        return json({ error: 'Failed to retrieve administrator list. Please try again later.' }, { status: 500 });
    }

    const mailOptions = {
        from: process.env.GMAIL_USER,
        to: adminEmailList.join(','),
        subject: `New message from ArtStore from: ${userName} - ${subject}`,
        html: `
            <p><strong>Message from ArtStore user</strong></p>
            <p><strong>Name:</strong> ${userName}</p>
            <p><strong>Email:</strong> ${userEmail}</p>
            <p><strong>Subject:</strong> ${subject}</p>
            <p><strong>Message:</strong></p>
            <p>${message.replace(/\n/g, '<br>')}</p>
            <hr>
            <p>This is an automated message. Please do not reply to it.</p>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        return json({ message: 'Message sent successfully.' }, { status: 200 });
    } catch (error) {
        console.error('Error sending email:', error);
        return json({ error: 'Failed to send message. Please try again later.' }, { status: 500 });
    }
}