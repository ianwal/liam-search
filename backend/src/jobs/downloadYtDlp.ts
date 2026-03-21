import { helpers } from "ytdlp-nodejs";
import { Job } from "../types";

export default new Job("download yt-dlp", async () => {
	await helpers.downloadYtDlp();
});
