import { Job } from ".";
import config from "../config";
import processVideos from "./processVideos";

export default new Job("register interval", async () => {
	setInterval(
		() => {
			// todo: check if job is already running
			Job.pushQueue(processVideos);
		},
		config.core.process_interval * 60 * 1000,
	);

	return { status: "success" };
});
