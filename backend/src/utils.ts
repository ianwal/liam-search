export type PageResults = {
	page: number;
	perPage: number;
	pageCount: number;
	results: any[];
};

export function paginate(arr: any[], page: number, perPage: number): PageResults {
	return {
		page,
		perPage,
		pageCount: Math.ceil(arr.length / perPage),
		results: arr.slice((page - 1) * perPage, page * perPage),
	};
}
