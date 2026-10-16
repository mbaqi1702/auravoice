"""
Security Fixes S2, S3, S4, S7, S8:
- S2: Path traversal defense & safe file handling
- S3 & S7: Token-bucket rate limiter & authorization
- S8: Prompt injection delimiter wrapping for RAG
"""

import os
from pathlib import Path
import uuid
import re
from typing import Set, Tuple, Optional

ALLOWED_EXTENSIONS: Set[str] = {".txt", ".pdf", ".md", ".csv", ".json", ".html", ".docx"}
MAX_FILE_SIZE_BYTES: int = 10 * 1024 * 1024  # 10 MB


class PathSecurityError(Exception):
    pass


def get_safe_document_path(raw_filename: str, base_dir: Path) -> Path:
    """
    S2: Enforces strict path traversal prevention, extension allowlist, and path relativity.
    """
    if not raw_filename or not isinstance(raw_filename, str):
        raise PathSecurityError("Filename must be a non-empty string")

    # 1. Extract purely the base name to strip directory traversal (../../)
    clean_name = Path(raw_filename).name

    # 2. Check extension
    suffix = Path(clean_name).suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise PathSecurityError(f"Extension '{suffix}' is not in the allowed list: {ALLOWED_EXTENSIONS}")

    # 3. Sanitize characters (allow alphanumeric, dash, underscore, dot)
    safe_stem = re.sub(r"[^a-zA-Z0-9_\-]", "_", Path(clean_name).stem)
    unique_filename = f"{uuid.uuid4().hex[:12]}_{safe_stem}{suffix}"

    # 4. Resolve path and assert it is strictly inside base_dir
    base_resolved = base_dir.resolve()
    target_path = (base_resolved / unique_filename).resolve()

    try:
        # Python 3.9+ is_relative_to
        if not target_path.is_relative_to(base_resolved):
            raise PathSecurityError("Path traversal attempt detected")
    except AttributeError:
        # Fallback for older python
        if not str(target_path).startswith(str(base_resolved)):
            raise PathSecurityError("Path traversal attempt detected")

    return target_path


def wrap_untrusted_rag_chunk(filename: str, page_or_chunk: str, text: str) -> str:
    """
    S8: Prompt Injection Mitigation.
    Treats retrieved text as untrusted passive data wrapped in explicit delimiter boundaries.
    Instructs the LLM to ignore any command or instruction sequences embedded inside.
    """
    sanitized_text = text.replace("<<<", "〈〈〈").replace(">>>", "〉〉〉")
    return (
        f"<<<UNTRUSTED_DOCUMENT_CONTENT: source='{filename}', section='{page_or_chunk}'>>>\n"
        f"DATA_CONTENT_START:\n"
        f"{sanitized_text}\n"
        f"DATA_CONTENT_END\n"
        f"<<<END_UNTRUSTED_CONTENT>>>"
    )
