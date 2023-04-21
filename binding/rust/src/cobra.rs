/*
    Copyright 2021-2023 Picovoice Inc.

    You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
    file accompanying this source.

    Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
    an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
    specific language governing permissions and limitations under the License.
*/

use std::cmp::PartialEq;
use std::ffi::{CStr, CString};
use std::path::PathBuf;
use std::ptr::addr_of_mut;
use std::sync::Arc;

use libc::c_char;
use libloading::{Library, Symbol};

use crate::util::pv_library_path;

#[cfg(unix)]
use libloading::os::unix::Symbol as RawSymbol;
#[cfg(windows)]
use libloading::os::windows::Symbol as RawSymbol;

#[repr(C)]
struct CCobra {}

#[repr(C)]
#[derive(PartialEq, Eq, Clone, Debug)]
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
    unsafe extern "C" fn(access_key: *const c_char, object: *mut *mut CCobra) -> PvStatus;
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
    pub fn new(status: CobraErrorStatus, message: impl Into<String>) -> Self {
        Self {
            status,
            message: Some(message.into()),
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
    pub fn new<S: Into<String>>(access_key: S) -> Result<Cobra, CobraError> {
        let inner = CobraInner::init(access_key.into(), pv_library_path());
        match inner {
            Ok(inner) => Ok(Cobra {
                inner: Arc::new(inner),
            }),
            Err(err) => Err(err),
        }
    }

    pub fn new_with_library<S: Into<String>, P: Into<PathBuf>>(access_key: S, library_path: P) -> Result<Cobra, CobraError> {
        let inner = CobraInner::init(access_key.into(), library_path);
        match inner {
            Ok(inner) => Ok(Cobra {
                inner: Arc::new(inner),
            }),
            Err(err) => Err(err),
        }
    }

    pub fn process(&self, pcm: &[i16]) -> Result<f32, CobraError> {
        self.inner.process(pcm)
    }

    pub fn frame_length(&self) -> u32 {
        self.inner.frame_length as u32
    }

    pub fn sample_rate(&self) -> u32 {
        self.inner.sample_rate as u32
    }

    pub fn version(&self) -> String {
        self.inner.version.clone()
    }
}

unsafe fn load_library_fn<T>(
    library: &Library,
    function_name: &[u8],
) -> Result<RawSymbol<T>, CobraError> {
    library
        .get(function_name)
        .map(|s: Symbol<T>| s.into_raw())
        .map_err(|err| {
            CobraError::new(
                CobraErrorStatus::LibraryLoadError,
                format!("Failed to load function symbol from cobra library: {}", err),
            )
        })
}

fn check_fn_call_status(status: PvStatus, function_name: &str) -> Result<(), CobraError> {
    match status {
        PvStatus::SUCCESS => Ok(()),
        _ => Err(CobraError::new(
            CobraErrorStatus::LibraryError(status),
            format!("Function '{}' in the cobra library failed", function_name),
        )),
    }
}

struct CobraInnerVTable {
    pv_cobra_process: RawSymbol<PvCobraProcessFn>,
    pv_cobra_delete: RawSymbol<PvCobraDeleteFn>,

    _lib_guard: Library,
}

struct CobraInner {
    ccobra: *mut CCobra,
    frame_length: i32,
    sample_rate: i32,
    version: String,
    vtable: CobraInnerVTable,
}

impl CobraInnerVTable {
    pub fn new(lib: Library) -> Result<Self, CobraError> {
        unsafe {
            Ok(Self {
                pv_cobra_process: load_library_fn::<PvCobraProcessFn>(&lib, b"pv_cobra_process")?,
                pv_cobra_delete: load_library_fn::<PvCobraDeleteFn>(&lib, b"pv_cobra_delete")?,

                _lib_guard: lib,
            })
        }
    }
}

impl CobraInner {
    pub fn init<S: Into<String>, P: Into<PathBuf>>(access_key: S, library_path: P) -> Result<Self, CobraError> {

        let access_key: String = access_key.into();
        let library_path: PathBuf = library_path.into();

        if access_key.is_empty() {
            return Err(CobraError::new(
                CobraErrorStatus::ArgumentError,
                "AccessKey is required for Cobra initialization",
            ));
        }

        if !library_path.exists() {
            return Err(CobraError::new(
                CobraErrorStatus::ArgumentError,
                format!(
                    "Couldn't find Cobra's dynamic library at {}",
                    library_path.display()
                ),
            ));
        }

        let lib = unsafe { Library::new(library_path) }.map_err(|err| {
            CobraError::new(
                CobraErrorStatus::LibraryLoadError,
                format!("Failed to load cobra dynamic library: {}", err),
            )
        })?;

        let pv_access_key = CString::new(access_key).map_err(|err| {
            CobraError::new(
                CobraErrorStatus::ArgumentError,
                format!("AccessKey is not a valid C string {}", err),
            )
        })?;

        let (ccobra, sample_rate, frame_length, version) = unsafe {
            let pv_cobra_init = load_library_fn::<PvCobraInitFn>(&lib, b"pv_cobra_init")?;
            let pv_cobra_version = load_library_fn::<PvCobraVersionFn>(&lib, b"pv_cobra_version")?;
            let pv_sample_rate = load_library_fn::<PvSampleRateFn>(&lib, b"pv_sample_rate")?;
            let pv_cobra_frame_length =
                load_library_fn::<PvCobraFrameLengthFn>(&lib, b"pv_cobra_frame_length")?;

            let mut ccobra = std::ptr::null_mut();

            check_fn_call_status(
                pv_cobra_init(
                    pv_access_key.as_ptr(),
                    addr_of_mut!(ccobra),
                ),
                "pv_cobra_init",
            )?;

            let version = match CStr::from_ptr(pv_cobra_version()).to_str() {
                Ok(string) => string.to_string(),
                Err(err) => {
                    return Err(CobraError::new(
                        CobraErrorStatus::LibraryLoadError,
                        format!("Failed to get version info from Cobra Library: {}", err),
                    ))
                }
            };

            (
                ccobra,
                pv_sample_rate(),
                pv_cobra_frame_length(),
                version,
            )
        };

        Ok(Self {
            ccobra,
            sample_rate,
            frame_length,
            version,
            vtable: CobraInnerVTable::new(lib)?,
        })
    }

    pub fn process(&self, pcm: &[i16]) -> Result<f32, CobraError> {
        if pcm.len() as i32 != self.frame_length {
            return Err(CobraError::new(
                CobraErrorStatus::FrameLengthError,
                format!(
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
        check_fn_call_status(status, "pv_cobra_process")?;

        Ok(result)
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
