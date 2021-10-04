/*
    Copyright 2021 Picovoice Inc.

    You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
    file accompanying this source.

    Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
    an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
    specific language governing permissions and limitations under the License.
*/

use lazy_static::lazy_static;
use libc::c_char;
use libloading::{Library, Symbol};
use std::cmp::PartialEq;
use std::ffi::{CStr, CString};
use std::ptr::addr_of_mut;
use std::sync::Arc;

lazy_static! {
    static ref PV_COBRA_LIB: Result<Library, CobraError> = {
        unsafe {
            match Library::new(pv_library_path()) {
                Ok(symbol) => Ok(symbol),
                Err(err) => Err(CobraError::new(
                    CobraErrorStatus::LibraryLoadError,
                    &format!("Failed to load pvrecorder dynamic library: {}", err),
                )),
            }
        }
    };
}

use crate::util::*;

#[repr(C)]
struct CCobra {}

#[repr(C)]
#[derive(PartialEq, Clone, Debug)]
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

#[derive(Clone, Debug)]
pub enum CobraErrorStatus {
    LibraryError(PvStatus),
    LibraryLoadError,
    FrameLengthError,
    ArgumentError,
}

#[derive(Clone, Debug)]
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
        let inner = CobraInner::init(app_id.into());
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

fn load_library_fn<T>(function_name: &[u8]) -> Result<Symbol<T>, CobraError> {
    match &*PV_COBRA_LIB {
        Ok(lib) => unsafe {
            lib.get(function_name).map_err(|err| {
                CobraError::new(
                    CobraErrorStatus::LibraryLoadError,
                    &format!(
                        "Failed to load function symbol from pvrecorder library: {}",
                        err
                    ),
                )
            })
        },
        Err(err) => Err((*err).clone()),
    }
}

macro_rules! check_fn_call_status {
    ($status:ident, $function_name:literal) => {
        if $status != PvStatus::SUCCESS {
            return Err(CobraError::new(
                CobraErrorStatus::LibraryError($status),
                &format!(
                    "Function '{}' in the pvrecorder library failed",
                    $function_name
                ),
            ));
        }
    };
}

struct CobraInnerVTable {
    pv_cobra_process: Symbol<'static, PvCobraProcessFn>,
    pv_cobra_delete: Symbol<'static, PvCobraDeleteFn>,
}

struct CobraInner {
    ccobra: *mut CCobra,
    frame_length: i32,
    sample_rate: i32,
    version: String,
    vtable: CobraInnerVTable,
}

impl CobraInner {
    pub fn init<S: Into<String>>(app_id: S) -> Result<Self, CobraError> {
        unsafe {
            let pv_cobra_init: Symbol<PvCobraInitFn> = load_library_fn(b"pv_cobra_init")?;

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

            let pv_cobra_process: Symbol<PvCobraProcessFn> = load_library_fn(b"pv_cobra_process")?;

            let pv_cobra_delete: Symbol<PvCobraDeleteFn> = load_library_fn(b"pv_cobra_delete")?;

            let pv_sample_rate: Symbol<PvSampleRateFn> = load_library_fn(b"pv_sample_rate")?;

            let pv_cobra_frame_length: Symbol<PvCobraFrameLengthFn> =
                load_library_fn(b"pv_cobra_frame_length")?;

            let pv_cobra_version: Symbol<PvCobraVersionFn> = load_library_fn(b"pv_cobra_version")?;

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

            let vtable = CobraInnerVTable {
                pv_cobra_process,
                pv_cobra_delete,
            };

            return Ok(Self {
                ccobra,
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
        check_fn_call_status!(status, "pv_cobra_process");

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
