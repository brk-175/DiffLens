import logging
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.reviews import Review, ReviewFile, ReviewIssue, ReviewIssueDetails
from app.services.storage import StorageService
from app.services.ai import review_diff
from app.schemas.ai import DiffLensReviewOutput
from app.schemas.reviews import ReviewStatus
from typing import Any
from app.services.review_events import publish_review_event


logger = logging.getLogger(__name__)

def _download_input_diff(storage: StorageService, object_path: str) -> str:
    """
    Supports either:
    - storage.download_text(path) -> str
    - storage.get_object(path) -> bytes
    """

    diff_text = storage.download_text(object_path)
    if diff_text is None:
        raise ValueError(f"Failed to download input blob: {object_path}")
    return diff_text


def _extract_selected_modes(mode_flags: dict[str, Any] | None) -> list[str]:
    if not mode_flags:
        return ["generic"]
    return [k for k, v in mode_flags.items() if v]


def _upload_json_blob(storage: StorageService, object_path: str, payload: dict) -> tuple[str, int, str]:
    """
    Supports either:
    - storage.upload_json(path, payload) -> (path, size, hash)
    - storage.put_object(path, bytes, content_type)
    """

    return storage.upload_json(object_path, payload)


def _upload_text_blob(storage: StorageService, object_path: str, text: str) -> str:
    """
    Supports either:
    - storage.upload_text(path, text) -> (path, size, hash)
    - storage.put_object(path, bytes, content_type)
    Returns only the blob path (that's what issue tables store).
    """

    if not text:
        raise ValueError(f"Text content is empty, cannot upload empty blob: {object_path}")

    return storage.upload_text(object_path, text)


def process_review(review_id: int) -> None:
    db: Session = SessionLocal()
    storage = StorageService()

    try:
        logger.info(f"worker started review_id={review_id}")
        
        review = db.get(Review, review_id)
        if not review:
            logger.error(f"Review not found with ID: {review_id}")
            return ValueError(f"Review not found with ID: {review_id}")
        logger.info(f"worker loaded review review_id={review_id} status={review.status}")

        publish_review_event(review_id, {"type": "status", "status": ReviewStatus.processing.value})
        review.status = ReviewStatus.processing.value
        review.error_message = None
        db.commit()

        if not review.input_blob_path:
            raise ValueError(f"input_blob_path is missing on review with ID: {review_id}")

        # 1) Read input diff from MinIO
        diff_text = _download_input_diff(storage, review.input_blob_path)
        selected_modes = _extract_selected_modes(review.mode_flags)

        # 2) Call AI Service to review the diff and generate output
        logger.info(f"ai review started review_id={review_id}")
        ai_raw = review_diff(diff_text=diff_text, selected_modes=selected_modes)

        # 3) Validate strict schema
        validated = DiffLensReviewOutput.model_validate(ai_raw)
        if not validated:
            raise ValueError(f"AI output validation failed for review with ID: {review_id}")
        logger.info(f"ai review validated review_id={review_id} files={len(validated.files)}")

        # 4) Store full output JSON in MinIO
        output_path = f"reviews/{review.id}/output/result.json"
        out_path, out_size, out_hash = _upload_json_blob(storage, output_path, validated.model_dump())

        review.output_blob_path = out_path
        review.output_blob_size = out_size
        review.output_blob_hash = out_hash
        logger.info(f"output uploaded review_id={review_id} output_path={out_path} size={out_size}")

        # Store result file in review_files table
        ReviewFile (
            review_id=review.id,
            file_path=output_path,
            source_type="result",
        )

        # 5) Store lightweight summary in DB
        review.overall_verdict = validated.summary.overall_verdict
        review.risk_level = validated.summary.risk_level
        review.short_summary = validated.summary.short_summary
        review.final_summary_key_takeaways = validated.final_summary.key_takeaways
        review.final_summary_recommended_next_steps = validated.final_summary.recommended_next_steps
        review.file_count = len(validated.files)
        review.issue_count = sum(len(f.issues) for f in validated.files)

        sev_counts: dict[str, int] = {"critical": 0, "high": 0, "medium": 0, "low": 0}
        for f in validated.files:
            for issue in f.issues:
                sev_counts[issue.severity] = sev_counts.get(issue.severity, 0) + 1
        review.severity_counts = sev_counts

        # 6) Clear previous analysis rows (if re-run)
        # Keep upload/paste rows intact; remove only source_type="analyzed"
        analysis_files = (
            db.query(ReviewFile)
            .filter(ReviewFile.review_id == review.id, ReviewFile.source_type == "analyzed")
            .all()
        )
        for rf in analysis_files:
            db.delete(rf)
        db.flush()

        # 7) Persist normalized analysis output
        for file_obj in validated.files:
            review_file = ReviewFile(
                review_id=review.id,
                file_path=file_obj.file_path,
                file_summary=file_obj.file_summary,
                source_type="analyzed",
            )
            db.add(review_file)
            db.flush()  # get review_file.id

            for issue_obj in file_obj.issues:
                review_issue = ReviewIssue(
                    review_file_id=review_file.id,
                    severity=issue_obj.severity,
                    mode_tags=issue_obj.mode_tags,
                    line_start=issue_obj.line_start,
                    line_end=issue_obj.line_end,
                    comment=issue_obj.comment,
                )
                db.add(review_issue)
                db.flush()  # get review_issue.id

                # Offload suggested_fix
                suggested_fix_blob_path = None
                if issue_obj.suggested_fix:
                    sf_path = f"reviews/{review.id}/analyzed_review_files/{review_file.id}/issues/{review_issue.id}/suggested_fix.txt"
                    suggested_fix_blob_path, sf_blob_size, sf_blob_hash = _upload_text_blob(storage, sf_path, issue_obj.suggested_fix)
                review_issue.suggested_fix_blob_path = suggested_fix_blob_path

                # Offload code_example
                code_example_blob_path = None
                if issue_obj.why_this_matters.code_example:
                    ce_path = f"reviews/{review.id}/analyzed_review_files/{review_file.id}/issues/{review_issue.id}/code_example.txt"
                    code_example_blob_path, ce_blob_size, ce_blob_hash = _upload_text_blob(
                        storage, ce_path, issue_obj.why_this_matters.code_example
                    )

                details = ReviewIssueDetails(
                    review_issue_id=review_issue.id,
                    what_is_wrong=issue_obj.why_this_matters.what_is_wrong,
                    why_it_matters=issue_obj.why_this_matters.why_it_matters,
                    how_to_fix=issue_obj.why_this_matters.how_to_fix,
                    code_example_blob_path=code_example_blob_path,
                )
                db.add(details)

        publish_review_event(review_id, {"type": "status", "status": ReviewStatus.complete.value})
        review.status = ReviewStatus.complete.value
        logger.info(f"worker persisting complete review_id={review_id}")
        db.commit()
        logger.info(f"worker success review_id={review_id} status=complete")
    
    except Exception as ex:
        db.rollback()
        review = db.get(Review, review_id)
        if review:
            publish_review_event(review_id, {"type": "status", "status": ReviewStatus.failed.value, "error": str(ex)})
            review.status = ReviewStatus.failed.value
            review.error_message = str(ex)[:5000]
            logger.exception(f"worker failed review_id={review_id} error={ex}")
            db.commit()

    finally:
        db.close()
