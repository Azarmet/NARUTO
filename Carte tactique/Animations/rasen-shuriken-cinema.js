const ShurikenCinema = (() => {
  const width = 640, height = 360, columns = 6, framesPerSheet = 48;
  let sheets = [];
  const releaseFrame = 95;
  const releaseMs = releaseFrame * 1000 / 24;

  async function load() {
    sheets = await Promise.all([1,2].map(async part => {
      const sheet = new Image();
      sheet.src = 'Animations/Rasen Shuriken - Clones ' + part + '.webp';
      await sheet.decode();
      if (sheet.naturalWidth !== width * columns || sheet.naturalHeight !== height * 8) {
        throw new Error('Dimensions inattendues pour le plan des clones.');
      }
      return typeof createImageBitmap === 'function' ? createImageBitmap(sheet) : sheet;
    }));
  }

  // Midpoint of the soles and separation of the feet in the actual Omni take.
  const stances = [
    [0,323,265,47,-24], [23,323,265,47,-24], [38,322,266,48,-23],
    [48,330,294,69,1], [88,330,296,65,1], [91,325,296,64,1],
    [92,297,299,72,-4], [94,273,299,71,-4]
  ];
  function stance(frame) {
    let i = 1;
    while (i < stances.length - 1 && frame > stances[i][0]) i++;
    const a = stances[i-1], b = stances[i];
    const t = clamp((frame-a[0])/(b[0]-a[0]));
    return a.slice(1).map((n,j) => n + (b[j+1]-n)*t);
  }
  function contact(ctx,x,y,rx,ry,opacity) {
    ctx.save();
    ctx.translate(x,y);
    ctx.scale(rx,ry);
    const shade = ctx.createRadialGradient(0,0,0,0,0,1);
    shade.addColorStop(0,'rgba(55,38,34,'+opacity+')');
    shade.addColorStop(1,'rgba(55,38,34,0)');
    ctx.fillStyle = shade;
    ctx.fillRect(-1,-1,2,2);
    ctx.restore();
  }
  function draw(ctx,ground,elapsed,caster) {
    const frame = Math.min(releaseFrame-1,Math.floor(elapsed*24/1000));
    const zoom = 1.35;
    const scale = zoom*scaleAt(caster.y)*1.018;
    const pivotX = 323, pivotY = 265;
    // Leave room in front of the throw and keep the back fence in this wider shot.
    const aimX = caster.facing > 0 ? 884 : 1036;
    const panX = Math.min(0,Math.max(1920*(1-zoom),aimX-caster.x*zoom));
    const panY = Math.min(0,Math.max(1080*(1-zoom),708-caster.y*zoom));
    const screenX = panX+caster.x*zoom, screenY = panY+caster.y*zoom;
    const charge = smooth((frame-28)/20) * (1-smooth((frame-88)/6));
    ctx.save();
    // The cut changes shot size once. Both the ground and the camera stay fixed.
    ctx.drawImage(ground,panX,panY,1920*zoom,1080*zoom);
    const shade = ctx.createRadialGradient(screenX,530,165,screenX,530,1110);
    shade.addColorStop(0,'rgba(23,36,42,0.04)');
    shade.addColorStop(.55,'rgba(20,35,41,'+(.10+.09*charge)+')');
    shade.addColorStop(1,'rgba(12,28,37,'+(.34+.17*charge)+')');
    ctx.fillStyle = shade;
    ctx.fillRect(0,0,1920,1080);
    ctx.translate(screenX,screenY);
    ctx.scale(caster.facing*scale,scale);
    ctx.translate(-pivotX,-pivotY);
    const [x,y,dx,dy] = stance(frame);
    contact(ctx,x,y+1,dx+24,13,.22);
    contact(ctx,x-dx,y-dy,20,4.7,.56);
    contact(ctx,x+dx,y+dy,21,4.2,.54);
    const clones = smooth((frame-10)/10)*(1-smooth((frame-69)/10));
    if (clones > 0) {
      contact(ctx,137,312,73,13,.23*clones);
      contact(ctx,91,343,23,5,.52*clones);
      contact(ctx,190,284,21,5,.52*clones);
      contact(ctx,497,296,58,13,.22*clones);
      contact(ctx,467,330,23,5,.51*clones);
      contact(ctx,529,274,19,5,.48*clones);
    }
    if (charge > 0) {
      ctx.save();
      ctx.translate(283,278); ctx.scale(1,.27);
      const glow = ctx.createRadialGradient(0,0,0,0,0,133);
      glow.addColorStop(0,'rgba(151,233,255,'+(.29*charge)+')');
      glow.addColorStop(1,'rgba(123,216,255,0)');
      ctx.fillStyle=glow;
      ctx.fillRect(-133,-133,266,266);
      ctx.restore();
    }
    const index = frame % framesPerSheet;
    ctx.drawImage(sheets[Math.floor(frame/framesPerSheet)],index%columns*width,
      Math.floor(index/columns)*height,width,height,0,0,width,height);
    ctx.restore();
  }
  return {load,draw,releaseMs};
})();
