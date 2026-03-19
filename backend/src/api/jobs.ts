import { Hono } from "hono";

import { Job } from "../jobs";

const app = new Hono<{ Variables: { logData: any } }>();

app.get("/", async (c) => {
	return c.json({ running: Job.runningJob?.id ?? null, queue: Job.queue });
});

export default app;
