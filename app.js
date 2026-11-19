const $=id=>document.getElementById(id);
const audio=$('audio');
let audioCtx,source,splitter,leftAnalyser,rightAnalyser,mixAnalyser,mediaDest,recorder,chunks=[],previewFrame=0,recordFrame=0,recording=false;
const fallback='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" rx="18" fill="#26384d"/><text x="50" y="63" text-anchor="middle" font-size="42" fill="white">♫</text></svg>');
$('cover').src=fallback;
function status(t){$('status').textContent=t}
function syncText(){
  $('title').textContent=$('titleInput').value||'Название трека';
  $('artist').textContent=$('artistInput').value||'Исполнитель';
}
$('titleInput').addEventListener('input',syncText);
$('artistInput').addEventListener('input',syncText);
$('scale').addEventListener('input',e=>document.documentElement.style.setProperty('--island-scale',e.target.value/100));
$('accent').addEventListener('input',e=>document.documentElement.style.setProperty('--accent',e.target.value));
function toggleIsland(){
  $('island').classList.toggle('expanded');
}
$('island').addEventListener('click',toggleIsland);
$('island').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggleIsland()}});
$('audioFile').addEventListener('change',e=>{
  const f=e.target.files[0];if(!f)return;
  audio.src=URL.createObjectURL(f);
  $('titleInput').value=f.name.replace(/\.[^.]+$/,'');syncText();
  $('play').disabled=false;$('record').disabled=false;
  status('Трек загружен. Можно прослушать и записать.');
});
$('coverFile').addEventListener('change',e=>{
  const f=e.target.files[0];if(!f)return;
  const r=new FileReader();r.onload=()=>{$('cover').src=r.result};r.readAsDataURL(f);
});
function setup(){
  if(audioCtx)return;
  audioCtx=new(window.AudioContext||window.webkitAudioContext)();
  source=audioCtx.createMediaElementSource(audio);
  splitter=audioCtx.createChannelSplitter(2);
  leftAnalyser=audioCtx.createAnalyser();rightAnalyser=audioCtx.createAnalyser();mixAnalyser=audioCtx.createAnalyser();
  [leftAnalyser,rightAnalyser,mixAnalyser].forEach(a=>{a.fftSize=1024;a.smoothingTimeConstant=.72});
  mediaDest=audioCtx.createMediaStreamDestination();
  source.connect(splitter);splitter.connect(leftAnalyser,0);splitter.connect(rightAnalyser,1);
  source.connect(mixAnalyser);source.connect(audioCtx.destination);source.connect(mediaDest);
}
$('play').onclick=async()=>{
  setup();await audioCtx.resume();
  if(audio.paused){await audio.play();$('play').textContent='Ⅱ Пауза';startPreview()}
  else{audio.pause();$('play').textContent='▶ Прослушать'}
};
$('stop').onclick=()=>{audio.pause();audio.currentTime=0;$('play').textContent='▶ Прослушать'};
audio.addEventListener('loadedmetadata',()=>{$('stop').disabled=false});
audio.addEventListener('ended',()=>{$('play').textContent='▶ Прослушать'});
function startPreview(){
  cancelAnimationFrame(previewFrame);
  const data=new Uint8Array(mixAnalyser.frequencyBinCount);
  function tick(){
    if(!audioCtx)return;
    mixAnalyser.getByteFrequencyData(data);
    document.querySelectorAll('.bars i').forEach((b,i)=>{b.style.height=(4+(data[i*9+2]/255)*29)+'px'});
    previewFrame=requestAnimationFrame(tick);
  }
  tick();
}
function roundRect(ctx,x,y,w,h,r){
  ctx.beginPath();
  if(ctx.roundRect)ctx.roundRect(x,y,w,h,r);
  else ctx.rect(x,y,w,h);
}
function wrapLines(ctx,text,maxWidth,maxLines){
  const words=String(text||'').trim().split(/\s+/);
  const lines=[];let line='';
  for(const word of words){
    const test=line?line+' '+word:word;
    if(ctx.measureText(test).width<=maxWidth){line=test;continue}
    if(line)lines.push(line);
    line=word;
    if(lines.length>=maxLines)break;
  }
  if(line&&lines.length<maxLines)lines.push(line);
  const used=lines.join(' ');
  if(used.length<String(text||'').trim().length){
    let last=lines.length-1, s=lines[last]||'';
    while(s&&ctx.measureText(s+'…').width>maxWidth)s=s.slice(0,-1);
    lines[last]=s+'…';
  }
  return lines;
}
function drawExport(canvas,ctx){
  const w=canvas.width,h=canvas.height;
  ctx.fillStyle='#00ff00';ctx.fillRect(0,0,w,h);
  const accent=$('accent').value,scale=Number($('scale').value)/100;
  const expanded=$('island').classList.contains('expanded');
  const baseW=w*.82,iw=baseW*scale;
  const ih=(expanded?Math.max(250,h*.105):Math.max(190,h*.085))*scale;
  const x=(w-iw)/2,y=(h-ih)/2;
  ctx.save();ctx.shadowColor='#000';ctx.shadowBlur=42*scale;
  ctx.fillStyle='#08090d';roundRect(ctx,x,y,iw,ih,Math.min(70*scale,ih/3));ctx.fill();
  ctx.shadowBlur=0;ctx.strokeStyle='#292d35';ctx.lineWidth=5*scale;
  roundRect(ctx,x,y,iw,ih,Math.min(70*scale,ih/3));ctx.stroke();
  const pad=iw*.035,art=ih*.70,artX=x+pad,artY=y+(ih-art)/2;
  const img=$('cover');
  if(img.complete&&img.naturalWidth){
    ctx.save();roundRect(ctx,artX,artY,art,art,art*.22);ctx.clip();ctx.drawImage(img,artX,artY,art,art);ctx.restore();
  }else{
    ctx.fillStyle='#26384d';roundRect(ctx,artX,artY,art,art,art*.22);ctx.fill();
    ctx.fillStyle='#fff';ctx.font=`bold ${art*.52}px Arial`;ctx.fillText('♫',artX+art*.25,artY+art*.72);
  }
  const tx=artX+art+pad*.8,barW=iw*.15,textRight=x+iw-barW-pad*1.2;
  const maxW=Math.max(50,textRight-tx);
  ctx.textAlign='left';ctx.fillStyle='#fff';
  const titleSize=Math.max(24,ih*(expanded?.19:.22));
  ctx.font=`bold ${titleSize}px Arial`;
  const lines=wrapLines(ctx,$('titleInput').value||'Название трека',maxW,3);
  const lineH=titleSize*1.12;
  const titleBlockH=lines.length*lineH;
  const artist=$('artistInput').value||'Исполнитель';
  const artistSize=Math.max(18,ih*.12);
  ctx.font=`${artistSize}px Arial`;
  const artistY=y+ih*.5+titleBlockH*.5+artistSize*.85;
  const titleStartY=artistY-titleBlockH-artistSize*.45;
  ctx.font=`bold ${titleSize}px Arial`;
  lines.forEach((line,i)=>ctx.fillText(line,tx,titleStartY+i*lineH));
  ctx.fillStyle='#aab1bd';ctx.font=`${artistSize}px Arial`;
  ctx.fillText(artist.length>28?artist.slice(0,27)+'…':artist,tx,artistY);
  const arr=new Uint8Array(mixAnalyser.frequencyBinCount);mixAnalyser.getByteFrequencyData(arr);
  ctx.fillStyle=accent;const bx=x+iw-barW*.92,base=y+ih/2;
  for(let i=0;i<8;i++){
    const v=arr[i*8+3]/255,bh=(ih*.09+v*ih*.38);
    roundRect(ctx,bx+i*(barW/8),base-bh/2,Math.max(4,barW*.075),bh,5*scale);ctx.fill();
  }
  ctx.restore();
}
$('record').onclick=async()=>{
  setup();await audioCtx.resume();
  if(audio.paused){try{await audio.play()}catch(e){status('Не удалось запустить аудио. Нажми «Прослушать» и повтори.');return}}
  const width=Number($('resolution').value),height=Math.round(width*16/9),fps=Number($('fps').value);
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext('2d',{alpha:false});
  if(!canvas.captureStream||!window.MediaRecorder){status('Запись не поддерживается. Открой сайт в Chrome.');return}
  const videoStream=canvas.captureStream(fps);
  const combined=new MediaStream([...videoStream.getVideoTracks(),...mediaDest.stream.getAudioTracks()]);
  const mime=['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'].find(t=>MediaRecorder.isTypeSupported(t));
  if(!mime){status('Браузер не поддерживает запись WebM. Попробуй Chrome.');return}
  recording=true;
  const paint=()=>{if(!recording)return;drawExport(canvas,ctx);recordFrame=requestAnimationFrame(paint)};
  paint();chunks=[];
  try{recorder=new MediaRecorder(combined,{mimeType:mime,videoBitsPerSecond:width>=2160?24000000:10000000})}
  catch(e){recording=false;cancelAnimationFrame(recordFrame);status('Телефон не смог запустить выбранное качество. Выбери 1080p и 30 FPS.');return}
  recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
  recorder.onstop=()=>{
    recording=false;cancelAnimationFrame(recordFrame);
    const blob=new Blob(chunks,{type:mime}),url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download='SONIQ_GREEN_SCREEN.webm';a.click();
    setTimeout(()=>URL.revokeObjectURL(url),60000);
    status(`Видео сохранено · ${width}×${height} · выбранные ${fps} FPS. Реальная частота зависит от устройства.`);
    $('finish').disabled=true;$('record').disabled=false;$('stop').disabled=false;
    videoStream.getTracks().forEach(t=>t.stop());
  };
  recorder.start(1000);$('record').disabled=true;$('finish').disabled=false;$('stop').disabled=true;
  $('play').textContent='Ⅱ Запись идёт';
  status(`Идёт запись ${width}×${height}, выбранные ${fps} FPS. Нажми «Сохранить видео», когда закончишь.`);
};
$('finish').onclick=()=>{
  if(recorder&&recorder.state!=='inactive'){recorder.stop();audio.pause();$('play').textContent='▶ Прослушать'}
};
