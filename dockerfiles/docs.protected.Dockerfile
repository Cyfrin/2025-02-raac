FROM node:20-alpine

# Install docsify-cli globally and nginx
RUN apk add --no-cache nginx apache2-utils && npm install -g docsify-cli

# Set up environment variables
ENV NGINX_USER=admin
ENV NGINX_PASS=readytoraac

# Create .htpasswd file
RUN htpasswd -cb /etc/nginx/.htpasswd $NGINX_USER $NGINX_PASS

# Set the working directory
WORKDIR /docs

# Copy the documentation files
COPY docs /docs

# Copy the NGINX configuration
COPY dockerfiles/nginx.conf /etc/nginx/nginx.conf

# Expose ports 80 and 3000
EXPOSE 80 3010

# Start NGINX and Docsify
CMD nginx && docsify serve /docs -p 3010