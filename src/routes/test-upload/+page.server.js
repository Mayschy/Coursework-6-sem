// src/routes/test-upload/+page.server.js
import { redirect } from '@sveltejs/kit';

/** @type {import('./$types').PageServerLoad} */
export async function load({ locals }) {
  if (!locals.user) {
    throw redirect(303, '/login');
  }

  // Перевіряємо роль користувача
  if (locals.user.role !== 'admin') {
    throw redirect(303, '/');
  }

  return {};
}