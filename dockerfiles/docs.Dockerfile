FROM node:20-alpine

# Install docsify-cli globally
RUN npm install -g docsify-cli

# Set the working directory in the container
WORKDIR /docs

# Copy the documentation files to the container
COPY docs .

# Expose port 3000 for the docsify server
EXPOSE 3000

# Start the docsify server
CMD ["docsify", "serve", "."]