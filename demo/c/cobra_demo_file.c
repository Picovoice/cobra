/*
    Copyright 2021-2022 Picovoice Inc.
    You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
    file accompanying this source.
    Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
    an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
    specific language governing permissions and limitations under the License.
*/

#include <getopt.h>
#include <stdio.h>
#include <stdlib.h>
#include <sys/time.h>

#if defined(_WIN32) || defined(_WIN64)

#include <windows.h>

#else

#include <dlfcn.h>

#endif

#define DR_WAV_IMPLEMENTATION

#include "dr_wav.h"

#include "pv_cobra.h"

static void *open_dl(const char *dl_path) {

#if defined(_WIN32) || defined(_WIN64)

    return LoadLibrary(dl_path);

#else

    return dlopen(dl_path, RTLD_NOW);

#endif
}

static void *load_symbol(void *handle, const char *symbol) {

#if defined(_WIN32) || defined(_WIN64)

    return GetProcAddress((HMODULE)handle, symbol);

#else

    return dlsym(handle, symbol);

#endif
}

static void close_dl(void *handle) {

#if defined(_WIN32) || defined(_WIN64)

    FreeLibrary((HMODULE)handle);

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

static struct option long_options[] = {
        {"show_audio_devices",        no_argument,       NULL, 's'},
        {"library_path",              required_argument, NULL, 'l'},
        {"wav_path",                  required_argument, NULL, 'w'},
};

void print_usage(const char *program_name) {
    fprintf(stdout, "Usage: %s [-l LIBRARY_PATH -a ACCESS_KEY -w WAV_PATH]\n", program_name);
}

int picovoice_main(int argc, char *argv[]) {
    const char *library_path = NULL;
    const char *access_key = NULL;
    const char *wav_path = NULL;

    int c;
    while ((c = getopt_long(argc, argv, "l:a:w:", long_options, NULL)) != -1) {
        switch (c) {
            case 'l':
                library_path = optarg;
                break;
            case 'a':
                access_key = optarg;
                break;
            case 'w':
                wav_path = optarg;
                break;
            default:
                exit(1);
        }
    }

    if (!library_path || !access_key || !wav_path) {
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

    pv_status_t(*pv_cobra_init_func)( const char *, pv_cobra_t * *) = load_symbol(cobra_library, "pv_cobra_init");
    if (!pv_cobra_init_func) {
        print_dl_error("failed to load 'pv_cobra_init'");
        exit(1);
    }

    void (*pv_cobra_delete_func)(pv_cobra_t *) = load_symbol(cobra_library, "pv_cobra_delete");
    if (!pv_cobra_delete_func) {
        print_dl_error("failed to load 'pv_cobra_delete'");
        exit(1);
    }

    pv_status_t(*pv_cobra_process_func)(pv_cobra_t * , const int16_t *, float *) =
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

    drwav f;

    if (!drwav_init_file(&f, wav_path, NULL)) {
        fprintf(stderr, "failed to open wav file at '%s'.", wav_path);
        exit(1);
    }

    if (f.sampleRate != (uint32_t) pv_sample_rate_func()) {
        fprintf(stderr, "audio sample rate should be %d\n.", pv_sample_rate_func());
        exit(1);
    }

    if (f.bitsPerSample != 16) {
        fprintf(stderr, "audio format should be 16-bit\n.");
        exit(1);
    }

    if (f.channels != 1) {
        fprintf(stderr, "audio should be single-channel.\n");
        exit(1);
    }

    int16_t *pcm = calloc(pv_cobra_frame_length_func(), sizeof(int16_t));
    if (!pcm) {
        fprintf(stderr, "failed to allocate memory for audio frame.\n");
        exit(1);
    }

    pv_cobra_t *cobra = NULL;
    pv_status_t status = pv_cobra_init_func(access_key, &cobra);
    if (status != PV_STATUS_SUCCESS) {
        fprintf(stderr, "failed to init with '%s'", pv_status_to_string_func(status));
        exit(1);
    }

    fprintf(stdout, "V%s\n\n", pv_cobra_version_func());

    double total_cpu_time_usec = 0;
    double total_processed_time_usec = 0;

    while ((int32_t) drwav_read_pcm_frames_s16(&f, pv_cobra_frame_length_func(), pcm) == pv_cobra_frame_length_func()) {
        struct timeval before;
        gettimeofday(&before, NULL);

        float is_voiced = 0.f;
        status = pv_cobra_process_func(cobra, pcm, &is_voiced);
        if (status != PV_STATUS_SUCCESS) {
            fprintf(stderr, "failed to init with '%s'", pv_status_to_string_func(status));
            exit(1);
        }
        fprintf(stdout, "%.2f ", is_voiced);

        struct timeval after;
        gettimeofday(&after, NULL);

        total_cpu_time_usec +=
                (double) (after.tv_sec - before.tv_sec) * 1e6 + (double) (after.tv_usec - before.tv_usec);
        total_processed_time_usec += (pv_cobra_frame_length_func() * 1e6) / pv_sample_rate_func();
    }

    const double real_time_factor = total_cpu_time_usec / total_processed_time_usec;
    fprintf(stdout, "real time factor : %.3f\n", real_time_factor);

    fprintf(stdout, "\n");

    free(pcm);
    drwav_uninit(&f);
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
        utf8_argv[i] = (char *)malloc(arg_chars_num * sizeof(char));
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
