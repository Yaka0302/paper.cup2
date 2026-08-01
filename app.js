const crafts = {
  rabbit: {
    name: "うさぎ", emoji: "🐰",
    image: "rabbit.jpg", pdf: "rabbit.pdf", audio: "rabbit_soft.wav",
    steps: ["かみこっぷを さかさまに おく","みみと かおを きる","みみと かおを はる","できあがり！"]
  },
  frog: {
    name: "かえる", emoji: "🐸",
    image: "frog.jpg", pdf: "frog.pdf", audio: "gentle_bgm.wav",
    steps: ["みどりの かみを はる","め・くち・てあしを きる","かみこっぷに はる","できあがり！"]
  },
  lion: {
    name: "らいおん", emoji: "🦁",
    image: "lion.jpg", pdf: "lion.pdf", audio: "gentle_bgm.wav",
    steps: ["きいろの かみを はる","たてがみと かおを きる","かみこっぷに はる","できあがり！"]
  },
  penguin: {
    name: "ぺんぎん", emoji: "🐧",
    image: "penguin.jpg", pdf: "penguin.pdf", audio: "gentle_bgm.wav",
    steps: ["くろい かみを はる","おなか・くちばし・つばさを きる","かみこっぷに はる","できあがり！"]
  },
  rocket: {
    name: "ろけっと", emoji: "🚀",
    image: "rocket.jpg", pdf: "rocket.pdf", audio: "gentle_bgm.wav",
    steps: ["あおい かみを はる","まど・つばさ・ほのおを きる","かみこっぷに はる","できあがり！"]
  },
  flower: {
    name: "おはな", emoji: "🌸",
    image: "flower.jpg", pdf: "flower.pdf", audio: "gentle_bgm.wav",
    steps: ["みどりの かみを はる","はなびら・まんなか・はっぱを きる","かみこっぷに はる","できあがり！"]
  }
};

let selected = "rabbit";
let stream = null;
let guideTimer = null;
let faceMesh = null;
let faceLoopRunning = false;
let lastFaceSend = 0;
let currentMusicMode = "";

const $ = id => document.getElementById(id);

function craftRoot() {
  return $("craftGrid") || $("craftButtons");
}

function renderCraftButtons() {
  const root = craftRoot();
  if (!root) {
    console.error("こうさく選択エリアが見つかりません。");
    return;
  }

  root.innerHTML = "";

  Object.entries(crafts).forEach(([key, craft]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "craft" + (key === selected ? " selected" : "");
    button.innerHTML = `<span>${craft.emoji}</span>${craft.name}`;

    button.addEventListener("click", () => {
      selected = key;
      renderCraftButtons();
      renderCraft();
    });

    root.appendChild(button);
  });
}

function renderCraft() {
  const craft = crafts[selected];

  if ($("craftTitle")) {
    $("craftTitle").textContent = `${craft.emoji} ${craft.name}の つくりかた`;
  }

  if ($("finishedPhoto")) {
    $("finishedPhoto").src = craft.image;
    $("finishedPhoto").alt = `${craft.name}の できあがりしゃしん`;
  }

  if ($("steps")) {
    $("steps").innerHTML = craft.steps.map(step => `<li>${step}</li>`).join("");
  }

  if ($("pdfLink")) {
    $("pdfLink").href = craft.pdf;
    $("pdfLink").setAttribute("download", craft.pdf);
  }

  if ($("cameraTitle")) {
    $("cameraTitle").textContent = `${craft.emoji} ${craft.name}を もってね`;
  }

  const audio = $("bgm");
  if (audio) {
    audio.pause();
    audio.src = craft.audio;
    audio.load();
  }
}

function updateMusicLabel(text) {
  if ($("musicState")) {
    $("musicState").textContent = text;
  }
}

function setMusicMode(mode) {
  if (currentMusicMode === mode) return;

  currentMusicMode = mode;
  const audio = $("bgm");
  if (!audio) return;

  if (mode === "calm") {
    audio.volume = 0.06;
    audio.playbackRate = 0.80;
    updateMusicLabel("🎵 ゆっくり やさしい おんがく");
  } else if (mode === "bright") {
    audio.volume = 0.11;
    audio.playbackRate = 0.94;
    updateMusicLabel("🎵 すこし あかるい おんがく");
  } else {
    audio.volume = 0.08;
    audio.playbackRate = 0.87;
    updateMusicLabel("🎵 やさしい おんがく");
  }
}

function pointDistance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function handleFaceResults(results) {
  const landmarks =
    results &&
    results.multiFaceLandmarks &&
    results.multiFaceLandmarks[0];

  if (!landmarks) {
    setMusicMode("soft");
    return;
  }

  const faceWidth = pointDistance(landmarks[234], landmarks[454]) || 1;
  const mouthWidth = pointDistance(landmarks[61], landmarks[291]) / faceWidth;
  const mouthOpen = pointDistance(landmarks[13], landmarks[14]) / faceWidth;
  const cornerY = (landmarks[61].y + landmarks[291].y) / 2;
  const mouthCenterY = (landmarks[13].y + landmarks[14].y) / 2;
  const smileLift = mouthCenterY - cornerY;

  if (mouthOpen > 0.050) {
    setMusicMode("calm");
  } else if (mouthWidth > 0.35 && smileLift > 0.003) {
    setMusicMode("bright");
  } else {
    setMusicMode("soft");
  }
}

async function setupFaceMesh() {
  if (faceMesh || typeof FaceMesh === "undefined") return;

  faceMesh = new FaceMesh({
    locateFile: file =>
      `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
  });

  faceMesh.setOptions({
    maxNumFaces: 1,
    refineLandmarks: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
  });

  faceMesh.onResults(handleFaceResults);
  await faceMesh.initialize();
}

async function faceLoop(timestamp) {
  if (!faceLoopRunning) return;

  const video = $("video");

  if (
    faceMesh &&
    video &&
    video.readyState >= 2 &&
    timestamp - lastFaceSend > 150
  ) {
    lastFaceSend = timestamp;

    try {
      await faceMesh.send({ image: video });
    } catch (error) {
      console.warn("表情認識を一時的にスキップしました。", error);
    }
  }

  requestAnimationFrame(faceLoop);
}

function startGuide() {
  const sequence = [
    "🎵 おんがくが はじまるよ！",
    "➡️ みぎに ゆらゆら",
    "⬅️ ひだりに ゆらゆら",
    "🙌 たかく あげよう！",
    "🔄 くるっと まわそう！",
    "🎉 じょうずに できたね！"
  ];

  let index = 0;

  if ($("guide")) {
    $("guide").textContent = sequence[0];
  }

  clearInterval(guideTimer);

  guideTimer = setInterval(() => {
    index += 1;

    if (index < sequence.length) {
      if ($("guide")) {
        $("guide").textContent = sequence[index];
      }
    } else {
      clearInterval(guideTimer);
    }
  }, 3500);
}

async function openCameraAndPlay() {
  const cameraPanel = $("cameraPanel");
  const video = $("video");
  const audio = $("bgm");

  if (cameraPanel) {
    cameraPanel.classList.add("open");
    cameraPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (audio) {
    audio.src = crafts[selected].audio;
    audio.load();
    audio.currentTime = 0;
    currentMusicMode = "";
    setMusicMode("soft");
    audio.play().catch(() => {});
  }

  startGuide();

  if (!video || !navigator.mediaDevices) return;

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" },
      audio: false
    });

    video.srcObject = stream;
    await video.play();

    try {
      await setupFaceMesh();

      if (faceMesh) {
        faceLoopRunning = true;
        requestAnimationFrame(faceLoop);
      }
    } catch (error) {
      console.warn("表情認識を利用できません。", error);
      updateMusicLabel("🎵 やさしい おんがく");
    }
  } catch (error) {
    if ($("guide")) {
      $("guide").textContent =
        "かめらを つかえません。おんがくだけでも あそべるよ！";
    }
  }
}

function closeCamera() {
  clearInterval(guideTimer);
  faceLoopRunning = false;

  if (stream) {
    stream.getTracks().forEach(track => track.stop());
  }

  stream = null;

  if ($("video")) {
    $("video").srcObject = null;
  }

  const audio = $("bgm");
  if (audio) {
    audio.pause();
    audio.currentTime = 0;
  }

  if ($("cameraPanel")) {
    $("cameraPanel").classList.remove("open");
  }

  if ($("nextBtn")) {
    $("nextBtn").scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  renderCraftButtons();
  renderCraft();

  if ($("nextBtn")) {
    $("nextBtn").addEventListener("click", openCameraAndPlay);
  }

  if ($("replayBtn")) {
    $("replayBtn").addEventListener("click", () => {
      const audio = $("bgm");

      if (audio) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      }

      startGuide();
    });
  }

  if ($("closeBtn")) {
    $("closeBtn").addEventListener("click", closeCamera);
  }
});
