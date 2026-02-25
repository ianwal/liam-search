export type SearchResponse = {
	ms: number;
	results: SearchResult[];
};

export type SearchResult = {
	video: {
		id: string;
		title: string;
		thumbnailUrl: string;
	}
	seconds: number;
	text: string;
};
