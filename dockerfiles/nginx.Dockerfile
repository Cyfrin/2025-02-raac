FROM nginx:alpine

RUN apk add --no-cache apache2-utils

ENV NGINX_USER=admin
ENV NGINX_PASS=readytoraac

RUN htpasswd -cb /etc/nginx/.htpasswd $NGINX_USER $NGINX_PASS

COPY dockerfiles/nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]