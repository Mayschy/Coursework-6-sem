import { fail, redirect } from '@sveltejs/kit';
import { connectDB } from '$lib/server/db';
import bcrypt from 'bcryptjs';
import { ObjectId } from 'mongodb';

/** @type {import('./$types').Actions} */
export const actions = {
  default: async ({ request, cookies }) => {
    const data = await request.formData();
    const email = data.get('email');
    const password = data.get('password');

    if (typeof email !== 'string' || !email) {
      return fail(400, { email: '', error: 'Please enter a valid email.' });
    }
    if (typeof password !== 'string' || !password) {
      return fail(400, { email, error: 'Please enter your password.' });
    }

    const db = await connectDB();
    const user = await db.collection('users').findOne({ email });

    if (!user || typeof user.passwordHash !== 'string' || !(await bcrypt.compare(password, user.passwordHash))) {
      return fail(400, { email, error: 'Invalid email or password.' });
    }

    cookies.set('user_id', user._id.toString(), {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7
    });

    throw redirect(303, '/');
  }
};