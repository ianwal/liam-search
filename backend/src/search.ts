import MiniSearch from "minisearch";
import { singular } from "pluralize";

import type { SearchResult } from "@/types";

import { db } from "./db";
import { Job } from "./jobs";

const index = new MiniSearch({
	fields: ["text"],
	storeFields: ["previousId", "nextId", "videoId", "seconds", "text"],

	// https://github.com/lucaong/minisearch/blob/3d239d1c3ae7aef1bf5d8945dd7b5f0709f646f5/src/MiniSearch.ts#L2261
	tokenize: (string, _fieldName) => string.split(/(?!['"])[\n\r\p{Z}\p{P}]/gu),

	processTerm: (term) => singular(term.toLowerCase().replace(/['"]/gu, "")),
});

export async function search(query: string, sort: "best" | "latest" | "oldest", match: "all" | "any", from: number, to: number): Promise<SearchResult[]> {
	const results = index.search(query, { combineWith: match == "all" ? "AND" : "OR" });

	let richResults: SearchResult[] = results.map(({ videoId, seconds, text, previousId, nextId }) => {
		const video = db.query("select title, thumbnailUrl, uploadTimestamp from videos where id = ?").get(videoId) as { title: string; thumbnailUrl: string; uploadTimestamp: number };
		return {
			video: {
				id: videoId,
				title: video.title,
				thumbnailUrl: video.thumbnailUrl,
				uploadTimestamp: video.uploadTimestamp,
			},
			seconds,
			text,
			previousText: (index.getStoredFields(previousId)?.text as string) ?? null,
			nextText: (index.getStoredFields(nextId)?.text as string) ?? null,
		};
	});

	richResults = richResults.filter((result) => result.video.uploadTimestamp >= from && result.video.uploadTimestamp <= to);

	if (sort == "latest") richResults.sort((a, b) => b.video.uploadTimestamp - a.video.uploadTimestamp || b.seconds - a.seconds);
	if (sort == "oldest") richResults.sort((a, b) => a.video.uploadTimestamp - b.video.uploadTimestamp || a.seconds - b.seconds);

	return richResults;
}

export const buildIndexJob = new Job("build index", async () => {
	// todo: better id
	let id = -1;

	const segments = db
		.query("select id, transcript from videos where transcript is not null")
		.all()
		.flatMap((video: any) => {
			const transcript: any[] = JSON.parse(video.transcript);

			return transcript.map((segment, segmentIndex) => {
				id++;

				return {
					id: id,
					previousId: segmentIndex > 0 ? id - 1 : null,
					nextId: segmentIndex < transcript.length - 1 ? id + 1 : null,
					videoId: video.id as string,
					seconds: Math.floor(segment.start / 1000),
					text: segment.text as string,
				};
			});
		});

	index.removeAll();
	index.addAll(segments);

	return { status: "success" };
});
