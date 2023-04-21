/*
    Copyright 2019-2023 Picovoice Inc.

    You may not use this file except in compliance with the license. A copy of
   the license is located in the "LICENSE" file accompanying this source.

    Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
   WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
   License for the specific language governing permissions and limitations under
   the License.
*/

#ifndef PV_COBRA_H
#define PV_COBRA_H

#include <stdbool.h>
#include <stdint.h>

#include "picovoice.h"

#ifdef __cplusplus

extern "C"

{

#endif

/**
 * Forward declaration for Cobra voice activity detection (VAD) engine. It
 * detects speech signals within an incoming stream of audio in real-time. It
 * processes incoming audio in consecutive frames and for each frame emits the
 * probability of voice activity. The number of samples per frame can be
 * attained by calling 'pv_cobra_frame_length()'. The incoming audio needs to
 * have a sample rate equal to 'pv_sample_rate()' and be 16-bit
 * linearly-encoded. Cobra operates on single-channel audio.
 */
typedef struct pv_cobra pv_cobra_t;

/**
 * Constructor.
 *
 * @param access_key AccessKey provided by Picovoice Console
 * (https://picovoice.ai/console/)
 * @param object Constructed instance of Cobra.
 * @return Status code. Returns 'PV_STATUS_INVALID_ARGUMENT' or
 * 'PV_STATUS_OUT_OF_MEMORY', 'PV_STATUS_RUNTIME_ERROR',
 * 'PV_STATUS_ACTIVATION_ERROR', 'PV_STATUS_ACTIVATION_LIMIT_REACHED',
 * 'PV_STATUS_ACTIVATION_THROTTLED', or 'PV_STATUS_ACTIVATION_REFUSED' on
 * failure.
 */
PV_API pv_status_t pv_cobra_init(const char *access_key, pv_cobra_t **object);

/**
 * Destructor.
 *
 * @param object Cobra object.
 */
PV_API void pv_cobra_delete(pv_cobra_t *object);

/**
 * Processes a frame of the incoming audio stream and emits the probability of
 * voice activity.
 *
 * @param object Cobra object.
 * @param pcm A frame of audio samples. The number of samples per frame can be
 * attained by calling 'pv_cobra_frame_length()'. The incoming audio needs to
 * have a sample rate equal to 'pv_sample_rate()' and be 16-bit
 * linearly-encoded. Cobra operates on single-channel audio.
 * @param[out] is_voiced Probability of voice activity. It is a floating-point
 * number within [0, 1].
 * @return Returns 'PV_STATUS_INVALID_ARGUMENT' or 'PV_STATUS_OUT_OF_MEMORY' on
 * failure.
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

#ifdef __cplusplus
}

#endif

#endif // PV_COBRA_H
