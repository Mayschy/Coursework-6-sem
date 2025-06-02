import { error } from '@sveltejs/kit';
import { connectDB } from '$lib/server/db';
import { ObjectId } from 'mongodb';

export async function load({ params, locals }) {
  const paintingId = params.id;

  if (!ObjectId.isValid(paintingId)) {
    throw error(404, 'Painting not found');
  }

  const db = await connectDB();
  const painting = await db.collection('paintings').findOne({ _id: new ObjectId(paintingId) });

  if (!painting) {
    throw error(404, 'Painting not found');
  }

  let hasPurchased = false;
  if (locals.user) {
    const userId = new ObjectId(locals.user._id);

    const userOrder = await db.collection('orders').findOne({
      userId: userId,
      status: 'completed',
      'items.paintingId': new ObjectId(paintingId)
    });

    if (userOrder) {
      hasPurchased = true;
    }
  }

  return {
    painting: {
      _id: painting._id.toString(),
      title: painting.title,
      description: painting.description || '',
      price: painting.price,
      previewImage: painting.previewImage,
      hoverPreviewImage: painting.hoverPreviewImage || '',
      detailImages: painting.detailImages || [],
      saleFileUrl: painting.saleFileUrl,
      dimensions: painting.dimensions,
    },
    hasPurchased: hasPurchased
  };
}