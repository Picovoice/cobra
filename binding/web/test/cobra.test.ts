import { Cobra, CobraWorker } from "../";
import { CobraError } from "../dist/types/cobra_errors";

const ACCESS_KEY: string = Cypress.env("ACCESS_KEY");

const DEVICE: string = Cypress.env('DEVICE');

const getDeviceList = () => {
  const result: string[] = [];
  if (DEVICE === 'cpu') {
    const maxThreads = self.navigator.hardwareConcurrency / 2;

    for (let i = 1; i <= maxThreads; i *= 2) {
      result.push(`cpu:${i}`);
    }
  } else {
    result.push(DEVICE);
  }

  return result;
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
    device?: string,
    expectFailure?: boolean,
  } = {}
) => {
  const {
    accessKey = ACCESS_KEY,
    device = DEVICE,
    expectFailure = false,
  } = params;

  let isFailed = false;

  try {
    const cobra = await instance.create(
      accessKey,
      () => {},
      { device });

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
  params: {
    accessKey?: string,
    device?: string;
  } = {}
) => {
  const {
    accessKey = ACCESS_KEY,
    device = DEVICE,
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
          processErrorCallback: (error: CobraError) => {
            reject(error);
          },
          device,
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
    const labels = new Array(numSamples).fill(0);

    labels.fill(1, 28, 53);
    labels.fill(1, 97, 121);
    labels.fill(1, 163, 183);
    labels.fill(1, 227, 252);

    const loss = lossFunc(labels, results);
    expect(loss).to.be.lte(0.1);
  } catch (e) {
    expect(e).to.be.undefined;
  }
};

describe("Cobra Binding", function () {
  it(`should return process error message stack`, async () => {
    let error: CobraError | null = null;

    const runProcess = () => new Promise<void>(async resolve => {
      const cobra = await Cobra.create(
        ACCESS_KEY,
        () => { },
        {
          processErrorCallback: (e: CobraError) => {
            error = e;
            resolve();
          },
          device: DEVICE,
        }
      );
      const testPcm = new Int16Array(cobra.frameLength);
      // @ts-ignore
      const objectAddress = cobra._objectAddress;

      // @ts-ignore
      cobra._objectAddress = 0;
      await cobra.process(testPcm);

      await delay(1000);

      // @ts-ignore
      cobra._objectAddress = objectAddress;
      await cobra.release();
    });

    await runProcess();
    expect(error).to.not.be.null;
    if (error) {
      expect((error as CobraError).messageStack.length).to.be.gt(0);
      expect((error as CobraError).messageStack.length).to.be.lte(8);
    }
  });

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
        cy.getFramesFromFile("audio_samples/sample.wav").then( async pcm => {
          await runProcTest(
            instance,
            pcm,
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
          () => { },
          { device: DEVICE }
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
          () => { },
          { device: DEVICE }
        );
        expect(cobra).to.be.undefined;
      } catch (e: any) {
        expect(messageStack.length).to.be.eq(e.messageStack.length);
      }
    });
  }
});
