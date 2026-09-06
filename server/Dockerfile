FROM node:22-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY *.js ./

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Sealos 部署时请挂载持久化存储到 /app/data，数据库文件才会在重启后保留
VOLUME ["/app/data"]

CMD ["node", "index.js"]
