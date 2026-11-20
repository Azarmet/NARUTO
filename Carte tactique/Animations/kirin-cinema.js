const KirinCinema = (() => {
  const film = document.createElement('video');
  film.playsInline = true;
  film.preload = 'auto';
  let active = false, failed = false, shownFrame = 0, callback = 0;

  function load() {
    return new Promise((resolve,reject) => {
      film.addEventListener('loadeddata', resolve, {once:true});
      film.addEventListener('error', () => { failed = true; reject(film.error); }, {once:true});
      film.src = 'Animations/Kirin - Cinématique.webm';
      film.load();
    });
  }
  function followFrames() {
    if (!film.requestVideoFrameCallback) return;
    callback = film.requestVideoFrameCallback((_,metadata) => {
      shownFrame = Math.round(metadata.mediaTime*24);
      if (active) followFrames();
    });
  }
  function sync(wanted,audible,suspended) {
    film.muted = !audible;
    if (wanted !== active) {
      active = wanted;
      film.pause();
      if (callback) film.cancelVideoFrameCallback(callback);
      callback = 0;
      if (film.readyState) film.currentTime = 0;
      shownFrame = 0;
      if (active) { failed = false; followFrames(); }
    }
    if (!active || suspended) { film.pause(); return; }
    if (film.paused && !film.ended) {
      film.play().catch(error => { if (error.name !== 'AbortError') failed = true; });
    }
  }

  // Frame, camera magnification, caster's projected foot position (source 1280x720), storm intensity.
  const shots = [
    [0,2.5,630,530,.05],[15,3.3,630,690,.11],[44,5.2,601,1270,.23],
    [70,5.8,400,1510,.48],[85,5.9,410,1910,.82],[100,2.2,495,905,.72],
    [106,1.23,492,695,.65],[140,1.23,492,695,.65],[147,4.3,635,1350,.58],
    [162,4.4,650,1350,.58],[173,2.1,520,770,.54]
  ];
  function cameraShot(f) {
    let i=1;
    while (i<shots.length-1 && f>shots[i][0]) i++;
    const a=shots[i-1], b=shots[i], t=smooth((f-a[0])/(b[0]-a[0]));
    return a.slice(1).map((v,j)=>v+(b[j+1]-v)*t);
  }
  // Chest marker entering during the tracking shot, measured on the original footage.
  const track = [[1390,510],[1295,493],[1200,476],[1120,456],[1052,438],
    [1000,423],[959,409],[931,395],[913,386],[903,380],[898,380],[895,388],
    [896,379],[895,386],[896,381]];
  function draw(ctx,ground,caster,target) {
    const f=film.requestVideoFrameCallback?shownFrame:Math.floor(film.currentTime*24);
    const mirror=caster.facing<0;
    const projectX=x=>(mirror?1280-x:x)*1.5;
    const settle=smooth((f-225)/15);
    const [openingZoom,x,y,storm]=cameraShot(f);
    let zoom=openingZoom, dx=projectX(x)-caster.x*zoom, dy=y*1.5-caster.y*zoom;
    const marker=track[Math.max(0,Math.min(track.length-1,f-174))];
    const impactZoom=2.05;
    const chestY=target.y-127*scaleAt(target.y);
    const pan=smooth((f-167)/7);
    zoom+=(impactZoom-zoom)*pan;
    dx+=(projectX(marker[0])-target.x*impactZoom-dx)*pan;
    dy+=(marker[1]*1.5-chestY*impactZoom-dy)*pan;
    zoom+=(1-zoom)*settle;
    dx*=1-settle; dy*=1-settle;

    // Clamp the scenery crop even when the generated camera tilts above the actors.
    ctx.save();
    const bx=Math.max(1920*(1-zoom),Math.min(0,dx));
    const by=Math.max(1080*(1-zoom),Math.min(0,dy));
    ctx.drawImage(ground,bx,by,1920*zoom,1080*zoom);
    ctx.fillStyle='rgba(11,24,56,'+(storm*(1-settle))+')';
    ctx.fillRect(0,0,1920,1080);
    if (f>=174) {
      ctx.save();
      ctx.translate(dx,dy);ctx.scale(zoom,zoom);
      const reaction=smooth((f-181)/3)*(1-smooth((f-192)/16));
      drawActor(target.x,target.y,target.facing,target.phase,null,1,8*reaction);
      if (settle>0) drawActor(caster.x,caster.y,caster.facing,caster.phase,null,settle,0,null,null,true);
      ctx.restore();
      if (f>=182 && f<204) {
        const lightX=projectX(marker[0]), lightY=marker[1]*1.5;
        const glow=ctx.createRadialGradient(lightX,lightY,0,lightX,lightY,920);
        glow.addColorStop(0,'rgba(191,235,255,.43)');
        glow.addColorStop(1,'rgba(131,191,255,0)');
        ctx.save();ctx.globalAlpha=1-smooth((f-182)/22);
        ctx.fillStyle=glow;ctx.fillRect(0,0,1920,1080);ctx.restore();
      }
    }
    if (film.readyState>=2 && settle<1) {
      if (mirror) {ctx.translate(1920,0);ctx.scale(-1,1);}
      ctx.globalAlpha=1-settle;
      ctx.drawImage(film,0,0,1920,1080);
    }
    ctx.restore();
  }
  return {load,sync,draw,duration:()=>film.duration*1000,finished:()=>film.ended||failed};
})();
