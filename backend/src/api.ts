import { compress } from "@hono/bun-compress";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { logger } from "hono/logger";

import type { SearchResponse } from "@/types";

import { search } from "./search";

const app = new Hono();
app.use("*", cors());
app.use(logger());
app.use(compress());

app.get("/search", async (c) => {
	const query = c.req.query("query");

	if (query != undefined) {
		const startTime = performance.now();
		const results = await search(query);
		const searchTime = parseFloat((performance.now() - startTime).toFixed(2));

		return c.json({
			ms: searchTime,
			results,
		} as SearchResponse);
	}

	throw new HTTPException(400, { message: "missing query" });
});

export default app;
