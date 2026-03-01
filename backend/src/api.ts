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

app.get(
	"/search",
	zValidator(
		"query",
		z.object({
			query: z.string(),
			sort: z.enum(["best", "latest", "oldest"]).default("best"),
			match: z.enum(["all", "any"]).default("all"),
		}),
	),
	async (c) => {
		const { query, sort, match } = c.req.valid("query");

		const startTime = performance.now();
		const results = await search(query, sort, match);
		const searchTime = parseFloat((performance.now() - startTime).toFixed(2));

		return c.json({
			ms: searchTime,
			results,
		} as SearchResponse);
	},
);

export default app;
