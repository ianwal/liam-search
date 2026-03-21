import type { PlaylistInfo, VideoInfo } from "ytdlp-nodejs";

import config from "../config";
import { db } from "../db";
import { log } from "../log";
import { ytdlp } from "../main";
import { Job, JobResult } from "../types";
import type { VideoCache, VideoMetadata } from "../types";

async function fetchVideoInfo(playlistURLs: string[]) {
	const videosInfo = [];
	for (const url of playlistURLs) {
		const playlistInfo = (await ytdlp.getInfoAsync(url, { cookies: config.core.cookies_path })) as PlaylistInfo;
		videosInfo.push(...playlistInfo.entries);
	}

	if (videosInfo.length > 0) {
		return videosInfo.map(
			(video: any) =>
				({
					id: video.id,
					title: video.title,
					thumbnailUrl: `https://i.ytimg.com/vi/${video.id}/mqdefault.jpg`,
					duration: video.duration,
					uploader: video.uploader,
					uploaderUrl: video.uploader_url,
					viewCount: video.view_count,
				}) as VideoMetadata,
		);
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
					const videoInfo = (await ytdlp.getInfoAsync(`https://www.youtube.com/watch?v=${video.id}`, { cookies: config.core.cookies_path })) as VideoInfo;
					video.uploadTimestamp = videoInfo.timestamp * 1000;

					db.query(`update videos set title = ?, viewCount = ?, cacheTimestamp = ? where id = ?`).run(videoInfo.title, videoInfo.view_count, Date.now(), video.id);
				}
			} else {
				const videoInfo = (await ytdlp.getInfoAsync(`https://www.youtube.com/watch?v=${video.id}`, { cookies: config.core.cookies_path })) as VideoInfo;
				video.uploadTimestamp = videoInfo.timestamp * 1000;

				const query = db.query(`insert into videos values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
				query.run(video.id, video.title, video.thumbnailUrl, video.uploadTimestamp, video.duration, video.uploader, video.uploaderUrl, video.viewCount, null, null, Date.now());
			}

			if (config.overrides[video.id]) {
				db.query(`update videos set uploadTimestamp = ? where id = ?`).run(config.overrides[video.id]!.getTime(), video.id);
			}
		} catch (err: any) {
			log("INFO", "ERROR", { message: `failed to get video info (${video.id})! skipping...`, error: err.stack }, err);
		}
	}
}

export default new Job("update videos cache", async () => {
	try {
		const videoMetadata = await fetchVideoInfo(config.core.playlists);
		await updateVideosCache(videoMetadata);
	} catch (err: any) {
		log("INFO", "ERROR", { message: err }, err);
		return JobResult.FAIL_QUEUE;
	}
});
