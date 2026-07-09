import os
import datetime
from pathlib import Path
from typing import Optional
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from app.services.notes_service import NotesService
from app.routers.websocket import manager
from app.config import settings

# Global in-memory queue to hold due quiz concepts
# Formatted as: { slug: { "title": title, "path": str(path), "due_at": str } }
due_quiz_queue = {}

scheduler = AsyncIOScheduler()

def parse_date(date_val) -> Optional[datetime.date]:
    if not date_val:
        return None
    if isinstance(date_val, datetime.date):
        return date_val
    if isinstance(date_val, datetime.datetime):
        return date_val.date()
    if isinstance(date_val, str):
        try:
            return datetime.datetime.strptime(date_val.strip(), "%Y-%m-%d").date()
        except Exception:
            pass
    return None

async def scan_for_due_quizzes():
    """
    Scans the notes directory for notes that are due for active recall review.
    Populates the due_quiz_queue and broadcasts notifications via WebSocket.
    """
    notes_dir = Path(getattr(settings, "DEFAULT_NOTES_DIR", os.path.join(os.getcwd(), "notes")))
    if not notes_dir.exists():
        return

    today = datetime.date.today()
    newly_due = []

    for file_path in notes_dir.rglob("*.md"):
        try:
            frontmatter, content, is_empty = NotesService.parse_markdown_file(file_path)
            status = frontmatter.get("status")
            
            # The active recall scheduler checks notes that are drafted, reviewed, or mastered
            if status not in ["draft", "reviewed", "mastered"]:
                continue
                
            slug = frontmatter.get("slug", file_path.stem).lower().strip()
            title = frontmatter.get("title", file_path.stem)
            
            # Parse or compute next review date
            next_review_date = parse_date(frontmatter.get("next_review"))
            last_reviewed_date = parse_date(frontmatter.get("last_reviewed"))
            review_interval_days = frontmatter.get("review_interval_days")
            
            is_due = False
            
            if next_review_date:
                if next_review_date <= today:
                    is_due = True
            elif last_reviewed_date and review_interval_days is not None:
                due_date = last_reviewed_date + datetime.timedelta(days=int(review_interval_days))
                if due_date <= today:
                    is_due = True
            else:
                # If scheduling metadata is missing, default to due today to kickstart review
                is_due = True
                
            if is_due:
                if slug not in due_quiz_queue:
                    due_data = {
                        "title": title,
                        "path": str(file_path),
                        "due_at": today.isoformat()
                    }
                    due_quiz_queue[slug] = due_data
                    newly_due.append({"slug": slug, "title": title})
        except Exception:
            pass

    # Broadcast WebSocket notifications for newly due quizzes
    for item in newly_due:
        await manager.broadcast({
            "type": "quiz_due",
            "slug": item["slug"],
            "title": item["title"],
            "message": f"Quiz for '{item['title']}' is due!"
        })

def start_scheduler():
    """
    Starts the Active Recall background scheduling engine.
    """
    interval_secs = getattr(settings, "SCHEDULER_INTERVAL_SECS", 60)
    scheduler.add_job(
        scan_for_due_quizzes,
        "interval",
        seconds=interval_secs,
        id="active_recall_scan",
        replace_existing=True
    )
    scheduler.start()

def shutdown_scheduler():
    """
    Stops the background scheduling engine.
    """
    scheduler.shutdown()
