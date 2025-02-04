/*
    Copyright 2025 Picovoice Inc.

    You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
    file accompanying this source.

    Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
    an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
    specific language governing permissions and limitations under the License.
*/

using System;

namespace Pv
{
    public class CobraException : Exception
    {
        private readonly string[] _messageStack;

        public CobraException() { }

        public CobraException(string message) : base(message) { }

        public CobraException(string message, string[] messageStack) : base(ModifyMessages(message, messageStack))
        {
            this._messageStack = messageStack;
        }

        public string[] MessageStack
        {
            get => _messageStack;
        }

        private static string ModifyMessages(string message, string[] messageStack)
        {
            string messageString = message;
            if (messageStack.Length > 0)
            {
                messageString += ":";
                for (int i = 0; i < messageStack.Length; i++)
                {
                    messageString += $"\n  [{i}] {messageStack[i]}";
                }
            }
            return messageString;
        }

    }

    public class CobraMemoryException : CobraException
    {
        public CobraMemoryException() { }

        public CobraMemoryException(string message) : base(message) { }

        public CobraMemoryException(string message, string[] messageStack) : base(message, messageStack) { }
    }

    public class CobraIOException : CobraException
    {
        public CobraIOException() { }

        public CobraIOException(string message) : base(message) { }

        public CobraIOException(string message, string[] messageStack) : base(message, messageStack) { }
    }

    public class CobraInvalidArgumentException : CobraException
    {
        public CobraInvalidArgumentException() { }

        public CobraInvalidArgumentException(string message) : base(message) { }

        public CobraInvalidArgumentException(string message, string[] messageStack) : base(message, messageStack) { }
    }

    public class CobraStopIterationException : CobraException
    {
        public CobraStopIterationException() { }

        public CobraStopIterationException(string message) : base(message) { }

        public CobraStopIterationException(string message, string[] messageStack) : base(message, messageStack) { }
    }

    public class CobraKeyException : CobraException
    {
        public CobraKeyException() { }

        public CobraKeyException(string message) : base(message) { }

        public CobraKeyException(string message, string[] messageStack) : base(message, messageStack) { }
    }

    public class CobraInvalidStateException : CobraException
    {
        public CobraInvalidStateException() { }

        public CobraInvalidStateException(string message) : base(message) { }

        public CobraInvalidStateException(string message, string[] messageStack) : base(message, messageStack) { }
    }

    public class CobraRuntimeException : CobraException
    {
        public CobraRuntimeException() { }

        public CobraRuntimeException(string message) : base(message) { }

        public CobraRuntimeException(string message, string[] messageStack) : base(message, messageStack) { }
    }

    public class CobraActivationException : CobraException
    {
        public CobraActivationException() { }

        public CobraActivationException(string message) : base(message) { }

        public CobraActivationException(string message, string[] messageStack) : base(message, messageStack) { }
    }

    public class CobraActivationLimitException : CobraException
    {
        public CobraActivationLimitException() { }

        public CobraActivationLimitException(string message) : base(message) { }

        public CobraActivationLimitException(string message, string[] messageStack) : base(message, messageStack) { }
    }

    public class CobraActivationThrottledException : CobraException
    {
        public CobraActivationThrottledException() { }

        public CobraActivationThrottledException(string message) : base(message) { }

        public CobraActivationThrottledException(string message, string[] messageStack) : base(message, messageStack) { }
    }

    public class CobraActivationRefusedException : CobraException
    {
        public CobraActivationRefusedException() { }

        public CobraActivationRefusedException(string message) : base(message) { }

        public CobraActivationRefusedException(string message, string[] messageStack) : base(message, messageStack) { }
    }
}