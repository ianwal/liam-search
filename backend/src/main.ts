import path from "path";
import { YtDlp } from "ytdlp-nodejs";

import { db } from "./db";
import { Job } from "./jobs";
import buildIndex from "./jobs/buildIndex";
import checkForCookies from "./jobs/checkForCookies";
import downloadYtDlp from "./jobs/downloadYtDlp";
import registerInterval from "./jobs/registerInterval";
import startServer from "./jobs/startServer";
import transcribe from "./jobs/transcribe";

export const ytdlp = new YtDlp({ binaryPath: "C:\\Users\\zanes\\Downloads\\yt-dlp.exe" });
export const cookiesPath = path.resolve(__dirname, "../cookies.txt");

function exit() {
	console.log("clearing queue...");
	Job.clearQueue();

	console.log("closing database...");
	db.close(false);

	process.exit();
}

process.on("SIGINT", exit);

Job.pushQueue(
	registerInterval,
	buildIndex,
	startServer,
	downloadYtDlp,
	checkForCookies,
	transcribe,
);
