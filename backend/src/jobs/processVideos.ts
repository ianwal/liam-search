import { resolve } from "path";

import config from "../config";
import { db } from "../db";
import { log } from "../log";
import { queue, ytdlp } from "../main";
import { Job, JobResult } from "../types";
import buildIndex from "./buildIndex";

async function downloadAudio(videoId: string, outDir: string) {
	const options = {
		extractAudio: true,
		audioFormat: "best",
		output: resolve(`${outDir}${videoId}.%(ext)s`),
	};

	let res;
	try {
		res = await ytdlp.downloadAsync(videoId, {
			...options,
			cookies: config.core.cookies_path,
		});
	} catch (withCookiesErr: any) {
		try {
			log("INFO", "ERROR", { message: `failed to download audio (${videoId})! trying again without cookies...`, error: withCookiesErr.stack });
			res = await ytdlp.downloadAsync(videoId, options);
		} catch (withoutCookiesErr: any) {
			const errorMessage = `failed to download audio (${videoId})! skipping...`;
			log("INFO", "ERROR", { message: errorMessage, error: withoutCookiesErr.stack });
			throw new Error(errorMessage);
		}
	}

	return res.filePaths[0]!;
}

async function transcribeAudio(audioPath: string, outPath: string, cleanup: boolean = true) {
	const proc = Bun.spawn({
		cmd: ["uv", "run", "main.py", "--input", audioPath, "--output", outPath, "--device", config.transcriber.device, "--compute_type", config.transcriber.compute_type],
		cwd: resolve("src/transcriber"),
	});

	if ((await proc.exited) != 0) {
		throw new Error("transciber failed!");
	}

	const transcription = await Bun.file(outPath).json();

	if (cleanup) {
		await Bun.file(audioPath!).delete();
		await Bun.file(outPath!).delete();
	}

	return transcription;
}

export default new Job("transcribe new videos", async () => {
	const newVideos = db.query("select id, tempAudioPath from videos where transcript is null").all() as { id: string; tempAudioPath: string | null }[];

	if (newVideos.length > 0) {
		for (const video of newVideos) {
			// todo: add subjobs or something
			if (video.tempAudioPath == null || !(await Bun.file(video.tempAudioPath).exists())) {
				queue.push(
					new Job(`download audio (${video.id})`, async () => {
						try {
							const path = await downloadAudio(video.id, "temp/");

							db.query(`update videos set tempAudioPath = ? where id = ?`).run(path, video.id);
							video.tempAudioPath = path;
						} catch (err: any) {
							log("INFO", "ERROR", { message: err }, err);
							return JobResult.FAIL;
						}
					}),
				);
			}

			queue.push(
				new Job(`transcribe audio (${video.id})`, async () => {
					if (video.tempAudioPath != null) {
						try {
							const transcription = await transcribeAudio(video.tempAudioPath, resolve(`./temp/${video.id}.json`));

							db.query(`update videos set tempAudioPath = null, transcript = ? where id = ?`).run(JSON.stringify(transcription), video.id);

							queue.insertNext(buildIndex);
						} catch (err: any) {
							log("INFO", "ERROR", { message: err }, err);
							return JobResult.FAIL;
						}
					} else {
						log("INFO", "ERROR", { message: "temporary audio path is null" });
						return JobResult.FAIL;
					}
				}),
			);
		}
	} else {
		return JobResult.SKIP;
	}
});
