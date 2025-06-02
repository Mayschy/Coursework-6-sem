// D:\new store pj\artstore-svelte\src\routes\api\register\+server.js
import { json } from '@sveltejs/kit';
import bcrypt from 'bcryptjs';
import { connectDB } from '$lib/server/db';
import nodemailer from 'nodemailer';

export async function POST({ request }) {
  const user = await request.json();
  const db = await connectDB();
  const existing = await db.collection('users').findOne({ email: user.email });
  if (existing) return json({ message: 'Email already in use' }, { status: 400 });

  user.passwordHash = await bcrypt.hash(user.password, 10);
  delete user.password;
  user.role = 'customer';
  user.createdAt = new Date();

  await db.collection('users').insertOne(user);

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS
    }
  });

  console.log('Attempting to send registration email...');
  console.log('GMAIL_USER:', process.env.GMAIL_USER ? 'Loaded' : 'NOT LOADED');

  try {
    const info = await transporter.sendMail({
      from: 'Art Store <no-reply@artstore.com>',
      to: user.email,
      subject: 'Welcome to ArtStore!',
      text: `Hello, ${user.firstName}! Thank you for registering on our website.`
    });
    console.log('Email sent successfully:', info.messageId);
  } catch (error) {
    console.error('Error sending email:', error);
  }

  return json({ success: true });
}