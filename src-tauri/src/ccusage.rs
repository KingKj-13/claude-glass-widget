//! ccusage integration.
//!
//! Runs the `ccusage` CLI (falling back to `npx ccusage@latest`), parses its
//! JSON output and normalizes everything into the canonical snapshot shape the
//! React frontend consumes (see `src/types/usage.ts`). All parsing is defensive:
//! missing fields degrade gracefully rather than erroring.

use std::process::Command;

use chrono::{DateTime, Datelike, Local, NaiveDate, TimeZone, Utc};
use serde_json::{json, Value};

const FIVE_HOURS_MS: i64 = 5 * 60 * 60 * 1000;
const HOUR_MS: i64 = 60 * 60 * 1000;

/// Plan limits + estimation knobs, overridable via environment variables so a
/// user on a different Claude plan can tune them without rebuilding.
struct Limits {
    daily_tokens: f64,
    /// Total generated-token budget for the current 5-hour window (session bar).
    session_tokens: f64,
    /// Per-model generated-token budget for the current 5-hour window.
    window_token_limit: f64,
    avg_tokens_per_request: f64,
}

impl Limits {
    fn load() -> Self {
        let env_f = |k: &str, d: f64| {
            std::env::var(k)
                .ok()
                .and_then(|v| v.parse::<f64>().ok())
                .unwrap_or(d)
        };
        Limits {
            daily_tokens: env_f("CLAUDE_DAILY_TOKEN_LIMIT", 10_000_000.0),
            session_tokens: env_f("CLAUDE_SESSION_TOKEN_LIMIT", 4_000_000.0),
            window_token_limit: env_f("CLAUDE_WINDOW_TOKEN_LIMIT", 2_000_000.0),
            avg_tokens_per_request: env_f("CLAUDE_AVG_TOKENS_PER_REQUEST", 1_100.0),
        }
    }
}

/// True when the ccusage CLI responds to `--version`.
pub fn is_available() -> bool {
    run_ccusage(&["--version"]).is_some()
}

/// Build a complete usage snapshot. Always returns `Ok` — when no data source is
/// reachable it returns an `available: false` snapshot with a helpful reason.
pub fn build_snapshot() -> Result<Value, String> {
    let limits = Limits::load();
    let now_ms = Utc::now().timestamp_millis();

    if !is_available() {
        return Ok(unavailable(
            "ccusage was not found on your PATH. Install it with: npm install -g ccusage",
        ));
    }

    let daily = run_json(&["daily", "--json"]);
    let blocks = run_json(&["blocks", "--json"]);

    let daily_rows: Vec<Value> = daily
        .as_ref()
        .map(|v| arr(v, "daily").to_vec())
        .unwrap_or_default();
    let block_rows: Vec<Value> = blocks
        .as_ref()
        .map(|v| arr(v, "blocks").to_vec())
        .unwrap_or_default();

    if daily_rows.is_empty() && block_rows.is_empty() {
        return Ok(unavailable(
            "ccusage is installed but reported no usage yet. Use Claude Code, then refresh.",
        ));
    }

    // -------- today's totals & per-model split --------
    let today = Local::now().format("%Y-%m-%d").to_string();
    let today_row = daily_rows
        .iter()
        .find(|r| day_date(r).as_deref() == Some(today.as_str()))
        .cloned()
        .or_else(|| daily_rows.last().cloned())
        .unwrap_or_else(|| json!({}));

    let used_today = claude_tokens(&today_row);
    // "Available" is the configured daily limit (set CLAUDE_DAILY_TOKEN_LIMIT to
    // match your plan). Remaining is clamped at 0 so heavy days never go negative.
    let available_today = limits.daily_tokens;
    let remaining_today = (available_today - used_today).max(0.0);

    // Today's Claude split drives how we attribute the active window per model.
    let (sonnet_today, opus_today) = model_split(&today_row);

    // -------- active 5-hour block -> session, reset & per-model window --------
    // Prefer the live block; if none is active (e.g. you're rate-limited and have
    // stopped sending messages, so there's a gap), fall back to the most recent
    // real block so usage isn't shown as 0.
    let active = block_rows
        .iter()
        .find(|b| b.get("isActive").and_then(|x| x.as_bool()).unwrap_or(false))
        .or_else(|| {
            block_rows
                .iter()
                .rev()
                .find(|b| !b.get("isGap").and_then(|x| x.as_bool()).unwrap_or(false))
        });

    let (window_start, reset_at, block_used, block_model_list) = match active {
        Some(b) => {
            let start = parse_ms(b, "startTime").unwrap_or(now_ms);
            let end = parse_ms(b, "endTime").unwrap_or(start + FIVE_HOURS_MS);
            (start, end, block_generated(b), block_models(b))
        }
        None => (now_ms, now_ms + FIVE_HOURS_MS, 0.0, Vec::new()),
    };

    // Blocks carry no per-model token breakdown, so attribute the window's tokens
    // by today's Sonnet/Opus ratio, falling back to the block's model list.
    let today_sum = sonnet_today + opus_today;
    let (sonnet_win, opus_win) = if today_sum > 0.0 {
        (
            block_used * sonnet_today / today_sum,
            block_used * opus_today / today_sum,
        )
    } else {
        let has_opus = block_model_list.iter().any(|m| m.contains("opus"));
        let has_sonnet = block_model_list.iter().any(|m| !m.contains("opus"));
        match (has_sonnet, has_opus) {
            (true, true) => (block_used * 0.5, block_used * 0.5),
            (false, true) => (0.0, block_used),
            (true, false) => (block_used, 0.0),
            _ => (0.0, 0.0),
        }
    };

    let win_limit = limits.window_token_limit;
    let models = json!([
        {
            "name": "Claude Sonnet",
            "modelId": "claude-sonnet-4-6",
            "windowUsed": sonnet_win as i64,
            "windowLimit": win_limit as i64,
            "tokensToday": sonnet_today as i64,
        },
        {
            "name": "Claude Opus",
            "modelId": "claude-opus-4-8",
            "windowUsed": opus_win as i64,
            "windowLimit": win_limit as i64,
            "tokensToday": opus_today as i64,
        }
    ]);

    let session_usage = block_used;
    let session_remaining = (limits.session_tokens - session_usage).max(0.0);
    let session = json!({
        "usage": session_usage as i64,
        "remaining": session_remaining as i64,
        "limit": limits.session_tokens as i64,
    });
    let reset = json!({ "resetAt": reset_at, "windowStart": window_start });

    // -------- charts --------
    let hourly = hourly_series(&block_rows, now_ms);
    let daily_series = daily_chart(&daily_rows);
    let weekly_series = weekly_chart(&daily_rows);
    let monthly_series = monthly_chart(&daily_rows);

    // -------- history & logs --------
    let history = json!({
        "daily": daily_history(&daily_rows, &limits),
        "weekly": weekly_history(&daily_rows, &limits),
        "monthly": monthly_history(&daily_rows, &limits),
    });
    let reset_history = reset_history(&block_rows);
    let session_history = session_history(&block_rows, &limits);

    Ok(json!({
        "available": true,
        "source": "ccusage",
        "models": models,
        "tokens": {
            "availableToday": available_today as i64,
            "usedToday": used_today as i64,
            "remainingToday": remaining_today as i64,
        },
        "session": session,
        "reset": reset,
        "hourly": hourly,
        "daily": daily_series,
        "weekly": weekly_series,
        "monthly": monthly_series,
        "history": history,
        "resetHistory": reset_history,
        "sessionHistory": session_history,
        "updatedAt": now_ms,
    }))
}

/* ----------------------------- ccusage runner ---------------------------- */

fn run_json(args: &[&str]) -> Option<Value> {
    let out = run_ccusage(args)?;
    serde_json::from_str::<Value>(&out).ok()
}

/// Try the global `ccusage`, then `npx ccusage@latest`.
fn run_ccusage(args: &[&str]) -> Option<String> {
    if let Some(out) = try_run("ccusage", args) {
        return Some(out);
    }
    let mut npx: Vec<&str> = vec!["--yes", "ccusage@latest"];
    npx.extend_from_slice(args);
    try_run("npx", &npx)
}

#[cfg(target_os = "windows")]
fn try_run(program: &str, args: &[&str]) -> Option<String> {
    use std::os::windows::process::CommandExt;
    const CREATE_NO_WINDOW: u32 = 0x0800_0000;

    // Route through cmd /C so `.cmd` shims (ccusage.cmd / npx.cmd) resolve.
    let output = Command::new("cmd")
        .arg("/C")
        .arg(program)
        .args(args)
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .ok()?;
    if output.status.success() {
        Some(String::from_utf8_lossy(&output.stdout).into_owned())
    } else {
        None
    }
}

#[cfg(not(target_os = "windows"))]
fn try_run(program: &str, args: &[&str]) -> Option<String> {
    let output = Command::new(program).args(args).output().ok()?;
    if output.status.success() {
        Some(String::from_utf8_lossy(&output.stdout).into_owned())
    } else {
        None
    }
}

/* ------------------------------ json helpers ----------------------------- */

/// First numeric value among `keys`, else 0.
fn f(v: &Value, keys: &[&str]) -> f64 {
    for k in keys {
        if let Some(n) = v.get(*k).and_then(Value::as_f64) {
            return n;
        }
    }
    0.0
}

fn s(v: &Value, key: &str) -> Option<String> {
    v.get(key).and_then(Value::as_str).map(str::to_string)
}

fn arr<'a>(v: &'a Value, key: &str) -> &'a [Value] {
    v.get(key)
        .and_then(Value::as_array)
        .map(Vec::as_slice)
        .unwrap_or(&[])
}

/// ccusage 20.x names the bucket date `period`; older versions used `date`.
fn day_date(d: &Value) -> Option<String> {
    s(d, "period").or_else(|| s(d, "date"))
}

fn day_naive(d: &Value) -> Option<NaiveDate> {
    day_date(d).and_then(|x| NaiveDate::parse_from_str(&x, "%Y-%m-%d").ok())
}

fn model_name(m: &Value) -> String {
    s(m, "modelName").or_else(|| s(m, "model")).unwrap_or_default()
}

fn is_claude(name: &str) -> bool {
    name.to_lowercase().contains("claude")
}

/// Generated tokens for a model breakdown: input + output + cache *writes*.
/// Excludes cache *reads*, which are cheap reuse and otherwise dominate totals.
fn model_total(m: &Value) -> f64 {
    f(m, &["inputTokens"])
        + f(m, &["outputTokens"])
        + f(m, &["cacheCreationTokens", "cacheCreationInputTokens"])
}

/// Generated tokens for the active 5-hour block (from its `tokenCounts`).
fn block_generated(b: &Value) -> f64 {
    match b.get("tokenCounts") {
        Some(tc) => {
            f(tc, &["inputTokens"])
                + f(tc, &["outputTokens"])
                + f(tc, &["cacheCreationInputTokens", "cacheCreationTokens"])
        }
        None => 0.0,
    }
}

/// Lower-cased Claude model names present in a block.
fn block_models(b: &Value) -> Vec<String> {
    arr(b, "models")
        .iter()
        .filter_map(|v| v.as_str())
        .map(|s| s.to_lowercase())
        .filter(|s| s.contains("claude"))
        .collect()
}

/// Claude-only token total for a day. ccusage also tracks other agents/models
/// (Gemini, etc.); a Claude usage monitor must exclude those.
fn claude_tokens(day: &Value) -> f64 {
    let breakdowns = arr(day, "modelBreakdowns");
    if breakdowns.is_empty() {
        let claude = arr(day, "modelsUsed")
            .iter()
            .any(|v| v.as_str().map(is_claude).unwrap_or(false));
        return if claude {
            f(day, &["inputTokens"])
                + f(day, &["outputTokens"])
                + f(day, &["cacheCreationTokens"])
        } else {
            0.0
        };
    }
    breakdowns
        .iter()
        .filter(|m| is_claude(&model_name(m)))
        .map(|m| model_total(m))
        .sum()
}

/// Claude-only cost for a day.
fn claude_cost(day: &Value) -> f64 {
    arr(day, "modelBreakdowns")
        .iter()
        .filter(|m| is_claude(&model_name(m)))
        .map(|m| f(m, &["cost", "totalCost"]))
        .sum()
}

fn parse_ms(v: &Value, key: &str) -> Option<i64> {
    let raw = v.get(key)?.as_str()?;
    DateTime::parse_from_rfc3339(raw)
        .ok()
        .map(|d| d.timestamp_millis())
}

fn estimate_requests(tokens: f64, limits: &Limits) -> i64 {
    if tokens <= 0.0 {
        return 0;
    }
    (tokens / limits.avg_tokens_per_request).round().max(1.0) as i64
}

/// Split today's tokens into (sonnet, opus) using per-model breakdowns when
/// present, otherwise a sensible whole-day fallback.
fn model_split(day: &Value) -> (f64, f64) {
    let mut sonnet = 0.0; // non-Opus Claude (Sonnet/Haiku) shown on the Sonnet bar
    let mut opus = 0.0;
    let mut matched = false;

    for m in arr(day, "modelBreakdowns") {
        let name = model_name(m).to_lowercase();
        if !name.contains("claude") {
            continue; // ignore Gemini/other agents
        }
        let tokens = model_total(m);
        if name.contains("opus") {
            opus += tokens;
        } else {
            sonnet += tokens;
        }
        matched = true;
    }

    if !matched {
        // No per-model data: assume the common ~80/20 Sonnet/Opus split.
        let total = claude_tokens(day);
        sonnet = total * 0.82;
        opus = total * 0.18;
    }
    (sonnet, opus)
}

/* -------------------------------- charts --------------------------------- */

/// 24 hourly buckets ending now, distributing each block's tokens across the
/// hours it overlaps.
fn hourly_series(blocks: &[Value], now_ms: i64) -> Value {
    let start = now_ms - 24 * HOUR_MS;
    let mut buckets = [0f64; 24];

    for b in blocks {
        if b.get("isGap").and_then(Value::as_bool).unwrap_or(false) {
            continue;
        }
        let Some(bs) = parse_ms(b, "startTime") else {
            continue;
        };
        let be = parse_ms(b, "actualEndTime")
            .or_else(|| parse_ms(b, "endTime"))
            .unwrap_or(bs + FIVE_HOURS_MS);
        let dur = (be - bs).max(1) as f64;
        let total = f(b, &["totalTokens"]);
        if total <= 0.0 {
            continue;
        }
        for (h, bucket) in buckets.iter_mut().enumerate() {
            let hs = start + h as i64 * HOUR_MS;
            let he = hs + HOUR_MS;
            let overlap = (be.min(he) - bs.max(hs)).max(0) as f64;
            if overlap > 0.0 {
                *bucket += total * (overlap / dur);
            }
        }
    }

    let points: Vec<Value> = (0..24)
        .map(|h| {
            let ts = start + h as i64 * HOUR_MS;
            let label = Local
                .timestamp_millis_opt(ts)
                .single()
                .map(|d| d.format("%H:00").to_string())
                .unwrap_or_default();
            json!({ "label": label, "value": buckets[h as usize].round() as i64 })
        })
        .collect();
    Value::Array(points)
}

fn daily_chart(daily: &[Value]) -> Value {
    let take = daily.iter().rev().take(7).rev();
    let points: Vec<Value> = take
        .map(|d| {
            let label = day_naive(d)
                .map(|nd| nd.format("%a").to_string())
                .unwrap_or_else(|| day_date(d).unwrap_or_default());
            json!({ "label": label, "value": claude_tokens(d) as i64 })
        })
        .collect();
    Value::Array(points)
}

fn weekly_chart(daily: &[Value]) -> Value {
    let groups = group_by(daily, |nd| format!("{}-W{:02}", nd.iso_week().year(), nd.iso_week().week()));
    let mut entries: Vec<(String, f64)> = groups.into_iter().collect();
    entries.sort_by(|a, b| a.0.cmp(&b.0));
    let points: Vec<Value> = entries
        .iter()
        .rev()
        .take(6)
        .rev()
        .map(|(k, v)| {
            let label = k.split("-W").nth(1).map(|w| format!("W{w}")).unwrap_or_else(|| k.clone());
            json!({ "label": label, "value": *v as i64 })
        })
        .collect();
    Value::Array(points)
}

fn monthly_chart(daily: &[Value]) -> Value {
    let groups = group_by(daily, |nd| format!("{}-{:02}", nd.year(), nd.month()));
    let mut entries: Vec<(String, f64)> = groups.into_iter().collect();
    entries.sort_by(|a, b| a.0.cmp(&b.0));
    let points: Vec<Value> = entries
        .iter()
        .rev()
        .take(6)
        .rev()
        .map(|(k, v)| {
            let label = month_label_short(k);
            json!({ "label": label, "value": *v as i64 })
        })
        .collect();
    Value::Array(points)
}

/* -------------------------------- history -------------------------------- */

fn daily_history(daily: &[Value], limits: &Limits) -> Value {
    let rows: Vec<Value> = daily
        .iter()
        .rev()
        .filter(|d| claude_tokens(d) > 0.0)
        .take(14)
        .map(|d| {
            let tokens = claude_tokens(d);
            json!({
                "period": day_date(d).unwrap_or_default(),
                "tokens": tokens as i64,
                "requests": estimate_requests(tokens, limits),
                "cost": round2(claude_cost(d)),
            })
        })
        .collect();
    Value::Array(rows)
}

fn weekly_history(daily: &[Value], limits: &Limits) -> Value {
    history_from_groups(
        group_with_cost(daily, |nd| {
            format!("{}-W{:02}", nd.iso_week().year(), nd.iso_week().week())
        }),
        |k| k.split("-W").nth(1).map(|w| format!("Week {w}")).unwrap_or_else(|| k.to_string()),
        limits,
    )
}

fn monthly_history(daily: &[Value], limits: &Limits) -> Value {
    history_from_groups(
        group_with_cost(daily, |nd| format!("{}-{:02}", nd.year(), nd.month())),
        month_label_long,
        limits,
    )
}

fn history_from_groups(
    groups: Vec<(String, (f64, f64))>,
    label: impl Fn(&str) -> String,
    limits: &Limits,
) -> Value {
    let mut entries = groups;
    entries.sort_by(|a, b| b.0.cmp(&a.0)); // newest first
    let rows: Vec<Value> = entries
        .into_iter()
        .take(6)
        .map(|(k, (tokens, cost))| {
            json!({
                "period": label(&k),
                "tokens": tokens as i64,
                "requests": estimate_requests(tokens, limits),
                "cost": round2(cost),
            })
        })
        .collect();
    Value::Array(rows)
}

fn reset_history(blocks: &[Value]) -> Value {
    let rows: Vec<Value> = blocks
        .iter()
        .filter(|b| {
            !b.get("isGap").and_then(Value::as_bool).unwrap_or(false)
                && !b.get("isActive").and_then(Value::as_bool).unwrap_or(false)
        })
        .rev()
        .take(6)
        .filter_map(|b| {
            let at = parse_ms(b, "actualEndTime").or_else(|| parse_ms(b, "endTime"))?;
            Some(json!({ "at": at, "tokensAtReset": f(b, &["totalTokens"]) as i64 }))
        })
        .collect();
    Value::Array(rows)
}

fn session_history(blocks: &[Value], limits: &Limits) -> Value {
    let rows: Vec<Value> = blocks
        .iter()
        .filter(|b| !b.get("isGap").and_then(Value::as_bool).unwrap_or(false))
        .rev()
        .take(6)
        .filter_map(|b| {
            let start = parse_ms(b, "startTime")?;
            let end = parse_ms(b, "actualEndTime")
                .or_else(|| parse_ms(b, "endTime"))
                .unwrap_or(start + FIVE_HOURS_MS);
            let tokens = f(b, &["totalTokens"]);
            Some(json!({
                "startedAt": start,
                "endedAt": end,
                "tokens": tokens as i64,
                "requests": estimate_requests(tokens, limits),
            }))
        })
        .collect();
    Value::Array(rows)
}

/* ----------------------------- group helpers ----------------------------- */

fn group_by(daily: &[Value], key: impl Fn(&NaiveDate) -> String) -> std::collections::HashMap<String, f64> {
    let mut map: std::collections::HashMap<String, f64> = std::collections::HashMap::new();
    for d in daily {
        if let Some(nd) = day_naive(d) {
            *map.entry(key(&nd)).or_insert(0.0) += claude_tokens(d);
        }
    }
    map
}

fn group_with_cost(
    daily: &[Value],
    key: impl Fn(&NaiveDate) -> String,
) -> Vec<(String, (f64, f64))> {
    let mut map: std::collections::HashMap<String, (f64, f64)> = std::collections::HashMap::new();
    for d in daily {
        if let Some(nd) = day_naive(d) {
            let e = map.entry(key(&nd)).or_insert((0.0, 0.0));
            e.0 += claude_tokens(d);
            e.1 += claude_cost(d);
        }
    }
    map.into_iter().collect()
}

/* ------------------------------ misc helpers ----------------------------- */

fn round2(v: f64) -> f64 {
    (v * 100.0).round() / 100.0
}

const MONTHS: [&str; 12] = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const MONTHS_LONG: [&str; 12] = [
    "January", "February", "March", "April", "May", "June", "July", "August", "September",
    "October", "November", "December",
];

fn month_index(key: &str) -> Option<(i32, usize)> {
    let mut parts = key.split('-');
    let year = parts.next()?.parse::<i32>().ok()?;
    let month = parts.next()?.parse::<usize>().ok()?;
    if (1..=12).contains(&month) {
        Some((year, month - 1))
    } else {
        None
    }
}

fn month_label_short(key: &str) -> String {
    month_index(key)
        .map(|(_, m)| MONTHS[m].to_string())
        .unwrap_or_else(|| key.to_string())
}

fn month_label_long(key: &str) -> String {
    month_index(key)
        .map(|(y, m)| format!("{} {}", MONTHS_LONG[m], y))
        .unwrap_or_else(|| key.to_string())
}

/// An `available: false` snapshot with the given reason.
fn unavailable(reason: &str) -> Value {
    let now = Utc::now().timestamp_millis();
    json!({
        "available": false,
        "reason": reason,
        "source": "ccusage",
        "models": [],
        "tokens": { "availableToday": 0, "usedToday": 0, "remainingToday": 0 },
        "session": { "usage": 0, "remaining": 0, "limit": 0 },
        "reset": { "resetAt": now, "windowStart": now },
        "hourly": [],
        "daily": [],
        "weekly": [],
        "monthly": [],
        "history": { "daily": [], "weekly": [], "monthly": [] },
        "resetHistory": [],
        "sessionHistory": [],
        "updatedAt": now,
    })
}
