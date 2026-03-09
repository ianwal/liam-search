import { helpers } from "ytdlp-nodejs";

import { Job } from ".";

export default new Job("download yt-dlp", async () => {
	await helpers.downloadYtDlp();

	return { status: "success" };
});
