import { compress } from "@hono/bun-compress";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { rateLimiter } from "hono-rate-limiter";
import { cors } from "hono/cors";
import { requestId } from "hono/request-id";
import { z } from "zod";

import type { SearchResponse } from "@/types";

import { log } from "./log";
import { search } from "./search";

const app = new Hono<{ Variables: { logData: any } }>();

function zodDate() {
	return z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
		message: "expected YYYY-MM-DD",
	});
}

app.use("*", cors());
app.use(compress());
app.use(requestId());
app.use(
	rateLimiter({
		windowMs: 30 * 1000,
		limit: 10,
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

app.get(
	"/search",
	zValidator(
		"query",
		z.object({
			query: z.string().transform((q) => q.replaceAll('"', "")),
			id: z.string().optional(),
			from: zodDate().catch("1970-01-01"),
			to: zodDate().catch(new Date().toISOString().split("T")[0] as string),
			sort: z.enum(["best", "latest", "oldest"]).default("best"),
			match: z.enum(["all", "any"]).default("all"),
			page: z.coerce.number().int().positive().default(1),
			perPage: z.coerce.number().int().positive().default(24),
		}),
	),
	async (c) => {
		const { query, id, from, to, sort, match, page, perPage } = c.req.valid("query");

		const fromMs = new Date(from).getTime();
		const toMs = new Date(to).getTime();

		const response = await search(query, {
			sort,
			match,
			from: fromMs,
			to: toMs,
			id,
			page,
			perPage,
		});

		c.set("logData", {
			search_ms: response.ms,
			result_count: response.resultCount,
			page_count: response.pageCount,
			per_page: perPage,
		});

		return c.json(response);
	},
);

export default app;
