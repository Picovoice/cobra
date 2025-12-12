import { Cobra, CobraWorker } from "../";

const ACCESS_KEY = Cypress.env('ACCESS_KEY');
const DEVICE = Cypress.env('DEVICE');
const NUM_TEST_ITERATIONS = Number(Cypress.env('NUM_TEST_ITERATIONS'));
const PROC_PERFORMANCE_THRESHOLD_SEC = Number(Cypress.env('PROC_PERFORMANCE_THRESHOLD_SEC'));

async function testPerformance(
  instance: typeof Cobra | typeof CobraWorker,
  inputPcm: Int16Array
) {
  const initPerfResults: number[] = [];
  const procPerfResults: number[] = [];

  for (let j = 0; j < NUM_TEST_ITERATIONS; j++) {
    let start = Date.now();

    let numSamples = 0;
    let processed = 0;

    const cobra = await instance.create(
      ACCESS_KEY,
      () => {
        processed += 1;
      },
      { device: DEVICE }
    );

    let end = Date.now();
    initPerfResults.push((end - start) / 1000);

    numSamples = Math.floor(inputPcm.length / cobra.frameLength);

    const waitUntil = (): Promise<void> =>
      new Promise(resolve => {
        setInterval(() => {
          if (numSamples === processed) {
            resolve();
          }
        }, 100);
      });

    start = Date.now();
    for (
      let i = 0;
      i < inputPcm.length - cobra.frameLength + 1;
      i += cobra.frameLength
    ) {
      await cobra.process(inputPcm.slice(i, i + cobra.frameLength));
    }
    await waitUntil();
    end = Date.now();
    procPerfResults.push((end - start) / 1000);

    if (cobra instanceof CobraWorker) {
      cobra.terminate();
    } else {
      await cobra.release();
    }
  }

  const procAvgPerf = procPerfResults.reduce((a, b) => a + b) / NUM_TEST_ITERATIONS;

  // eslint-disable-next-line no-console
  console.log(`Average proc performance: ${procAvgPerf} seconds`);

  expect(procAvgPerf).to.be.lessThan(PROC_PERFORMANCE_THRESHOLD_SEC);
}

describe('Cobra binding performance test', () => {
  Cypress.config('defaultCommandTimeout', 120000);

  for (const instance of [Cobra, CobraWorker]) {
    const instanceString = (instance === CobraWorker) ? 'worker' : 'main';

    it(`should be lower than performance threshold (${instanceString})`, () => {
      cy.getFramesFromFile('audio_samples/sample.wav').then( async inputPcm => {
        await testPerformance(instance, inputPcm);
      });
    });
  }
});
