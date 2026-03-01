<script lang="ts">
	import { Search } from "lucide-svelte";
</script>

<main class="mx-auto flex h-screen w-full flex-col gap-5 px-8 pt-10 md:px-16 2xl:px-42">
	<div class="mb-5 flex flex-col items-center">
		<a href="/" class="flex items-center justify-center gap-5">
			<img src="logo.png" alt="Liam logo" class="h-16" />
			<h1>Liam Search</h1>
		</a>
		<p class="text-gray-500">made by <a href="https://squidee.dev/" target="_blank" class="link">squidee_</a> from chat</p>
	</div>
	<div class="mx-auto flex w-full flex-col gap-2">
		<div class="light-outline flex grow overflow-clip rounded-full outline-1 has-[input:focus]:outline-blue-500!">
			<!-- svelte-ignore a11y_autofocus -->
			<input type="text" autofocus placeholder="search" class="bg-background! grow px-5 py-1 placeholder:text-gray-500" />
			<button class="btn rounded-none! px-4!"><Search class="w-5" /></button>
		</div>
		<div class="flex items-center justify-between">
			<span class="text-gray-500 italic">11 results in 1.21 ms</span>
			<div class="flex gap-2">
				<input type="date" class="btn" />
				<input type="date" class="btn" />
				<select class="btn">
					<option>sort by best</option>
					<option>sort by latest</option>
					<option>sort by oldest</option>
				</select>
				<select class="btn">
					<option>match all words</option>
					<option>match any word</option>
				</select>
			</div>
		</div>
	</div>

	<div class="bg-liam-background text-liam-skin w-full rounded p-3 text-center">
		<span>processing video (Liam VOD - Minecraft Speedrunning Day 20)...</span>
	</div>

	<div class="mx-auto grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
		{#each { length: 11 } as _}
			<div class="outline-liam-background flex w-fit flex-col gap-2 rounded p-2.5 outline-1 transition-[outline] duration-150 hover:outline-gray-700">
				<a href="https://www.youtube.com/watch?v=l657DY7N3Gc&t=100" target="_blank">
					<img src="https://i.ytimg.com/vi/l657DY7N3Gc/maxresdefault.jpg" alt="" class="aspect-video w-full rounded-sm" />
				</a>
				<p>
					<a href="https://www.youtube.com/watch?v=l657DY7N3Gc" target="_blank">Liam VOD - Minecraft Speedrunning Day 20</a>
					<span class="text-gray-500">at</span>
					<a href="https://www.youtube.com/watch?v=l657DY7N3Gc&t=100" target="_blank" class="text-blue-500 hover:text-blue-400">1:40</a>
				</p>
				<p class="text-[15px] text-gray-500 italic">
					"...consectetur adipisicing elit.
					<span class="font-medium text-white">Lorem ipsum dolor, sit amet consectetur adipisicing elit.</span>
					Lorem ipsum dolor..."
				</p>
			</div>
		{/each}
	</div>
	<footer class="mt-auto flex flex-col items-center gap-5 py-10 text-gray-500">
		<span>latest update: idk</span>
		<div class="flex gap-2">
			<button class="link">help / more info</button>
			<span>•</span>
			<a href="https://github.com/zaneshaw/liam-search" target="_blank" class="link">source code<sup>🡥</sup></a>
			<span>•</span>
			<a href="https://www.twitch.tv/liam" target="_blank" class="link">liam twitch<sup>🡥</sup></a>
		</div>
	</footer>
</main>
