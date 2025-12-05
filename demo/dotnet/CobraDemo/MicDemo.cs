/*
    Copyright 2025 Picovoice Inc.

    You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
    file accompanying this source.

    Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
    an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
    specific language governing permissions and limitations under the License.
*/

using System;
using System.Diagnostics;
using System.IO;
using System.Text;
using System.Threading;

using Pv;

namespace CobraDemo
{
    /// <summary>
    /// Microphone Demo for the Cobra Voice Activity Detection engine. It creates an input audio stream from a microphone and detects voice activity in real-time.
    /// It optionally saves the recorded audio into a file for further debugging.
    /// </summary>
    public class MicDemo
    {
        /// <summary>
        /// Creates an input audio stream, instantiates an instance of the Cobra engine, and detects voice activity in the audio stream.
        /// </summary>
        /// <param name="accessKey">AccessKey obtained from Picovoice Console (https://console.picovoice.ai/).</param>
        /// <param name="device">Device to run demo.</param>
        /// <param name="audioDeviceIndex">Optional argument. If provided, audio is recorded from this input device. Otherwise, the default audio input device is used.</param>
        /// <param name="outputPath">Optional argument. If provided, recorded audio will be stored in this location at the end of the run.</param>
        public static void RunDemo(
            string accessKey,
            string device,
            int audioDeviceIndex,
            string outputPath = null)
        {
            using (Cobra cobra = new Cobra(accessKey, device))
            {
                using (PvRecorder recorder = PvRecorder.Create(frameLength: cobra.FrameLength, deviceIndex: audioDeviceIndex))
                {
                    Console.WriteLine($"Using device: {recorder.SelectedDevice}");
                    Console.CancelKeyPress += delegate (object sender, ConsoleCancelEventArgs e)
                    {
                        e.Cancel = true;
                        recorder.Stop();
                    };

                    BinaryWriter outputFileWriter = null;
                    int totalSamplesWritten = 0;
                    if (!string.IsNullOrWhiteSpace(outputPath))
                    {
                        outputFileWriter = new BinaryWriter(new FileStream(outputPath, FileMode.OpenOrCreate, FileAccess.Write));
                        WriteWavHeader(outputFileWriter, 1, 16, recorder.SampleRate, 0);
                    }

                    Console.WriteLine("Listening for voice activity...");
                    recorder.Start();

                    while (recorder.IsRecording)
                    {
                        short[] frame = recorder.Read();

                        float voiceProbability = cobra.Process(frame);
                        ShowVoiceProbabilityMeter(voiceProbability);

                        if (outputFileWriter != null)
                        {
                            foreach (short sample in frame)
                            {
                                outputFileWriter.Write(sample);
                            }
                            totalSamplesWritten += frame.Length;
                        }

                        Thread.Yield();
                    }

                    if (outputFileWriter != null)
                    {
                        WriteWavHeader(outputFileWriter, 1, 16, recorder.SampleRate, totalSamplesWritten);
                        outputFileWriter.Flush();
                        outputFileWriter.Dispose();
                        Console.WriteLine($"\nWrote audio to '{outputPath}'");
                    }
                }
            }
        }

        private static void ShowVoiceProbabilityMeter(float probability)
        {
            int barWidth = 30;
            int filledLength = (int)(probability * barWidth);
            string bar = new string('█', filledLength).PadRight(barWidth, ' ');
            string percentage = $"{Math.Round(probability * 100, 2): 0}%".PadLeft(4);
            Console.Write($"\r[{bar}] {percentage}");
        }

        /// <summary>
        /// Writes the RIFF header for a file in WAV format
        /// </summary>
        /// <param name="writer">Output stream to WAV file</param>
        /// <param name="channelCount">Number of channels</param>
        /// <param name="bitDepth">Number of bits per sample</param>
        /// <param name="sampleRate">Sampling rate in Hz</param>
        /// <param name="totalSampleCount">Total number of samples written to the file</param>
        private static void WriteWavHeader(BinaryWriter writer, ushort channelCount, ushort bitDepth, int sampleRate, int totalSampleCount)
        {
            if (writer == null)
            {
                return;
            }

            _ = writer.Seek(0, SeekOrigin.Begin);
            writer.Write(Encoding.ASCII.GetBytes("RIFF"));
            writer.Write((bitDepth / 8 * totalSampleCount) + 36);
            writer.Write(Encoding.ASCII.GetBytes("WAVE"));
            writer.Write(Encoding.ASCII.GetBytes("fmt "));
            writer.Write(16);
            writer.Write((ushort)1);
            writer.Write(channelCount);
            writer.Write(sampleRate);
            writer.Write(sampleRate * channelCount * bitDepth / 8);
            writer.Write((ushort)(channelCount * bitDepth / 8));
            writer.Write(bitDepth);
            writer.Write(Encoding.ASCII.GetBytes("data"));
            writer.Write(bitDepth / 8 * totalSampleCount);
        }

        /// <summary>
        /// Lists available audio input devices.
        /// </summary>
        public static void ShowAudioDevices()
        {
            string[] devices = PvRecorder.GetAvailableDevices();
            for (int i = 0; i < devices.Length; i++)
            {
                Console.WriteLine($"index: {i}, device name: {devices[i]}");
            }
        }

        public static void Main(string[] args)
        {
            AppDomain.CurrentDomain.UnhandledException += OnUnhandledException;
            if (args.Length == 0)
            {
                Console.WriteLine(HELP_STR);
                _ = Console.Read();
                return;
            }

            string accessKey = null;
            string device = "cpu:1";
            int audioDeviceIndex = -1;
            string outputPath = null;
            bool showAudioDevices = false;
            bool showHelp = false;

            int argIndex = 0;
            while (argIndex < args.Length)
            {
                if (args[argIndex] == "--access_key")
                {
                    if (++argIndex < args.Length)
                    {
                        accessKey = args[argIndex++];
                    }
                }
                else if (args[argIndex] == "--device")
                {
                    if (++argIndex < args.Length)
                    {
                        device = args[argIndex++];
                    }
                }
                else if (args[argIndex] == "--show_audio_devices")
                {
                    showAudioDevices = true;
                    argIndex++;
                }
                else if (args[argIndex] == "--audio_device_index")
                {
                    if (++argIndex < args.Length && int.TryParse(args[argIndex], out int deviceIdx))
                    {
                        audioDeviceIndex = deviceIdx;
                        argIndex++;
                    }
                }
                else if (args[argIndex] == "--output_path")
                {
                    if (++argIndex < args.Length)
                    {
                        outputPath = args[argIndex++];
                    }
                }
                else if (args[argIndex] == "-h" || args[argIndex] == "--help")
                {
                    showHelp = true;
                    argIndex++;
                }
                else
                {
                    argIndex++;
                }
            }

            if (showHelp)
            {
                Console.WriteLine(HELP_STR);
                _ = Console.Read();
                return;
            }

            if (showAudioDevices)
            {
                ShowAudioDevices();
                _ = Console.Read();
                return;
            }


            if (string.IsNullOrEmpty(accessKey))
            {
                throw new ArgumentNullException("access_key");
            }

            RunDemo(accessKey, device, audioDeviceIndex, outputPath);
        }

        private static void OnUnhandledException(object sender, UnhandledExceptionEventArgs e)
        {
            Console.WriteLine(e.ExceptionObject.ToString());
            Environment.Exit(1);
        }

        private static readonly string HELP_STR = "Available options: \n " +
            $"\t--access_key (required): AccessKey obtained from Picovoice Console (https://console.picovoice.ai/)\n" +
            $"\t--device: device to run demo\n" +
            "\t--audio_device_index: Index of input audio device.\n" +
            "\t--output_path: Absolute path to recorded audio for debugging.\n" +
            "\t--show_audio_devices: Print available recording devices.\n";
    }
}