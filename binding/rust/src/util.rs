/*
    Copyright 2021-2024 Picovoice Inc.

    You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
    file accompanying this source.

    Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
    an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
    specific language governing permissions and limitations under the License.
*/

#[allow(unused_imports)]
use log::*;

#[allow(unused_imports)]
use std::process::Command;

use std::path::PathBuf;

const DEFAULT_RELATIVE_LIBRARY_DIR: &str = "lib/";

#[allow(dead_code)]
const RPI_MACHINES: [&str; 3] = ["arm11", "cortex-a53", "cortex-a72"];

#[cfg(target_os = "linux")]
#[allow(dead_code)]
fn find_machine_type() -> String {
    let cpu_info = Command::new("cat")
        .arg("/proc/cpuinfo")
        .output()
        .expect("Failed to retrieve cpu info");
    let cpu_part_list = std::str::from_utf8(&cpu_info.stdout)
        .unwrap()
        .split('\n')
        .filter(|x| x.contains("CPU part"))
        .collect::<Vec<_>>();

    if cpu_part_list.is_empty() {
        panic!("Unsupported CPU");
    }

    let cpu_part = cpu_part_list[0]
        .split(' ')
        .collect::<Vec<_>>()
        .pop()
        .unwrap()
        .to_lowercase();

    let machine = match cpu_part.as_str() {
        "0xb76" => "arm11",
        "0xd03" => "cortex-a53",
        "0xd08" => "cortex-a72",
        _ => "unsupported",
    };

    String::from(machine)
}

#[cfg(all(target_os = "macos", target_arch = "x86_64"))]
fn base_library_path() -> PathBuf {
    return PathBuf::from("mac/x86_64/libpv_cobra.dylib");
}

#[cfg(all(target_os = "macos", target_arch = "aarch64"))]
fn base_library_path() -> PathBuf {
    return PathBuf::from("mac/arm64/libpv_cobra.dylib");
}

#[cfg(target_os = "windows")]
fn base_library_path() -> PathBuf {
    return PathBuf::from("windows/amd64/libpv_cobra.dll");
}

#[cfg(all(target_os = "linux", target_arch = "x86_64"))]
fn base_library_path() -> PathBuf {
    PathBuf::from("linux/x86_64/libpv_cobra.so")
}

#[cfg(all(target_os = "linux", any(target_arch = "arm", target_arch = "aarch64")))]
fn base_library_path() -> PathBuf {
    let machine = find_machine_type();
    return match machine.as_str() {
        machine if RPI_MACHINES.contains(&machine) => {
            if cfg!(target_arch = "aarch64") {
                PathBuf::from(format!("raspberry-pi/{}-aarch64/libpv_cobra.so", &machine))
            } else {
                PathBuf::from(format!("raspberry-pi/{}/libpv_cobra.so", &machine))
            }
        }
        _ => {
            warn!("WARNING: Please be advised that this device is not officially supported by Picovoice.\nFalling back to the armv6-based (Raspberry Pi Zero) library. This is not tested nor optimal.\nFor the model, use Raspberry Pi's models");
            PathBuf::from("raspberry-pi/arm11/libpv_cobra.so")
        }
    };
}

pub fn pv_library_path() -> PathBuf {
    let mut path = PathBuf::from(env!("OUT_DIR"));
    path.push(DEFAULT_RELATIVE_LIBRARY_DIR);
    path.push(base_library_path());
    path
}
