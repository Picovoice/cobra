/*
    Copyright 2021 Picovoice Inc.

    You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
    file accompanying this source.

    Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
    an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
    specific language governing permissions and limitations under the License.
*/

use libc::c_char;
use libloading::{Library, Symbol};
use std::cmp::PartialEq;
use std::convert::AsRef;
use std::ffi::{CStr, CString};
use std::path::Path;
use std::ptr::addr_of_mut;
use std::sync::Arc;

#[cfg(target_family = "unix")]
use libloading::os::unix::Symbol as RawSymbol;

#[cfg(target_family = "windows")]
use libloading::os::windows::Symbol as RawSymbol;

use crate::util::*;

#[repr(C)]
struct CCobra {}

#[repr(C)]
#[derive(PartialEq, Debug)]
#[allow(non_camel_case_types)]
pub enum PvStatus {
    SUCCESS = 0,
    OUT_OF_MEMORY = 1,
    IO_ERROR = 2,
    INVALID_ARGUMENT = 3,
    STOP_ITERATION = 4,
    KEY_ERROR = 5,
    INVALID_STATE = 6,
    PV_STATUS_RUNTIME_ERROR = 7,
    PV_STATUS_ACTIVATION_ERROR = 8,
    PV_STATUS_ACTIVATION_LIMIT_REACHED = 9,
    PV_STATUS_ACTIVATION_THROTTLED = 10,
    PV_STATUS_ACTIVATION_REFUSED = 11,
}

type PvCobraInitFn =
    unsafe extern "C" fn(app_id: *const c_char, object: *mut *mut CCobra) -> PvStatus;
type PvSampleRateFn = unsafe extern "C" fn() -> i32;
type PvCobraFrameLengthFn = unsafe extern "C" fn() -> i32;
type PvCobraVersionFn = unsafe extern "C" fn() -> *mut c_char;
type PvCobraProcessFn =
    unsafe extern "C" fn(object: *mut CCobra, pcm: *const i16, is_voiced: *mut f32) -> PvStatus;
type PvCobraDeleteFn = unsafe extern "C" fn(object: *mut CCobra);

#[derive(Debug)]
pub enum CobraErrorStatus {
    LibraryError(PvStatus),
    LibraryLoadError,
    FrameLengthError,
    ArgumentError,
}

#[derive(Debug)]
pub struct CobraError {
    pub status: CobraErrorStatus,
    pub message: Option<String>,
}

impl CobraError {
    pub fn new(status: CobraErrorStatus, message: &str) -> Self {
        CobraError {
            status,
            message: Some(message.to_string()),
        }
    }
}

impl std::fmt::Display for CobraError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match &self.message {
            Some(message) => write!(f, "{}: {:?}", message, self.status),
            None => write!(f, "Cobra error: {:?}", self.status),
        }
    }
}

#[derive(Clone)]
pub struct Cobra {
    inner: Arc<CobraInner>,
}

impl Cobra {
    pub fn new<S: Into<String>>(app_id: S) -> Result<Cobra, CobraError> {
        let library_path = pv_library_path();
        let inner = CobraInner::init(app_id.into(), library_path);
        return match inner {
            Ok(inner) => Ok(Cobra {
                inner: Arc::new(inner),
            }),
            Err(err) => Err(err),
        };
    }

    pub fn process(&self, pcm: &[i16]) -> Result<f32, CobraError> {
        return self.inner.process(pcm);
    }

    pub fn frame_length(&self) -> u32 {
        return self.inner.frame_length as u32;
    }

    pub fn sample_rate(&self) -> u32 {
        return self.inner.sample_rate as u32;
    }

    pub fn version(&self) -> String {
        return self.inner.version.clone();
    }
}

macro_rules! load_library_fn {
    ($lib:ident, $function_name:literal) => {
        match $lib.get($function_name) {
            Ok(symbol) => symbol,
            Err(err) => {
                return Err(CobraError::new(
                    CobraErrorStatus::LibraryLoadError,
                    &format!("Failed to load function symbol from Cobra library: {}", err),
                ))
            }
        };
    };
}

struct CobraInnerVTable {
    pv_cobra_process: RawSymbol<PvCobraProcessFn>,
    pv_cobra_delete: RawSymbol<PvCobraDeleteFn>,
}

struct CobraInner {
    ccobra: *mut CCobra,
    _lib: Library,
    frame_length: i32,
    sample_rate: i32,
    version: String,
    vtable: CobraInnerVTable,
}

impl CobraInner {
    pub fn init<S: Into<String>, P: AsRef<Path>>(
        app_id: S,
        library_path: P,
    ) -> Result<Self, CobraError> {
        unsafe {
            if !library_path.as_ref().exists() {
                return Err(CobraError::new(
                    CobraErrorStatus::ArgumentError,
                    &format!(
                        "Couldn't find Cobra's dynamic library at {}",
                        library_path.as_ref().display()
                    ),
                ));
            }

            let lib = match Library::new(library_path.as_ref()) {
                Ok(symbol) => symbol,
                Err(err) => {
                    return Err(CobraError::new(
                        CobraErrorStatus::LibraryLoadError,
                        &format!("Failed to load cobra dynamic library: {}", err),
                    ))
                }
            };

            let pv_cobra_init: Symbol<PvCobraInitFn> = load_library_fn!(lib, b"pv_cobra_init");

            let app_id = match CString::new(app_id.into()) {
                Ok(app_id) => app_id,
                Err(err) => {
                    return Err(CobraError::new(
                        CobraErrorStatus::ArgumentError,
                        &format!("App id is not a valid C string {}", err),
                    ))
                }
            };
            let mut ccobra = std::ptr::null_mut();

            let status = pv_cobra_init(app_id.as_ptr(), addr_of_mut!(ccobra));
            if status != PvStatus::SUCCESS {
                return Err(CobraError::new(
                    CobraErrorStatus::LibraryLoadError,
                    "Failed to initialize the Cobra library",
                ));
            }

            let pv_cobra_process: Symbol<PvCobraProcessFn> =
                load_library_fn!(lib, b"pv_cobra_process");

            let pv_cobra_delete: Symbol<PvCobraDeleteFn> =
                load_library_fn!(lib, b"pv_cobra_delete");

            let pv_sample_rate: Symbol<PvSampleRateFn> = load_library_fn!(lib, b"pv_sample_rate");

            let pv_cobra_frame_length: Symbol<PvCobraFrameLengthFn> =
                load_library_fn!(lib, b"pv_cobra_frame_length");

            let pv_cobra_version: Symbol<PvCobraVersionFn> =
                load_library_fn!(lib, b"pv_cobra_version");

            let sample_rate = pv_sample_rate();
            let frame_length = pv_cobra_frame_length();
            let version = match CStr::from_ptr(pv_cobra_version()).to_str() {
                Ok(string) => string.to_string(),
                Err(err) => {
                    return Err(CobraError::new(
                        CobraErrorStatus::LibraryLoadError,
                        &format!("Failed to get version info from Cobra Library: {}", err),
                    ))
                }
            };

            // Using the raw symbols means we have to ensure that "lib" outlives these refrences
            let vtable = CobraInnerVTable {
                pv_cobra_process: pv_cobra_process.into_raw(),
                pv_cobra_delete: pv_cobra_delete.into_raw(),
            };

            return Ok(Self {
                ccobra,
                _lib: lib,
                sample_rate,
                frame_length,
                version,
                vtable,
            });
        }
    }

    pub fn process(&self, pcm: &[i16]) -> Result<f32, CobraError> {
        if pcm.len() as i32 != self.frame_length {
            return Err(CobraError::new(
                CobraErrorStatus::FrameLengthError,
                &format!(
                    "Found a frame length of {} Expected {}",
                    pcm.len(),
                    self.frame_length
                ),
            ));
        }

        let mut result: f32 = 0.0;
        let status = unsafe {
            (self.vtable.pv_cobra_process)(self.ccobra, pcm.as_ptr(), addr_of_mut!(result))
        };

        if status != PvStatus::SUCCESS {
            return Err(CobraError::new(
                CobraErrorStatus::LibraryError(status),
                "Cobra library failed to process",
            ));
        }

        return Ok(result);
    }
}

unsafe impl Send for CobraInner {}
unsafe impl Sync for CobraInner {}

impl Drop for CobraInner {
    fn drop(&mut self) {
        unsafe {
            (self.vtable.pv_cobra_delete)(self.ccobra);
        }
    }
}
