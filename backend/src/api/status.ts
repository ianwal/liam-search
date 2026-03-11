import { Hono } from "hono";

import status from "../status";

const app = new Hono<{ Variables: { logData: any } }>();

app.get("/", async (c) => {
	const _status = status.get();
	const res = { code: _status.code, message: _status.message };

	c.status(_status.status);
	c.set("logData", res);

	return c.json(res);
});

export default app;
