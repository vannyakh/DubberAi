use bridge::export;
use serde::{Deserialize, Serialize};

pub const DEFAULT_THRESHOLD_DB: f64 = -40.0;
pub const DEFAULT_MIN_SILENCE_SECONDS: f64 = 0.6;
pub const DEFAULT_PADDING_SECONDS: f64 = 0.08;

const WINDOW_SECONDS: f64 = 0.03;
const HOP_SECONDS: f64 = 0.01;
const MIN_KEEP_AFTER_PAD: f64 = 0.01;

#[cfg_attr(feature = "wasm", derive(tsify_next::Tsify))]
#[cfg_attr(feature = "wasm", tsify(into_wasm_abi))]
#[derive(Serialize, Deserialize, Clone, Copy, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct SilenceRange {
    pub start_seconds: f64,
    pub end_seconds: f64,
}

#[cfg_attr(feature = "wasm", derive(tsify_next::Tsify))]
#[cfg_attr(feature = "wasm", tsify(from_wasm_abi))]
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DetectSilencesOptions {
    pub samples: Vec<f32>,
    pub sample_rate: f64,
    #[serde(default = "default_threshold_db")]
    pub threshold_db: f64,
    #[serde(default = "default_min_silence_seconds")]
    pub min_silence_seconds: f64,
    #[serde(default = "default_padding_seconds")]
    pub padding_seconds: f64,
}

fn default_threshold_db() -> f64 {
    DEFAULT_THRESHOLD_DB
}

fn default_min_silence_seconds() -> f64 {
    DEFAULT_MIN_SILENCE_SECONDS
}

fn default_padding_seconds() -> f64 {
    DEFAULT_PADDING_SECONDS
}

#[export]
pub fn detect_silences(
    DetectSilencesOptions {
        samples,
        sample_rate,
        threshold_db,
        min_silence_seconds,
        padding_seconds,
    }: DetectSilencesOptions,
) -> Vec<SilenceRange> {
    detect_silences_impl(
        &samples,
        sample_rate,
        threshold_db,
        min_silence_seconds,
        padding_seconds,
    )
}

pub fn detect_silences_impl(
    samples: &[f32],
    sample_rate: f64,
    threshold_db: f64,
    min_silence_seconds: f64,
    padding_seconds: f64,
) -> Vec<SilenceRange> {
    if samples.is_empty() || sample_rate <= 0.0 {
        return Vec::new();
    }

    let window_size = ((sample_rate * WINDOW_SECONDS).round() as usize).max(1);
    let hop_size = ((sample_rate * HOP_SECONDS).round() as usize).max(1);
    let threshold = 10f64.powf(threshold_db / 20.0);

    let window_count = if samples.len() >= window_size {
        (samples.len() - window_size) / hop_size + 1
    } else {
        1
    };

    let mut silent_windows = vec![false; window_count];
    for window_index in 0..window_count {
        let start = window_index * hop_size;
        let end = (start + window_size).min(samples.len());
        let mut sum_squares = 0.0f64;
        for sample in &samples[start..end] {
            let value = f64::from(*sample);
            sum_squares += value * value;
        }
        let rms = (sum_squares / (end - start) as f64).sqrt();
        silent_windows[window_index] = rms < threshold;
    }

    let duration_seconds = samples.len() as f64 / sample_rate;
    let mut raw_ranges: Vec<SilenceRange> = Vec::new();
    let mut run_start: Option<usize> = None;

    for window_index in 0..=window_count {
        let is_silent = window_index < window_count && silent_windows[window_index];
        if is_silent && run_start.is_none() {
            run_start = Some(window_index);
        } else if !is_silent {
            if let Some(start_window) = run_start.take() {
                let start_seconds = (start_window * hop_size) as f64 / sample_rate;
                let end_window = window_index.saturating_sub(1);
                let end_seconds = ((end_window * hop_size + window_size) as f64 / sample_rate)
                    .min(duration_seconds);
                if end_seconds > start_seconds {
                    raw_ranges.push(SilenceRange {
                        start_seconds,
                        end_seconds,
                    });
                }
            }
        }
    }

    let mut padded: Vec<SilenceRange> = Vec::new();
    for range in raw_ranges {
        if range.end_seconds - range.start_seconds < min_silence_seconds {
            continue;
        }
        let start_seconds = range.start_seconds + padding_seconds;
        let end_seconds = range.end_seconds - padding_seconds;
        if end_seconds - start_seconds > MIN_KEEP_AFTER_PAD {
            padded.push(SilenceRange {
                start_seconds,
                end_seconds,
            });
        }
    }

    padded
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn empty_samples_returns_empty() {
        assert!(detect_silences_impl(&[], 44100.0, -40.0, 0.6, 0.08).is_empty());
    }

    #[test]
    fn silence_is_detected() {
        let sample_rate = 1000.0;
        let mut samples = vec![0.0f32; 2000];
        for sample in &mut samples[500..1500] {
            *sample = 0.5;
        }
        let ranges = detect_silences_impl(&samples, sample_rate, -20.0, 0.2, 0.0);
        assert!(!ranges.is_empty());
    }
}
