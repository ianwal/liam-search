import app from "../api";
import config from "../config";
import { Job } from "@zaneshaw/squeue";

export default new Job("start server", () => {
	Bun.serve({
		port: config.api.port,
		fetch: app.fetch,
	});

	console.log(`serving api at http://localhost:${config.api.port}`);
});
