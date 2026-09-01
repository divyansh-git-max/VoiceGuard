import asyncio
import json
import os
import tempfile
import uuid
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status
from ai_ml.classifier.predict import predict
from ai_ml.dsp.dsp import extract_dsp_features
from backend.llm_judge.judge import judge

router = APIRouter(tags=["Analysis"])


async def analyze(temp_file_path: str, context: dict = None) -> dict:
    if context is None:
        context = {
            "transaction_type": "unknown",
            "caller_id_match": True,
        }

    # Parallelize CPU-heavy ML and DSP models simultaneously using threads
    auth_score, dsp_flags = await asyncio.gather(
        asyncio.to_thread(predict, temp_file_path),
        asyncio.to_thread(extract_dsp_features, temp_file_path),
    )

    # Evidence Packaging & LLM Judge
    evidence = {
        "authenticity_score": auth_score,
        "dsp_output": dsp_flags,
        "context": context,
    }

    try:
        verdict = await asyncio.to_thread(judge, evidence)
    except Exception as e:
        verdict = {
            "final_risk_score": int(auth_score * 100),
            "risk_level": "high" if auth_score >= 0.7 else "medium" if auth_score >= 0.4 else "low",
            "explanation": f"Evaluation error in LLM judge: {str(e)}",
        }

    chunk_id = f"vg-chunk-{uuid.uuid4().hex[:8]}"

    # Output shape matching shared/schema.json contract
    output = {
        "chunk_id": chunk_id,
        "model1_output": {
            "authenticity_score": round(float(auth_score), 4),
        },
        "dsp_output": dsp_flags,
        "context": context,
        "llm_judge_output": verdict,
    }

    return output


@router.post("/analyze")
async def analyze_audio(
    audio: Optional[UploadFile] = File(None),
    audio_file: Optional[UploadFile] = File(None),
    transaction_type: str = Form("unknown"),
    caller_id_match: bool = Form(True),
):
    upload = audio or audio_file
    if upload is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No audio file uploaded. Please provide an 'audio' or 'audio_file' form field."
        )

    temp_file_path = None

    try:
        filename = upload.filename or "sample.wav"
        suffix = Path(filename).suffix or ".wav"

        contents = await upload.read()
        if not contents or len(contents) < 100:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded audio file is empty or corrupted."
            )

        with tempfile.NamedTemporaryFile(
            suffix=suffix,
            delete=False,
        ) as temp_file:
            temp_file_path = temp_file.name
            temp_file.write(contents)

        context = {
            "transaction_type": transaction_type,
            "caller_id_match": bool(caller_id_match),
        }

        result = await analyze(
            temp_file_path,
            context,
        )

        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Forensic analysis failed: {str(e)}"
        )
    finally:
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                os.remove(temp_file_path)
            except OSError:
                pass
            
