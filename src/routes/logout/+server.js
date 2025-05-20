/** @type {import('./$types').RequestHandler} */
export async function GET({ cookies }) {
  cookies.delete('user_id', { path: '/' });
  return new Response(null, {
    status: 302,
    headers: {
      Location: '/'
    }
  });
}
