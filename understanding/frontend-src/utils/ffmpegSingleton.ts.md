# File: frontend/src/utils/ffmpegSingleton.ts

- [ ] Read and understand this file

What it is:
- Singleton wrapper around ffmpeg.

What it does (easy words):
- Keeps one ffmpeg instance in memory.
- Can force a fresh instance if needed.

Practical example:
- Multiple AVI files reuse the same ffmpeg instance instead of reloading.
