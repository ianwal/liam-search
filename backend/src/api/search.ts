import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";

import { search } from "../search";

const app = new Hono<{ Variables: { logData: any } }>();

function zodDate() {
	return z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
		message: "expected YYYY-MM-DD",
	});
}

app.get(
	"/",
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
