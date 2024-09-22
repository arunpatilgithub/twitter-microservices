# Use Node.js LTS version
FROM node:16

# Set the working directory
WORKDIR /app

# Copy the package.json and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the app files
COPY . .

# Expose the port the app runs on
EXPOSE 3000

# Start the NestJS application
CMD ["npm", "run", "start"]
