/*
    Copyright 2018-2025 Picovoice Inc.

    You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
    file accompanying this source.

    Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
    an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
    specific language governing permissions and limitations under the License.
*/

#ifndef PV_COBRA_H
#define PV_COBRA_H

#include <stdbool.h>
#include <stdint.h>

#include "picovoice.h"

#ifdef __cplusplus

extern "C" {

#endif

/**
 * Forward declaration for Cobra wake word engine. It detects utterances of given keywords within an incoming stream
 * of audio in real-time. It processes incoming audio in consecutive frames and for each frame emits the detection
 * result. The number of samples per frame can be attained by calling 'pv_cobra_frame_length()'. The incoming audio
 * needs to have a sample rate equal to 'pv_sample_rate()' and be 16-bit linearly-encoded. Cobra operates on
 * single-channel audio.
 */
typedef struct pv_cobra pv_cobra_t;


/**
 * Constructor.
 *
 * @param access_key AccessKey obtained from Picovoice Console (https://console.picovoice.ai/).
 * @param memory_size Memory size in bytes.
 * @param memory_buffer Memory buffer needs to be 8-byte aligned.
 * @param[out] object Constructed instance of Cobra.
 * @return Status code. Returns `PV_STATUS_INVALID_ARGUMENT` or `PV_STATUS_OUT_OF_MEMORY` on failure.
 */
PV_API pv_status_t pv_cobra_init(const char *access_key, int32_t memory_size, void *memory_buffer, pv_cobra_t **object);

/**
 * Destructor.
 *
 * @param object Cobra object.
 */
PV_API void pv_cobra_delete(pv_cobra_t *object);

/**
 * Processes a frame of the incoming audio stream and emits the probability of voice activity.
 *
 * @param object Cobra object.
 * @param pcm A frame of audio samples. The number of samples per frame can be attained by calling
 * `pv_cobra_frame_length()`. The incoming audio needs to have a sample rate equal to `pv_sample_rate()` and be 16-bit
 * linearly-encoded. Cobra operates on single-channel audio.
 * @param[out] is_voiced Probability of voice activity. It is a floating-point number within [0, 1].
 * @return Returns `PV_STATUS_INVALID_ARGUMENT` or `PV_STATUS_OUT_OF_MEMORY` on failure.
 */
PV_API pv_status_t pv_cobra_process(pv_cobra_t *object, const int16_t *pcm, float *is_voiced);

/**
 * Getter for number of audio samples per frame.
 *
 * @return Frame length.
 */
PV_API int32_t pv_cobra_frame_length(void);

/**
 * Getter for version.
 *
 * @return Version.
 */
PV_API const char *pv_cobra_version(void);

/**
 * Computes the minimum required memory buffer size, in bytes, for Cobra.
 * A relatively large value for 'preliminary_memory_buffer' is suggested (e.g., 50 kilobytes).
 * Then, 'pv_cobra_init' can be called optimally passing a memory buffer with the size of 'min_memory_buffer_size'.
 *
 * @param preliminary_memory_size Memory size in bytes.
 * @param preliminary_memory_buffer Memory needs to be 8-byte aligned.
 * @param[out] min_memory_buffer_size minimum required memory buffer size in bytes.
 * @return Status code. Returns 'PV_STATUS_INVALID_ARGUMENT', 'PV_STATUS_INVALID_STATE', or 'PV_STATUS_OUT_OF_MEMORY'
 * on failure.
 * */

PV_API pv_status_t pv_cobra_get_min_memory_buffer_size(
        void *preliminary_memory_buffer,
        int32_t preliminary_memory_size,
        int32_t *min_memory_buffer_size);


#ifdef __cplusplus
}

#endif

#endif // PV_COBRA_H
