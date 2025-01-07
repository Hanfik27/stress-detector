// Element references
const video = document.getElementById('video');
const detectionStatus = document.getElementById('detection-status');
const stressLevel = document.getElementById('stress-level');
const timer = document.getElementById('timer');
const finalResult = document.getElementById('final-result');

// Variables
let finalStressPercentage = 0;
let timeLeft = 5;
let isDetectionRunning = true;
const DETECTION_INTERVAL = 1000 / 60;

// Load face-api.js models
async function loadModels() {
  try {
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri('./models'),
      faceapi.nets.faceLandmark68Net.loadFromUri('./models'),
      faceapi.nets.faceRecognitionNet.loadFromUri('./models'),
      faceapi.nets.faceExpressionNet.loadFromUri('./models')
    ]);
    startVideo();
  } catch (error) {
    console.error('Error loading models:', error);
  }
}

// Start video stream
function startVideo() {
  navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 720, height: 540, frameRate: 60 } })
    .then(stream => { video.srcObject = stream; })
    .catch(error => console.error('Error accessing camera:', error));
}

// Handle video playback
video.addEventListener('play', () => {
  const canvas = faceapi.createCanvasFromMedia(video);
  document.querySelector('.video-container').appendChild(canvas);
  faceapi.matchDimensions(canvas, { width: video.videoWidth, height: video.videoHeight });
  detectFaces(canvas);
  startTimer();
});

// Face detection loop
async function detectFaces(canvas) {
  const ctx = canvas.getContext('2d');
  let previousBox = null;
  const detectionLoop = async () => {
    if (!isDetectionRunning) return;

    const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 256, scoreThreshold: 0.4 }))
      .withFaceLandmarks().withFaceExpressions();

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    if (detections.length > 0) {
      const { expressions, detection: faceDetection } = detections[0];
      const smoothedBox = previousBox ? lerpBox(previousBox, faceDetection.box) : faceDetection.box;
      previousBox = smoothedBox;

      finalStressPercentage = calculateStressLevel(expressions);
      drawDetectionBox(ctx, smoothedBox);
      updateUI('Stress Detected', `${finalStressPercentage.toFixed(0)}%`);
    } else {
      previousBox = null;
      updateUI('No Face Detected', `${finalStressPercentage.toFixed(0)}%`);
    }

    setTimeout(() => requestAnimationFrame(detectionLoop), DETECTION_INTERVAL);
  };
  detectionLoop();
}

// Linear interpolation
function lerpBox(start, end) {
  return {
    x: lerp(start.x, end.x, 0.3),
    y: lerp(start.y, end.y, 0.3),
    width: lerp(start.width, end.width, 0.3),
    height: lerp(start.height, end.height, 0.3)
  };
}

function lerp(start, end, t) {
  return start + (end - start) * t;
}

// Calculate stress level
function calculateStressLevel(expressions) {
  return Math.min((expressions.angry + expressions.sad + expressions.fearful) * 100, 100);
}

// Draw detection box
function drawDetectionBox(ctx, box) {
  ctx.strokeStyle = '#0000FF';
  ctx.lineWidth = 2;
  ctx.strokeRect(box.x, box.y, box.width, box.height);
  ctx.font = 'bold 16px Arial';
  ctx.fillStyle = 'white';
  ctx.lineWidth = 3;
  ctx.fillText('Face Detected', box.x, box.y - 10);
}

// Timer
function startTimer() {
  const interval = setInterval(() => {
    if (timeLeft <= 0) {
      clearInterval(interval);
      stopDetection();
    } else {
      updateTimer(`Time Remaining: ${timeLeft--} seconds`);
    }
  }, 1000);
}

function stopDetection() {
  isDetectionRunning = false;
  updateUI('Final Result', `${finalStressPercentage.toFixed(0)}%`);
  updateTimer('Time Remaining: 0 seconds');
  finalResult.textContent = `Final Stress Level: ${finalStressPercentage.toFixed(0)}%`;
  finalResult.style.display = 'block';
}

// UI updates
function updateUI(statusText, stressText) {
  detectionStatus.textContent = statusText;
  stressLevel.textContent = `Stress Level: ${stressText}`;
}

function updateTimer(timerText) {
  timer.textContent = timerText;
}

// Handle window resizing (to support mobile devices and window resizing)
window.addEventListener('resize', debounce(() => {
  adjustVideoAndCanvasSize();
}, 200));

// Adjust video and canvas size dynamically
function adjustVideoAndCanvasSize() {
  const container = document.querySelector('.video-container');
  const aspectRatio = video.videoWidth / video.videoHeight;
  const width = container.clientWidth;
  video.width = width;
  video.height = width / aspectRatio;

  const canvas = document.querySelector('canvas');
  if (canvas) faceapi.matchDimensions(canvas, { width, height: width / aspectRatio });
}

// Debounce helper to optimize resize events
function debounce(func, delay) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), delay);
  };
}

// Initialize
loadModels();