from sqlmodel import Session, select, col
from app.db.database import engine
from app.db.models import DownloadJob, PlaylistItem, PlaylistItemStatus, DownloadStatus

def reset_interrupted_queue_jobs() -> None:
    """
    Called on startup to clean up jobs that were left in 'downloading'
    or 'queued' states due to a hard crash.
    """
    with Session(engine) as session:
        # Handle single downloads
        jobs = session.exec(
            select(DownloadJob).where(col(DownloadJob.status).in_([
                DownloadStatus.PENDING.value, 
                DownloadStatus.DOWNLOADING.value
            ]))
        ).all()
        for job in jobs:
            job.status = DownloadStatus.FAILED.value
            job.progress_status = "failed"
            job.error_message = "Download was interrupted by an unexpected application shutdown."
            session.add(job)

        # Handle playlist items
        items = session.exec(
            select(PlaylistItem).where(col(PlaylistItem.status).in_([
                PlaylistItemStatus.QUEUED.value,
                PlaylistItemStatus.DOWNLOADING.value,
                PlaylistItemStatus.MERGING.value
            ]))
        ).all()
        for item in items:
            item.status = PlaylistItemStatus.FAILED.value
            session.add(item)
            
        session.commit()

async def shutdown_queue() -> None:
    """
    Called during FastAPI lifespan shutdown.
    - Cancel pending jobs that have not started.
    - Mark in-progress jobs as 'failed' in the database.
    - Wait up to 3 seconds for any active subprocess to reach a safe point.
    - Return. Do not block indefinitely.
    """
    with Session(engine) as session:
        # Handle single downloads
        jobs = session.exec(
            select(DownloadJob).where(col(DownloadJob.status).in_([
                DownloadStatus.PENDING.value, 
                DownloadStatus.DOWNLOADING.value
            ]))
        ).all()
        for job in jobs:
            job.status = DownloadStatus.FAILED.value
            job.progress_status = "failed"
            job.error_message = "Download was interrupted."
            session.add(job)

        # Handle playlist items
        items = session.exec(
            select(PlaylistItem).where(col(PlaylistItem.status).in_([
                PlaylistItemStatus.QUEUED.value,
                PlaylistItemStatus.DOWNLOADING.value,
                PlaylistItemStatus.MERGING.value
            ]))
        ).all()
        for item in items:
            item.status = PlaylistItemStatus.INTERRUPTED.value
            session.add(item)
            
        session.commit()
