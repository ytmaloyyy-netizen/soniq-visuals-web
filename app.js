const $=id=>document.getElementById(id);
const audio=$('audio'), stage=$('stage');
let ctx, source, splitter, analyserL, analyserR, analyserMix, mediaDest, recorder, chunks=[], recording=false, raf=0, coverUrl='', captureCanvas, captureCtx, captureTimer;
const bars=[...Array(7)].map(()=>{const e=document.createElement('i');$('miniEq').appendChild(e);return e});
function say(t){$('message').textContent=t}
function setCover(url){coverUrl=url;$('islandCover').src=url;$('bottomCover').src=url}
$('audioFile').addEventListener('change',e=>{
 const f=e.target.files[0];if(!f)return;
 audio.src=URL.createObjectURL(f);audio.load();
 $('trackTitle').value=f.name.replace(/\.[^.]+$/,'');
 $('bottomTitle').textContent=$('trackTitle').value;
 $('islandTitle').textContent=$('trackTitle').value;
 $('bottomArtist').textContent=$('artist').value;
 $('islandArtist').textContent=$('artist').value;
 $('play').disabled=false;$('record').disabled=false;
 say('Трек загружен. Нажми «Воспроизвести».');
});
$('coverFile').addEventListener('change',e=>{const f=e.target.files[0];if(f)setCover(URL.createObjectURL(f))});
$('trackTitle').addEventListener('input',e=>{$('bottomTitle').textContent=e.target.value;$('islandTitle').textContent=e.target.value});
$('artist').addEventListener('input',e=>{$('bottomArtist').textContent=e.target.value;$('islandArtist').textContent=e.target.value});
$('accent').addEventListener('input',e=>{document.documentElement.style.setProperty('--accent',e.target.value);});
function setupAudio(){
 if(ctx)return;
 ctx=new (window.AudioContext||window.webkitAudioContext)();
 source=ctx.createMediaElementSource(audio);
 splitter=ctx.createChannelSplitter(2);
 analyserL=ctx.createAnalyser();analyserR=ctx.createAnalyser();analyserMix=ctx.createAnalyser();
 [analyserL,analyserR,analyserMix].forEach(a=>{a.fftSize=1024;a.smoothingTimeConstant=.78});
 mediaDest=ctx.createMediaStreamDestination();
 source.connect(splitter);splitter.connect(analyserL,0);splitter.connect(analyserR,1);
 source.connect(analyserMix);source.connect(ctx.destination);source.connect(mediaDest);
}
$('play').onclick=async()=>{setupAudio();await ctx.resume();if(audio.paused){await audio.play();$('play').textContent='Ⅱ Пауза';say('Воспроизведение…')}else{audio.pause();$('play').textContent='▶ Воспроизвести';}};
$('stop').onclick=()=>{audio.pause();audio.currentTime=0;$('play').textContent='▶ Воспроизвести'};
audio.addEventListener('loadedmetadata',()=>{$('stop').disabled=false});
function draw(){
 const lc=new Uint8Array(analyserL?.frequencyBinCount||512),rc=new Uint8Array(analyserR?.frequencyBinCount||512),mix=new Uint8Array(analyserMix?.frequencyBinCount||512);
 if(analyserL){analyserL.getByteFrequencyData(lc);analyserR.getByteFrequencyData(rc);analyserMix.getByteFrequencyData(mix)}
 const c=$('stereoCanvas'),g=c.getContext('2d'),w=c.width,h=c.height;g.clearRect(0,0,w,h);
 const accent=$('accent').value;
 g.strokeStyle='#344761';g.lineWidth=4;g.beginPath();g.moveTo(30,h/2);g.lineTo(w-30,h/2);g.stroke();
 let l=lc.reduce((a,b)=>a+b,0)/lc.length/255,r=rc.reduce((a,b)=>a+b,0)/rc.length/255;
 const x=30+(w-60)*(l/(l+r||1));g.shadowBlur=28;g.shadowColor=accent;g.fillStyle=accent;g.beginPath();g.arc(x,h/2,10+Math.max(l,r)*14,0,Math.PI*2);g.fill();g.shadowBlur=0;
 g.fillStyle='#eaf5ff';g.font='bold 22px Arial';g.fillText('L',24,28);g.fillText('R',w-48,28);
 const ec=$('eqCanvas'),eg=ec.getContext('2d'),ew=ec.width,eh=ec.height;eg.clearRect(0,0,ew,eh);
 const count=44,gap=8,bw=(ew-gap*(count-1))/count;
 for(let i=0;i<count;i++){let v=mix[Math.floor(i/count*mix.length)]/255;let bh=5+v*(eh-12);eg.fillStyle=i%4===0?'#ff5c7c':accent;eg.beginPath();eg.roundRect(i*(bw+gap),eh-bh,bw,bh,5);eg.fill()}
 bars.forEach((b,i)=>b.style.height=(5+(mix[i*5]||0)/255*18)+'px');
 $('progress').style.width=(audio.duration?audio.currentTime/audio.duration*100:0)+'%';
 raf=requestAnimationFrame(draw);
}
function startDraw(){cancelAnimationFrame(raf);draw()}
$('record').onclick=async()=>{
 setupAudio();await ctx.resume();
 if(!audio.paused){say('Сначала поставь трек на паузу, затем начни запись.');return}
 captureCanvas=document.createElement('canvas');captureCanvas.width=1080;captureCanvas.height=1920;captureCtx=captureCanvas.getContext('2d');
 const stream=captureCanvas.captureStream(30), combined=new MediaStream([...stream.getVideoTracks(),...mediaDest.stream.getAudioTracks()]);
 const paintFrame=async()=>{if(!recording)return;try{const snap=await html2canvas(stage,{backgroundColor:'#070b16',scale:1080/stage.clientWidth});captureCtx.clearRect(0,0,1080,1920);captureCtx.drawImage(snap,0,0,1080,1920);}catch(e){}};
 await paintFrame();captureTimer=setInterval(paintFrame,100);
 const mime=['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'].find(t=>MediaRecorder.isTypeSupported(t));
 if(!mime){say('Этот браузер не поддерживает запись видео.');return}
 chunks=[];recorder=new MediaRecorder(combined,{mimeType:mime});recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
 recorder.onstop=()=>{recording=false;clearInterval(captureTimer);const blob=new Blob(chunks,{type:mime});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='SONIQ_VISUALS.webm';a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);say('Видео сохранено в формате WebM.');$('finish').disabled=true;$('record').disabled=false;};
 recorder.start();recording=true;$('record').disabled=true;$('finish').disabled=false;$('stop').disabled=true;
 await audio.play();$('play').textContent='Ⅱ Пауза';say('Идёт запись. Нажми «Сохранить», чтобы завершить.');
};
$('finish').onclick=()=>{if(recorder&&recorder.state!=='inactive'){recorder.stop();audio.pause();$('play').textContent='▶ Воспроизвести';}};
$('record').disabled=true;
setCover('');$('islandCover').style.display='none';$('bottomCover').style.display='none';
const fallback='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" rx="18" fill="#18314e"/><text x="50" y="62" text-anchor="middle" font-size="38" fill="#78d0ff">♫</text></svg>');
setCover(fallback);$('islandCover').style.display='block';$('bottomCover').style.display='block';
