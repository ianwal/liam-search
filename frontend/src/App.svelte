<script lang="ts">
	import { ArrowLeft, ArrowLeftToLine, ArrowRight, ArrowRightToLine, Search } from "lucide-svelte";
	import { onMount } from "svelte";
	import StatusBanner from "./lib/components/StatusBanner.svelte";

	let data: any = $state(null);
	let status: string = $state("");
	let forceUpdateStatus = $state(true);

	let searchQueryInput: HTMLInputElement;
	let helpModal: HTMLDialogElement;
	let helpModalContent: HTMLElement;

	async function doSearch(query: string, page?: number) {
		const res = await fetch(`${import.meta.env.VITE_API_URL}/search?query=${query}&page=${page}`);
		data = await res.json();

		const url = new URL(window.location.toString());
		url.searchParams.set("query", query);
		url.searchParams.set("page", data.page.toString());
		history.pushState({}, "", url);

		document.title = `Liam Search - Search for "${query}" (page ${data.page}/${data.totalPages})`;
	}

	async function updateStatus() {
		forceUpdateStatus = false;

		try {
			const res = await fetch(`${import.meta.env.VITE_API_URL}/status`);
			if (res.ok) {
				status = (await res.json()).status;
			} else {
				status = "api_error";
			}
		} catch {
			status = "api_error";
		}
	}

	onMount(async () => {
		await updateStatus();

		async function tryUpdateStatus() {
			forceUpdateStatus = true;
			if (document.hasFocus()) await updateStatus();
		}

		let updateInterval = setInterval(tryUpdateStatus, 30000);

		window.addEventListener("focus", async () => {
			if (forceUpdateStatus) {
				clearInterval(updateInterval);
				updateInterval = setInterval(tryUpdateStatus, 30000);
				await updateStatus();
			}
		});

		const url = new URL(window.location.toString());
		const query = url.searchParams.get("query");
		const page = parseInt(url.searchParams.get("page") || "1");
		if (query) {
			searchQueryInput.value = query;
			doSearch(query, page);
		}
	});
</script>

<main class="mx-auto flex h-screen w-[512px] flex-col gap-5 pt-10">
	<div class="flex flex-col items-center">
		<a href="/" class="flex items-center justify-center gap-5">
			<img src="logo.png" alt="Liam logo" class="h-16" />
			<h1>Liam Search</h1>
		</a>
		<p class="text-gray-500">made by <a href="https://squidee.dev/" target="_blank" class="link">squidee_</a> from chat</p>
	</div>
	<form
		onsubmit={(e) => {
			e.preventDefault();
			doSearch(searchQueryInput.value, 1);
		}}
		class="light-outline flex overflow-clip rounded-full outline-1 has-[input:focus]:outline-blue-500!"
	>
		<!-- svelte-ignore a11y_autofocus -->
		<input type="text" bind:this={searchQueryInput} autofocus placeholder="use double quotes to search an exact phrase" class="bg-background! grow px-5 py-1 placeholder:text-gray-500" />
		<button class="btn rounded-none! px-4!"><Search class="w-5" /></button>
	</form>
	<StatusBanner {status} />
	{#if data}
		{#if data.results?.length > 0}
			{#snippet resultsText()}
				<span class="text-gray-500 italic"
					>{data.resultsPerPage * (data.page - 1) + 1}-{Math.min(data.resultsPerPage * data.page, data.totalResults)} of {data.totalResults} results ({data.totalPages} pages)</span
				>
			{/snippet}
			{#snippet pageList()}
				<div class="flex items-center justify-center gap-2">
					<div class="flex gap-1">
						<button
							disabled={data.page == 1}
							onclick={() => doSearch(searchQueryInput.value, 1)}
							title="first page"
							class="text-gray-400 not-disabled:cursor-pointer not-disabled:hover:text-white disabled:text-gray-600"><ArrowLeftToLine /></button
						>
						<button
							disabled={data.page == 1}
							onclick={() => doSearch(searchQueryInput.value, data.page - 1)}
							title="previous page (page {data.page - 1})"
							class="text-gray-400 not-disabled:cursor-pointer not-disabled:hover:text-white disabled:text-gray-600"><ArrowLeft class="size-[22px]" /></button
						>
					</div>
					<div class="flex">
						{#each Array.from({ length: data.totalPages }) as _, i}
							{@const number = i + 1}
							{@const centre = Math.min(Math.max(2 + 1, data.page), data.totalPages - 2)}
							{#if Math.abs(number - centre) <= 2}
								<button onclick={() => doSearch(searchQueryInput.value, number)} title="page {number}" class="size-7 cursor-pointer">
									<span class={number == data.page ? "text-white" : "text-gray-500"}>{number}</span>
								</button>
							{/if}
						{/each}
					</div>
					<div class="flex gap-1">
						<button
							disabled={data.page == data.totalPages}
							onclick={() => doSearch(searchQueryInput.value, data.page + 1)}
							title="next page (page {data.page + 1})"
							class="text-gray-400 not-disabled:cursor-pointer not-disabled:hover:text-white disabled:text-gray-600"><ArrowRight class="size-[22px]" /></button
						>
						<button
							disabled={data.page == data.totalPages}
							onclick={() => doSearch(searchQueryInput.value, data.totalPages)}
							title="last page (page {data.totalPages})"
							class="text-gray-400 not-disabled:cursor-pointer not-disabled:hover:text-white disabled:text-gray-600"><ArrowRightToLine /></button
						>
					</div>
				</div>
			{/snippet}

			{@render resultsText()}
			{@render pageList()}
			<div class="mx-auto flex flex-col gap-10">
				{#each data.results as video, i}
					{@const timestamp = new Date(`1970-01-01T${video.time_start.split(",")[0]}.000Z`).getTime() / 1000}
					<div class="flex flex-col">
						{#if i < 5}
							<iframe
								width="512"
								height="288"
								src="https://www.youtube.com/embed/{video.video_id}?start={timestamp}"
								title=""
								frameborder="0"
								allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
								allowfullscreen
								class="bg-black"
							></iframe>
						{:else}
							<a href="https://www.youtube.com/watch?v={video.video_id}&t={timestamp}" target="_blank">
								<img src={video.thumbnail} alt="" class="h-full w-full" />
							</a>
						{/if}
						<p>
							<a href="https://www.youtube.com/watch?v={video.video_id}" target="_blank" class="font-bold">
								{video.title}
							</a>
							<span class="text-gray-500">at</span>
							<a href="https://www.youtube.com/watch?v={video.video_id}&t={timestamp}" target="_blank" class="text-blue-500 hover:text-blue-400">
								{video.time_start.split(",")[0]}
							</a>
						</p>
						<p class="text-gray-500 italic">"...{video.text_before} <span class="font-medium text-white">{video.text}</span> {video.text_after}..."</p>
					</div>
				{/each}
			</div>
			{@render pageList()}
			<div class="flex justify-center">{@render resultsText()}</div>
		{:else}
			<p class="text-center text-gray-500 italic">no results</p>
		{/if}
	{/if}
	<footer class="mt-auto flex flex-col items-center gap-5 py-10 text-gray-500">
		<span>latest update: searches now commit to your history.</span>
		<div class="flex gap-2">
			<button
				onclick={() => {
					helpModal.showModal();
					helpModalContent.scrollTo(0, 0);
				}}
				class="link">help / more info</button
			>
			<span>•</span>
			<a href="https://github.com/zaneshaw/liam-search" target="_blank" class="link">source code<sup>🡥</sup></a>
			<span>•</span>
			<a href="https://www.twitch.tv/liam" target="_blank" class="link">liam twitch<sup>🡥</sup></a>
		</div>
	</footer>
</main>
<dialog bind:this={helpModal} class="inset-0 size-full max-h-none max-w-none bg-transparent">
	<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
	<div
		onclick={(e) => {
			if (e.target === helpModal.firstChild) helpModal.close();
		}}
		class="flex h-full w-full items-center justify-center bg-black/50"
	>
		<div class="bg-liam-background text-liam-skin flex h-[500px] w-[650px] overflow-hidden rounded-lg">
			<div bind:this={helpModalContent} class="flex flex-col gap-8 overflow-y-auto px-6 py-8">
				<div class="flex flex-col gap-2">
					<h2>privacy statement</h2>
					<p>i log search queries and IP addresses solely to prevent abuse. i don't sell or share these logs with third parties. by using Liam Search, you consent to this collection.</p>
				</div>
				<div class="flex flex-col gap-2">
					<h2>bug / feedback</h2>
					<p>
						if something is broken or you want to give feedback/suggest something, feel free to open an issue on
						<a href="https://github.com/zaneshaw/liam-search/issues/new" target="_blank" class="link">github</a> or add me on discord (@zaneshaw).
					</p>
				</div>
				<div class="flex flex-col gap-2">
					<h2>faq <span class="text-liam-skin font-light">(no one asked these)</span></h2>
					<div>
						<p class="text-white italic">why can't i search swear words?</p>
						<p>
							the index is built from youtube subtitles, which replace pretty much every swear word with "[ __ ]". i'm planning to transcribe the vods locally at some point so i don't
							have to depend on youtube's transcription.
						</p>
					</div>
					<div>
						<p class="text-white italic">which vods are indexed?</p>
						<p>
							every video in this <a href="https://www.youtube.com/playlist?list=PLeMf46ndvGffIJt5KKDa_5SbXZ6F3azhP" target="_blank" class="link">vod playlist</a> by
							<a href="https://www.youtube.com/@LiamUnofficialVODs-dz8it" target="_blank" class="link">Liam Unofficial VODs</a> (minus about 30 videos that have unpublished subtitles)
							and this <a href="https://www.youtube.com/playlist?list=PL4p5tSr0nlvikGvf0bhqFuQoFAH7Iw9Ay" target="_blank" class="link">top clips playlist</a> by
							<a href="https://www.youtube.com/@ACIDMONEY" target="_blank" class="link">ACIDMONEY</a>.
						</p>
					</div>
					<div>
						<p class="text-white italic">why do only the first few results have embeds?</p>
						<p>loading more than like 20 youtube embeds freezes your browser, so for now only the first 5 results will have a youtube embed, while the rest will just be a thumbnail.</p>
					</div>
				</div>
				<div class="flex flex-col gap-2">
					<h2>indexing process</h2>
					<ol class="ml-4.5 list-decimal">
						<li>
							video metadata is fetched from the <a href="https://www.youtube.com/playlist?list=PLeMf46ndvGffIJt5KKDa_5SbXZ6F3azhP" target="_blank" class="link">vod playlist</a> and the
							<a href="https://www.youtube.com/playlist?list=PL4p5tSr0nlvikGvf0bhqFuQoFAH7Iw9Ay" target="_blank" class="link">top clips playlist</a> with yt-dlp
						</li>
						<li>srt subtitles are downloaded from these videos with yt-dlp</li>
						<li>
							the srt files are merged together to form a large json file (~150 MB) containing the text, start time, and video id of each subtitle chunk (a chunk is the highlighted text
							when you search something)
						</li>
						<li>i then use <a href="https://github.com/meilisearch/meilisearch" target="_blank" class="link">Meilisearch</a> to index each subtitle chunk locally</li>
						<li>this process is repeated every day at 12:00 AM AEST</li>
					</ol>
				</div>
				<p>the name "Liam Search" and domain name "liamsear.ch" are directly inspired by <a href="https://yardsear.ch/" target="_blank" class="link">yardsear.ch</a>.</p>
			</div>
		</div>
	</div>
</dialog>
