import { json } from '@sveltejs/kit';
import { connectDB } from '$lib/server/db.js';

export async function GET() {
  try {
    const db = await connectDB();
    const paintings = await db.collection('paintings').find().toArray();

    const transformed = paintings.map(p => ({
      ...p,
      _id: p._id.toString()
    }));

    return json(transformed);
  } catch (error) {
    console.error('Error fetching paintings:', error);
    return json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST({ request, locals }) {
  try {
    const user = locals.user;

    if (!user || user.role !== 'admin') {
      return json({ error: 'Access denied' }, { status: 403 });
    }

    const data = await request.json();

    const requiredFields = ['title', 'price', 'dimensions', 'previewImage', 'hoverPreviewImage', 'detailImages', 'saleFileUrl'];
    for (const field of requiredFields) {
      if (data[field] === undefined || data[field] === null || (typeof data[field] === 'string' && data[field].trim() === '') || (Array.isArray(data[field]) && data[field].length === 0)) {
        return json({ error: `Required field missing: ${field}` }, { status: 400 });
      }
    }

    const painting = {
      title: data.title,
      description: data.description || '',
      price: Number(data.price) || 0,
      dimensions: data.dimensions,
      previewImage: data.previewImage,
      hoverPreviewImage: data.hoverPreviewImage,
      detailImages: Array.isArray(data.detailImages) ? data.detailImages : [],
      saleFileUrl: data.saleFileUrl,
      createdAt: data.createdAt ? new Date(data.createdAt) : new Date()
    };

    const db = await connectDB();
    const result = await db.collection('paintings').insertOne(painting);

    return json({
      message: 'Painting added successfully',
      id: result.insertedId.toString()
    });
  } catch (err) {
    console.error('Error adding painting:', err);
    return json({ error: 'Server error' }, { status: 500 });
  }
}