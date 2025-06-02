// D:\new store pj\artstore-svelte\src\routes\api\login\+server.js
import { json, error } from '@sveltejs/kit';
import { connectDB } from '$lib/server/db';
import bcrypt from 'bcryptjs';

export async function POST({ request, cookies }) {
  const { email, password } = await request.json();
  const db = await connectDB();
  const user = await db.collection('users').findOne({ email });

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw error(401, 'Invalid credentials');
  }


  cookies.set('user_id', user._id.toString(), {
    path: '/',
    httpOnly: true, 
    secure: process.env.NODE_ENV === 'production', 
    sameSite: 'lax', 
    maxAge: 60 * 60 * 24 * 7 
  });
 

  return json({ success: true });
}