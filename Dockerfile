FROM docker.io/library/node:16 AS build

ADD . /usr/src/app
WORKDIR /usr/src/app
RUN npm install && npm run build

FROM docker.io/library/nginx:stable

RUN chmod g+rwx /var/cache/nginx /var/run /var/log/nginx
COPY --from=build /usr/src/app/dist /usr/share/nginx/html
