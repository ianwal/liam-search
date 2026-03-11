import { Hono } from "hono";

import status from "../status";

const app = new Hono<{ Variables: { logData: any } }>();

app.get("/", async (c) => {
	c.set("logData", {
		status_message: "aga",
	});

	const _status = status.get();

	c.status(_status.status);
	return c.json({ code: _status.code, message: _status.message });
});

export default app;
