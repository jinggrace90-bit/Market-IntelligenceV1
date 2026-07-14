"""Collision-resistant, URL-safe IDs shaped like Prisma's ``cuid()``.

The frontend treats these ids as opaque strings (used in URLs and as pagination
cursors), so we only need the same *shape*: a 25-char lowercase base36 string
prefixed with ``c``. This is a self-contained cuid v1-style generator.
"""

from __future__ import annotations

import os
import secrets
import time

_BASE36 = "0123456789abcdefghijklmnopqrstuvwxyz"
_BLOCK = 4
_counter = secrets.randbelow(36**_BLOCK)
# Per-process fingerprint (stable across ids from this process).
_FINGERPRINT = (os.getpid() % (36**2)) * (36**2) + secrets.randbelow(36**2)


def _to_base36(number: int, pad: int) -> str:
    if number == 0:
        out = "0"
    else:
        digits = []
        while number:
            number, rem = divmod(number, 36)
            digits.append(_BASE36[rem])
        out = "".join(reversed(digits))
    return out[-pad:].rjust(pad, "0")


def cuid() -> str:
    global _counter
    _counter = (_counter + 1) % (36**_BLOCK)
    timestamp = _to_base36(int(time.time() * 1000), 8)
    counter = _to_base36(_counter, _BLOCK)
    fingerprint = _to_base36(_FINGERPRINT, _BLOCK)
    random_block = _to_base36(secrets.randbelow(36 ** (_BLOCK * 2)), _BLOCK * 2)
    return f"c{timestamp}{counter}{fingerprint}{random_block}"
