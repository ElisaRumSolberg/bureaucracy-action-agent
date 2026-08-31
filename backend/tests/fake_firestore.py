"""A tiny in-memory stand-in for the google-cloud-firestore client, covering
only the operations the app actually uses (set/get/update/delete, a single
equality where() clause, and add()+order_by() for the events subcollection).
Lets integration tests exercise real route logic without real GCP credentials
or network calls.

All state lives in the FakeFirestoreClient instance (`_collections` for
top-level collections, `_subcollections` for one level of nesting, which is
all `documents/{id}/events` needs) — every Ref/Query below is just a thin
view over those two dicts, so writes made through one reference are visible
through any other reference to the same collection."""

from __future__ import annotations

import uuid


class FakeDocumentSnapshot:
    def __init__(self, doc_id: str, data: dict | None, reference: "FakeDocumentRef | None" = None):
        self.id = doc_id
        self._data = data
        # Mirrors real google.cloud.firestore.DocumentSnapshot.reference —
        # production code (delete_document, save_tasks) calls
        # `snap.reference.delete()` on results from a query .stream(), so the
        # fake must support it too, not just direct .document(id).get().
        self.reference = reference

    @property
    def exists(self) -> bool:
        return self._data is not None

    def to_dict(self) -> dict | None:
        return dict(self._data) if self._data is not None else None


class FakeDocumentRef:
    def __init__(self, client: "FakeFirestoreClient", collection_name: str, doc_id: str):
        self._client = client
        self._collection_name = collection_name
        self.id = doc_id

    def _store(self) -> dict:
        return self._client._collections.setdefault(self._collection_name, {})

    def set(self, data: dict) -> None:
        self._store()[self.id] = dict(data)

    def update(self, data: dict) -> None:
        self._store().setdefault(self.id, {}).update(data)

    def get(self) -> FakeDocumentSnapshot:
        return FakeDocumentSnapshot(self.id, self._store().get(self.id), reference=self)

    def delete(self) -> None:
        self._store().pop(self.id, None)

    def collection(self, name: str) -> "FakeCollectionRef":
        return FakeCollectionRef(
            self._client, name, parent=(self._collection_name, self.id)
        )


class FakeQuery:
    def __init__(
        self,
        client: "FakeFirestoreClient",
        name: str,
        parent: tuple[str, str] | None = None,
        predicate=lambda _id, _data: True,
        order_by: str | None = None,
    ):
        self._client = client
        self._name = name
        self._parent = parent
        self._predicate = predicate
        self._order_by = order_by

    def _store(self) -> dict:
        key = (self._parent, self._name) if self._parent else self._name
        table = self._client._subcollections if self._parent else self._client._collections
        return table.setdefault(key, {})

    def where(self, field: str, op: str, value) -> "FakeQuery":
        assert op == "==", f"FakeFirestore only supports '==', got {op!r}"
        prev = self._predicate
        return FakeQuery(
            self._client,
            self._name,
            self._parent,
            lambda doc_id, data: prev(doc_id, data) and data.get(field) == value,
            self._order_by,
        )

    def order_by(self, field: str) -> "FakeQuery":
        return FakeQuery(self._client, self._name, self._parent, self._predicate, field)

    def _ref_for(self, doc_id: str) -> "FakeDocumentRef":
        if self._parent:
            return _FakeSubDocumentRef(self._client, self._name, self._parent, doc_id)
        return FakeDocumentRef(self._client, self._name, doc_id)

    def stream(self):
        items = [
            FakeDocumentSnapshot(doc_id, data, reference=self._ref_for(doc_id))
            for doc_id, data in self._store().items()
            if self._predicate(doc_id, data)
        ]
        if self._order_by:
            items.sort(key=lambda snap: snap.to_dict().get(self._order_by))
        return items


class FakeCollectionRef(FakeQuery):
    def document(self, doc_id: str | None = None) -> FakeDocumentRef:
        if self._parent:
            return _FakeSubDocumentRef(self._client, self._name, self._parent, doc_id or self._auto_id())
        if doc_id is None:
            doc_id = self._auto_id()
        return FakeDocumentRef(self._client, self._name, doc_id)

    @staticmethod
    def _auto_id() -> str:
        return f"auto_{uuid.uuid4().hex}"

    def add(self, data: dict) -> tuple[None, FakeDocumentRef]:
        ref = self.document()
        ref.set(data)
        return None, ref


class _FakeSubDocumentRef(FakeDocumentRef):
    """A document inside a one-level-deep subcollection (documents/{id}/events)."""

    def __init__(self, client: "FakeFirestoreClient", collection_name: str, parent: tuple, doc_id: str):
        super().__init__(client, collection_name, doc_id)
        self._parent = parent

    def _store(self) -> dict:
        key = (self._parent, self._collection_name)
        return self._client._subcollections.setdefault(key, {})


class FakeWriteBatch:
    """Mirrors google.cloud.firestore.WriteBatch: queues set/update/delete
    calls and only applies them on .commit(), so a test can monkeypatch
    commit() to fail and assert nothing was written — the same atomicity
    guarantee a real Firestore batch gives production code."""

    def __init__(self):
        self._ops: list[tuple[str, object, dict | None]] = []

    def set(self, ref, data: dict) -> None:
        self._ops.append(("set", ref, data))

    def update(self, ref, data: dict) -> None:
        self._ops.append(("update", ref, data))

    def delete(self, ref) -> None:
        self._ops.append(("delete", ref, None))

    def commit(self) -> None:
        for kind, ref, data in self._ops:
            if kind == "set":
                ref.set(data)
            elif kind == "update":
                ref.update(data)
            else:
                ref.delete()
        self._ops = []


class FakeFirestoreClient:
    def __init__(self):
        self._collections: dict[str, dict] = {}
        self._subcollections: dict[tuple, dict] = {}

    def collection(self, name: str) -> FakeCollectionRef:
        return FakeCollectionRef(self, name)

    def batch(self) -> FakeWriteBatch:
        return FakeWriteBatch()
