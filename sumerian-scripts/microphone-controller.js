'use strict';

function setup(args, ctx) {
  ctx.mic = new Microphone();

  // <audio> element used for audio playback
  ctx.audioElement = document.getElementById("audio");
  // Set download link for the audio download button
  ctx.downloadElement = document.getElementById("downloadLink");
  
  startListening(ctx.mic, ctx);
};

function update(args, ctx) {
};

function cleanup(args, ctx) {
  ctx.mic.cleanup();
  releaseAudioURL(ctx.audioElement);
  
  stopListening(ctx);
};

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
      navigator.mediaDevices.getUserMedia({audio: true}).then((stream) => {
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
      }).catch ((e) => {
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
      this._audioBlob = new Blob(this._recordedBlob, {type: this._audioType});
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

function startListening(mic, ctx) {
  // Single button for recording using the mic icon
  if (document.getElementById("recordMic")) {
    ctx.recordMicButton = document.getElementById("recordMic");

    ctx.recordMicButton.addEventListener("mousedown", (e) => { startRecordingWithButton(e.target, "#4a90e2", ctx.audioElement, ctx.mic, ctx); });
    ctx.recordMicButton.addEventListener("mouseup", (e) => { stopRecordingWithButton(e.target, "white", ctx.audioElement, ctx.mic); });
  }

  window.addEventListener("micRecordingReady", (e) => { setAudioSource(ctx.audioElement, ctx.downloadElement, e.detail) });
}

function stopListening(ctx) {
  if (ctx.recordMicButton) {
    ctx.recordMicButton.removeEventListener("mousedown", startRecordingWithButton);
    ctx.recordMicButton.removeEventListener("mouseup", stopRecordingWithButton);
  }

  window.removeEventListener("micRecordingReady", setAudioSource);
}

function startRecordingWithButton(micButton, buttonColor, audioElement, mic, ctx) {
  mic.startRecording();
  ctx.isBufferProcessed = false;

  releaseAudioURL(audioElement);

  if (micButton) {
    micButton.style.background = buttonColor;
  }
}

function stopRecordingWithButton(micButton, buttonColor, audioElement, mic) {
  mic.stopRecording();  

  if (micButton) {
    micButton.style.background = buttonColor;
  }
}

function setAudioSource(audioElement, downloadElement, blobData) {
  if (blobData) {
    audioElement.src = URL.createObjectURL(blobData);

    setDownloadLink(downloadElement, audioElement.src);
  } else {
    throw "Could not set the audio source and download link with the mic recording";
  }
}

function setDownloadLink(downloadElement, audioSource) {
  if (!downloadElement) return;

  if (audioSource) {
      downloadElement.href = audioSource;
  } else {
    console.log("No audio source available to download");
  }
}

function releaseAudioURL(audioElement) {
  if (audioElement.src) {
    window.URL.revokeObjectURL(audioElement.src);
  }
}
