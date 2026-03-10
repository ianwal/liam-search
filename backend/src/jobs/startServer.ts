import { Job } from ".";
import app from "../api";

export default new Job("start server", async () => {
	Bun.serve({
		port: parseInt(Bun.env.VITE_PORT!),
		fetch: app.fetch,
	});

	console.log("serving api at http://localhost:8059");

	return { status: "success" };
});
