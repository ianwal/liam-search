import { Hono } from "hono";

import { db } from "../db";

const app = new Hono<{ Variables: { logData: any } }>();

app.get("/", async (c) => {
	const stats = {
		coverage: {
			total: (db.query("select count(*) from videos").get() as any)["count(*)"],
			transcribed: (db.query("select count(transcript) from videos").get() as any)["count(transcript)"],
			not_transcribed: db
				.query("select id from videos where transcript is null")
				.all()
				.map((x: any) => x.id),
		},
	};

	return c.json(stats);
});

export default app;
