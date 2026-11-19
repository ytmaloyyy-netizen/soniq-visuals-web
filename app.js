const $=id=>document.getElementById(id);
const audio=$('audio'), island=$('island'), bars=$('bars'), miniBars=$('miniBars');
let audioURL=null, coverURL=null, audioCtx=null, analyser=null, source=null, recorder=null, chunks=[], expanded=true, raf=0;
const ctx=bars.getContext('2d'), mctx=miniBars.getContext('2d');
function fmt(s){if(!Number.isFinite(s))return '0:00';return Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0')}
function setText(){const t=$('titleInput').value.trim()||'Название трека', a=$('artistInput').value.trim()||'Исполнитель';$('track').textContent=t;$('artist').textContent=a;$('miniTrack').textContent=t;$('miniArtist').textContent=a;$('lyrics').textContent=$('lyricsInput').value.trim()||' '}
['titleInput','artistInput','lyricsInput'].forEach(id=>$(id).addEventListener('input',setText));
$('audioFile').addEventListener('change',e=>{const f=e.target.files[0];if(!f)return;if(audioURL)URL.revokeObjectURL(audioURL);audioURL=URL.createObjectURL(f);audio.src=audioURL;$('status').textContent='Трек загружен. Нажми воспроизведение.';if(!$('titleInput').value||$('titleInput').value==='Название трека')$('titleInput').value=f.name.replace(/\.[^.]+$/,'');setText();});
$('imageFile').addEventListener('change',e=>{const f=e.target.files[0];if(!f)return;if(coverURL)URL.revokeObjectURL(coverURL);coverURL=URL.createObjectURL(f);$('cover').src=coverURL;$('miniCover').src=coverURL;});
function setupAudio(){if(audioCtx)return;audioCtx=new(window.AudioContext||window.webkitAudioContext)();analyser=audioCtx.createAnalyser();analyser.fftSize=256;analyser.smoothingTimeConstant=.78;source=audioCtx.createMediaElementSource(audio);source.connect(analyser);analyser.connect(audioCtx.destination)}
audio.addEventListener('play',async()=>{setupAudio();if(audioCtx.state==='suspended')await audioCtx.resume();draw()});
audio.addEventListener('pause',()=>cancelAnimationFrame(raf));
audio.addEventListener('timeupdate',()=>{$('current').textContent=fmt(audio.currentTime);$('duration').textContent=fmt(audio.duration);$('progressFill').style.width=(audio.duration?audio.currentTime/audio.duration*100:0)+'%'});
$('play').onclick=()=>audio.paused?audio.play():audio.pause();
$('back').onclick=()=>audio.currentTime=Math.max(0,audio.currentTime-10);
$('forward').onclick=()=>audio.currentTime=Math.min(audio.duration||0,audio.currentTime+10);
$('sound').onclick=()=>audio.muted=!audio.muted;
$('like').onclick=e=>e.currentTarget.style.opacity=e.currentTarget.style.opacity==='0.45'?'1':'.45';
$('toggleExpand').onclick=()=>{expanded=!expanded;island.classList.toggle('collapsed',!expanded)};
function drawBars(c,canvas,count=18){c.clearRect(0,0,canvas.width,canvas.height);let data=new Uint8Array(analyser?analyser.frequencyBinCount:128);if(analyser)analyser.getByteFrequencyData(data);let gap=3,w=(canvas.width-gap*(count-1))/count;for(let i=0;i<count;i++){let v=analyser?data[Math.floor(i*data.length/count)]:0;let h=Math.max(3,(v/255)*(canvas.height*.88));c.fillStyle='#ff3948';c.beginPath();c.roundRect(i*(w+gap),canvas.height-h,w,h,3);c.fill()}}
function draw(){drawBars(ctx,bars,13);drawBars(mctx,miniBars,10);raf=requestAnimationFrame(draw)}
$('record').onclick=async()=>{if(!audio.src){$('status').textContent='Сначала загрузи MP3.';return}if(!window.MediaRecorder||!HTMLCanvasElement.prototype.captureStream){$('status').textContent='Этот браузер не поддерживает запись. Попробуй Chrome.';return}
setupAudio();await audioCtx.resume();
const out=document.createElement('canvas');out.width=1080;out.height=1920;const c=out.getContext('2d');const stream=out.captureStream(30);const audioStream=audioCtx.createMediaStreamDestination();analyser.connect(audioStream);audioStream.stream.getAudioTracks().forEach(t=>stream.addTrack(t));
const render=()=>{c.fillStyle='#00ff00';c.fillRect(0,0,1080,1920);const x=48,y=78,w=984,h=expanded?405:100,r=82;c.save();c.shadowColor='#ff3548';c.shadowBlur=26;c.fillStyle='#050506';c.strokeStyle='#6b252c';c.lineWidth=5;c.beginPath();c.roundRect(x,y,w,h,r);c.fill();c.stroke();c.shadowBlur=0;
const img=$('cover');if(img.complete){c.save();c.beginPath();c.arc(x+88,y+75,48,0,Math.PI*2);c.clip();c.drawImage(img,x+40,y+27,96,96);c.restore()}
c.fillStyle='white';c.font='bold 39px Arial';let title=$('titleInput').value||'Название трека';c.save();c.beginPath();c.rect(x+155,y+20,600,65);c.clip();c.fillText(title,x+160,y+65);c.restore();c.fillStyle='#aaa';c.font='30px Arial';c.fillText($('artistInput').value||'Исполнитель',x+160,y+112);
let d=new Uint8Array(analyser.frequencyBinCount);analyser.getByteFrequencyData(d);for(let i=0;i<15;i++){let bh=Math.max(8,d[i*3]/255*78);c.fillStyle='#ff3c4a';c.beginPath();c.roundRect(x+790+i*11,y+105-bh,6,bh,4);c.fill()}
if(expanded){c.fillStyle='#eee';c.font='28px Arial';c.fillText(($('lyricsInput').value||'').slice(0,58),x+40,y+205);c.fillStyle='#555';c.fillRect(x+40,y+264,904,5);c.fillStyle='#ff414b';c.fillRect(x+40,y+264,904*(audio.duration?audio.currentTime/audio.duration:0),5);c.fillStyle='#aaa';c.font='22px Arial';c.fillText(fmt(audio.currentTime),x+40,y+302);c.fillText('-'+fmt((audio.duration||0)-audio.currentTime),x+850,y+302);c.fillStyle='#ff414b';c.font='bold 48px Arial';c.fillText('♥',x+45,y+370);c.fillStyle='white';c.font='bold 40px Arial';c.fillText('◀◀          Ⅱ          ▶▶',x+280,y+370);c.font='30px Arial';c.fillText('◖))',x+850,y+370)}
c.restore();if(recorder&&recorder.state==='recording')requestAnimationFrame(render)};
chunks=[];recorder=new MediaRecorder(stream,{mimeType:MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')?'video/webm;codecs=vp9,opus':'video/webm'});recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};recorder.onstop=()=>{const blob=new Blob(chunks,{type:'video/webm'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='SONIQ-ISLAND.webm';a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);$('status').textContent='Готово! Видео сохранено в загрузки.'};recorder.start(500);render();$('stopRecord').disabled=false;$('record').disabled=true;$('status').textContent='Идёт запись. Запусти или продолжи песню.';if(audio.paused)audio.play();};
$('stopRecord').onclick=()=>{if(recorder&&recorder.state==='recording')recorder.stop();$('stopRecord').disabled=true;$('record').disabled=false};
setText();
