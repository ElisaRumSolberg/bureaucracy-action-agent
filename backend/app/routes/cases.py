"""Cases group several documents under one umbrella (e.g. "Visa application")
so their tasks show up in one unified list with one shared Next Best Action,
instead of each document being an island. Deliberately the simple version:
no cross-document dependency inference — each document's task graph stays
independent, and the case-level "next best action" is just the best
candidate across each document's own (unchanged) recommendation logic."""

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.agent.next_best_action import _PRIORITY_RANK, blocking_count, get_next_best_action_index
from app.auth import resolve_owner_id
from app.firestore_client import get_firestore_client
from app.models.schemas import ValidatedTask
from app.routes.documents import _ordered_tasks_for_document

router = APIRouter(prefix="/cases", tags=["cases"])


class CaseCreate(BaseModel):
    name: str


def _owned_documents_for_case(db, case_id: str, owner_id: str | None) -> list[dict]:
    doc_snaps = db.collection("documents").where("case_id", "==", case_id).stream()
    documents = []
    for snap in doc_snaps:
        data = snap.to_dict()
        if data.get("owner_id") and data.get("owner_id") != owner_id:
            continue
        documents.append({"document_id": snap.id, **data})
    documents.sort(key=lambda d: d.get("uploaded_at") or "")
    return documents


def _case_next_best_action(candidates: list[tuple[str, str, list[dict]]]) -> dict | None:
    """candidates: (document_id, filename, ordered_tasks) per document. Picks
    the single best task across all of them using the same ranking
    get_next_best_action_index uses internally, so a case's recommendation
    never disagrees with what each document would recommend on its own."""
    ranked = []
    for document_id, filename, tasks in candidates:
        index = get_next_best_action_index(tasks)
        if index is None:
            continue
        task = tasks[index]
        priority_rank = _PRIORITY_RANK.get(task.get("priority"), 1)
        blocks = -blocking_count(tasks, index)
        deadline = task.get("deadline") or "9999-99-99"
        ranked.append((priority_rank, blocks, deadline, document_id, filename, task))

    if not ranked:
        return None
    ranked.sort(key=lambda r: r[:3])
    _, _, _, document_id, filename, task = ranked[0]
    return {"document_id": document_id, "filename": filename, "task": task}


@router.post("")
def create_case(body: CaseCreate, owner_id: str | None = Depends(resolve_owner_id)):
    if not body.name.strip():
        raise HTTPException(status_code=400, detail="name must not be empty.")

    db = get_firestore_client()
    case_id = f"case_{uuid.uuid4().hex[:8]}"
    db.collection("cases").document(case_id).set(
        {
            "name": body.name.strip(),
            "owner_id": owner_id,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
    )
    return {"case_id": case_id, "name": body.name.strip()}


@router.get("")
def list_cases(owner_id: str | None = Depends(resolve_owner_id)):
    if not owner_id:
        return {"cases": []}

    db = get_firestore_client()
    case_snaps = db.collection("cases").where("owner_id", "==", owner_id).stream()
    cases = []
    for snap in case_snaps:
        data = snap.to_dict()
        document_count = sum(
            1 for _ in db.collection("documents").where("case_id", "==", snap.id).stream()
        )
        cases.append(
            {
                "case_id": snap.id,
                "name": data.get("name", ""),
                "created_at": data.get("created_at"),
                "document_count": document_count,
            }
        )
    cases.sort(key=lambda c: c.get("created_at") or "", reverse=True)
    return {"cases": cases}


@router.get("/{case_id}")
def get_case(case_id: str, owner_id: str | None = Depends(resolve_owner_id)):
    db = get_firestore_client()
    case_snap = db.collection("cases").document(case_id).get()
    if not case_snap.exists or case_snap.to_dict().get("owner_id") != owner_id:
        raise HTTPException(status_code=404, detail="Case not found.")
    case_data = case_snap.to_dict()

    owned_documents = _owned_documents_for_case(db, case_id, owner_id)

    documents_out = []
    candidates = []
    for doc in owned_documents:
        document_id = doc["document_id"]
        ordered_tasks = _ordered_tasks_for_document(db, document_id)
        tasks_with_ids = [
            {"id": f"task_{document_id}_{i}", **ValidatedTask(**task).model_dump()}
            for i, task in enumerate(ordered_tasks)
        ]
        documents_out.append(
            {
                "document_id": document_id,
                "filename": doc.get("filename", ""),
                "summary": doc.get("summary", ""),
                "tasks": tasks_with_ids,
            }
        )
        candidates.append((document_id, doc.get("filename", ""), tasks_with_ids))

    return {
        "case_id": case_id,
        "name": case_data.get("name", ""),
        "documents": documents_out,
        "next_best_action": _case_next_best_action(candidates),
    }


@router.delete("/{case_id}")
def delete_case(case_id: str, owner_id: str | None = Depends(resolve_owner_id)):
    db = get_firestore_client()
    case_ref = db.collection("cases").document(case_id)
    case_snap = case_ref.get()
    if not case_snap.exists or case_snap.to_dict().get("owner_id") != owner_id:
        raise HTTPException(status_code=404, detail="Case not found.")

    # Unlink rather than delete the documents themselves — a case is just a
    # grouping, removing it shouldn't take anyone's uploaded documents with it.
    doc_snaps = db.collection("documents").where("case_id", "==", case_id).stream()
    for snap in doc_snaps:
        snap.reference.update({"case_id": None})

    case_ref.delete()
    return {"case_id": case_id, "deleted": True}
