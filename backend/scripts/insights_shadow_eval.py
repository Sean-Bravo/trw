#!/usr/bin/env python3
"""
Insights shadow eval — run every verified exchange fixture (and any extra
files you point it at) through the Business-tier insights path twice: the
production model (TIER_CONFIG) and the shadow candidate (SHADOW_CONFIG), on
the identical normalized input. Writes a JSON report and prints the summary
the Oct 28 review reads: flag agreement, refusal rate, P50/P90 cost per
call, cache behaviour, latency.

This spends real money (two model calls per file). It never touches S3,
Neon or a job; it is the offline half of the shadow run — the online half
is handlers/processor.py run_shadow_insights on live Business jobs.

Usage:
    ANTHROPIC_API_KEY=... python3 scripts/insights_shadow_eval.py \
        [--fixtures-dir tests/fixtures/valid] [--files a.csv b.csv ...] \
        [--out reports/insights_shadow_<date>.json] [--dry-run] [--tier business]

--dry-run parses the files and prints the request type, input size and
estimated prefix size without calling any model.
"""

import argparse
import glob
import json
import os
import statistics
import sys
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

HERE = os.path.dirname(os.path.abspath(__file__))
BACKEND = os.path.abspath(os.path.join(HERE, ".."))
# services/ for ai_insights' flat imports; backend/ so engine can import
# services.fingerprinting (the layout the Lambda package has too).
sys.path.insert(0, os.path.join(BACKEND, "services"))
sys.path.insert(0, BACKEND)

import ai_insights  # noqa: E402
from ai_insights import (  # noqa: E402
    SHADOW_CONFIG,
    SHADOW_TIERS_ENV,
    TIER_CONFIG,
    build_insights_input,
    classify_request,
    generate_insights,
    generate_shadow_insights,
)


def _records_from_csv_bytes(data: bytes, filename: str) -> List[Dict[str, Any]]:
    """Parse one export with the same engine the processor uses and return
    the normalized (Koinly-column) records the insights path receives."""
    import csv
    from io import StringIO

    from services.engine import process_file

    from csv_safety import sanitize_csv_records

    result = process_file(input_data=data, exchange_name=None, debug=False, deduplicate=True)
    records = result.get("records") or []
    if not result.get("success") or not records:
        errors = result.get("errors") or [{"message": "no records"}]
        raise RuntimeError(f"engine failed on {filename}: {errors[0].get('message')}")
    # Same round-trip as handlers/processor.py: records → output.csv → DictReader,
    # so the eval sees exactly the string-valued rows the live path sees.
    out = StringIO()
    writer = csv.DictWriter(out, fieldnames=list(records[0].keys()))
    writer.writeheader()
    writer.writerows(sanitize_csv_records(records))
    return list(csv.DictReader(StringIO(out.getvalue())))


def _percentile(values: List[float], pct: float) -> Optional[float]:
    clean = sorted(v for v in values if isinstance(v, (int, float)))
    if not clean:
        return None
    k = (len(clean) - 1) * pct
    lo, hi = int(k), min(int(k) + 1, len(clean) - 1)
    return round(clean[lo] + (clean[hi] - clean[lo]) * (k - lo), 6)


def _summarize(rows: List[Dict[str, Any]], role: str) -> Dict[str, Any]:
    # A failed call carries "usage": None, so `or {}` rather than a .get default:
    # a run where every call 401s must still write its report.
    calls = [r[role] for r in rows if r.get(role)]
    costs = [(c.get("usage") or {}).get("cost_usd") for c in calls]
    latencies = [(c.get("usage") or {}).get("latency_ms") for c in calls]
    cache_reads = [(c.get("usage") or {}).get("cache_read_tokens", 0) for c in calls]
    cache_writes = [(c.get("usage") or {}).get("cache_creation_tokens", 0) for c in calls]
    return {
        "calls": len(calls),
        "model": calls[0].get("model") if calls else None,
        "success": sum(1 for c in calls if c.get("success")),
        "refusals": sum(1 for c in calls if c.get("refusal")),
        "errors": sum(1 for c in calls if not c.get("success") and not c.get("refusal")),
        "cost_usd_p50": _percentile(costs, 0.5),
        "cost_usd_p90": _percentile(costs, 0.9),
        "cost_usd_total": round(sum(c for c in costs if isinstance(c, (int, float))), 6),
        "latency_ms_p50": _percentile(latencies, 0.5),
        "latency_ms_p95": _percentile(latencies, 0.95),
        "calls_with_cache_write": sum(1 for w in cache_writes if w),
        "calls_with_cache_read": sum(1 for r in cache_reads if r),
    }


def _agreement_summary(rows: List[Dict[str, Any]]) -> Dict[str, Any]:
    agreements = [r["shadow"]["agreement"] for r in rows if r.get("shadow") and (r["shadow"].get("agreement") or {}).get("comparable")]
    jaccards = [a["flag_jaccard"] for a in agreements]
    deltas = [a["taxable_events_delta"] for a in agreements if a.get("taxable_events_delta") is not None]
    return {
        "comparable_files": len(agreements),
        "flag_jaccard_mean": round(statistics.fmean(jaccards), 4) if jaccards else None,
        "flag_jaccard_min": min(jaccards) if jaccards else None,
        "files_in_full_flag_agreement": sum(1 for j in jaccards if j == 1.0),
        "transaction_types_match": sum(1 for a in agreements if a.get("transaction_types_match")),
        "taxable_events_delta_mean": round(statistics.fmean(deltas), 2) if deltas else None,
        "taxable_events_delta_max_abs": max((abs(d) for d in deltas), default=None),
    }


def _strip_for_report(result: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """Keep what the report needs; drop the raw error text (may quote cells)."""
    if result is None:
        return None
    keep = {k: result.get(k) for k in ("success", "refusal", "model", "provider", "role", "stop_reason", "usage", "metadata", "agreement")}
    if result.get("insights"):
        ins = result["insights"]
        keep["insights"] = {
            "total_transactions": ins.get("total_transactions"),
            "estimated_taxable_events": ins.get("estimated_taxable_events"),
            "transaction_types": ins.get("transaction_types"),
            "flags": ins.get("flags"),
            "data_notes": ins.get("data_notes"),
            "summary": ins.get("summary"),
        }
    if not result.get("success"):
        keep["error"] = result.get("error") if result.get("refusal") else type(result.get("error")).__name__
    return keep


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--fixtures-dir", default=os.path.join(BACKEND, "tests", "fixtures", "valid"))
    parser.add_argument("--files", nargs="*", default=[], help="extra CSV exports (e.g. a sample of real files)")
    parser.add_argument("--no-fixtures", action="store_true", help="only run --files")
    parser.add_argument("--tier", default="business")
    parser.add_argument("--out", default=None)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    if args.tier not in SHADOW_CONFIG:
        print(f"tier {args.tier!r} has no SHADOW_CONFIG entry", file=sys.stderr)
        return 2
    os.environ[SHADOW_TIERS_ENV] = args.tier

    paths = [] if args.no_fixtures else sorted(glob.glob(os.path.join(args.fixtures_dir, "*.csv")))
    paths += args.files
    if not paths:
        print("nothing to run", file=sys.stderr)
        return 2

    secrets = {"ANTHROPIC_API_KEY": os.environ.get("ANTHROPIC_API_KEY", "")}
    if not args.dry_run and not secrets["ANTHROPIC_API_KEY"]:
        print("ANTHROPIC_API_KEY is not set", file=sys.stderr)
        return 2

    production_model = TIER_CONFIG[args.tier]["model"]
    shadow_model = SHADOW_CONFIG[args.tier]["model"]
    print(f"insights shadow eval — tier={args.tier} production={production_model} shadow={shadow_model} "
          f"prompt_version={ai_insights.INSIGHTS_PROMPT_VERSION} files={len(paths)} dry_run={args.dry_run}")

    rows: List[Dict[str, Any]] = []
    for path in paths:
        name = os.path.basename(path)
        row: Dict[str, Any] = {"file": name}
        try:
            with open(path, "rb") as fh:
                records = _records_from_csv_bytes(fh.read(), name)
        except Exception as e:  # noqa: BLE001 — report and move on
            row["parse_error"] = type(e).__name__
            print(f"  {name}: parse error {type(e).__name__}: {e}")
            rows.append(row)
            continue

        request = build_insights_input(records)
        row["records"] = len(records)
        row["request_type"] = classify_request(records)
        row["input"] = request["input"]
        if args.dry_run:
            print(f"  {name}: records={len(records)} request_type={row['request_type']} input={request['input']}")
            rows.append(row)
            continue

        started = time.perf_counter()
        production = generate_insights(records, args.tier, secrets)
        shadow = generate_shadow_insights(records, args.tier, secrets, production.get("insights"))
        row["production"] = _strip_for_report(production)
        row["shadow"] = _strip_for_report(shadow)
        row["wall_ms"] = int((time.perf_counter() - started) * 1000)
        agreement = (shadow or {}).get("agreement") or {}
        print(
            f"  {name}: records={len(records)} type={row['request_type']} "
            f"prod[{production.get('stop_reason')} ${(production.get('usage') or {}).get('cost_usd')} "
            f"cache_w={(production.get('usage') or {}).get('cache_creation_tokens')} cache_r={(production.get('usage') or {}).get('cache_read_tokens')}] "
            f"shadow[{(shadow or {}).get('stop_reason')} ${((shadow or {}).get('usage') or {}).get('cost_usd')} "
            f"cache_w={((shadow or {}).get('usage') or {}).get('cache_creation_tokens')} cache_r={((shadow or {}).get('usage') or {}).get('cache_read_tokens')}] "
            f"jaccard={agreement.get('flag_jaccard')} only_prod={agreement.get('flags_only_production')} only_shadow={agreement.get('flags_only_shadow')} "
            f"taxable_delta={agreement.get('taxable_events_delta')}"
        )
        rows.append(row)

    report = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "tier": args.tier,
        "prompt_version": ai_insights.INSIGHTS_PROMPT_VERSION,
        "production_model": production_model,
        "shadow_model": shadow_model,
        "dry_run": args.dry_run,
        "files": len(rows),
        "rows": rows,
    }
    if not args.dry_run:
        report["production"] = _summarize(rows, "production")
        report["shadow"] = _summarize(rows, "shadow")
        report["agreement"] = _agreement_summary(rows)
        print("\nsummary")
        for role in ("production", "shadow"):
            print(f"  {role}: {json.dumps(report[role])}")
        print(f"  agreement: {json.dumps(report['agreement'])}")
        p90 = report["shadow"]["cost_usd_p90"]
        if p90 is not None:
            print(f"  review rule — shadow P90 cost per call {'under' if p90 < 0.12 else 'NOT under'} $0.12 (p90=${p90})")

    out = args.out or os.path.join(BACKEND, "reports", f"insights_shadow_{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')}.json")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w", encoding="utf-8") as fh:
        json.dump(report, fh, indent=2, default=str)
    print(f"\nreport: {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
