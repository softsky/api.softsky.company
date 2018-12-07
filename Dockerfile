FROM node:latest

MAINTAINER Arsen A.Gutsal <a.gutsal@softsky.com.ua>

WORKDIR /opt/api

ADD certs certs
ADD .env .
ADD .env.production .
ADD index.js .
ADD package.json .
RUN yarn

EXPOSE 8000
EXPOSE 8443
CMD ["node", "/opt/api/index.js"]
