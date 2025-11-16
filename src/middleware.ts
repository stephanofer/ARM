import { defineMiddleware } from "astro:middleware";


export const onRequest = defineMiddleware((context, next) => {
  console.log("➡ Request:", context.url.pathname);
  return next();
});
