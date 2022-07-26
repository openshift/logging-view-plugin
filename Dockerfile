FROM docker.io/library/node:16.14.2 AS build

WORKDIR /usr/src/app

COPY package*.json .
RUN npm ci && npm cache clean --force

COPY . /usr/src/app
RUN npm run build

FROM docker.io/library/nginx:stable

RUN chmod g+rwx /var/cache/nginx /var/run /var/log/nginx
COPY --from=build /usr/src/app/dist /usr/share/nginx/html
