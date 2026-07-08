mod silence;

pub use silence::{
    detect_silences, DetectSilencesOptions, SilenceRange, DEFAULT_MIN_SILENCE_SECONDS,
    DEFAULT_PADDING_SECONDS, DEFAULT_THRESHOLD_DB,
};
