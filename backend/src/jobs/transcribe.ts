import path from "path";
import type { PlaylistInfo, VideoInfo } from "ytdlp-nodejs";

import { Job } from ".";
import { db } from "../db";
import { log } from "../log";
import { cookiesPath, ytdlp } from "../main";
import type { VideoCache, VideoMetadata } from "../types";
import buildIndex from "./buildIndex";

// const playlists = ["https://www.youtube.com/playlist?list=PL4p5tSr0nlvikGvf0bhqFuQoFAH7Iw9Ay", "https://www.youtube.com/playlist?list=PL-dR2WR6nR_ZI0Ijd1xcjcT3Y6ht5NEX9"];
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

export default new Job(
	"fetch video info",
	async () => {
		const videosInfo = [];
		for (const url of playlists) {
			const playlistInfo = (await ytdlp.getInfoAsync(url, { cookies: cookiesPath })) as PlaylistInfo;
			videosInfo.push(...playlistInfo.entries);
		}

		if (videosInfo.length > 0) {
			const videoMetadata = videosInfo.map((video: any) => ({
				id: video.id,
				title: video.title,
				thumbnailUrl: `https://i.ytimg.com/vi/${video.id}/mqdefault.jpg`,
				duration: video.duration,
				uploader: video.uploader,
				uploaderUrl: video.uploader_url,
				viewCount: video.view_count,
			}));

			return { status: "success", data: { videoMetadata } };
		} else {
			console.error("playlist fetch error. does it have any videos?");
			return { status: "failed_queue" };
		}
	},
	(res) => {
		if (res.status == "success") {
			Job.pushQueue(
				new Job("update videos cache", async () => {
					for (const video of res.data!.videoMetadata as VideoMetadata[]) {
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

					return { status: "success" };
				}),
				new Job("transcribe new videos", async () => {
					const newVideos = db.query("select id, tempAudioPath from videos where transcript is null").all() as { id: string; tempAudioPath: string | null }[];

					if (newVideos.length > 0) {
						for (const video of newVideos) {
							// todo: add subjobs or something
							await transcribeVideo(video.id, video.tempAudioPath);
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

// kinda scuffed and doesn't really use the job system correctly
async function transcribeVideo(videoId: string, tempAudioPath: string | null) {
	if (tempAudioPath == null || !(await Bun.file(tempAudioPath).exists())) {
		Job.pushQueue(
			new Job(`download audio (${videoId})`, async () => {
				const options = {
					extractAudio: true,
					audioFormat: "best",
					output: path.resolve(__dirname, `../../temp/${videoId}.%(ext)s`),
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
						log("INFO", "ERROR", { message: `failed to download audio (${videoId})! skipping...` });
						return { status: "failed" };
					}
				}

				tempAudioPath = res.filePaths[0]!;
				db.query(`update videos set tempAudioPath = ? where id = ?`).run(tempAudioPath, videoId);

				return { status: "success" };
			}),
		);
	}

	Job.pushQueue(
		new Job(`transcribe audio (${videoId})`, async () => {
			return new Promise(async (res) => {
				if (tempAudioPath != null) {
					const outPath = path.resolve(__dirname, `../../temp/${videoId}.json`);

					const proc = Bun.spawn({
						cmd: ["uv", "run", "main.py", tempAudioPath, outPath],
						cwd: path.resolve(__dirname, "../transcriber"),
						stdout: "ignore",
						stderr: "ignore",
					});

					await proc.exited;

					const transcription = await Bun.file(outPath).json();

					db.query(`update videos set tempAudioPath = null, transcript = ? where id = ?`).run(JSON.stringify(transcription), videoId);

					await Bun.file(tempAudioPath!).delete();
					await Bun.file(outPath!).delete();

					res({ status: "success" });
				} else {
					res({ status: "failed" });
				}
			});
		}),
	);

	Job.pushQueue(buildIndex);
}
