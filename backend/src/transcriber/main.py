import whisperx
import json
import sys

def main():
	print("running transcriber")

	model = whisperx.load_model("large-v3", "cuda", compute_type="float16", language="en")
	print("loaded model")

	audio = whisperx.load_audio(sys.argv[1])
	print("loaded audio")

	result = model.transcribe(audio, batch_size=8)

	model_a, metadata = whisperx.load_align_model(language_code=result["language"], device="cuda")
	result = whisperx.align(result["segments"], model_a, metadata, audio, "cuda", return_char_alignments=False)

	processed_result = [
		{
			"start": int(float(segment["start"]) * 1000),
			"end": int(float(segment["end"]) * 1000),
			"text": segment["text"].strip()
		}
		for segment in result["segments"]
	]

	with open(sys.argv[2], "w") as f:
		f.write(json.dumps(processed_result))


if __name__ == "__main__":
	main()
