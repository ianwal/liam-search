import config from "../config";
import { queue } from "../main";
import { Job } from "../types";
import processVideos from "./processVideos";

export default new Job("register interval", () => {
	setInterval(
		() => {
			// todo: check if job is already running
			queue.push(processVideos);
		},
		config.core.process_interval * 60 * 1000,
	);
});
