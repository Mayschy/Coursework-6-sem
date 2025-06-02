// D:\new store pj\artstore-svelte\src\routes\cart\+page.server.js
import { redirect } from '@sveltejs/kit';

export async function load({ locals }) {

  if (!locals.user) {
    throw redirect(302, '/login'); 
  }


  return {};
}