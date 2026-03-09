<script lang="ts">
	import type { SearchResult } from "@/types";

	let { result }: { result: SearchResult } = $props();

	let showEmbed: boolean = $state(false);

	const videoUrl = $derived(`https://www.youtube.com/watch?v=${result.video.id}`);

	function secondsToTimestamp(seconds: number) {
		const hours = Math.floor(seconds / 60 / 60);
		const minutes = Math.floor(seconds / 60) % 60;

		return (hours ? `${hours}:` : "") + `${minutes}:${(seconds % 60).toString().padStart(2, "0")}`;
	}
</script>

<div class="outline-liam-background flex w-full flex-col gap-2 rounded p-2.5 wrap-break-word outline-1 transition-[outline] duration-150 hover:outline-gray-700">
	<div class="relative flex items-center justify-center overflow-hidden rounded-sm">
		{#if showEmbed}
			<iframe
				src="https://www.youtube.com/embed/{result.video.id}?start={result.seconds}&autoplay=1&rel=0"
				title={result.video.title}
				frameborder="0"
				allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
				referrerpolicy="strict-origin-when-cross-origin"
				allowfullscreen
				class="absolute top-0 left-0 z-10 size-full"
			></iframe>
		{/if}
		<button class:invisible={showEmbed} onclick={() => (showEmbed = true)} class="relative w-full cursor-pointer">
			<img src={result.video.thumbnailUrl} alt="" class="aspect-video w-full" />
			<svg viewBox="0 0 68 48" class="absolute top-1/2 left-1/2 size-1/4 -translate-1/2 fill-[#ff0033]">
				<path
					d="M66.52,7.74c-0.78-2.93-2.49-5.41-5.42-6.19C55.79,.13,34,0,34,0S12.21,.13,6.9,1.55 C3.97,2.33,2.27,4.81,1.48,7.74C0.06,13.05,0,24,0,24s0.06,10.95,1.48,16.26c0.78,2.93,2.49,5.41,5.42,6.19 C12.21,47.87,34,48,34,48s21.79-0.13,27.1-1.55c2.93-0.78,4.64-3.26,5.42-6.19C67.94,34.95,68,24,68,24S67.94,13.05,66.52,7.74z"
				></path>
				<path d="M 45,24 27,14 27,34" fill="#fff"></path>
			</svg>
		</button>
	</div>
	<p>
		<a href={videoUrl} target="_blank">{result.video.title}</a>
		<span class="text-gray-500">at</span>
		<a href={`${videoUrl}&t=${result.seconds}`} target="_blank" class="text-blue-500 hover:text-blue-400">{secondsToTimestamp(result.seconds)}</a>
	</p>
	<p class="text-[15px] text-gray-500">
		"{#if result.previousText}...{result.previousText}{/if}
		<span class="font-medium text-white">{result.text}</span>
		{#if result.nextText}{result.nextText}..{/if}"
	</p>
</div>
