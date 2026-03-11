import path from "path";
import type { PlaylistInfo, VideoInfo } from "ytdlp-nodejs";

import { Job, type JobResult } from ".";
import { db } from "../db";
import { log } from "../log";
import { cookiesPath, ytdlp } from "../main";
import type { VideoCache, VideoMetadata } from "../types";
import buildIndex from "./buildIndex";

const playlists = [
	"https://www.youtube.com/playlist?list=PL-dR2WR6nR_YPhchO2f48lssHKENSMAYy",
	"https://www.youtube.com/playlist?list=PL-dR2WR6nR_ZYPbJhACQKEiyb43DXunBy",
	"https://www.youtube.com/playlist?list=PL4p5tSr0nlvikGvf0bhqFuQoFAH7Iw9Ay",
];
const uploadDateOverrides: { [id: string]: Date } = {
	"HGoVx0-0tJ4": new Date("2017-01-01"),
	"mzGXgJVJPhM": new Date("2018-01-01"),
	"2dx8Tz_eJY8": new Date("2019-01-01"),
	"ED1pc5u_HbM": new Date("2020-01-01"),
	"Xj2vHvMmHF0": new Date("2021-01-01"),
};

async function fetchVideoInfo(playlistURLs: string[]) {
	const videosInfo = [];
	for (const url of playlistURLs) {
		const playlistInfo = (await ytdlp.getInfoAsync(url, { cookies: cookiesPath })) as PlaylistInfo;
		videosInfo.push(...playlistInfo.entries);
	}

	if (videosInfo.length > 0) {
		return videosInfo.map((video: any) => ({
			id: video.id,
			title: video.title,
			thumbnailUrl: `https://i.ytimg.com/vi/${video.id}/mqdefault.jpg`,
			duration: video.duration,
			uploader: video.uploader,
			uploaderUrl: video.uploader_url,
			viewCount: video.view_count,
		}));
	} else {
		throw new Error("playlist fetch error. does it have any videos?");
	}
}

async function updateVideosCache(videoMetadata: VideoMetadata[]) {
	for (const video of videoMetadata) {
		try {
			const cachedVideo = db.query("select * from videos where id = ?").get(video.id) as VideoCache;

			if (cachedVideo) {
				if (Date.now() > cachedVideo.cacheTimestamp + 14 * 24 * 60 * 60 * 1000) {
					const videoInfo = (await ytdlp.getInfoAsync(`https://www.youtube.com/watch?v=${video.id}`, { cookies: cookiesPath })) as VideoInfo;
					video.uploadTimestamp = videoInfo.timestamp * 1000;

					db.query(`update videos set title = ?, viewCount = ?, cacheTimestamp = ? where id = ?`).run(videoInfo.title, videoInfo.view_count, Date.now(), video.id);
				}
			} else {
				const videoInfo = (await ytdlp.getInfoAsync(`https://www.youtube.com/watch?v=${video.id}`, { cookies: cookiesPath })) as VideoInfo;
				video.uploadTimestamp = videoInfo.timestamp * 1000;

				const query = db.query(`insert into videos values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
				query.run(video.id, video.title, video.thumbnailUrl, video.uploadTimestamp, video.duration, video.uploader, video.uploaderUrl, video.viewCount, null, null, Date.now());
			}

			if (uploadDateOverrides[video.id]) {
				db.query(`update videos set uploadTimestamp = ? where id = ?`).run(uploadDateOverrides[video.id]!.getTime(), video.id);
			}
		} catch (err: any) {
			console.error(err);
			log("INFO", "ERROR", { message: `failed to get video info (${video.id})! skipping...`, error: err.stack });
		}
	}
}

async function downloadAudio(videoId: string, outDir: string) {
	const options = {
		extractAudio: true,
		audioFormat: "best",
		output: path.resolve(__dirname, `${outDir}${videoId}.%(ext)s`),
	};

	let res;
	try {
		res = await ytdlp.downloadAsync(videoId, {
			...options,
			cookies: cookiesPath,
		});
	} catch (withCookiesErr: any) {
		try {
			log("INFO", "ERROR", { message: `failed to download audio (${videoId})! trying again without cookies...`, error: withCookiesErr.stack });
			res = await ytdlp.downloadAsync(videoId, options);
		} catch (withoutCookiesErr: any) {
			const errorMessage = `failed to download audio (${videoId})! skipping...`;
			log("INFO", "ERROR", { message: errorMessage });
			throw new Error(errorMessage);
		}
	}

	return res.filePaths[0]!;
}

async function transcribeAudio(audioPath: string, outPath: string, cleanup: boolean = true) {
	const proc = Bun.spawn({
		cmd: ["uv", "run", "main.py", "--input", audioPath, "--output", outPath],
		cwd: path.resolve(__dirname, "../transcriber"),
	});

	await proc.exited;

	const transcription = await Bun.file(outPath).json();

	if (cleanup) {
		await Bun.file(audioPath!).delete();
		await Bun.file(outPath!).delete();
	}

	return transcription;
}

// kinda scuffed and doesn't really use the job system correctly
export default new Job(
	"fetch video info",
	async () => {
		try {
			const videoMetadata = await fetchVideoInfo(playlists);
			return { status: "success", data: { videoMetadata } };
		} catch (err) {
			console.error(err);
			return { status: "failed_queue" };
		}
	},
	(res) => {
		if (res.status == "success") {
			Job.pushQueue(
				new Job("update videos cache", async () => {
					await updateVideosCache(res.data!.videoMetadata as VideoMetadata[]);

					return { status: "success" };
				}),
				new Job("transcribe new videos", async () => {
					const newVideos = db.query("select id, tempAudioPath from videos where transcript is null").all() as { id: string; tempAudioPath: string | null }[];

					if (newVideos.length > 0) {
						for (const video of newVideos) {
							// todo: add subjobs or something
							if (video.tempAudioPath == null || !(await Bun.file(video.tempAudioPath).exists())) {
								Job.pushQueue(
									new Job(`download audio (${video.id})`, async () => {
										try {
											const path = await downloadAudio(video.id, "../../temp/");

											db.query(`update videos set tempAudioPath = ? where id = ?`).run(path, video.id);
											return { status: "success" };
										} catch (err) {
											return { status: "failed" };
										}
									}),
								);
							}

							Job.pushQueue(
								new Job(`transcribe audio (${video.id})`, async () => {
									if (video.tempAudioPath != null) {
										const transcription = await transcribeAudio(video.tempAudioPath, path.resolve(__dirname, `../../temp/${video.id}.json`));

										db.query(`update videos set tempAudioPath = null, transcript = ? where id = ?`).run(JSON.stringify(transcription), video.id);

										return { status: "success" };
									} else {
										return { status: "failed" };
									}
								}),
							);

							Job.pushQueue(buildIndex);
						}

						return { status: "success" };
					} else {
						return { status: "skipped" };
					}
				}),
			);
		}
	},
);
