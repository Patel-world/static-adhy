var toggle = true;

function toggleCam(){
    toggle ? stopVid() : startVid();
    toggle = !toggle;
}
function toggleMic(){
    toggle ? stopMic() : startMic();
    toggle = !toggle;
}

async function load_home() {
    call();
    document.getElementById("j").style.display = "none";
    document.getElementById("c").style.display = "none";
    document.getElementById("video2").style.height = "620px";
    document.getElementById("video2").style.width = "1000px";
    document.getElementById("video2").style.borderRadius = "0";
    document.getElementById("video2").style.left = "0";
    document.getElementById("video2").style.top = "-30px";
    document.getElementById("chat").style.display = "block";
    document.getElementById("end").style.display = "block";
}

async function endCall(){


    document.getElementById('mic').style.display ="none";
    document.getElementById("vid").style.display = "none";
    document.getElementById("chat").style.display = "none";
    document.getElementById("myForm").style.display = "none";
    document.getElementById("j").style.display = "none";
    document.getElementById("c").style.display = "none";
    document.getElementById("video2").style.display = "none";
    document.getElementById("chat").style.display = "none";
    document.getElementById("end").style.display = "none";
    hangup();
    closeForm();
    document.getElementById("endc").style.display = "block";
}

function openForm() {
  document.getElementById("myForm").style.display = "block";
}

function closeForm() {
  document.getElementById("myForm").style.display = "none";
}


function openFort() {
    toggle ? openForm() : closeForm();
    toggle = !toggle;
}

/*
 *  Copyright (c) 2015 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

'use strict';




const video2 = document.querySelector('video#video2');


let pc1Local;
let pc1Remote;
const offerOptions = {
  offerToReceiveAudio: 1,
  offerToReceiveVideo: 1
};



function gotStream(stream) {
  console.log('Received local stream');
  video2.srcObject = stream;
  window.localStream = stream;
}

function start() {
  console.log('Requesting local stream');
  navigator.mediaDevices
      .getUserMedia({
        audio: true,
        video: true
      })
      .then(gotStream)
      .catch(e => console.log('getUserMedia() error: ', e));
}

const muteUnmute = () => {
    const enabled = window.localStream.getVideoTracks()[0].enabled;
    if (enabled) {
        window.localStream.getVideoTracks()[0].enabled = false;
        setUnmuteButton();
    } else {
        setMuteButton();
        window.localStream.getVideoTracks().enabled = true;
    }
}


function startVid() {
    window.localStream.getVideoTracks()[0].enabled = true;

}
function startMic() {
    window.localStream.getAudioTracks()[0].enabled = true;
  }
function stopVid() {
    window.localStream.getVideoTracks()[0].enabled = false;
}

function stopMic() {
    window.localStream.getAudioTracks()[0].enabled = false;
  }

const muteUnmu = () => {
    const enabled = window.localStream.getAudioTracks()[0].enabled;
    if (enabled) {
        window.localStream.getAudioTracks()[0].enabled = false;
        setUnmuteButton();
    } else {
        setMuteButton();
        window.localStream.getAudioTracks().enabled = true;
    }
}



start();


function call() {
  console.log('Starting calls');
  const audioTracks = window.localStream.getAudioTracks();
  const videoTracks = window.localStream.getVideoTracks();
  if (audioTracks.length > 0) {
    console.log(`Using audio device: ${audioTracks[0].label}`);
  }
  if (videoTracks.length > 0) {
    console.log(`Using video device: ${videoTracks[0].label}`);
  }
  // Create an RTCPeerConnection via the polyfill.
  const servers = null;
  pc1Local = new RTCPeerConnection(servers);
  pc1Remote = new RTCPeerConnection(servers);
  pc1Remote.ontrack = gotRemoteStream1;
  pc1Local.onicecandidate = iceCallback1Local;
  pc1Remote.onicecandidate = iceCallback1Remote;
  console.log('pc1: created local and remote peer connection objects');


  window.localStream.getTracks().forEach(track => pc1Local.addTrack(track, window.localStream));
  console.log('Adding local stream to pc1Local');
  pc1Local
      .createOffer(offerOptions)
      .then(gotDescription1Local, onCreateSessionDescriptionError);
}

function onCreateSessionDescriptionError(error) {
  console.log(`Failed to create session description: ${error.toString()}`);
}

function gotDescription1Local(desc) {
  pc1Local.setLocalDescription(desc);
  console.log(`Offer from pc1Local\n${desc.sdp}`);
  pc1Remote.setRemoteDescription(desc);
  // Since the 'remote' side has no media stream we need
  // to pass in the right constraints in order for it to
  // accept the incoming offer of audio and video.
  pc1Remote.createAnswer().then(gotDescription1Remote, onCreateSessionDescriptionError);
}

function gotDescription1Remote(desc) {
  pc1Remote.setLocalDescription(desc);
  console.log(`Answer from pc1Remote\n${desc.sdp}`);
  pc1Local.setRemoteDescription(desc);
}

function upgrade() {
  navigator.mediaDevices
      .getUserMedia({video: true})
      .then(stream => {
        const videoTracks = stream.getVideoTracks();
        if (videoTracks.length > 0) {
          console.log(`Using video device: ${videoTracks[0].label}`);
        }
        localStream.addTrack(videoTracks[0]);
        localVideo.srcObject = null;
        localVideo.srcObject = localStream;
        pc1.addTrack(videoTracks[0], localStream);
        return pc1.createOffer();
      })
      .then(offer => pc1.setLocalDescription(offer))
      .then(() => pc2.setRemoteDescription(pc1.localDescription))
      .then(() => pc2.createAnswer())
      .then(answer => pc2.setLocalDescription(answer))
      .then(() => pc1.setRemoteDescription(pc2.localDescription));
}



function hangup() {
  console.log('Ending calls');
  window.localStream.getVideoTracks()[0].stop();
  window.localStream.getAudioTracks()[0].stop();
  pc1Local.close();
  pc1Remote.close();
  pc1Local = pc1Remote = null;
}

function gotRemoteStream1(e) {
  if (video2.srcObject !== e.streams[0]) {
    video2.srcObject = e.streams[0];
    console.log('pc1: received remote stream');
  }
}


function iceCallback1Local(event) {
  handleCandidate(event.candidate, pc1Remote, 'pc1: ', 'local');
}

function iceCallback1Remote(event) {
  handleCandidate(event.candidate, pc1Local, 'pc1: ', 'remote');
}

function handleCandidate(candidate, dest, prefix, type) {
  dest.addIceCandidate(candidate)
      .then(onAddIceCandidateSuccess, onAddIceCandidateError);
  console.log(`${prefix}New ${type} ICE candidate: ${candidate ? candidate.candidate : '(null)'}`);
}

function onAddIceCandidateSuccess() {
  console.log('AddIceCandidate success.');
}

function onAddIceCandidateError(error) {
  console.log(`Failed to add ICE candidate: ${error.toString()}`);
}
