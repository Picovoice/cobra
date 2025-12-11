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

using Pv;

namespace CobraDemo
{
    /// <summary>
    /// File Demo for the Cobra Voice Activity Detection engine. It takes an input audio file and prints out locations when voice was detected.
    /// </summary>
    public class FileDemo
    {

        /// <summary>
        /// Reads through input file and detects voice activity.
        /// </summary>
        /// <param name="inputAudioPath">Required argument. Absolute path to input audio file.</param>
        /// <param name="accessKey">AccessKey obtained from Picovoice Console (https://console.picovoice.ai/).</param>
        /// <param name="device">Device to run demo.</param>
        /// <param name="threshold">Threshold for voice detection.</param>
        public static void RunDemo(
            string inputAudioPath,
            string accessKey,
            string device,
            float threshold)
        {
            using (Cobra cobra = new Cobra(accessKey, device))
            {
                using (BinaryReader reader = new BinaryReader(File.Open(inputAudioPath, FileMode.Open)))
                {
                    ValidateWavFile(reader, cobra.SampleRate, 16, out short numChannels);

                    short[] cobraFrame = new short[cobra.FrameLength];
                    int frameIndex = 0;
                    long totalSamplesRead = 0;

                    Stopwatch stopWatch = new Stopwatch();
                    stopWatch.Start();
                    while (reader.BaseStream.Position != reader.BaseStream.Length)
                    {
                        totalSamplesRead++;
                        cobraFrame[frameIndex++] = reader.ReadInt16();

                        if (frameIndex == cobraFrame.Length)
                        {
                            float voiceProbability = cobra.Process(cobraFrame);
                            if (voiceProbability >= threshold)
                            {
                                Console.WriteLine($"Detected voice activity at " +
                                    $"{Math.Round(totalSamplesRead / (double)cobra.SampleRate, 2)} sec");
                            }
                            frameIndex = 0;
                        }

                        // skip right channel
                        if (numChannels == 2)
                        {
                            _ = reader.ReadInt16();
                        }
                    }
                    stopWatch.Stop();
                    double audioLen = Math.Round(totalSamplesRead / (double)cobra.SampleRate, 2);
                    double realtimeFactor = Math.Round(audioLen / stopWatch.Elapsed.TotalSeconds, 2);
                    Console.WriteLine($"Realtime factor: {realtimeFactor}x");
                }
            }
        }


        /// <summary>
        ///  Reads RIFF header of a WAV file and validates its properties against Picovoice audio processing requirements
        /// </summary>
        /// <param name="reader">WAV file stream reader</param>
        /// <param name="requiredSampleRate">Required sample rate in Hz</param>
        /// <param name="requiredBitDepth">Required number of bits per sample</param>
        /// <param name="numChannels">Number of channels can be returned by function</param>
        public static void ValidateWavFile(BinaryReader reader, int requiredSampleRate, short requiredBitDepth, out short numChannels)
        {
            byte[] riffHeader = reader?.ReadBytes(44);

            int riff = BitConverter.ToInt32(riffHeader, 0);
            int wave = BitConverter.ToInt32(riffHeader, 8);
            if (riff != BitConverter.ToInt32(Encoding.UTF8.GetBytes("RIFF"), 0) ||
                wave != BitConverter.ToInt32(Encoding.UTF8.GetBytes("WAVE"), 0))
            {
                throw new ArgumentException("input_audio_path", $"Invalid input audio file format. Input file must be a {requiredSampleRate}kHz, 16-bit WAV file.");
            }

            numChannels = BitConverter.ToInt16(riffHeader, 22);
            int sampleRate = BitConverter.ToInt32(riffHeader, 24);
            short bitDepth = BitConverter.ToInt16(riffHeader, 34);
            if (sampleRate != requiredSampleRate || bitDepth != requiredBitDepth)
            {
                throw new ArgumentException("input_audio_path", $"Invalid input audio file format. Input file must be a {requiredSampleRate}Hz, 16-bit WAV file.");
            }

            if (numChannels == 2)
            {
                Console.WriteLine("Picovoice processes single-channel audio but stereo file is provided. Processing left channel only.");
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

            string inputAudioPath = null;
            string accessKey = null;
            string device = "cpu:1";
            float threshold = 0.8f;
            bool showHelp = false;

            // parse command line arguments
            int argIndex = 0;
            while (argIndex < args.Length)
            {
                if (args[argIndex] == "--input_audio_path")
                {
                    if (++argIndex < args.Length)
                    {
                        inputAudioPath = args[argIndex++];
                    }
                }
                else if (args[argIndex] == "--access_key")
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
                else if (args[argIndex] == "--threshold")
                {
                    if (++argIndex < args.Length)
                    {
                        if (!float.TryParse(args[argIndex++], out threshold) || threshold < 0 || threshold > 1)
                        {
                            throw new ArgumentException("Threshold was not a valid floating-point number between [0, 1]");
                        }
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

            // print help text and exit
            if (showHelp)
            {
                Console.WriteLine(HELP_STR);
                _ = Console.Read();
                return;
            }

            if (string.IsNullOrEmpty(accessKey))
            {
                throw new ArgumentNullException("access_key");
            }

            if (string.IsNullOrEmpty(inputAudioPath))
            {
                throw new ArgumentNullException("input_audio_path");
            }
            if (!File.Exists(inputAudioPath))
            {
                throw new ArgumentException($"Audio file at path {inputAudioPath} does not exist");
            }

            RunDemo(inputAudioPath, accessKey, device, threshold);
        }

        private static void OnUnhandledException(object sender, UnhandledExceptionEventArgs e)
        {
            Console.WriteLine(e.ExceptionObject.ToString());
            Environment.Exit(1);
        }

        private static readonly string HELP_STR = "Available options: \n " +
            $"\t--input_audio_path (required): Absolute path to input audio file.\n" +
            $"\t--access_key (required): AccessKey obtained from Picovoice Console (https://console.picovoice.ai/)\n" +
            $"\t--device: device to run demo\n" +
            $"\t--threshold: Voice activity detection threshold. Demo will print out events that exceed the threshold. Must be between [0, 1]. \n";
    }
}