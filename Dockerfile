FROM node:lts-alpine as builder
WORKDIR /app
COPY package.json ./
COPY tsconfig.json ./
COPY src ./src
RUN ls -a
RUN npm i
RUN npm run build

FROM node:12.17.0-alpine
WORKDIR /app
COPY package.json ./
RUN npm i --only=production
COPY --from=builder /app/build .
EXPOSE 8888
CMD ["node", "index.js"]
