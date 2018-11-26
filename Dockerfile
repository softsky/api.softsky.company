FROM node:latest

MAINTAINER Arsen A.Gutsal <a.gutsal@softsky.com.ua>

ADD .env /opt/api/
ADD index.js /opt/api/
ADD package.json /opt/api/
RUN cd /opt/api && npm install

CMD ["node", "/opt/api/index.js"]
