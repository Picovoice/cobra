/*
    Copyright 2021 Picovoice Inc.

    You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
    file accompanying this source.

    Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
    an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
    specific language governing permissions and limitations under the License.
*/

#include <getopt.h>
#include <math.h>
#include <signal.h>
#include <stdio.h>
#include <stdlib.h>

#if defined(_WIN32) || defined(_WIN64)

#include <windows.h>

#else

#include <dlfcn.h>

#endif

#include "pv_cobra.h"
#include "pv_recorder.h"

static void *open_dl(const char *dl_path) {

#if defined(_WIN32) || defined(_WIN64)

    return LoadLibrary(dl_path);

#else

    return dlopen(dl_path, RTLD_NOW);

#endif

}

static void *load_symbol(void *handle, const char *symbol) {

#if defined(_WIN32) || defined(_WIN64)

    return GetProcAddress((HMODULE) handle, symbol);

#else

    return dlsym(handle, symbol);

#endif

}

static void close_dl(void *handle) {

#if defined(_WIN32) || defined(_WIN64)

    FreeLibrary((HMODULE) handle);

#else

    dlclose(handle);

#endif

}

static void print_dl_error(const char *message) {

#if defined(_WIN32) || defined(_WIN64)

    fprintf(stderr, "%s with code '%lu'.\n", message, GetLastError());

#else

    fprintf(stderr, "%s with '%s'.\n", message, dlerror());

#endif

}

static volatile bool is_interrupted = false;
static const float alpha = 0.15f;
static float voice_probability = 0.f;

static struct option long_options[] = {
        {"show_audio_devices", no_argument,       NULL, 's'},
        {"library_path",       required_argument, NULL, 'l'},
        {"access_key",         required_argument, NULL, 'a'},
        {"audio_device_index", required_argument, NULL, 'd'}
};

void print_usage(const char *program_name) {
    fprintf(stdout, "Usage: %s [-s] [-l LIBRARY_PATH -a ACCESS_KEY -d AUDIO_DEVICE_INDEX]\n", program_name);
}

void interrupt_handler(int _) {
    (void) _;
    is_interrupted = true;
}

void show_audio_devices(void) {
    char **devices = NULL;
    int32_t count = 0;

    pv_recorder_status_t status = pv_recorder_get_audio_devices(&count, &devices);
    if (status != PV_RECORDER_STATUS_SUCCESS) {
        fprintf(stderr, "Failed to get audio devices with: %s.\n", pv_recorder_status_to_string(status));
        exit(1);
    }

    fprintf(stdout, "Printing devices...\n");
    for (int32_t i = 0; i < count; i++) {
        fprintf(stdout, "index: %d, name: %s\n", i, devices[i]);
    }

    pv_recorder_free_device_list(count, devices);
}

static void print_analog(float is_voiced) {
    voice_probability = (alpha * is_voiced) + ((1 - alpha) * voice_probability);

    int32_t percentage = (int32_t) roundf(voice_probability * 100);
    int32_t bar_length = ((int32_t) roundf(voice_probability * 20)) * 3;
    int32_t empty_length = 20 - (bar_length / 3);
    fprintf(stdout,
            "\r[%3d%%]%.*s%.*s|", percentage,
            bar_length, "████████████████████",
            empty_length, "                    ");
    fflush(stdout);
}

int picovoice_main(int argc, char *argv[]) {
    signal(SIGINT, interrupt_handler);

    const char *library_path = NULL;
    const char *access_key = NULL;
    int32_t device_index = -1;

    int c;
    while ((c = getopt_long(argc, argv, "hsl:a:d:", long_options, NULL)) != -1) {
        switch (c) {
            case 's':
                show_audio_devices();
                return 0;
            case 'l':
                library_path = optarg;
                break;
            case 'a':
                access_key = optarg;
                break;
            case 'd':
                device_index = (int32_t) strtol(optarg, NULL, 10);
                break;
            default:
                exit(1);
        }
    }

    if (!library_path || !access_key) {
        print_usage(argv[0]);
        exit(1);
    }

    void *cobra_library = open_dl(library_path);
    if (!cobra_library) {
        fprintf(stderr, "failed to open library at '%s'.\n", library_path);
        exit(1);
    }

    const char *(*pv_status_to_string_func)(pv_status_t) = load_symbol(cobra_library, "pv_status_to_string");
    if (!pv_status_to_string_func) {
        print_dl_error("failed to load 'pv_status_to_string'");
        exit(1);
    }

    int32_t(*pv_sample_rate_func)() = load_symbol(cobra_library, "pv_sample_rate");
    if (!pv_sample_rate_func) {
        print_dl_error("failed to load 'pv_sample_rate'");
        exit(1);
    }

    pv_status_t(*pv_cobra_init_func)(const char *, pv_cobra_t **) = load_symbol(cobra_library, "pv_cobra_init");
    if (!pv_cobra_init_func) {
        print_dl_error("failed to load 'pv_cobra_init'");
        exit(1);
    }

    void (*pv_cobra_delete_func)(pv_cobra_t *) = load_symbol(cobra_library, "pv_cobra_delete");
    if (!pv_cobra_delete_func) {
        print_dl_error("failed to load 'pv_cobra_delete'");
        exit(1);
    }

    pv_status_t(*pv_cobra_process_func)(pv_cobra_t *, const int16_t *, float *) =
    load_symbol(cobra_library, "pv_cobra_process");
    if (!pv_cobra_process_func) {
        print_dl_error("failed to load 'pv_cobra_process'");
        exit(1);
    }

    int32_t(*pv_cobra_frame_length_func)() = load_symbol(cobra_library, "pv_cobra_frame_length");
    if (!pv_cobra_frame_length_func) {
        print_dl_error("failed to load 'pv_cobra_frame_length'");
        exit(1);
    }

    const char *(*pv_cobra_version_func)() = load_symbol(cobra_library, "pv_cobra_version");
    if (!pv_cobra_version_func) {
        print_dl_error("failed to load 'pv_cobra_version'");
        exit(1);
    }

    pv_cobra_t *cobra = NULL;
    pv_status_t cobra_status = pv_cobra_init_func(access_key, &cobra);
    if (cobra_status != PV_STATUS_SUCCESS) {
        fprintf(stderr, "failed to init with '%s'", pv_status_to_string_func(cobra_status));
        exit(1);
    }

    fprintf(stdout, "V%s\n\n", pv_cobra_version_func());

    const int32_t frame_length = 512;
    pv_recorder_t *recorder = NULL;
    pv_recorder_status_t recorder_status = pv_recorder_init(device_index, frame_length, 100, true, &recorder);
    if (recorder_status != PV_RECORDER_STATUS_SUCCESS) {
        fprintf(stderr, "Failed to initialize device with %s.\n", pv_recorder_status_to_string(recorder_status));
        exit(1);
    }

    const char *selected_device = pv_recorder_get_selected_device(recorder);
    fprintf(stdout, "Selected device: %s.\n", selected_device);

    fprintf(stdout, "Start recording...\n");
    recorder_status = pv_recorder_start(recorder);
    if (recorder_status != PV_RECORDER_STATUS_SUCCESS) {
        fprintf(stderr, "Failed to start device with %s.\n", pv_recorder_status_to_string(recorder_status));
        exit(1);
    }

    int16_t *pcm = malloc(frame_length * sizeof(int16_t));
    if (!pcm) {
        fprintf(stderr, "Failed to allocate pcm memory.\n");
        exit(1);
    }

    while (!is_interrupted) {
        recorder_status = pv_recorder_read(recorder, pcm);
        if (recorder_status != PV_RECORDER_STATUS_SUCCESS) {
            fprintf(stderr, "Failed to read with %s.\n", pv_recorder_status_to_string(recorder_status));
            exit(1);
        }

        float is_voiced = 0.f;
        cobra_status = pv_cobra_process_func(cobra, pcm, &is_voiced);
        if (cobra_status != PV_STATUS_SUCCESS) {
            fprintf(stderr, "'pv_cobra_process' failed with '%s'\n", pv_status_to_string_func(cobra_status));
            exit(1);
        }

        print_analog(is_voiced);
    }
    fprintf(stdout, "\n");

    recorder_status = pv_recorder_stop(recorder);
    if (recorder_status != PV_RECORDER_STATUS_SUCCESS) {
        fprintf(stderr, "Failed to stop device with %s.\n", pv_recorder_status_to_string(recorder_status));
        exit(1);
    }

    free(pcm);
    pv_recorder_delete(recorder);
    pv_cobra_delete_func(cobra);
    close_dl(cobra_library);

    return 0;
}

int main(int argc, char *argv[]) {

#if defined(_WIN32) || defined(_WIN64)

#define UTF8_COMPOSITION_FLAG (0)
#define NULL_TERMINATED (-1)

    LPWSTR *wargv = CommandLineToArgvW(GetCommandLineW(), &argc);
    if (wargv == NULL) {
        fprintf(stderr, "CommandLineToArgvW failed\n");
        exit(1);
    }

    char *utf8_argv[argc];

    for (int i = 0; i < argc; ++i) {
        // WideCharToMultiByte: https://docs.microsoft.com/en-us/windows/win32/api/stringapiset/nf-stringapiset-widechartomultibyte
        int arg_chars_num = WideCharToMultiByte(CP_UTF8, UTF8_COMPOSITION_FLAG, wargv[i], NULL_TERMINATED, NULL, 0, NULL, NULL);
        utf8_argv[i] = (char *) malloc(arg_chars_num * sizeof(char));
        if (!utf8_argv[i]) {
            fprintf(stderr, "failed to to allocate memory for converting args");
        }
        WideCharToMultiByte(CP_UTF8, UTF8_COMPOSITION_FLAG, wargv[i], NULL_TERMINATED, utf8_argv[i], arg_chars_num, NULL, NULL);
    }

    LocalFree(wargv);
    argv = utf8_argv;

#endif

    int result = picovoice_main(argc, argv);

#if defined(_WIN32) || defined(_WIN64)

    for (int i = 0; i < argc; ++i) {
        free(utf8_argv[i]);
    }

#endif

    return result;
}
