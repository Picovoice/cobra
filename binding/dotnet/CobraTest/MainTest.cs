/*
    Copyright 2025 Picovoice Inc.

    You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
    file accompanying this source.

    Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
    an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
    specific language governing permissions and limitations under the License.
*/

using System;
using System.Collections.Generic;
using System.IO;
using System.Reflection;

using Microsoft.VisualStudio.TestTools.UnitTesting;

using Pv;

namespace CobraTest
{
    [TestClass]
    public class MainTest
    {
        private static string _accessKey;
        private static string _device;
        private static readonly string ROOT_DIR = Path.Combine(
            Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location),
            "../../../../../..");


        [ClassInitialize]
        public static void ClassInitialize(TestContext _)
        {
            _accessKey = Environment.GetEnvironmentVariable("ACCESS_KEY");
            _device = Environment.GetEnvironmentVariable("DEVICE") ?? "cpu:1";
        }

        private static List<short> GetPcmFromFile(string audioFilePath, int expectedSampleRate)
        {
            List<short> data = new List<short>();
            using (BinaryReader reader = new BinaryReader(File.Open(audioFilePath, FileMode.Open)))
            {
                reader.ReadBytes(24); // skip over part of the header
                Assert.AreEqual(reader.ReadInt32(), expectedSampleRate, "Specified sample rate did not match test file.");
                reader.ReadBytes(16); // skip over the rest of the header

                while (reader.BaseStream.Position != reader.BaseStream.Length)
                {
                    data.Add(reader.ReadInt16());
                }
            }

            return data;
        }

        [TestMethod]
        public void TestInit()
        {
            using (Cobra cobra = new Cobra(_accessKey, _device))
            {
                Assert.IsFalse(string.IsNullOrWhiteSpace(cobra?.Version), "Cobra did not return a valid version string.");
                Assert.IsTrue(cobra.SampleRate > 0, "Cobra did not return a valid sample rate number.");
                Assert.IsTrue(cobra.FrameLength > 0, "Cobra did not return a valid frame length number.");
            }
        }

        [TestMethod]
        public void TestProcess()
        {
            List<float> probs = new List<float>();
            int framecount;
            using (Cobra cobra = new Cobra(_accessKey, _device))
            {
                int frameLen = cobra.FrameLength;
                string testAudioPath = Path.Combine(ROOT_DIR, "res/audio/sample.wav");
                List<short> data = GetPcmFromFile(testAudioPath, cobra.SampleRate);

                framecount = (int)Math.Floor((float)(data.Count / frameLen));
                for (int i = 0; i < framecount; i++)
                {
                    int start = i * frameLen;
                    int count = frameLen;
                    List<short> frame = data.GetRange(start, count);
                    float prob = cobra.Process(frame.ToArray());
                    Assert.IsTrue(prob >= 0.0 && prob <= 1.0, "Cobra returned a probability outside of [0, 1] range");
                    probs.Add(prob);
                }
            }

            float[] labels = new float[framecount];
            Array.Fill(labels, 1.0f, 28, 53 - 28);
            Array.Fill(labels, 1.0f, 97, 121 - 97);
            Array.Fill(labels, 1.0f, 163, 183 - 163);
            Array.Fill(labels, 1.0f, 227, 252 - 227);

            Assert.AreEqual(probs.Count, labels.Length);

            double error = 0;
            for (int i = 0; i < probs.Count; i++)
            {
                error -= (labels[i] * Math.Log(probs[i])) + ((1 - labels[i]) * Math.Log(1 - probs[i]));
            }

            error /= probs.Count;
            Assert.IsTrue(error < 0.1);
        }

        [TestMethod]
        public void TestMessageStack()
        {
            Cobra c;
            string[] messageList = { };

            try
            {
                c = new Cobra("invalid", _device);
                Assert.IsNull(c);
                c.Dispose();
            }
            catch (CobraException e)
            {
                messageList = e.MessageStack;
            }

            Assert.IsTrue(0 < messageList.Length);
            Assert.IsTrue(messageList.Length < 8);

            try
            {
                c = new Cobra("invalid", _device);
                Assert.IsNull(c);
                c.Dispose();
            }
            catch (CobraException e)
            {
                for (int i = 0; i < messageList.Length; i++)
                {
                    Assert.AreEqual(messageList[i], e.MessageStack[i]);
                }
            }
        }

        [TestMethod]
        public void TestGetAvailableDevices()
        {
            string[] devices = Cobra.GetAvailableDevices();
            Assert.IsTrue(devices.Length > 0);
            foreach (string device in devices)
            {
                Assert.IsFalse(string.IsNullOrEmpty(device));
            }
        }

        [TestMethod]
        public void TestProcessMessageStack()
        {
            Cobra c = new Cobra(_accessKey, _device);
            short[] testPcm = new short[c.FrameLength];

            var obj = typeof(Cobra).GetField("_libraryPointer", BindingFlags.NonPublic | BindingFlags.Instance);
            IntPtr address = (IntPtr)obj.GetValue(c);
            obj.SetValue(c, IntPtr.Zero);

            try
            {
                float prob = c.Process(testPcm);
                Assert.IsTrue(prob == 100);
            }
            catch (CobraException e)
            {
                Assert.IsTrue(0 < e.MessageStack.Length);
                Assert.IsTrue(e.MessageStack.Length < 8);
            }

            obj.SetValue(c, address);
            c.Dispose();
        }

    }
}