import { helpers } from "ytdlp-nodejs";
import { Job } from "@zaneshaw/squeue";

export default new Job("download yt-dlp", async () => {
	await helpers.downloadYtDlp();
});
