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
type PvGetErrorStackFn =
    unsafe extern "C" fn(message_stack: *mut *mut *mut c_char, message_stack_depth: *mut i32);
type PvFreeErrorStackFn = unsafe extern "C" fn(message_stack: *mut *mut c_char);
type PvSetSdkFn = unsafe extern "C" fn(sdk: *const c_char);

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
    pub message: String,
    pub message_stack: Vec<String>,
}

impl CobraError {
    pub fn new(status: CobraErrorStatus, message: impl Into<String>) -> Self {
        Self {
            status,
            message: message.into(),
            message_stack: Vec::new()
        }
    }

    pub fn new_with_stack(
        status: CobraErrorStatus,
        message: impl Into<String>,
        message_stack: impl Into<Vec<String>>
    ) -> Self {
        Self {
            status,
            message: message.into(),
            message_stack: message_stack.into(),
        }
    }
}

impl std::fmt::Display for CobraError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> Result<(), std::fmt::Error> {
        let mut message_string = String::new();
        message_string.push_str(&format!("{} with status '{:?}'", self.message, self.status));

        if !self.message_stack.is_empty() {
            message_string.push(':');
            for x in 0..self.message_stack.len() {
                message_string.push_str(&format!("  [{}] {}\n", x, self.message_stack[x]))
            };
        }
        write!(f, "{}", message_string)
    }
}

impl std::error::Error for CobraError {}

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

fn check_fn_call_status(
    vtable: &CobraInnerVTable,
    status: PvStatus,
    function_name: &str
) -> Result<(), CobraError> {
    match status {
        PvStatus::SUCCESS => Ok(()),
        _ => unsafe {
            let mut message_stack_ptr: *mut c_char = std::ptr::null_mut();
            let mut message_stack_ptr_ptr = addr_of_mut!(message_stack_ptr);

            let mut message_stack_depth: i32 = 0;
            (vtable.pv_get_error_stack)(
                addr_of_mut!(message_stack_ptr_ptr),
                addr_of_mut!(message_stack_depth),
            );

            let mut message_stack = Vec::new();
            for i in 0..message_stack_depth as usize {
                let message = CStr::from_ptr(*message_stack_ptr_ptr.add(i));
                let message = message.to_string_lossy().into_owned();
                message_stack.push(message);
            }

            (vtable.pv_free_error_stack)(message_stack_ptr_ptr);

            Err(CobraError::new_with_stack(
                CobraErrorStatus::LibraryError(status),
                format!("'{function_name}' failed"),
                message_stack,
            ))
        },
    }
}

struct CobraInnerVTable {
    pv_cobra_init: RawSymbol<PvCobraInitFn>,
    pv_cobra_process: RawSymbol<PvCobraProcessFn>,
    pv_cobra_delete: RawSymbol<PvCobraDeleteFn>,
    pv_sample_rate: RawSymbol<PvSampleRateFn>,
    pv_cobra_frame_length: RawSymbol<PvCobraFrameLengthFn>,
    pv_cobra_version: RawSymbol<PvCobraVersionFn>,
    pv_get_error_stack: RawSymbol<PvGetErrorStackFn>,
    pv_free_error_stack: RawSymbol<PvFreeErrorStackFn>,
    pv_set_sdk: RawSymbol<PvSetSdkFn>,

    _lib_guard: Library,
}

impl CobraInnerVTable {
    pub fn new(lib: Library) -> Result<Self, CobraError> {
        unsafe {
            Ok(Self {
                pv_cobra_init: load_library_fn(&lib, b"pv_cobra_init")?,
                pv_cobra_process: load_library_fn::<PvCobraProcessFn>(&lib, b"pv_cobra_process")?,
                pv_cobra_delete: load_library_fn::<PvCobraDeleteFn>(&lib, b"pv_cobra_delete")?,
                pv_sample_rate: load_library_fn(&lib, b"pv_sample_rate")?,
                pv_cobra_frame_length: load_library_fn(&lib, b"pv_cobra_frame_length")?,
                pv_cobra_version: load_library_fn(&lib, b"pv_cobra_version")?,
                pv_get_error_stack: load_library_fn(&lib, b"pv_get_error_stack")?,
                pv_free_error_stack: load_library_fn(&lib, b"pv_free_error_stack")?,
                pv_set_sdk: load_library_fn(&lib, b"pv_set_sdk")?,

                _lib_guard: lib,
            })
        }
    }
}

struct CobraInner {
    ccobra: *mut CCobra,
    frame_length: i32,
    sample_rate: i32,
    version: String,
    vtable: CobraInnerVTable,
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
        let vtable = CobraInnerVTable::new(lib)?;

        let sdk_string = match CString::new("rust") {
            Ok(sdk_string) => sdk_string,
            Err(err) => {
                return Err(CobraError::new(
                    CobraErrorStatus::ArgumentError,
                    format!("sdk_string is not a valid C string {err}"),
                ))
            }
        };

        let pv_access_key = CString::new(access_key).map_err(|err| {
            CobraError::new(
                CobraErrorStatus::ArgumentError,
                format!("AccessKey is not a valid C string {}", err),
            )
        })?;

        let mut ccobra = std::ptr::null_mut();

        // SAFETY: most of the unsafe comes from the `load_library_fn` which is
        // safe, because we don't use the raw symbols after this function
        // anymore.
        let (sample_rate, frame_length, version) = unsafe {
            (vtable.pv_set_sdk)(sdk_string.as_ptr());

            let status = (vtable.pv_cobra_init)(
                pv_access_key.as_ptr(),
                addr_of_mut!(ccobra),
            );
            check_fn_call_status(&vtable, status, "pv_cobra_init")?;

            let version = CStr::from_ptr((vtable.pv_cobra_version)())
                .to_string_lossy()
                .into_owned();

            (
                (vtable.pv_sample_rate)(),
                (vtable.pv_cobra_frame_length)(),
                version,
            )
        };

        Ok(Self {
            ccobra,
            sample_rate,
            frame_length,
            version,
            vtable,
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
        check_fn_call_status(&self.vtable, status, "pv_cobra_process")?;

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
