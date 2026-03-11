import { exists } from "fs/promises";
import { resolve } from "path";

import { Job } from ".";
import config from "../config";

export default new Job("check for cookies.txt", async () => {
	if (!(await exists(config.core.cookies_path))) {
		console.error("no cookies.txt");
		return { status: "failed_queue" };
	}

	return { status: "success" };
});
