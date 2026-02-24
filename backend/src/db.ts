import { Database } from "bun:sqlite";
import path from "path";

export const db = new Database(path.resolve(__dirname, "../db.sqlite"), { create: true, strict: true });

db.run(`create table if not exists videos(
	id text not null primary key,
	title text not null,
	duration integer not null,
	uploader text not null,
	uploaderUrl text not null,
	viewCount integer not null,
	tempAudioPath text,
	transcript text,
	cacheTimestamp number
)`);
