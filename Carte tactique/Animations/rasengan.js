const Rasengan = (() => {
  const atlas = new Image();
  const cell = {width:512, height:336, columns:8, pivotX:199.2, pivotY:252.3};
  const frameCount = 96, frameMs = 1000 / (24 * 1.75);
  const contactFrame = 50, burstFrame = 55;
  const contactMs = contactFrame * frameMs, duration = frameCount * frameMs;

  async function load() {
    atlas.src = 'Animations/Rasengan - Omni.webp';
    await atlas.decode();
    if (atlas.naturalWidth !== cell.width * cell.columns ||
        atlas.naturalHeight !== cell.height * Math.ceil(frameCount / cell.columns)) {
      throw new Error('Dimensions inattendues pour l’atlas du Rasengan.');
    }
  }

  function drawFrame(ctx, frame) {
    const {width,height,columns,pivotX,pivotY} = cell;
    ctx.drawImage(atlas, frame % columns * width, Math.floor(frame / columns) * height,
      width, height, -pivotX, -pivotY, width, height);
  }

  function pose(elapsed, fighter, target) {
    const frame = elapsed / frameMs;
    const rush = smooth((frame - 39) / (contactFrame - 39));
    const retreat = smooth((frame - 77) / 15);
    const travel = rush * (1 - retreat);
    const closeY = target.y + 4;
    // The bright core is 158.8 source pixels ahead of the feet on frame 50.
    const closeX = target.x - 12 * scaleAt(target.y) - 158.8 * scaleAt(closeY);
    const lift = 17 * Math.sin(Math.PI * rush) + 27 * Math.sin(Math.PI * retreat);
    return {
      x:fighter.x + (closeX - fighter.x) * travel,
      y:fighter.y + (closeY - fighter.y) * travel - lift,
      facing:fighter.facing, phase:fighter.phase,
      specialFrame:Math.min(frameCount - 1,Math.max(0,Math.floor(frame + 1e-8))),
      opacity:1 - .45 * Math.sin(Math.PI * retreat)
    };
  }

  function recoil(elapsed) {
    const frame = elapsed / frameMs;
    // The sphere makes contact before the burst drawn into the footage.
    const press = 3 * smooth((frame - contactFrame) / (burstFrame - contactFrame));
    const burst = 14 * smooth((frame - burstFrame) / 2);
    return (press + burst) * (1 - smooth((frame - 57) / 13));
  }
  return {load,drawFrame,pose,recoil,duration,contactMs};
})();
