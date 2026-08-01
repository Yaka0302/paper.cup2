const crafts = {
 rabbit:{name:"うさぎ",emoji:"🐰",image:"rabbit.jpg",pdf:"rabbit.pdf",audio:"rabbit_soft.wav",steps:["かみこっぷを さかさまに おく","みみと かおを きる","みみと かおを はる","できあがり！"]},
 frog:{name:"かえる",emoji:"🐸",image:"frog.jpg",pdf:"frog.pdf",audio:"gentle_bgm.wav",steps:["みどりの かみを はる","め・くち・てあしを きる","かみこっぷに はる","できあがり！"]},
 lion:{name:"らいおん",emoji:"🦁",image:"lion.jpg",pdf:"lion.pdf",audio:"gentle_bgm.wav",steps:["きいろの かみを はる","たてがみと かおを きる","かみこっぷに はる","できあがり！"]},
 penguin:{name:"ぺんぎん",emoji:"🐧",image:"penguin.jpg",pdf:"penguin.pdf",audio:"gentle_bgm.wav",steps:["くろい かみを はる","おなか・くちばし・つばさを きる","かみこっぷに はる","できあがり！"]},
 rocket:{name:"ろけっと",emoji:"🚀",image:"rocket.jpg",pdf:"rocket.pdf",audio:"gentle_bgm.wav",steps:["あおい かみを はる","まど・つばさ・ほのおを きる","かみこっぷに はる","できあがり！"]},
 flower:{name:"おはな",emoji:"🌸",image:"flower.jpg",pdf:"flower.pdf",audio:"gentle_bgm.wav",steps:["みどりの かみを はる","はなびら・まんなか・はっぱを きる","かみこっぷに はる","できあがり！"]}
};

let selected="rabbit";
let stream=null;
let timer=null;
let faceMesh=null;
let faceLoopRunning=false;
let lastFaceSend=0;
let currentMusicMode="soft";

const $=id=>document.getElementById(id);

function drawButtons(){
 const root=$("craftGrid");
 root.innerHTML="";
 Object.entries(crafts).forEach(([key,c])=>{
  const b=document.createElement("button");
  b.className="craft"+(key===selected?" selected":"");
  b.innerHTML=`<span>${c.emoji}</span>${c.name}`;
  b.onclick=()=>{
   selected=key;
   drawButtons();
   showCraft();
  };
  root.appendChild(b);
 });
}

function showCraft(){
 const c=crafts[selected];
 $("craftTitle").textContent=`${c.emoji} ${c.name}の つくりかた`;
 $("finishedPhoto").src=c.image;
 $("finishedPhoto").alt=`${c.name}の できあがりしゃしん`;
 $("steps").innerHTML=c.steps.map(x=>`<li>${x}</li>`).join("");
 $("pdfLink").href=c.pdf;
 $("pdfLink").setAttribute("download",c.pdf);
 $("cameraTitle").textContent=`${c.emoji} ${c.name}を もってね`;
 const audio=$("bgm");
 audio.src=c.audio;
 audio.load();
}

function startGuide(){
 const seq=[
  "🎵 おんがくが はじまるよ！",
  "➡️ みぎに ゆらゆら",
  "⬅️ ひだりに ゆらゆら",
  "🙌 たかく あげよう！",
  "🔄 くるっと まわそう！",
  "🎉 じょうずに できたね！"
 ];
 let i=0;
 $("guide").textContent=seq[0];
 clearInterval(timer);
 timer=setInterval(()=>{
  i++;
  if(i<seq.length){
   $("guide").textContent=seq[i];
  }else{
   clearInterval(timer);
  }
 },3500);
}

function setMusicMode(mode){
 if(currentMusicMode===mode) return;
 currentMusicMode=mode;
 const audio=$("bgm");

 // Very low maximum volume to prevent ear discomfort.
 if(mode==="calm"){
  audio.volume=0.08;
  audio.playbackRate=0.84;
  $("musicState").textContent="🎵 ゆっくり やさしい おんがく";
 }else if(mode==="bright"){
  audio.volume=0.14;
  audio.playbackRate=0.96;
  $("musicState").textContent="🎵 すこし げんきな おんがく";
 }else{
  audio.volume=0.10;
  audio.playbackRate=0.90;
  $("musicState").textContent="🎵 やさしい おんがく";
 }
}

function distance(a,b){
 return Math.hypot(a.x-b.x,a.y-b.y);
}

function handleFaceResults(results){
 const landmarks=results.multiFaceLandmarks?.[0];
 if(!landmarks){
  setMusicMode("soft");
  return;
 }

 // MediaPipe FaceMesh landmark ratios.
 const faceWidth=distance(landmarks[234],landmarks[454]) || 1;
 const mouthWidth=distance(landmarks[61],landmarks[291]) / faceWidth;
 const mouthOpen=distance(landmarks[13],landmarks[14]) / faceWidth;
 const cornerY=(landmarks[61].y+landmarks[291].y)/2;
 const mouthCenterY=(landmarks[13].y+landmarks[14].y)/2;
 const smileLift=(mouthCenterY-cornerY);

 // Do not label or judge emotions. Use mouth shape only as a gentle input.
 if(mouthOpen>0.045){
  setMusicMode("calm");
 }else if(mouthWidth>0.36 && smileLift>0.004){
  setMusicMode("bright");
 }else{
  setMusicMode("soft");
 }
}

async function setupFaceMesh(){
 if(faceMesh || typeof FaceMesh==="undefined") return;
 faceMesh=new FaceMesh({
  locateFile:file=>`https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
 });
 faceMesh.setOptions({
  maxNumFaces:1,
  refineLandmarks:true,
  minDetectionConfidence:0.5,
  minTrackingConfidence:0.5
 });
 faceMesh.onResults(handleFaceResults);
 await faceMesh.initialize();
}

async function faceLoop(timestamp){
 if(!faceLoopRunning) return;
 const video=$("video");
 if(faceMesh && video.readyState>=2 && timestamp-lastFaceSend>130){
  lastFaceSend=timestamp;
  try{
   await faceMesh.send({image:video});
  }catch(error){
   console.warn("face recognition skipped",error);
  }
 }
 requestAnimationFrame(faceLoop);
}

$("nextBtn").onclick=async()=>{
 $("cameraPanel").classList.add("open");
 $("cameraPanel").scrollIntoView({behavior:"smooth"});

 const audio=$("bgm");
 audio.src=crafts[selected].audio;
 audio.volume=selected==="rabbit" ? 0.10 : 0.16;
 audio.playbackRate=selected==="rabbit" ? 0.90 : 0.96;
 audio.currentTime=0;
 audio.play().catch(()=>{});
 currentMusicMode="";
 setMusicMode("soft");
 startGuide();

 try{
  stream=await navigator.mediaDevices.getUserMedia({
   video:{facingMode:"user"},
   audio:false
  });
  $("video").srcObject=stream;
  await $("video").play();

  try{
   await setupFaceMesh();
   if(faceMesh){
    faceLoopRunning=true;
    requestAnimationFrame(faceLoop);
   }else{
    $("musicState").textContent="🎵 やさしい おんがく";
   }
  }catch(error){
   console.warn("face recognition unavailable",error);
   $("musicState").textContent="🎵 やさしい おんがく";
  }
 }catch(e){
  $("guide").textContent="かめらを つかえません。おんがくだけでも あそべるよ！";
 }
};

$("replayBtn").onclick=()=>{
 const audio=$("bgm");
 audio.currentTime=0;
 audio.play().catch(()=>{});
 startGuide();
};

$("closeBtn").onclick=()=>{
 clearInterval(timer);
 faceLoopRunning=false;
 if(stream) stream.getTracks().forEach(t=>t.stop());
 stream=null;
 $("video").srcObject=null;
 const audio=$("bgm");
 audio.pause();
 audio.currentTime=0;
 $("cameraPanel").classList.remove("open");
 $("nextBtn").scrollIntoView({behavior:"smooth"});
};

drawButtons();
showCraft();
