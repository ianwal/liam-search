<script lang="ts">
	import { Search } from "lucide-svelte";
	import { onMount } from "svelte";

	import type { SearchResponse } from "@/types";
	import Result from "./lib/components/Result.svelte";

	let queryValue: string = $state("");
	let fromValue: string = $state("");
	let toValue: string = $state("");
	let sortValue: string = $state("best");
	let matchValue: string = $state("all");

	let searchResponse: SearchResponse | undefined = $state(undefined);
	let searchState: "ready" | "loading" | "error" | "rate_limit" = $state("ready");

	let infoModal: HTMLDialogElement;

	onMount(async () => {
		const url = new URL(window.location.href);
		const query = url.searchParams.get("query");

		if (url.searchParams.get("from")) fromValue = url.searchParams.get("from")!;
		if (url.searchParams.get("to")) toValue = url.searchParams.get("to")!;
		if (url.searchParams.get("sort")) sortValue = url.searchParams.get("sort")!;
		if (url.searchParams.get("match")) matchValue = url.searchParams.get("match")!;

		if (query) {
			queryValue = query;
			document.title = `Liam Search - Search for "${query}"`;

			searchState = "loading";

			try {
				const res = await fetch(`http://localhost:8059/search${url.search}`);

				if (res.ok) {
					searchResponse = (await res.json()) as SearchResponse;
					searchState = "ready";
				} else if (res.status == 429) {
					searchState = "rate_limit";
				} else {
					searchState = "error";
				}
			} catch (err) {
				searchState = "error";
			}
		}
	});
</script>

<svelte:head>
	<link rel="preload" as="image" href={"/LiamConga.avif"} />
	<link rel="preload" as="image" href={"/liamkSlam.avif"} />
	<link rel="preload" as="image" href={"/Buggin.avif"} />
	<link rel="preload" as="image" href={"/poroAgony.avif"} />
</svelte:head>

<main class="mx-auto flex h-screen w-full flex-col gap-5 px-8 pt-10 md:px-16 2xl:px-42">
	<div class="mx-auto mb-5 flex w-fit flex-col items-center">
		<a href="/" class="flex items-center justify-center gap-5">
			<img src="logo.png" alt="Liam logo" class="h-16" />
			<h1>Liam Search</h1>
		</a>
		<p class="-mt-1.5 ml-auto text-gray-500">by <a href="https://squidee.dev/" target="_blank" class="link">squidee_</a> from chat</p>
	</div>
	<form class="mx-auto flex w-full flex-col gap-2">
		<div class="light-outline flex grow overflow-clip rounded-full outline-1 has-[input:focus]:outline-blue-500!">
			<!-- svelte-ignore a11y_autofocus -->
			<input bind:value={queryValue} type="text" name="query" autofocus placeholder="Search" class="bg-background! grow px-5 py-1 placeholder:text-gray-500" />
			<label class="btn rounded-none! px-4!">
				<input type="submit" class="hidden" />
				<Search class="w-5" />
			</label>
		</div>
		<div class="flex items-center justify-between">
			<span class="text-gray-500 italic">
				{#if searchResponse}
					{searchResponse.results.length} results in {searchResponse.ms} ms
				{/if}
			</span>
			<div class="flex gap-2">
				<input bind:value={fromValue} type="date" name="from" class="btn" />
				<input bind:value={toValue} type="date" name="to" class="btn" />
				<select bind:value={sortValue} name="sort" class="btn">
					<option value="best">sort by best</option>
					<option value="latest">sort by latest</option>
					<option value="oldest">sort by oldest</option>
				</select>
				<select bind:value={matchValue} name="match" class="btn">
					<option value="all">match all words</option>
					<option value="any">match any word</option>
				</select>
			</div>
		</div>
	</form>

	<!-- <div class="bg-liam-background text-liam-skin w-full rounded p-3 text-center">
		<span>processing video (Liam VOD - Minecraft Speedrunning Day 20)...</span>
	</div> -->

	<div class="flex justify-center">
		{#if searchState == "ready"}
			{#if searchResponse}
				{#if searchResponse.results.length > 0}
					<div class="mx-auto grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
						{#each searchResponse?.results as result}
							<Result {result} />
						{/each}
					</div>
				{:else}
					<div class="flex flex-col items-center gap-2">
						<img src="/liamkSlam.avif" alt="liamkSlam emote" class="h-20" />
						<span class="text-gray-500 italic">no results</span>
					</div>
				{/if}
			{/if}
		{:else if searchState == "loading"}
			<img src="/LiamConga.avif" alt="LiamConga emote" class="h-20" />
		{:else if searchState == "rate_limit"}
			<div class="flex flex-col items-center gap-2">
				<img src="/Buggin.avif" alt="Buggin emote" class="h-20" />
				<span class="text-gray-500 italic">stop spamming</span>
			</div>
		{:else if searchState == "error"}
			<div class="flex flex-col items-center gap-2">
				<img src="/poroAgony.avif" alt="poroAgony emote" class="h-20" />
				<span class="text-gray-500 italic">something went wrong</span>
			</div>
		{/if}
	</div>

	<footer class="mt-auto flex flex-col items-center gap-5 py-10 text-gray-500">
		<span class="w-[450px] text-center">Latest update: Full rework! Now supports date ranges, sorting, word matching, swear words, and more VODs.</span>
		<div class="flex gap-2">
			<button onclick={() => infoModal.showModal()} class="link">Help / Info</button>
			<span>•</span>
			<a href="https://github.com/zaneshaw/liam-search" target="_blank" class="link">Source code<sup>🡥</sup></a>
			<span>•</span>
			<a href="https://www.twitch.tv/liam" target="_blank" class="link">Twitch<sup>🡥</sup></a>
			<span>•</span>
			<a href="https://www.youtube.com/@LiamKings" target="_blank" class="link">YouTube<sup>🡥</sup></a>
		</div>
	</footer>
</main>

<dialog
	bind:this={infoModal}
	onmousedown={(e) => {
		if (e.target == infoModal) infoModal.close();
	}}
	class="backdrop:bg-black/50"
>
	<div class="bg-background text-liam-skin light-outline fixed top-1/2 left-1/2 flex h-[600px] w-[450px] -translate-1/2 flex-col rounded">
		<div class="border-b border-gray-700 p-4">
			<h2>Help / Info</h2>
		</div>
		<div class="flex flex-col gap-4 overflow-y-auto p-4">
			<div>
				<h2 class="mb-2">Disclaimer</h2>
				<p>
					Liam Search is an unofficial website that is not affiliated in any way with the streamer Liam. The Liam logo belongs to Liam. Liam Search is directly inspired by <a
						href="https://yardsear.ch"
						target="_blank"
						class="link">yardsear.ch</a
					>.
				</p>
			</div>
			<hr />
			<div>
				<h2 class="mb-2">Privacy Statement</h2>
				<p>
					I keep a log of search queries and IP addresses solely to prevent abuse. I don't sell or share these logs with third parties. By using Liam Search, you consent to this collection.
				</p>
			</div>
			<hr />
			<div>
				<h2 class="mb-2">Bugs / Feedback</h2>
				<p>
					If something is broken or you want to give feedback/suggest something, feel free to open an issue on <a
						href="https://github.com/zaneshaw/liam-search/issues/new"
						target="_blank"
						class="link">GitHub</a
					> or add me on Discord (@zaneshaw).
				</p>
			</div>
			<hr />
			<div>
				<h2 class="mb-2">How does Liam Search work?</h2>
				<ol class="flex list-inside list-decimal flex-col gap-2">
					<li>
						Metadata and audio is pulled from the <a href="https://www.youtube.com/playlist?list=PLeMf46ndvGffIJt5KKDa_5SbXZ6F3azhP" target="_blank" class="link">Liam VODs playlist</a>
						and
						<a href="https://www.youtube.com/playlist?list=PL4p5tSr0nlvikGvf0bhqFuQoFAH7Iw9Ay" target="_blank" class="link">ACIDMONEY's clip compilations</a> with
						<a href="https://github.com/yt-dlp/yt-dlp" target="_blank" class="link">yt-dlp</a> every 6 hours
					</li>
					<li>Audio is transcribed with <a href="https://github.com/m-bain/whisperX" target="_blank" class="link">whisperX</a> (large-v3 model)</li>
					<li>The transcription is added to a <a href="https://github.com/lucaong/minisearch" target="_blank" class="link">MiniSearch</a> index</li>
					<li>You query that index with whatever paramaters you set, and the results are displayed here</li>
				</ol>
			</div>
			<hr />
			<div>
				<h2 class="mb-2">Notes</h2>
				<ul class="flex list-inside list-['-_'] flex-col gap-2">
					<li>Only VODs after July 2023 as well as some clips are indexed. I plan to index every clip at some point</li>
					<li>There is a limit of 10 searches in a sliding window of 30 seconds to prevent abuse</li>
				</ul>
			</div>
		</div>
	</div>
</dialog>
