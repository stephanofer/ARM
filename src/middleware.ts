import { defineMiddleware } from "astro:middleware";
import { createClient } from "./lib/supabase";

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  if (!pathname.startsWith("/admin")) {
    return next();
  }

  const supabase = createClient({
    request: context.request,
    cookies: context.cookies,
  });

  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    return context.redirect("/ingresar");
  }

  context.locals.user = data.user;
  context.locals.email = data.user.email || "";
  context.locals.isLoggedIn = !!data.user;

  return next();
});
