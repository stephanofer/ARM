import { defineMiddleware } from "astro:middleware";
import { createClient } from "./lib/supabase";

export const onRequest = defineMiddleware(async (context, next) => {
    const { pathname } = context.url;

    // console.log("Middleware executing for path:", pathname);

    const supabase = createClient({
        request: context.request,
        cookies: context.cookies,
    });

    if (pathname.startsWith("/admin")) {
        // console.log("Checking auth for protected route");

        const { data } = await supabase.auth.getUser();
        // console.log(data);

        if (!data.user) {
            return context.redirect("/ingresar");
        }
    }

    return next();
});