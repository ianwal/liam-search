<script lang="ts">
	import { Search } from "lucide-svelte";
	import { onMount } from "svelte";

	import type { SearchResponse } from "@/types";

	let queryValue: string = $state("");
	let fromValue: string = $state("");
	let toValue: string = $state("");
	let sortValue: string = $state("best");
	let matchValue: string = $state("all");

	let searchResponse: SearchResponse | undefined = $state(undefined);
	let searchState: "ready" | "loading" | "error" | "rate_limit" = $state("ready");

	function secondsToTimestamp(seconds: number) {
		const hours = Math.floor(seconds / 60 / 60);
		const minutes = Math.floor(seconds / 60) % 60;

		return (hours ? `${hours}:` : "") + `${minutes}:${(seconds % 60).toString().padStart(2, "0")}`;
	}

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
	<div class="mb-5 flex flex-col items-center">
		<a href="/" class="flex items-center justify-center gap-5">
			<img src="logo.png" alt="Liam logo" class="h-16" />
			<h1>Liam Search</h1>
		</a>
		<p class="text-gray-500">made by <a href="https://squidee.dev/" target="_blank" class="link">squidee_</a> from chat</p>
	</div>
	<form class="mx-auto flex w-full flex-col gap-2">
		<div class="light-outline flex grow overflow-clip rounded-full outline-1 has-[input:focus]:outline-blue-500!">
			<!-- svelte-ignore a11y_autofocus -->
			<input bind:value={queryValue} type="text" name="query" autofocus placeholder="search" class="bg-background! grow px-5 py-1 placeholder:text-gray-500" />
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
							{@const videoUrl = `https://www.youtube.com/watch?v=${result.video.id}`}
							<div class="outline-liam-background flex w-fit flex-col gap-2 rounded p-2.5 outline-1 transition-[outline] duration-150 hover:outline-gray-700">
								<a href={`${videoUrl}&t=${result.seconds}`} target="_blank">
									<img src={result.video.thumbnailUrl} alt="" class="aspect-video w-full rounded-sm" />
								</a>
								<p>
									<a href={videoUrl} target="_blank">Liam VOD - Minecraft Speedrunning Day 20</a>
									<span class="text-gray-500">at</span>
									<a href={`${videoUrl}&t=${result.seconds}`} target="_blank" class="text-blue-500 hover:text-blue-400">{secondsToTimestamp(result.seconds)}</a>
								</p>
								<p class="text-[15px] text-gray-500">
									"{#if result.previousText}...{result.previousText}{/if}
									<span class="font-medium text-white">{result.text}</span>
									{#if result.nextText}{result.nextText}..{/if}"
								</p>
							</div>
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
		<span>latest update: full rework! now supports date ranges, sorting, and word matching.</span>
		<div class="flex gap-2">
			<button class="link">help / more info</button>
			<span>•</span>
			<a href="https://github.com/zaneshaw/liam-search" target="_blank" class="link">source code<sup>🡥</sup></a>
			<span>•</span>
			<a href="https://www.twitch.tv/liam" target="_blank" class="link">liam twitch<sup>🡥</sup></a>
		</div>
	</footer>
</main>
