import { Hono } from "hono";

import { queue } from "../main";

const app = new Hono<{ Variables: { logData: any } }>();

app.get("/", async (c) => {
	return c.json(
		queue.runs.map((run) => {
			const { startTime, ...rest } = run as any;
			return { ...rest, duration: run.duration ?? undefined };
		}),
	);
});

export default app;
