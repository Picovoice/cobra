function writeMessage(message) {
  console.log(message);
  document.getElementById("status").innerHTML = message;
}

function writeVoiceProbability(message, value) {
  document.getElementById("voiceProbabilityText").innerHTML = message;
  document.getElementById("voiceProbabilityRange").value = value * 100;
}

function voiceProbabilityCallback(voiceProbability) {
  const timestamp = new Date();
  writeVoiceProbability(
    `Voice detected with probability of ${voiceProbability.toFixed(2)} at ${timestamp.toString()}`,
    voiceProbability,
  );
}

async function startCobra(accessKey) {
  writeMessage("Cobra is loading. Please wait...");
  let cobra = null;
  try {
    cobra = await CobraWeb.CobraWorker.create(
      accessKey,
      voiceProbabilityCallback,
    );
  } catch (error) {
    writeMessage(error);
    throw new Error(error);
  }
  writeMessage("Cobra worker ready!");

  writeMessage(
    "WebVoiceProcessor initializing. Microphone permissions requested ...",
  );

  try {
    WebVoiceProcessor.WebVoiceProcessor.subscribe(cobra);
    writeMessage("WebVoiceProcessor ready and listening!");
  } catch (e) {
    writeMessage("WebVoiceProcessor failed to initialize: " + e);
  }
}
