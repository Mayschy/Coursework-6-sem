import { MongoClient, ObjectId } from 'mongodb';

const uri = import.meta.env.VITE_MONGODB_URI;
const client = new MongoClient(uri);

let db;

export async function connectDB() {
  if (!db) {
    try {
      console.log('Подключение к MongoDB...');
      await client.connect();
      db = client.db('artstore'); // название базы данных
      console.log('Подключение к MongoDB установлено');
    } catch (error) {
      console.error('Ошибка подключения к MongoDB:', error);
      throw error;
    }
  }
  return db;
}

export async function getUserById(id) {
  if (!ObjectId.isValid(id)) return null;

  const database = await connectDB();
  return database.collection('users').findOne({ _id: new ObjectId(id) });
}

export async function getPaintingById(id) {
  if (!ObjectId.isValid(id)) return null;

  const database = await connectDB();
  const painting = await database.collection('paintings').findOne({ _id: new ObjectId(id) });
  if (painting) {
    painting._id = painting._id.toString();
  }
  return painting;
}