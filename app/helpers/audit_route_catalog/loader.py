"""
Load audit route rules from YAML files under config/audit_routes/.

All *.yaml / *.yml files are discovered and merged in sorted filename order (use 00_, 10_ prefixes).
Override directory with AUDIT_ROUTES_DIR for tests or custom deployments.
"""

from __future__ import annotations

import os
import re
from pathlib import Path
from typing import Any, Callable

import yaml

from app.helpers.logger import get_logger

logger = get_logger(__name__)

_METHOD_KIND: dict[str, str] = {
    "GET": "read",
    "POST": "create",
    "PUT": "update",
    "PATCH": "update",
    "DELETE": "delete",
}


def _kind(method: str) -> str:
    return _METHOD_KIND.get(method.upper(), "other")


def _read_summary(feature: str) -> str:
    return f"Viewed {feature}"


def _mut_summary(verb: str, feature: str, target: str = "") -> str:
    if target:
        return f"{verb} {feature}: {target}"
    return f"{verb} {feature}"


def _snake_title(s: str) -> str:
    return s.replace("_", " ").title()


def _project_root() -> Path:
    return Path(__file__).resolve().parents[3]


def audit_routes_dir() -> Path:
    override = os.environ.get("AUDIT_ROUTES_DIR")
    if override:
        return Path(override).expanduser().resolve()
    return _project_root() / "config" / "audit_routes"


def _list_yaml_files(directory: Path) -> list[Path]:
    if not directory.is_dir():
        return []
    out: list[Path] = []
    for p in directory.iterdir():
        if not p.is_file():
            continue
        if p.suffix.lower() in (".yaml", ".yml"):
            out.append(p)
    return sorted(out, key=lambda x: x.name.lower())


def _ctx_from_match(match: re.Match[str], named: dict[str, int] | None = None) -> dict[str, str]:
    g = match.groups()
    ctx: dict[str, str] = {}
    for i, val in enumerate(g):
        ctx[f"g{i + 1}"] = val if val is not None else ""
    if named:
        for name, idx in named.items():
            if 1 <= idx <= len(g):
                ctx[name] = g[idx - 1] if g[idx - 1] is not None else ""
    return ctx


def _interpolate(template: str, method: str, ctx: dict[str, str]) -> str:
    k = _kind(method)
    s = template
    s = s.replace("{action_type}", k)
    s = s.replace("{method}", method.upper())
    for key, val in ctx.items():
        s = s.replace(f"{{{key}}}", val)
    return s


def _pick_summary(rule: dict[str, Any], method: str, ctx: dict[str, str]) -> str:
    mu = method.upper()
    sm = rule.get("summary")
    if isinstance(sm, dict):
        raw = sm.get(mu) or sm.get("default") or sm.get("GET")
        if raw is None and sm:
            raw = next(iter(sm.values()))
        if isinstance(raw, str):
            return _interpolate(raw, method, ctx)
    if isinstance(sm, str):
        return _interpolate(sm, method, ctx)
    st = rule.get("summary_template")
    if isinstance(st, str):
        return _interpolate(st, method, ctx)
    return ""


def _pick_action_code(rule: dict[str, Any], method: str, ctx: dict[str, str]) -> str:
    mu = method.upper()
    ac = rule.get("action_code")
    if isinstance(ac, dict):
        raw = ac.get(mu) or ac.get("default")
        if isinstance(raw, str):
            return _interpolate(raw, method, ctx)
    if isinstance(ac, str):
        return _interpolate(ac, method, ctx)
    tpl = rule.get("action_code_template")
    if isinstance(tpl, str):
        return _interpolate(tpl, method, ctx)
    return ""


def _pick_action_type(rule: dict[str, Any], method: str) -> str:
    at = rule.get("action_type")
    if at is None:
        return _kind(method)
    if at == "from_method":
        return _kind(method)
    if isinstance(at, dict):
        mu = method.upper()
        v = at.get(mu) or at.get("default")
        if v == "from_method" or v is None:
            return _kind(method)
        if isinstance(v, str):
            return v
    if isinstance(at, str):
        return at
    return _kind(method)


def _rest_matches(rest: str, spec: dict[str, Any]) -> bool:
    t = spec.get("type") or "prefix"
    if t == "prefix":
        return rest.startswith(spec["value"])
    if t == "equals":
        return rest == spec["value"]
    if t == "contains":
        return spec["value"] in rest
    if t == "any_of":
        return any(_rest_matches(rest, c) for c in spec.get("conditions", []))
    return False


def _build_simple_dict(rule: dict[str, Any], method: str, match: re.Match[str], ctx: dict[str, str]) -> dict[str, Any]:
    feature_area = rule.get("feature_area") or ""
    feature_label = rule.get("feature_label") or ""
    fl_from = rule.get("feature_label_from_group")
    if isinstance(fl_from, int) and 1 <= fl_from <= len(match.groups()):
        raw_g = match.group(fl_from) or ""
        tr = rule.get("feature_label_transform")
        if tr == "snake_title":
            feature_label = _snake_title(raw_g)
        else:
            feature_label = raw_g
    summary = _pick_summary(rule, method, ctx)
    if not summary and rule.get("read_summary_feature"):
        summary = _read_summary(_interpolate(rule["read_summary_feature"], method, ctx))
    action_code = _pick_action_code(rule, method, ctx)
    action_type = _pick_action_type(rule, method)
    return {
        "action_type": action_type,
        "feature_area": feature_area,
        "feature_label": feature_label,
        "summary": summary,
        "action_code": action_code,
    }


def _make_nested_handler(rule: dict[str, Any]) -> tuple[re.Pattern[str], Callable[[re.Match[str], str], dict[str, Any] | None]]:
    pat = re.compile(rule["pattern"])
    groups = rule.get("groups") or {}
    id_idx = int(groups.get("id", 1))
    rest_idx = int(groups.get("rest", 2))
    branches: list[dict[str, Any]] = list(rule.get("branches") or [])

    def fn(m: re.Match[str], method: str) -> dict[str, Any] | None:
        job_id = m.group(id_idx)
        rest = m.group(rest_idx) or ""
        ctx = _ctx_from_match(m)
        ctx["id"] = job_id or ""
        ctx["job_id"] = job_id or ""
        ctx["rest"] = rest
        for br in branches:
            mspec = br.get("match")
            if not isinstance(mspec, dict):
                continue
            if not _rest_matches(rest, mspec):
                continue
            out = _build_simple_dict(br, method, m, ctx)
            if not out.get("action_code"):
                continue
            return out
        return None

    return pat, fn


def _make_simple_handler(rule: dict[str, Any]) -> tuple[re.Pattern[str], Callable[[re.Match[str], str], dict[str, Any] | None]]:
    pat = re.compile(rule["pattern"])

    def fn(m: re.Match[str], method: str) -> dict[str, Any] | None:
        ctx = _ctx_from_match(m)
        return _build_simple_dict(rule, method, m, ctx)

    return pat, fn


def _rule_to_handler(rule: dict[str, Any]) -> tuple[re.Pattern[str], Callable[[re.Match[str], str], dict[str, Any] | None]] | None:
    rtype = rule.get("type") or "simple"
    try:
        if rtype == "nested_rest":
            return _make_nested_handler(rule)
        if rtype == "simple":
            return _make_simple_handler(rule)
        logger.warning("Unknown audit route rule type %s (id=%s)", rtype, rule.get("id"))
        return None
    except re.error as e:
        logger.error("Invalid regex in audit route rule id=%s: %s", rule.get("id"), e)
        return None


def load_rules_from_disk() -> list[tuple[re.Pattern[str], Callable[[re.Match[str], str], dict[str, Any] | None]]]:
    directory = audit_routes_dir()
    files = _list_yaml_files(directory)
    if not files:
        logger.warning(
            "No audit route YAML files in %s — only generic API fallback labels will be used",
            directory,
        )
        return []

    out: list[tuple[re.Pattern[str], Callable[[re.Match[str], str], dict[str, Any] | None]]] = []
    for path in files:
        try:
            raw = path.read_text(encoding="utf-8")
            data = yaml.safe_load(raw)
        except Exception as e:
            logger.error("Failed to read audit routes file %s: %s", path, e)
            continue
        if not isinstance(data, dict):
            continue
        rules = data.get("rules")
        if not isinstance(rules, list):
            continue
        n = 0
        for rule in rules:
            if not isinstance(rule, dict):
                continue
            if "pattern" not in rule:
                continue
            built = _rule_to_handler(rule)
            if built:
                out.append(built)
                n += 1
        logger.debug("Loaded %s audit rule(s) from %s", n, path.name)
    return out


# Exposed for tests and describe_request fallback text
read_summary = _read_summary
mut_summary = _mut_summary
kind = _kind
