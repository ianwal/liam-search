import { Job } from ".";
import app from "../api";
import config from "../config";

export default new Job("start server", async () => {
	Bun.serve({
		port: config.api.port,
		fetch: app.fetch,
	});

	console.log(`serving api at http://localhost:${config.api.port}`);

	return { status: "success" };
});
