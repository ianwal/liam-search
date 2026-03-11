# Liam Search

Search words/phrases from every Liam VOD after July 2023. Inspired by [yardsear.ch](https://yardsear.ch/).

Currently using these playlists:

- https://www.youtube.com/playlist?list=PL-dR2WR6nR_YPhchO2f48lssHKENSMAYy
- https://www.youtube.com/playlist?list=PL-dR2WR6nR_ZYPbJhACQKEiyb43DXunBy
- https://www.youtube.com/playlist?list=PL4p5tSr0nlvikGvf0bhqFuQoFAH7Iw9Ay

## Official URLs

- Frontend: https://liamsear.ch/
- Backend: https://api.liamsear.ch/

## Development

### Prerequisites

- [Bun](https://bun.com/docs/installation)
- [uv](https://docs.astral.sh/uv/getting-started/installation)
- [ffmpeg shared](https://www.ffmpeg.org/download.html) (I'm using ffmpeg 8)
- [CUDA Toolkit 12.8.1](https://developer.nvidia.com/cuda-12-8-1-download-archive)
- [Meilisearch](https://www.meilisearch.com/docs/learn/self_hosted/getting_started_with_self_hosted_meilisearch)
- An NVIDIA RTX GPU with at least 6 GB VRAM (i think)

> [!CAUTION]
> If you have problems with downloading videos, use [yt-dlp 2026.03.03](https://github.com/yt-dlp/yt-dlp/releases/tag/2026.03.03) and set the binary path in `backend/config.toml`

### Backend

1. Navigate to the **backend** directory
2. Install dependencies with `bun i`
3. Copy **.env.example** to **.env** and configure your Meilisearch details
4. Download your YouTube cookies while signed-in with **Get cookies.txt LOCALLY** ([chrome](https://chromewebstore.google.com/detail/get-cookiestxt-locally/cclelndahbckbenkjhflpdbgdldlbecc), [firefox](https://addons.mozilla.org/en-US/firefox/addon/get-cookies-txt-locally/)) and put them in the backend directory as **cookies.txt** (`liam-search/backend/cookies.txt`)
5. Modify config in **config.toml** if needed
6. Navigate to the **backend/src/transcriber** directory
7. Install dependencies with `uv sync`
8. Navigate back to the **backend** directory and run with `bun dev`

> [!TIP]
> Modify the **playlists** array in **backend/config.toml** for testing.

### Frontend

1. Navigate to the **frontend** directory
2. Install dependencies with `bun i`
3. Copy **.env.example** to **.env**
4. Run with `bun dev`

## Roadmap

- [ ] **Rework the job system**: jobs api endpoint, batch jobs, complete rewrite
- [ ] **Twitch clips**: index all Liam Twitch clips before the oldest VOD in the current index
- [ ] **Better transcription**: i hate whisperX and python >:(
- [ ] **Config file**: allow for more configuration without modifying the code
    - [ ] **GPU/CPU switch**: switch between GPU mode and CPU compat mode
- [ ] **Better error handling**
