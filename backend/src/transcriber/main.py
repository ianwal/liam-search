import json
import argparse
from pathlib import Path

import whisperx


def transcribe_audio(audio_file: Path) -> str:
	print("[transcriber]: running transcriber...")

	print("[transcriber]: loading transcriber model...")
	model = whisperx.load_model(
		"large-v3",
		"cuda",
		compute_type="float16",
		language="en",
		asr_options={
			"log_prob_threshold": -0.5,
			"no_speech_threshold": 0.8,
		},
		vad_options={
			"vad_onset": 0.7,
			"vad_offset": 0.5,
		},
	)
	print("[transcriber]: loaded transcriber model.")

	print("[transcriber]: loading transcriber model...")
	audio = whisperx.load_audio(audio_file)
	print("[transcriber]: loaded audio.")

	print("[transcriber]: transcribing...")
	result = model.transcribe(audio, batch_size=8, chunk_size=8)
	print("[transcriber]: finished transcribing.")

	model_a, metadata = whisperx.load_align_model(
		language_code=result["language"], device="cuda"
	)
	result = whisperx.align(
		result["segments"],
		model_a,
		metadata,
		audio,
		"cuda",
		return_char_alignments=False,
	)

	processed_result = [
		{
			"start": int(float(segment["start"]) * 1000),
			"end": int(float(segment["end"]) * 1000),
			"text": segment["text"].strip(),
		}
		for segment in result["segments"]
	]
	return json.dumps(processed_result)


def save_transcribed_audio(transcribed_audio: str, output_file: Path):
	with open(output_file, "w") as f:
		f.write(transcribed_audio)


def main():
	parser = argparse.ArgumentParser(description="Transcribe an audio file to JSON.")

	parser.add_argument(
		"-i",
		"--input",
		help="Input audio file path.",
		required=True,
		type=lambda x: (
			Path(x) if Path(x).is_file() else parser.error(f"Input file not found: {x}")
		),
	)

	parser.add_argument(
		"-o",
		"--output",
		help="Output JSON file path.",
		required=True,
		type=Path,
	)

	args = parser.parse_args()

	save_transcribed_audio(transcribe_audio(args.input), args.output)


if __name__ == "__main__":
	main()
