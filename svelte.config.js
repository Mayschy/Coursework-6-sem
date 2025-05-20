import * as dotenv from 'dotenv';
dotenv.config(); // Загружает переменные из .env

import adapter from '@sveltejs/adapter-auto';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter()
	}
};

export default config;
