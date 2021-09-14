# cobra-web

The Picovoice Cobra library for web browsers, powered by WebAssembly. Intended (but not required) to be used with the [@picovoice/web-voice-processor](https://www.npmjs.com/package/@picovoice/web-voice-processor) package.

This library processes always-listening voice stream in-browser, offline. All processing is done via WebAssembly and Workers in a separate thread.

## Compatibility

- Chrome / Edge
- Firefox
- Safari

This library requires several modern browser features: WebAssembly, Web Workers, and promises. Internet Explorer will _not_ work.

If you are using this library with the [@picovoice/web-voice-processor](https://www.npmjs.com/package/@picovoice/web-voice-processor) to access the microphone, that requires some additional browser features like Web Audio API. Its overall browser support is approximately the same.

## Packages

The Cobra SDK for Web is split into separate worker and factory pacakges; Import each as required.

### Workers 

For typical cases, use the worker package. The worker package creates complete `CobraWorker` instances that can be immediately used with [@picovoice/web-voice-processor](https://www.npmjs.com/package/@picovoice/web-voice-processor).

* [@picovoice/cobra-web-worker](https://www.npmjs.com/package/@picovoice/cobra-web-worker)

### Factories

Factory packages allow you to create instances of `Cobra` directly. Useful for building your own custom Worker/Worklet, or some other bespoke purpose.

* [@picovoice/cobra-web-factory](https://www.npmjs.com/package/@picovoice/cobra-web-factory)

## Installation & Usage

### Worker

To obtain a `CobraWorker`, we can use the static `create` factory method from the CobraWorkerFactory. Here is a complete example that:

1. Obtains a `CobraWorker` from the `CobraWorkerFactory`
2. Responds to voice activity detection event by defining and passing a callback function 
3. Creates a `WebVoiceProcessor` to obtain microphone permission and forward microphone audio to the `CobraWorker`

E.g.:

```console
yarn add @picovoice/web-voice-processor @picovoice/cobra-web-worker
```

```javascript
import { WebVoiceProcessor } from "@picovoice/web-voice-processor"
import { CobraWorkerFactory } from "@picovoice/cobra-web-worker";
  
// The worker will call the callback function upon a detection event with
// the probability of the voice activity as the input argument
function cobraCallback(voiceProbability) {
  // voiceProbability: Probability of voice activity. It is a floating-point number within [0, 1].
  const threshold = // .. detection threshold within [0, 1] 
  if voiceProbability >= threshold {
    // .. detection made!
  }
}

async function startCobra() {
  // Create a Cobra Worker
  // Note: you receive a Worker object, _not_ an individual Cobra instance
  const appId = // .. AppID string provided by Picovoice Console (https://picovoice.ai/console/)
  const cobraWorker = await CobraWorkerFactory.create(
      appId,
      cobraCallback
  );

  // Start up the web voice processor. It will request microphone permission 
  // and immediately (start: true) start listening.
  // It downsamples the audio to voice recognition standard format (16-bit 16kHz linear PCM, single-channel)
  // The incoming microphone audio frames will then be forwarded to the Cobra Worker
  // n.b. This promise will reject if the user refuses permission! Make sure you handle that possibility.
  const webVp =
      await WebVoiceProcessor.init({
      engines: [cobraWorker],
      start: true,
      });
}

startCobra()

...

// Finished with Cobra? Release the WebVoiceProcessor and the worker.
if (done) {
    webVp.release()
    cobraWorker.sendMessage({
    command: "release"
    })
}

```

### Factory

If you wish to build your own worker, or perhaps not use workers at all, use the factory packages. This will let you instantiate Cobra engine instances directly.

The audio passed to the worker in the `process` function must be of the correct format. The `WebVoiceProcessor` handles downsampling in the examples above to standard voice recognition format (16-bit, 16kHz linear PCM, single-channel). Use an `Int16Array` [typed array](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Typed_arrays). If you are not using `WebVoiceProcessor`, you must ensure the audio passed to Cobra is of that format. The Cobra instance provides the length of the array required via `.frameLength`.

E.g.:

```javascript
import { Cobra } from "@picovoice/cobra-web-factory";

async function startCobra() {
  const appId = // .. AppID string provided by Picovoice Console (https://picovoice.ai/console/)
  const handle = await Cobra.create(appId);
  return handle;
}

const cobraHandle = startCobra()

// Send Cobra frames of audio (check handle.frameLength for size of array)
const audioFrames =  new Int16Array( /* Provide data with correct format and size*/ )
const cobraResult = cobraHandle.process(audioFrames)
// cobraResult: Probability of voice activity. It is a floating-point number within [0, 1].

...

```

## Build from source (IIFE + ESM outputs)

This library uses Rollup and TypeScript along with Babel and other popular rollup plugins. There are two outputs: an IIFE version intended for script tags / CDN usage, and a JavaScript module version intended for use with modern JavaScript/TypeScript development (e.g. Angular, Create React App, Webpack).

```console
yarn
yarn build
```

The output will appear in the ./dist/ folder.

For example usage refer to the [web demo](/demo/web/)