import { Job } from "@zaneshaw/squeue";

import config from "../config";
import { queue } from "../main";
import processVideos from "./processVideos";
import updateVideosCache from "./updateVideosCache";

export default new Job("register interval", () => {
	setInterval(
		() => {
			// todo: check if jobs are already running
			queue.push(updateVideosCache, processVideos);
		},
		config.core.process_interval * 60 * 1000,
	);
});
