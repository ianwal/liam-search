import { compress } from "@hono/bun-compress";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { rateLimiter } from "hono-rate-limiter";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { z } from "zod";

import type { SearchResponse } from "@/types";

import { search } from "./search";

const app = new Hono();
app.use("*", cors());
app.use(logger());
app.use(compress());
app.use(
	rateLimiter({
		windowMs: 30 * 1000,
		limit: 10,
		keyGenerator: (c) => c.req.header("x-forwarded-for") ?? "",
	}),
);

function zodDate() {
	return z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
		message: "expected YYYY-MM-DD",
	});
}

app.get(
	"/search",
	zValidator(
		"query",
		z.object({
			query: z.string(),
			from: zodDate().catch("1970-01-01"),
			to: zodDate().catch(new Date().toISOString().split("T")[0] as string),
			sort: z.enum(["best", "latest", "oldest"]).default("best"),
			match: z.enum(["all", "any"]).default("all"),
		}),
	),
	async (c) => {
		const { query, from, to, sort, match } = c.req.valid("query");

		const fromMs = new Date(from).getTime();
		const toMs = new Date(to).getTime();

		const startTime = performance.now();
		const results = await search(query, sort, match, fromMs, toMs);
		const searchTime = parseFloat((performance.now() - startTime).toFixed(2));

		return c.json({
			ms: searchTime,
			results,
		} as SearchResponse);
	},
);

export default app;
