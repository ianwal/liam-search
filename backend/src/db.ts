import { Database } from "bun:sqlite";
import { resolve } from "path";

export const db = new Database(resolve("db.sqlite"), { create: true, strict: true });

db.run(`create table if not exists videos(
	id text not null primary key,
	title text not null,
	thumbnailUrl text not null,
	uploadTimestamp number not null,
	duration integer not null,
	uploader text not null,
	uploaderUrl text not null,
	viewCount integer not null,
	tempAudioPath text,
	transcript text,
	cacheTimestamp number not null
)`);
