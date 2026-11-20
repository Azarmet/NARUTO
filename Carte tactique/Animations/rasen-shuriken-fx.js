const ShurikenFx = (() => {
  const discAtlas=new Image(), windAtlas=new Image();
  const impactLife=1200, windCell={width:512,height:480,columns:8,pivotX:256,pivotY:410};
  const turn=2*Math.PI;
  const unit=t=>Math.max(0,Math.min(1,t));
  const ease=t=>{t=unit(t);return t*t*(3-2*t)};
  const blend=document.createElement('canvas');
  blend.width=windCell.width;blend.height=windCell.height;
  const paint=blend.getContext('2d');
  let lastBlend=-1;

  async function load(){
    discAtlas.src='Animations/Rasen Shuriken - Vol des clones.webp';
    windAtlas.src='Animations/Rasen Shuriken - Déflagration.webp';
    await Promise.all([discAtlas.decode(),windAtlas.decode()]);
    if(discAtlas.naturalWidth!==1280 || discAtlas.naturalHeight!==384 ||
       windAtlas.naturalWidth!==4096 || windAtlas.naturalHeight!==2880){
      throw new Error('Dimensions inattendues pour les effets du Rasen Shuriken.');
    }
  }

  function disc(ctx,x,y,radius,timeMs,facing){
    const frame=Math.floor(Math.max(0,timeMs)*24/1000)%10;
    const scale=radius/105;
    ctx.save();ctx.translate(x,y);ctx.scale(facing*scale,scale);
    ctx.drawImage(discAtlas,frame%5*256,Math.floor(frame/5)*192,256,192,
      -128,-96,256,192);
    ctx.restore();
  }

  function trail(ctx,fromX,fromY,x,y,radius,timeMs,progress) {
    const dx=x-fromX,dy=y-fromY;
    const reach=Math.min(Math.hypot(dx,dy),radius*3.35);
    if(reach<1 || radius<=0 || progress<=0) return;
    ctx.save();ctx.translate(x,y);ctx.rotate(Math.atan2(dy,dx));
    ctx.globalAlpha*=Math.min(1,progress*10);
    for(let i=0;i<3;i++){
      const len=reach*(1-i*.18);
      const bend=radius*(.21*Math.sin(timeMs*.014+i*2.1)+(i-1)*.23);
      const root=(i-1)*radius*.17, width=(i===1?.17:.08)*radius;
      const fill=ctx.createLinearGradient(-len,0,0,0);
      fill.addColorStop(0,'rgba(220,255,255,0)');
      fill.addColorStop(.45,'rgba(121,229,247,.38)');
      fill.addColorStop(1,'rgba(235,255,255,.83)');
      ctx.fillStyle=fill;ctx.beginPath();ctx.moveTo(-len,bend*.75);
      ctx.bezierCurveTo(-len*.71,bend*1.36,-len*.37,-bend*.65,0,root-width);
      ctx.bezierCurveTo(-len*.35,-bend*.65+width*.7,-len*.76,bend*1.39,-len,bend*.75);
      ctx.fill();
    }
    ctx.restore();
  }


  function windFrame(frame){
    // Interpolate neighbouring transparent cels once. Adding their premultiplied
    // contributions here keeps the dojo visible through the openings in the wind.
    if(lastBlend===frame)return blend;
    const {width,height,columns}=windCell;
    const current=Math.floor(frame), fraction=frame-current, next=Math.min(47,current+1);
    paint.globalCompositeOperation='source-over';
    paint.clearRect(0,0,width,height);
    paint.globalAlpha=1-fraction;
    paint.drawImage(windAtlas,current%columns*width,Math.floor(current/columns)*height,width,height,0,0,width,height);
    if(fraction>0){
      paint.globalCompositeOperation='lighter';
      paint.globalAlpha=fraction;
      paint.drawImage(windAtlas,next%columns*width,Math.floor(next/columns)*height,width,height,0,0,width,height);
    }
    paint.globalAlpha=1;lastBlend=frame;
    return blend;
  }

  function pressureWave(ctx,age){
    const t=unit((age-105)/910);
    if(t<=0 || t>=1)return;
    const spread=1-(1-t)**2, radius=17+166*spread;
    ctx.save();
    ctx.scale(1,.26);
    ctx.globalAlpha*=Math.sin(t*Math.PI)**.4*(1-t);
    const light=ctx.createRadialGradient(0,0,radius*.55,0,0,radius);
    light.addColorStop(0,'rgba(160,248,255,0)');
    light.addColorStop(.75,'rgba(149,238,255,.12)');
    light.addColorStop(.93,'rgba(238,255,250,.38)');
    light.addColorStop(1,'rgba(242,228,190,0)');
    ctx.fillStyle=light;ctx.fillRect(-radius,-radius,2*radius,2*radius);
    for(let i=0;i<3;i++){
      const start=i*turn/3+.22*t;
      ctx.beginPath();ctx.arc(0,0,radius,start,start+1.45);
      ctx.lineWidth=1.5+2*(1-t);
      ctx.strokeStyle=i===0?'#f9ffec':'#c6eff2';ctx.stroke();
    }
    ctx.restore();
  }

  function impact(ctx,x,y,scale,age,groundY=y+124*scale){
    if(age<0 || age>=impactLife || scale<=0)return;
    const t=age/impactLife, drop=ease(age/210);
    // Widest visible painted bounds, with room for the feathered edges.
    const artScale=Math.min(1.07*scale,(1920-36-x)/252,(x-36)/240,
      (groundY-32)/356,(1080-groundY-32)/68);
    const anchorY=(y+21*scale)*(1-drop)+groundY*drop;
    ctx.save();
    ctx.translate(x,groundY);ctx.scale(scale,scale);pressureWave(ctx,age);
    ctx.restore();
    ctx.save();
    ctx.globalAlpha*=1-ease((t-.90)/.10);
    ctx.drawImage(windFrame(47*t),x-windCell.pivotX*artScale,anchorY-windCell.pivotY*artScale,
      windCell.width*artScale,windCell.height*artScale);
    ctx.restore();
    if(age<140){
      const flash=1-age/140, radius=(16+24*(1-flash))*scale;
      ctx.save();
      const light=ctx.createRadialGradient(x,y,0,x,y,radius);
      light.addColorStop(0,'rgba(248,255,255,.98)');
      light.addColorStop(.3,'rgba(159,242,255,.64)');
      light.addColorStop(1,'rgba(142,237,255,0)');
      ctx.globalAlpha*=flash;ctx.fillStyle=light;ctx.fillRect(x-radius,y-radius,2*radius,2*radius);
      ctx.restore();
    }
  }

  // Light and ground pressure travel out from the selected unit on the real dojo.
  function groundSurge(ctx,cast,age){
    if(age<0 || age>=impactLife)return;
    const t=age/impactLife;
    const x=cast.destination.x, y=cast.target.y;
    const flash=.19*(1-ease(age/220));
    ctx.save();
    if(flash>.001){
      ctx.fillStyle='rgba(186,240,255,'+flash+')';ctx.fillRect(0,0,1920,1080);
    }
    // Flatten the wave into the perspective of the courtyard.
    const spread=unit((age-55)/1080);
    if(spread>0 && spread<1){
      const strength=Math.sin(Math.PI*spread)**.5*(1-spread);
      const radius=40+2130*(1-(1-spread)**1.48);
      ctx.translate(x,y);ctx.scale(1,.44);
      const band=ctx.createRadialGradient(0,0,0,0,0,radius);
      band.addColorStop(0,'rgba(152,229,243,0)');
      band.addColorStop(.81,'rgba(152,229,243,0)');
      band.addColorStop(.93,'rgba(125,219,240,'+(.12*strength)+')');
      band.addColorStop(.98,'rgba(242,250,227,'+(.35*strength)+')');
      band.addColorStop(1,'rgba(249,247,222,0)');
      ctx.fillStyle=band;
      ctx.fillRect(-radius,-radius,2*radius,2*radius);
    }
    ctx.restore();
  }
  return {load,disc,trail,impact,groundSurge,impactLife};
})();
