export type SearchResponse = {
	ms: number;
	results: SearchResult[];
};

export type SearchResult = {
	video: {
		id: string;
		title: string;
		thumbnailUrl: string;
		uploadTimestamp: number;
	}
	seconds: number;
	text: string;
	previousText: string | null;
	nextText: string | null;
};
