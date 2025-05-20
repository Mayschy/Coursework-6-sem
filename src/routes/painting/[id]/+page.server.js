import { connectDB } from '$lib/server/db';
import { ObjectId } from 'mongodb';
import { error } from '@sveltejs/kit';

export async function load({ params }) {
  const db = await connectDB();

  let painting;
  try {
    painting = await db.collection('paintings').findOne({ _id: new ObjectId(params.id) });
  } catch (err) {
    throw error(400, 'Некорректный ID');
  }

  if (!painting) {
    throw error(404, 'Картина не найдена');
  }

  return {
    painting: {
      ...painting,
      _id: painting._id.toString(),
      createdAt: painting.createdAt?.toString() || null
    }
  };
}
