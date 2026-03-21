import { Hono } from "hono";
import { queue } from "../main";

const app = new Hono<{ Variables: { logData: any } }>();

app.get("/", async (c) => {
	return c.json(queue.runs);
});

export default app;
