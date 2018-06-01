'use strict';

var context;
function setup(args, ctx) {
  ctx.mic = new Microphone();
  context = ctx;
  startListening();
  setupSocketIOEvent(ctx);
  setupSpeechComponent(ctx);
}

function setupSocketIOEvent(ctx) {
  ctx.socket = io('https://bot.aws.viseo.io/', { path: '/socket.io' });
  ctx.socket.on('test', function (data) {
    console.log(data);
    var speech = ctx.speechComponent.speeches[0];
    speech.updateConfig({
      body: data.text
    });
    speech.play();
    sumerian.SystemBus.emit(data.animation);
  });
}

function setupSpeechComponent(ctx) {
  sumerian.SystemBus.addListener('aws.sdkReady', () => {
    ctx.speechComponent = ctx.entity.getComponent("speechComponent");
  }, true);
}

function cleanup(args, ctx) {

  ctx.mic.cleanup();
  ctx.socket.close();
  stopListening();

  sumerian.SystemBus.removeAllOnChannel('aws.sdkReady');
}

class Microphone {
  constructor(fileType = "audio/mp3") {
    // Using mp3 format as default
    // Supported audio formats: https://developer.mozilla.org/en-US/docs/Web/HTML/Supported_media_formats
    // Especially note OS and browser compatibilities
    // PCM format x-l16 is one of the audio formats supported by Amazon Lex
    // See https://docs.aws.amazon.com/lex/latest/dg/API_runtime_PostContent.html
    this._audioType = fileType;

    this._audioContext = new AudioContext();
    this._recorder = null;
    this._fileReader = new FileReader();

    this._recordedBlob = [];
    this._audioBlob = null;

    this._audioBuffer = [];
    this._bufferReady = false;

    this._setup();
  }

  get audioBlob() {
    return this._audioBlob;
  }

  get audioBuffer() {
    return this._audioBuffer;
  }

  get bufferReady() {
    return this._bufferReady;
  }

  _setup() {
    // Get access to microphone
    if (navigator.mediaDevices) {
      navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
        this._recorder = new MediaRecorder(stream);

        this._recorder.ondataavailable = (e) => {
          this._recordedBlob.push(e.data);
        }

        this._recorder.onerror = (e) => {
          throw e.error || new Error(e.name);
        }

        this._recorder.onstart = (e) => {
          this._clearBuffer();
        }

        this._recorder.onstop = (e) => {
          this._createAudioBlob().then((blob) => {
            this._onBlobReady(blob);
            this._convertBlobToBuffer(blob);
          })
        }
      }).catch((e) => {
        throw "Microphone: " + e.name + ". " + e.message;
      })
    } else {
      throw "MediaDevices are not supported in this browser";
    }
  }

  // Event fired when the audio blob is ready
  _onBlobReady(blob) {
    const blobReady = new CustomEvent("micRecordingReady", { detail: blob });
    window.dispatchEvent(blobReady);
  }

  _createAudioBlob() {
    return new Promise((resolve, reject) => {
      this._audioBlob = new Blob(this._recordedBlob, { type: this._audioType });
      resolve(this._audioBlob);
    })
  }

  _convertBlobToBuffer(blob) {
    this._fileReader.readAsArrayBuffer(blob);

    this._fileReader.onload = () => {
      this._audioContext.decodeAudioData(this._fileReader.result).then((decodedData) => {
        this._audioBuffer = decodedData.getChannelData(0);
        this._bufferReady = true;
      }).catch((e) => {
        throw "Could not decode audio data: " + e.name + ". " + e.message;
      });
    }
  }

  startRecording() {
    this._bufferReady = false;

    if (this._recorder && this._recorder.state !== "recording") {
      this._recorder.start();
    } else {
      throw "Recording could not start because recorder does not exist or is already being used.";
    }
  }

  stopRecording() {
    if (this._recorder && this._recorder.state === "recording") {
      this._recorder.stop();
    } else {
      throw "Recording could not stop because there is no recorder or is not recording.";
    }
  }

  _clearBuffer() {
    this._recordedBlob = [];
    this._audioBuffer = [];
  }

  cleanup() {
    this._audioContext.close();
  }
}

function startListening() {
  window.addEventListener('keydown', startRecordingWithButton);
  window.addEventListener('keyup', stopRecordingWithButton);
  window.addEventListener("micRecordingReady", setAudioSource);
}

function stopListening() {
  window.removeEventListener('keydown', startRecordingWithButton);
  window.removeEventListener('keyup', stopRecordingWithButton);
  window.removeEventListener("micRecordingReady", setAudioSource);
}

function startRecordingWithButton(event) {
  if (event.repeat != undefined) {
    context.allowed = !event.repeat;
  }
  if (context.allowed) {
    if (event.keyCode == 32) {
      context.mic.startRecording();
      console.log("recording...");
      context.isBufferProcessed = false;
    } else if (event.keyCode == 70) {
      console.log("f");
      sumerian.SystemBus.emit("triggerGesture");
    }
  }
}

function stopRecordingWithButton(event) {
  if (event.keyCode == 32) {
    context.mic.stopRecording();
  }
  context.allowed = true;
}

function setAudioSource(event) {
  var blobData = event.detail;
  if (blobData) {
    console.log(blobData);
    context.socket.emit('sumerian', blobData);
  } else {
    throw "no blob";
  }
}
