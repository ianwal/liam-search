import { MeiliSearch } from "meilisearch";

import type { SearchResponse, SearchResult } from "@/types";

import { db } from "./db";

export const msClient = new MeiliSearch({
	host: Bun.env.VITE_MEILISEARCH_HOST!,
	apiKey: "RKMpVWiC7sW3cDhdCCbp",
});

const index = msClient.index("segments");

await index.updatePagination({ maxTotalHits: Number.MAX_SAFE_INTEGER });
await index.updateTypoTolerance({ enabled: false });
await index.updateFilterableAttributes(["videoId", "videoTimestamp"]);
await index.updateSortableAttributes(["videoTimestamp", "seconds"]);

export async function search(
	query: string,
	options: {
		sort: "best" | "latest" | "oldest";
		match: "all" | "any";
		from: number;
		to: number;
		id?: string;
		page: number;
		perPage: number;
	},
): Promise<SearchResponse> {
	const startTime = performance.now();

	const sortArr: string[] = [];
	switch (options.sort) {
		case "latest":
			sortArr.push("videoTimestamp:desc", "seconds:desc");
			break;
		case "oldest":
			sortArr.push("videoTimestamp:asc", "seconds:asc");
			break;
	}

	const filterArr = [`videoTimestamp >= ${options.from} AND videoTimestamp < ${options.to}`];
	if (options.id) filterArr.push(`videoId = "${options.id}"`);

	const res = await index.search(options.match == "all" ? `"${query}"` : query, {
		page: options.page,
		hitsPerPage: options.perPage,
		matchingStrategy: options.match == "all" ? "all" : "frequency",
		sort: sortArr,
		filter: filterArr,
	});

	const videos = db.query("select id, title, thumbnailUrl, uploadTimestamp from videos").all() as { id: string; title: string; thumbnailUrl: string; uploadTimestamp: number }[];
	let results: SearchResult[] = [];

	for await (const { videoId, seconds, text, previousId, nextId } of res.hits) {
		const video = videos.find((v) => v.id == videoId);
		if (!options.id || options.id == videoId) {
			results.push({
				video: {
					id: videoId,
					title: video!.title,
					thumbnailUrl: video!.thumbnailUrl,
					uploadTimestamp: video!.uploadTimestamp,
				},
				seconds,
				text,
				previousText: ((await msClient.index("segments").getDocument(previousId)).text as string) ?? null,
				nextText: ((await msClient.index("segments").getDocument(nextId)).text as string) ?? null,
			});
		}
	}

	// results = results.filter((result) => result.video.uploadTimestamp >= options.from && result.video.uploadTimestamp <= options.to);

	const searchMs = parseFloat((performance.now() - startTime).toFixed(2));

	return {
		ms: searchMs,
		page: options.page,
		perPage: options.perPage,
		pageCount: res.totalPages,
		resultCount: res.totalHits,
		results,
	};
}
