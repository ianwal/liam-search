import { Hono } from "hono";
import { rateLimiter } from "hono-rate-limiter";
import { cors } from "hono/cors";
import { requestId } from "hono/request-id";

import config from "../config";
import { log } from "../log";
import search from "./search";
import status from "./status";

const app = new Hono<{ Variables: { logData: any } }>();

app.use("*", cors());
app.use(requestId());
app.use(
	rateLimiter({
		windowMs: config.api.rate_limit.window * 1000,
		limit: config.api.rate_limit.limit,
		keyGenerator: (c) => c.req.header("x-forwarded-for") ?? "",
	}),
);
app.use("*", async (c, next) => {
	await next();

	const res = c.res.clone() as Response;

	log("API", c.res.status >= 400 ? "ERROR" : "INFO", {
		request_id: c.get("requestId"),
		method: c.req.method,
		path: c.req.path,
		query: c.req.path == "/search" ? "[REDACTED]" : c.req.query(),
		status: res.status,
		message: res.statusText,
		...(c.get("logData") || {}),
	});
});

app.route("/status", status);
app.route("/search", search);

export default app;
