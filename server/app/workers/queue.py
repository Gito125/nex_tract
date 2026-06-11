from sqlmodel import Session, select
from app.db.database import engine
from app.db.models import DownloadJob, PlaylistItem, PlaylistItemStatus

async def shutdown_queue():
    """
    Called during FastAPI lifespan shutdown.
    - Cancel pending jobs that have not started.
    - Mark in-progress jobs as 'interrupted' in the database.
    - Wait up to 3 seconds for any active subprocess to reach a safe point.
    - Return. Do not block indefinitely.
    """
    with Session(engine) as session:
        # Handle single downloads
        jobs = session.exec(
            select(DownloadJob).where(DownloadJob.status.in_(["queued", "downloading", "merging"]))
        ).all()
        for job in jobs:
            job.status = "interrupted"
            session.add(job)

        # Handle playlist items
        items = session.exec(
            select(PlaylistItem).where(PlaylistItem.status.in_([
                PlaylistItemStatus.QUEUED.value,
                PlaylistItemStatus.DOWNLOADING.value,
                PlaylistItemStatus.MERGING.value
            ]))
        ).all()
        for item in items:
            item.status = PlaylistItemStatus.INTERRUPTED.value
            session.add(item)
            
        session.commit()
