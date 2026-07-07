//! Native Node addon exposing the shared `time` crate to the Electron
//! desktop app. Mirrors the JS surface of `opencut-wasm` (same camelCase
//! names, options objects, `null` where wasm returns `undefined`) so the
//! web UI can swap implementations at runtime with a thin dispatch shim.

use napi::bindgen_prelude::*;
use napi_derive::napi;
use time::{
    FloorToFrameOptions, FormatTimecodeOptions, FrameRate, GuessTimecodeFormatOptions,
    IsFrameAlignedOptions, LastFrameTimeOptions, MediaTime, MediaTimeAddOptions,
    MediaTimeClampOptions, MediaTimeFromFrameOptions, MediaTimeFromSecondsOptions,
    MediaTimeMaxOptions, MediaTimeMinOptions, MediaTimeSubOptions, MediaTimeToFrameOptions,
    MediaTimeToSecondsOptions, ParseTimecodeOptions, RoundToFrameOptions, SnappedSeekTimeOptions,
    TICKS_PER_SECOND, TimeCodeFormat,
};

#[napi(object)]
pub struct JsFrameRate {
    pub numerator: u32,
    pub denominator: u32,
}

impl From<JsFrameRate> for FrameRate {
    fn from(rate: JsFrameRate) -> Self {
        FrameRate::new(rate.numerator, rate.denominator)
    }
}

fn ticks(time: f64) -> MediaTime {
    MediaTime::from_ticks(time as i64)
}

fn to_js(time: MediaTime) -> f64 {
    time.as_ticks() as f64
}

fn parse_format(format: Option<String>) -> Result<Option<TimeCodeFormat>> {
    match format.as_deref() {
        None => Ok(None),
        Some("MM:SS") => Ok(Some(TimeCodeFormat::MmSs)),
        Some("HH:MM:SS") => Ok(Some(TimeCodeFormat::HhMmSs)),
        Some("HH:MM:SS:CS") => Ok(Some(TimeCodeFormat::HhMmSsCs)),
        Some("HH:MM:SS:FF") => Ok(Some(TimeCodeFormat::HhMmSsFf)),
        Some(other) => Err(Error::from_reason(format!(
            "unknown timecode format: {other}"
        ))),
    }
}

fn format_to_js(format: TimeCodeFormat) -> &'static str {
    match format {
        TimeCodeFormat::MmSs => "MM:SS",
        TimeCodeFormat::HhMmSs => "HH:MM:SS",
        TimeCodeFormat::HhMmSsCs => "HH:MM:SS:CS",
        TimeCodeFormat::HhMmSsFf => "HH:MM:SS:FF",
    }
}

#[napi(js_name = "ticksPerSecond")]
pub fn ticks_per_second() -> f64 {
    TICKS_PER_SECOND as f64
}

#[napi(js_name = "mediaTimeFromSeconds")]
pub fn media_time_from_seconds(seconds: f64) -> Option<f64> {
    time::media_time_from_seconds(MediaTimeFromSecondsOptions { seconds }).map(to_js)
}

#[napi(js_name = "mediaTimeToSeconds")]
pub fn media_time_to_seconds(time: f64) -> f64 {
    time::media_time_to_seconds(MediaTimeToSecondsOptions { time: ticks(time) })
}

#[napi(js_name = "mediaTimeFromFrame")]
pub fn media_time_from_frame(frame: i64, rate: JsFrameRate) -> Option<f64> {
    time::media_time_from_frame(MediaTimeFromFrameOptions {
        frame,
        rate: rate.into(),
    })
    .map(to_js)
}

#[napi(js_name = "mediaTimeToFrame")]
pub fn media_time_to_frame(time: f64, rate: JsFrameRate) -> Option<i64> {
    time::media_time_to_frame(MediaTimeToFrameOptions {
        time: ticks(time),
        rate: rate.into(),
    })
}

#[napi(js_name = "roundToFrame")]
pub fn round_to_frame(time: f64, rate: JsFrameRate) -> Option<f64> {
    time::round_to_frame(RoundToFrameOptions {
        time: ticks(time),
        rate: rate.into(),
    })
    .map(to_js)
}

#[napi(js_name = "floorToFrame")]
pub fn floor_to_frame(time: f64, rate: JsFrameRate) -> Option<f64> {
    time::floor_to_frame(FloorToFrameOptions {
        time: ticks(time),
        rate: rate.into(),
    })
    .map(to_js)
}

#[napi(js_name = "isFrameAligned")]
pub fn is_frame_aligned(time: f64, rate: JsFrameRate) -> Option<bool> {
    time::is_frame_aligned(IsFrameAlignedOptions {
        time: ticks(time),
        rate: rate.into(),
    })
}

#[napi(js_name = "lastFrameTime")]
pub fn last_frame_time(duration: f64, rate: JsFrameRate) -> Option<f64> {
    time::last_frame_time(LastFrameTimeOptions {
        duration: ticks(duration),
        rate: rate.into(),
    })
    .map(to_js)
}

#[napi(js_name = "snappedSeekTime")]
pub fn snapped_seek_time(time: f64, duration: f64, rate: JsFrameRate) -> Option<f64> {
    time::snapped_seek_time(SnappedSeekTimeOptions {
        time: ticks(time),
        duration: ticks(duration),
        rate: rate.into(),
    })
    .map(to_js)
}

#[napi(js_name = "mediaTimeAdd")]
pub fn media_time_add(lhs: f64, rhs: f64) -> f64 {
    to_js(time::media_time_add(MediaTimeAddOptions {
        lhs: ticks(lhs),
        rhs: ticks(rhs),
    }))
}

#[napi(js_name = "mediaTimeSub")]
pub fn media_time_sub(lhs: f64, rhs: f64) -> f64 {
    to_js(time::media_time_sub(MediaTimeSubOptions {
        lhs: ticks(lhs),
        rhs: ticks(rhs),
    }))
}

#[napi(js_name = "mediaTimeMin")]
pub fn media_time_min(lhs: f64, rhs: f64) -> f64 {
    to_js(time::media_time_min(MediaTimeMinOptions {
        lhs: ticks(lhs),
        rhs: ticks(rhs),
    }))
}

#[napi(js_name = "mediaTimeMax")]
pub fn media_time_max(lhs: f64, rhs: f64) -> f64 {
    to_js(time::media_time_max(MediaTimeMaxOptions {
        lhs: ticks(lhs),
        rhs: ticks(rhs),
    }))
}

#[napi(js_name = "mediaTimeClamp")]
pub fn media_time_clamp(time: f64, min: f64, max: f64) -> f64 {
    to_js(time::media_time_clamp(MediaTimeClampOptions {
        time: ticks(time),
        min: ticks(min),
        max: ticks(max),
    }))
}

#[napi(js_name = "formatTimecode")]
pub fn format_timecode(
    time: f64,
    format: Option<String>,
    rate: Option<JsFrameRate>,
) -> Result<Option<String>> {
    Ok(time::format_timecode(FormatTimecodeOptions {
        time: ticks(time),
        format: parse_format(format)?,
        rate: rate.map(Into::into),
    }))
}

#[napi(js_name = "parseTimecode")]
pub fn parse_timecode(
    time_code: String,
    format: Option<String>,
    rate: Option<JsFrameRate>,
) -> Result<Option<f64>> {
    Ok(time::parse_timecode(ParseTimecodeOptions {
        time_code,
        format: parse_format(format)?,
        rate: rate.map(Into::into),
    })
    .map(to_js))
}

#[napi(js_name = "guessTimecodeFormat")]
pub fn guess_timecode_format(time_code: String) -> Option<&'static str> {
    time::guess_timecode_format(GuessTimecodeFormatOptions { time_code }).map(format_to_js)
}
