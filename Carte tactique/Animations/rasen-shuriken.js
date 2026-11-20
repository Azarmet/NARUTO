const RasenShuriken = (() => {
  const recovery = new Image(), follow = new Image();
  const releaseMs = ShurikenCinema.releaseMs;
  const nativeScale = 1.018;

  async function load() {
    recovery.src = 'Animations/Rasen Shuriken - Omni.webp';
    follow.src = 'Animations/Rasen Shuriken - Suivi du lancer.webp';
    await Promise.all([recovery.decode(),follow.decode(),ShurikenCinema.load(),ShurikenFx.load()]);
    if (recovery.naturalWidth !== 3072 || recovery.naturalHeight !== 3456 ||
        follow.naturalWidth !== 1600 || follow.naturalHeight !== 512) {
      throw new Error('Dimensions inattendues pour le lancer de Naruto.');
    }
  }
  function drawFrame(ctx,frame) {
    const {age,blend} = frame;
    ctx.save();
    ctx.scale(nativeScale,nativeScale);
    if (blend < 1) {
      const f = Math.min(9,1+Math.floor(age*24/1000));
      ctx.save();ctx.globalAlpha *= 1-blend;
      ctx.drawImage(follow,f%5*320,Math.floor(f/5)*256,320,256,-105,-232,320,256);
      ctx.restore();
    }
    if (blend > 0) {
      const f = Math.min(143,105+Math.floor(Math.max(0,age-318)*.050));
      ctx.globalAlpha *= blend;
      ctx.drawImage(recovery,f%12*256,Math.floor(f/12)*288,256,288,-103.2,-249,256,288);
    }
    ctx.restore();
  }
  function pose(elapsed,fighter) {
    const age = Math.max(0,elapsed-releaseMs);
    const blend = smooth((age-318)/110);
    const step = (1-smooth((age-318)/440))*scaleAt(fighter.y)*nativeScale;
    return {...fighter,x:fighter.x-50*step*fighter.facing,y:fighter.y+34*step,
      specialFrame:age<1098?{age,blend}:null};
  }
  function plan(caster,target) {
    const s = nativeScale*scaleAt(caster.y);
    // Last cut-in drawing: core (531,139), palm (438,153), initial stance (323,265).
    const origin = {x:caster.x+208*s*caster.facing,y:caster.y-126*s};
    const palm = {x:caster.x+115*s*caster.facing,y:caster.y-112*s};
    const targetScale = scaleAt(target.y);
    const destination = {x:target.x-8*targetScale*caster.facing,y:target.y-124*targetScale};
    const distance = Math.hypot(destination.x-origin.x,destination.y-origin.y);
    const flightMs = Math.max(225,Math.min(560,distance/1.8));
    const impactMs = releaseMs+flightMs;
    return {caster,target,origin,palm,destination,flightMs,impactMs,
      duration:impactMs+ShurikenFx.impactLife,arc:Math.min(64,distance*.085)};
  }
  function flightPosition(cast,t) {
    return {x:cast.origin.x+(cast.destination.x-cast.origin.x)*t,
      y:cast.origin.y+(cast.destination.y-cast.origin.y)*t-4*cast.arc*t*(1-t)};
  }
  function effectAt(elapsed,cast) {
    if (elapsed<releaseMs || elapsed>=cast.duration) return null;
    if (elapsed>=cast.impactMs) {
      return {...cast.destination,phase:'impact',depth:cast.target.y+.5,
        scale:scaleAt(cast.target.y),groundY:cast.target.y,age:elapsed-cast.impactMs,
        flightMs:cast.flightMs,facing:cast.caster.facing};
    }
    const age = elapsed-releaseMs, t = clamp(age/cast.flightMs);
    const depth = cast.caster.y+(cast.target.y-cast.caster.y)*t;
    const tailTime = (age-72)/cast.flightMs;
    const trail = tailTime>=0 ? flightPosition(cast,tailTime) : {
      x:cast.palm.x+(cast.origin.x-cast.palm.x)*age/72,
      y:cast.palm.y+(cast.origin.y-cast.palm.y)*age/72
    };
    return {...flightPosition(cast,t),phase:'flight',depth:depth+.5,
      radius:105*nativeScale*scaleAt(depth),facing:cast.caster.facing,age,trail};
  }
  function drawEffect(ctx,effect,elapsed) {
    const {x,y,radius} = effect;
    if (effect.phase==='impact') {
      // Arrest the same spinning blades on the target as the wind sphere opens.
      const collapse = smooth(effect.age/135);
      if (collapse < 1) {
        ctx.save();ctx.globalAlpha *= 1-collapse;
        ShurikenFx.disc(ctx,x,y,105*nativeScale*effect.scale*(1-.65*collapse),
          effect.flightMs+effect.age,effect.facing);
        ctx.restore();
      }
      ShurikenFx.impact(ctx,x,y,effect.scale,effect.age,effect.groundY);
      return;
    }
    ShurikenFx.trail(ctx,effect.trail.x,effect.trail.y,x,y,radius,elapsed,1);
    ShurikenFx.disc(ctx,x,y,radius,effect.age,effect.facing);
  }
  function recoil(elapsed,cast) {
    const age = elapsed-cast.impactMs;
    return 23*smooth(age/75)*(1-smooth((age-75)/410));
  }
  return {load,drawFrame,pose,plan,effectAt,drawEffect,recoil,releaseMs};
})();
