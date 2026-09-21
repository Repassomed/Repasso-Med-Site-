"""Bootstrap de import compartilhado pelos testes do coordinator.

Mesmo padrão de tools/qa/tests/: sem pytest, sem dependência — só ajusta
sys.path para achar o pacote a partir da raiz do repositório.
"""

from __future__ import annotations

import os
import sys

_HERE = os.path.dirname(os.path.abspath(__file__))
_COORDINATOR_ROOT = os.path.dirname(_HERE)
REPO_ROOT = os.path.dirname(_COORDINATOR_ROOT)
FIXTURES = os.path.join(_COORDINATOR_ROOT, "fixtures")

if REPO_ROOT not in sys.path:
    sys.path.insert(0, REPO_ROOT)
