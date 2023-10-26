import { Cobra, CobraWorker } from "../";

const ACCESS_KEY: string = Cypress.env("ACCESS_KEY");

const testParam = {
  audioFile: 'sample.wav',
  expectedLoss: 0.1,
  labels: new Array(28).fill(0).fill(1, 10)
};

function delay(time: number) {
  return new Promise(resolve => setTimeout(resolve, time));
}

const lossFunc = (a: number[], b: number[]) =>
  -a.map((x, i) =>
    a[i] * Math.log(b[i]) + (1 - a[i]) * Math.log(1 - b[i])).reduce((m, n) => m + n) / a.length;

const runInitTest = async (
  instance: typeof Cobra | typeof CobraWorker,
  params: {
    accessKey?: string,
    expectFailure?: boolean,
  } = {}
) => {
  const {
    accessKey = ACCESS_KEY,
    expectFailure = false,
  } = params;

  let isFailed = false;

  try {
    const cobra = await instance.create(
      accessKey,
      () => {});

    expect(cobra.sampleRate).to.be.eq(16000);
    expect(typeof cobra.version).to.eq('string');
    expect(cobra.version.length).to.be.greaterThan(0);

    if (cobra instanceof CobraWorker) {
      cobra.terminate();
    } else {
      await cobra.release();
    }
  } catch (e) {
    if (expectFailure) {
      isFailed = true;
    } else {
      expect(e).to.be.undefined;
    }
  }

  if (expectFailure) {
    expect(isFailed).to.be.true;
  }
};

const runProcTest = async (
  instance: typeof Cobra | typeof CobraWorker,
  inputPcm: Int16Array,
  expectedLoss: number,
  labels: number[],
  params: {
    accessKey?: string,
  } = {}
) => {
  const {
    accessKey = ACCESS_KEY,
  } = params;

  const results: number[] = [];
  let numSamples = 0;
  let processed = 0;

  const runProcess = () =>
    new Promise<void>(async (resolve, reject) => {
      const cobra = await instance.create(
        accessKey,
        voiceProbability => {
          results.push(voiceProbability);
          processed += 1;
          if (processed === numSamples) {
            resolve();
          }
        },
        {
          processErrorCallback: (error: string) => {
            reject(error);
          }
        }
      );

      numSamples = Math.floor(inputPcm.length / cobra.frameLength);

      for (
        let i = 0;
        i < inputPcm.length - cobra.frameLength + 1;
        i += cobra.frameLength
      ) {
        await cobra.process(inputPcm.slice(i, i + cobra.frameLength));
      }

      await delay(1000);

      if (cobra instanceof CobraWorker) {
        cobra.terminate();
      } else {
        await cobra.release();
      }
    });

  try {
    await runProcess();
    const loss = lossFunc(labels, results);
    expect(loss).to.be.lte(expectedLoss);
  } catch (e) {
    expect(e).to.be.undefined;
  }
};

describe("Cobra Binding", function () {
  for (const instance of [Cobra, CobraWorker]) {
    const instanceString = (instance === CobraWorker) ? 'worker' : 'main';

    it(`should be able to init (${instanceString})`, () => {
      cy.wrap(null).then(async () => {
        await runInitTest(instance);
      });
    });

    it(`should be able to handle invalid access key (${instanceString})`, () => {
      cy.wrap(null).then(async () => {
        await runInitTest(instance, {
          accessKey: 'invalid',
          expectFailure: true
        });
      });
    });

    it(`should be able to process (${instanceString})`, () => {
      try {
        cy.getFramesFromFile(`audio_samples/${testParam.audioFile}`).then( async pcm => {
          await runProcTest(
            instance,
            pcm,
            testParam.expectedLoss,
            testParam.labels,
          );
        });
      } catch (e) {
        expect(e).to.be.undefined;
      }
    });

    it(`should return correct error message stack (${instanceString})`, async () => {
      let messageStack = [];
      try {
        const cobra = await instance.create(
          "invalidAccessKey",
          () => { }
        );
        expect(cobra).to.be.undefined;
      } catch (e: any) {
        messageStack = e.messageStack;
      }

      expect(messageStack.length).to.be.gt(0);
      expect(messageStack.length).to.be.lte(8);

      try {
        const cobra = await instance.create(
          "invalidAccessKey",
          () => { }
        );
        expect(cobra).to.be.undefined;
      } catch (e: any) {
        expect(messageStack.length).to.be.eq(e.messageStack.length);
      }
    });
  }
});
