import MiniSearch from "minisearch";

import type { SearchResult } from "@/types";

import { db } from "./db";
import type { IndexSegment } from "./types";

const index = new MiniSearch({
	fields: ["text"],
	storeFields: ["videoId", "seconds", "text"],
});

export async function search(query: string): Promise<SearchResult[]> {
	// todo: build the index when db changes instead of every search
	const segments: IndexSegment[] = db
		.query("select id, transcript from videos")
		.all()
		.flatMap((video: any, videoIndex) => {
			const transcript: any[] = JSON.parse(video.transcript);

			return transcript.map((segment, segmentIndex) => {
				return {
					id: videoIndex + segmentIndex,
					videoId: video.id as string,
					seconds: Math.floor(segment.start / 1000),
					text: segment.text as string,
				};
			});
		});

	index.removeAll();
	index.addAll(segments);

	const results = index.search(query, { combineWith: "AND" });

	return results.map(({ videoId, seconds, text }) => {
		const video = db.query("select title, thumbnailUrl from videos where id = ?").get(videoId) as { title: string, thumbnailUrl: string };
		return {
			video: {
				id: videoId,
				title: video.title,
				thumbnailUrl: video.thumbnailUrl,
			},
			seconds,
			text,
		};
	});
}
