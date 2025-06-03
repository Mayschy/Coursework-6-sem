# Base image for Node.js
FROM node:20-alpine

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json first to leverage Docker cache
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the SvelteKit application
# SvelteKit с adapter-node будет создавать выходные файлы в .svelte-kit/output/
RUN npm run build

# Expose the port your SvelteKit app runs on (default for SvelteKit is 3000)
EXPOSE 3000

# Command to run the application
# ✅ Указываем путь к скомпилированному серверному файлу SvelteKit
CMD ["node", ".svelte-kit/output/server/index.js"]