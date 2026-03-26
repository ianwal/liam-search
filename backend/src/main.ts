import { JobResult, Queue } from "@zaneshaw/squeue";
import { YtDlp } from "ytdlp-nodejs";

import config from "./config";
import { db } from "./db";
import buildIndex from "./jobs/buildIndex";
import checkForCookies from "./jobs/checkForCookies";
import downloadYtDlp from "./jobs/downloadYtDlp";
import processVideos from "./jobs/processVideos";
import registerInterval from "./jobs/registerInterval";
import startServer from "./jobs/startServer";
import updateVideosCache from "./jobs/updateVideosCache";
import { log } from "./log";

export const ytdlp = new YtDlp({ binaryPath: config.core.yt_dlp_binary_path });
export const queue = new Queue();
queue.beforeRun = (run) => {
	log(
		"JOB",
		"INFO",
		{
			job_id: run.job.id,
			job_name: run.job.name,
			run_id: run.id,
			event: "run_start",
		},
		`running '${run.job.name}'`,
	);
};
queue.afterFinish = (run, result) => {
	log(
		"JOB",
		result == (JobResult.FAIL || JobResult.FAIL_QUEUE) ? "ERROR" : "INFO",
		{
			job_id: run.job.id,
			job_name: run.job.name,
			run_id: run.id,
			event: "run_finish",
			result: JobResult[result],
			duration_ms: run.duration,
		},
		`finished '${run.job.name}' (${JobResult[result]})`,
	);
};

process.on("SIGINT", () => {
	console.log("clearing queues...");
	Queue.clearAll();

	console.log("closing database...");
	db.close(false);

	process.exit();
});

queue.push(startServer, registerInterval, processVideos);
// queue.push(startServer, registerInterval, buildIndex, downloadYtDlp, checkForCookies, updateVideosCache, processVideos);
