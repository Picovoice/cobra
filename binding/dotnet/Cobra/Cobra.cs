/*
    Copyright 2025 Picovoice Inc.

    You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
    file accompanying this source.

    Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
    an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
    specific language governing permissions and limitations under the License.
*/

using System;
using System.Reflection;
using System.Runtime.InteropServices;

namespace Pv
{
    /// <summary>
    /// Status codes returned by Cobra library
    /// </summary>
    public enum PvStatus
    {
        SUCCESS = 0,
        OUT_OF_MEMORY = 1,
        IO_ERROR = 2,
        INVALID_ARGUMENT = 3,
        STOP_ITERATION = 4,
        KEY_ERROR = 5,
        INVALID_STATE = 6,
        RUNTIME_ERROR = 7,
        ACTIVATION_ERROR = 8,
        ACTIVATION_LIMIT_REACHED = 9,
        ACTIVATION_THROTTLED = 10,
        ACTIVATION_REFUSED = 11
    }

    /// <summary>
    /// .NET binding for Cobra Voice Activity Detection Engine.
    /// </summary>
    public class Cobra : IDisposable
    {
        private const string LIBRARY = "libpv_cobra";
        private IntPtr _libraryPointer = IntPtr.Zero;

        static Cobra()
        {

#if NET6_0_OR_GREATER

            NativeLibrary.SetDllImportResolver(typeof(Cobra).Assembly, ImportResolver);

#endif

        }

#if NET6_0_OR_GREATER

        private static IntPtr ImportResolver(string libraryName, Assembly assembly, DllImportSearchPath? searchPath)
        {

#pragma warning disable IDE0058
#pragma warning disable IDE0059

            IntPtr libHandle = IntPtr.Zero;
            NativeLibrary.TryLoad(Utils.PvLibraryPath(libraryName), out libHandle);
            return libHandle;
        }

#pragma warning restore IDE0059
#pragma warning restore IDE0058

#endif

        [DllImport(LIBRARY, CallingConvention = CallingConvention.Cdecl)]
        private static extern PvStatus pv_cobra_init(
            IntPtr accessKey,
            IntPtr device,
            out IntPtr handle);

        [DllImport(LIBRARY, CallingConvention = CallingConvention.Cdecl)]
        private static extern void pv_cobra_delete(IntPtr handle);

        [DllImport(LIBRARY, CallingConvention = CallingConvention.Cdecl)]
        private static extern PvStatus pv_cobra_process(
            IntPtr handle,
            short[] pcm,
            out float voiceProbabilityPtr);

        [DllImport(LIBRARY, CallingConvention = CallingConvention.Cdecl)]
        private static extern int pv_cobra_frame_length();

        [DllImport(LIBRARY, CallingConvention = CallingConvention.Cdecl)]
        private static extern IntPtr pv_cobra_version();

        [DllImport(LIBRARY, CallingConvention = CallingConvention.Cdecl)]
        private static extern int pv_sample_rate();

        [DllImport(LIBRARY, CallingConvention = CallingConvention.Cdecl)]
        private static extern void pv_set_sdk(string sdk);

        [DllImport(LIBRARY, CallingConvention = CallingConvention.Cdecl)]
        private static extern PvStatus pv_get_error_stack(out IntPtr messageStack, out int messageStackDepth);

        [DllImport(LIBRARY, CallingConvention = CallingConvention.Cdecl)]
        private static extern void pv_free_error_stack(IntPtr messageStack);

        [DllImport(LIBRARY, CallingConvention = CallingConvention.Cdecl)]
        private static extern PvStatus pv_cobra_list_hardware_devices(
            out IntPtr hardwareDevices,
            out int numHardwareDevices);

        [DllImport(LIBRARY, CallingConvention = CallingConvention.Cdecl)]
        private static extern void pv_cobra_free_hardware_devices(
            IntPtr hardwareDevices,
            int numHardwareDevices);

        /// <summary>
        /// Gets the version number of the Cobra library.
        /// </summary>
        /// <returns>Version of Cobra</returns>
        public string Version { get; private set; }

        /// <summary>
        /// Gets the required number of audio samples per frame.
        /// </summary>
        /// <returns>Required frame length.</returns>
        public Int32 FrameLength { get; private set; }

        /// <summary>
        /// Get the audio sample rate required by Cobra
        /// </summary>
        /// <returns>Required sample rate.</returns>
        public Int32 SampleRate { get; private set; }

        /// <summary>
        /// Creates an instance of the Cobra VAD engine.
        /// </summary>
        /// <param name="accessKey">AccessKey obtained from Picovoice Console (https://console.picovoice.ai/).</param>
        /// <param name="device">
        /// String representation of the device (e.g., CPU or GPU) to use. If set to `best`, the most suitable device
        /// is selected automatically. If set to `gpu`, the engine uses the first available GPU device. To select a
        /// specific GPU device, set this argument to `gpu:${GPU_INDEX}`, where `${GPU_INDEX}` is the index of the
        /// target GPU. If set to `cpu`, the engine will run on the CPU with the default number of threads. To specify
        /// the number of threads, set this argument to `cpu:${NUM_THREADS}`, where `${NUM_THREADS}` is the desired
        /// number of threads.
        /// </param>
        public Cobra(string accessKey, string device = null)
        {
            if (string.IsNullOrEmpty(accessKey))
            {
                throw new CobraInvalidArgumentException("No AccessKey provided to Cobra");
            }

            device = device ?? "best";

            IntPtr accessKeyPtr = Utils.GetPtrFromUtf8String(accessKey);
            IntPtr devicePtr = Utils.GetPtrFromUtf8String(device);

            pv_set_sdk("dotnet");

            PvStatus status = pv_cobra_init(
                accessKeyPtr,
                devicePtr,
                out _libraryPointer);

            Marshal.FreeHGlobal(accessKeyPtr);
            Marshal.FreeHGlobal(devicePtr);

            if (status != PvStatus.SUCCESS)
            {
                string[] messageStack = GetMessageStack();
                throw PvStatusToException(status, "Cobra init failed", messageStack);
            }

            Version = Utils.GetUtf8StringFromPtr(pv_cobra_version());
            FrameLength = pv_cobra_frame_length();
            SampleRate = pv_sample_rate();
        }

        /// <summary>
        /// Processes a frame of the incoming audio stream and emits the probability of voice activity.
        /// </summary>
        /// <param name="pcm">
        /// A frame of audio samples. The number of samples per frame can be attained by calling `.FrameLength`
        /// The incoming audio needs to have a sample rate equal to `.SampleRate` and be 16-bit linearly-encoded.
        /// Cobra operates on single-channel audio.
        /// </param>
        /// <returns>
        /// Probability of voice activity. It is a floating-point number within [0, 1].
        /// </returns>
        public float Process(short[] pcm)
        {
            if (pcm.Length != FrameLength)
            {
                throw new CobraInvalidArgumentException(
                    $"Input audio frame size ({pcm.Length}) was not the size specified by Cobra engine ({FrameLength}). " +
                    $"Use Cobra.FrameLength to get the correct size.");
            }

            float voiceProbability;
            PvStatus status = pv_cobra_process(
                _libraryPointer,
                pcm,
                out voiceProbability);
            if (status != PvStatus.SUCCESS)
            {
                string[] messageStack = GetMessageStack();
                throw PvStatusToException(status, "Cobra process failed", messageStack);
            }

            return voiceProbability;
        }

        /// <summary>
        /// Lists all available devices that Cobra can use for inference.
        /// Each entry in the list can be used as the `device` argument when initializing Cobra.
        /// </summary>
        /// <returns>Array of all available devices that Cobra can use for inference.</returns>
        public static string[] GetAvailableDevices()
        {
            IntPtr deviceListRef;
            int deviceListSize;

            PvStatus status = pv_cobra_list_hardware_devices(out deviceListRef, out deviceListSize);
            if (status != PvStatus.SUCCESS)
            {
                string[] messageStack = GetMessageStack();
                throw PvStatusToException(status, "Unable to list hardware devices", messageStack);
            }

            int elementSize = Marshal.SizeOf(typeof(IntPtr));
            string[] deviceList = new string[deviceListSize];

            for (int i = 0; i < deviceListSize; i++)
            {
                deviceList[i] = Marshal.PtrToStringAnsi(Marshal.ReadIntPtr(deviceListRef, i * elementSize));
            }

            pv_cobra_free_hardware_devices(deviceListRef, deviceListSize);

            return deviceList;
        }

        /// <summary>
        /// Coverts status codes to relevant .NET exceptions
        /// </summary>
        /// <param name="status">Picovoice library status code.</param>
        /// <param name="message">Default error message.</param>
        /// <param name="messageStack">Error stack returned from Picovoice library.</param>
        /// <returns>.NET exception</returns>
        private static CobraException PvStatusToException(
            PvStatus status,
            string message = "",
            string[] messageStack = null)
        {
            if (messageStack == null)
            {
                messageStack = new string[] { };
            }

            switch (status)
            {
                case PvStatus.OUT_OF_MEMORY:
                    return new CobraMemoryException(message, messageStack);
                case PvStatus.IO_ERROR:
                    return new CobraIOException(message, messageStack);
                case PvStatus.INVALID_ARGUMENT:
                    return new CobraInvalidArgumentException(message, messageStack);
                case PvStatus.STOP_ITERATION:
                    return new CobraStopIterationException(message, messageStack);
                case PvStatus.KEY_ERROR:
                    return new CobraKeyException(message, messageStack);
                case PvStatus.INVALID_STATE:
                    return new CobraInvalidStateException(message, messageStack);
                case PvStatus.RUNTIME_ERROR:
                    return new CobraRuntimeException(message, messageStack);
                case PvStatus.ACTIVATION_ERROR:
                    return new CobraActivationException(message, messageStack);
                case PvStatus.ACTIVATION_LIMIT_REACHED:
                    return new CobraActivationLimitException(message, messageStack);
                case PvStatus.ACTIVATION_THROTTLED:
                    return new CobraActivationThrottledException(message, messageStack);
                case PvStatus.ACTIVATION_REFUSED:
                    return new CobraActivationRefusedException(message, messageStack);
                default:
                    return new CobraException("Unmapped error code returned from Cobra.", messageStack);
            }
        }

        /// <summary>
        /// Frees memory that was allocated for Cobra
        /// </summary>
        public void Dispose()
        {
            if (_libraryPointer != IntPtr.Zero)
            {
                pv_cobra_delete(_libraryPointer);
                _libraryPointer = IntPtr.Zero;

                // ensures finalizer doesn't trigger if already manually disposed
                GC.SuppressFinalize(this);
            }
        }

        ~Cobra()
        {
            Dispose();
        }

        private static string[] GetMessageStack()
        {
            int messageStackDepth;
            IntPtr messageStackRef;

            PvStatus status = pv_get_error_stack(out messageStackRef, out messageStackDepth);
            if (status != PvStatus.SUCCESS)
            {
                throw PvStatusToException(status, "Unable to get Cobra error state");
            }

            int elementSize = Marshal.SizeOf(typeof(IntPtr));
            string[] messageStack = new string[messageStackDepth];

            for (int i = 0; i < messageStackDepth; i++)
            {
                messageStack[i] = Marshal.PtrToStringAnsi(Marshal.ReadIntPtr(messageStackRef, i * elementSize));
            }

            pv_free_error_stack(messageStackRef);

            return messageStack;
        }
    }
}