import asyncio
import json
from ai_ml.classifier.predict import predict
from ai_ml.dsp.dsp import extract_dsp_features
from backend.llm_judge.judge import judge # not implemented as of now

# Audio files for testing
# AUDIO_PATH = r"E:\archive\LA\LA\ASVspoof2019_LA_eval\flac\LA_E_1001964.flac"
# AUDIO_PATH = r"E:\Mozilla Common Speech Hindi\cv-corpus-26.0-2026-06-12\hi\clips\common_voice_hi_23795252.mp3"


async def analyze(temp_file_path: str, context: dict = None) -> dict:
    if context is None:
        context = {
            "transaction_type": "unknown",
            "caller_id_match": True,
        }

    # Task 2: Parallelize CPU-heavy ML and DSP models simultaneously using threads
    auth_score, dsp_flags = await asyncio.gather(
        asyncio.to_thread(predict, temp_file_path),
        asyncio.to_thread(extract_dsp_features, temp_file_path),
    )

    # Task 3: Evidence Packaging & LLM Judge
    evidence = {
        "authenticity_score": auth_score,
        "dsp_output": dsp_flags,
        "context": context,
    }

    try:
        verdict = await asyncio.to_thread(judge, evidence)
    except Exception as e:
        verdict = {"status": "placeholder", "error": str(e)}

    # Output shape matching shared/schema_prototype.json
    output = {
        "model1_output": {
            "authenticity_score": auth_score,
        },
        "dsp_output": dsp_flags,
    }

    return output


async def main():
    result = await analyze(AUDIO_PATH)
    print("Final Analysis Output (schema_prototype.json format):")
    print(json.dumps(result, indent=4))


if __name__ == "__main__":
    asyncio.run(main())
