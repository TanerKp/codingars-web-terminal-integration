FROM node:20.13-alpine

# Set work dir
WORKDIR /var/lib/app/

# Copy package.json and install depedencies
COPY package* ./
RUN npm install --only=prod

# Copy backend and frontend
COPY . .

# Expose port
EXPOSE 4000

CMD ["sh","-c","npm start"]