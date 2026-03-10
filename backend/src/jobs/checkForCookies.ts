import { exists } from "fs/promises";

import { Job } from ".";
import { cookiesPath } from "../main";

export default new Job("check for cookies.txt", async () => {
	if (!(await exists(cookiesPath))) {
		console.error("no cookies.txt");
		return { status: "failed_queue" };
	}

	return { status: "success" };
});
