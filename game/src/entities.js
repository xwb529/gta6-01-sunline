'use strict';
(function(S){
  const C=S.C,TAU=Math.PI*2;
  S.makeCar=function(x,y,a,color,kind='parked'){
    return {x,y,a,color,kind,speed:0,hp:100,maxHp:100,w:23,h:45,owned:false,flash:0,hitCD:0,shootCD:2,path:[],pathTimer:0,stuck:0,dead:false,name:kind==='police'?'CIVIC INTERCEPTOR':'VENTO SEDAN',turn:0};
  };
  S.populate=function(g){
    const r=g.random;g.cars=[];g.peds=[];g.bullets=[];g.particles=[];g.skids=[];
    const spots=[[1195,1458,0],[1603,1541,Math.PI],[1010,1038,0],[725,1240,-Math.PI/2],[1981,1670,Math.PI/2],[2319,850,-Math.PI/2],[900,2298,0],[2821,2100,Math.PI/2],[302,920,Math.PI/2],[1561,2160,Math.PI/2]];
    for(let i=0;i<spots.length;i++){const [x,y,a]=spots[i];g.cars.push(S.makeCar(x,y,a,C.colors[i%C.colors.length]));}
    const special=S.makeCar(C.coupe.x,C.coupe.y,Math.PI,'#edb950','special');special.name='AURELIA GT';special.w=25;special.h=47;g.cars.push(special);g.specialCar=special;
    for(let i=0;i<13;i++){
      let ix=Math.floor(r()*6),iy=Math.floor(r()*6),dir=Math.floor(r()*4);
      const dx=[1,0,-1,0][dir],dy=[0,1,0,-1][dir];if(ix+dx<0||iy+dy<0||ix+dx>6||iy+dy>6)dir=0;
      const car=S.makeCar(C.xs[ix],C.ys[iy],dir*Math.PI/2,C.colors[i%7],'traffic');
      car.node={i:ix,j:iy};car.lastNode=null;car.cruise=65+r()*35;
      chooseTrafficNode(g,car);car.x=S.lerp(C.xs[ix],car.tx,.2+r()*.5);car.y=S.lerp(C.ys[iy],car.ty,.2+r()*.5);car.a=Math.atan2(car.ty-car.y,car.tx-car.x);g.cars.push(car);
    }
    for(let i=0;i<26;i++)g.peds.push(makePed(g,i));
  };
  function makePed(g,id){
    const r=g.random,focus=id<12?{x:1180+(r()-.5)*900,y:1410+(r()-.5)*700}:{x:260+r()*2520,y:240+r()*2520};
    const horizontal=r()<.5;
    const index=horizontal?C.ys.reduce((a,v,i)=>Math.abs(v-focus.y)<Math.abs(C.ys[a]-focus.y)?i:a,0):C.xs.reduce((a,v,i)=>Math.abs(v-focus.x)<Math.abs(C.xs[a]-focus.x)?i:a,0);
    const side=r()<.5?-1:1,along=S.clamp(horizontal?focus.x:focus.y,180,2890),line=(horizontal?C.ys[index]:C.xs[index])+side*69;
    return {x:horizontal?along:line,y:horizontal?line:along,horizontal,line,index,side,dir:r()<.5?-1:1,speed:22+r()*17,a:r()*TAU,color:['#dc795c','#e9cb86','#508e8d','#f5e0b5','#8b748c'][id%5],skin:['#bd855a','#e5b98b','#835d43'][id%3],flee:0,hp:35,dead:0,hitCD:0,step:r()*6,id};
  }
  function chooseTrafficNode(g,c){
    const n=c.node,opts=[];
    for(const [di,dj]of [[1,0],[0,1],[-1,0],[0,-1]]){const i=n.i+di,j=n.j+dj;if(i<0||i>6||j<0||j>6)continue;if(c.lastNode&&i===c.lastNode.i&&j===c.lastNode.j)continue;opts.push({i,j});}
    const next=opts[Math.floor(g.random()*opts.length)]||c.lastNode||{i:1,j:1};
    const a=Math.atan2(next.j-n.j,next.i-n.i);c.tx=C.xs[next.i]-Math.sin(a)*27;c.ty=C.ys[next.j]+Math.cos(a)*27;c.lastNode=n;c.node=next;
  }
  S.effects=function(g,x,y,color,count=8,speed=60){
    for(let k=0;k<count&&g.particles.length<150;k++){const a=g.random()*TAU,v=g.random()*speed;g.particles.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:.25+g.random()*.5,max:.75,color,size:1+g.random()*3});}
  };
  S.crime=function(g,amount,x,y,force=false){
    const pos={x,y};
    const witnesses=force||g.peds.some(p=>!p.dead&&S.dist(p,pos)<230&&g.city.clear(p,pos))||g.cars.some(c=>c.kind==='police'&&!c.dead&&S.dist(c,pos)<600&&g.city.clear(c,pos));
    if(!witnesses)return false;
    const old=S.starCount(g);g.heat=S.clamp(g.heat+amount,0,5);g.lastCrime=g.time;g.lastKnown={x,y};g.lastSeen=g.time;
    if(S.starCount(g)>old){g.notify('CRIME REPORTED  /  '+S.starCount(g)+'-STAR RESPONSE');g.sound('alert');}
    return true;
  };
  S.damagePlayer=function(g,amount,source='WASTED'){
    if(g.mode!=='play'||g.player.invuln>0)return;
    g.player.hp=Math.max(0,g.player.hp-amount);g.player.hurt=.35;g.shake=Math.max(g.shake,4);g.sound('hurt');
    if(g.player.hp<=0)g.fail(source);
  };
  S.enterExit=function(g){
    const p=g.player;
    if(p.car){
      if(Math.abs(p.car.speed)>85){g.notify('SLOW DOWN TO EXIT');return;}
      const c=p.car;let exit=null;
      for(const offset of [Math.PI/2,-Math.PI/2,Math.PI,0]){const q={x:c.x+Math.cos(c.a+offset)*40,y:c.y+Math.sin(c.a+offset)*40};if(!g.city.solid(q.x,q.y,11)){exit=q;break;}}
      if(!exit){g.notify('NO ROOM TO OPEN THE DOOR');return;}
      p.x=exit.x;p.y=exit.y;p.car=null;c.speed=0;p.invuln=.5;g.sound('door');return;
    }
    let car=null,dd=64;
    for(const c of g.cars){const d=S.dist(p,c);if(d<dd&&!c.dead&&g.city.clear(p,c)){dd=d;car=c;}}
    if(!car){g.notify('GET CLOSER TO A VEHICLE');return;}
    if(car.kind==='police'&&g.heat>0){g.notify('POLICE VEHICLE LOCKED DURING PURSUIT');return;}
    if(!car.owned){S.crime(g,.95,car.x,car.y);car.owned=true;if(car.kind==='traffic'){const ped=makePed(g,30);ped.x=car.x+34;ped.y=car.y;ped.flee=7;if(g.peds.length<30)g.peds.push(ped);}}
    car.kind=car===g.specialCar?'special':'parked';car.path=[];p.car=car;car.speed*=.4;g.sound('door');g.notify(car.name+'  /  W ACCELERATE · S BRAKE · A/D STEER');
  };
  S.reload=function(g){const p=g.player;if(p.reload||p.ammo===12)return;p.reload=1.1;g.sound('reload');};
  function shoot(g,x,y,a,enemy=false){
    g.bullets.push({x,y,px:x,py:y,vx:Math.cos(a)*760,vy:Math.sin(a)*760,life:.8,enemy});
    S.effects(g,x+Math.cos(a)*8,y+Math.sin(a)*8,'#ffe3a0',3,35);g.sound(enemy?'enemy':'shot');
    if(!enemy){g.player.ammo--;g.player.fireCD=.22;g.shake=2;S.crime(g,.22,x,y);for(const p of g.peds)if(S.dist(p,{x,y})<420)p.flee=7;}
  }
  function updatePlayer(g,dt,input){
    const p=g.player,axis=input.axes();p.hurt=Math.max(0,p.hurt-dt);p.invuln=Math.max(0,p.invuln-dt);p.fireCD=Math.max(0,p.fireCD-dt);
    if(p.reload){p.reload-=dt;if(p.reload<=0){p.reload=0;p.ammo=12;}}
    if(p.car){
      const c=p.car,throttle=-axis.y,handbrake=input.held('Space'),oldSpeed=c.speed;
      if(throttle){const reversing=Math.sign(throttle)!==Math.sign(c.speed)&&Math.abs(c.speed)>10;c.speed+=throttle*(reversing?370:throttle>0?173:115)*dt;}
      else {const f=25*dt;c.speed=Math.abs(c.speed)<f?0:c.speed-Math.sign(c.speed)*f;}
      if(handbrake)c.speed*=Math.exp(-3.6*dt);
      const offroad=!g.city.road(c.x,c.y);c.speed=S.clamp(c.speed,-100,offroad?175:c===g.specialCar?355:305);
      c.a+=axis.x*2.35*S.clamp(Math.abs(c.speed)/85,0,1.25)*Math.sign(c.speed||1)*dt*(handbrake?1.6:1);
      const hit=g.city.move(c,Math.cos(c.a)*c.speed*dt,Math.sin(c.a)*c.speed*dt,18);
      if(hit&&Math.abs(oldSpeed)>50&&c.hitCD<=0){c.hp-=Math.abs(oldSpeed)*.075;S.damagePlayer(g,Math.abs(oldSpeed)*.012);c.speed*=-.25;c.hitCD=.5;g.shake=7;S.effects(g,c.x,c.y,'#ffe0a0',12,100);g.sound('crash');}
      else if(hit)c.speed*=.9;
      if(Math.abs(c.speed)>125&&(axis.x||handbrake)&&g.time-g.lastSkid>.06){g.lastSkid=g.time;g.skids.push({x:c.x-Math.cos(c.a)*15,y:c.y-Math.sin(c.a)*15,a:c.a,life:9});if(g.skids.length>130)g.skids.shift();}
      p.x=c.x;p.y=c.y;p.a=c.a;p.step+=Math.abs(c.speed)*dt*.04;
      if(c.hp<=0){destroyCar(g,c);g.fail('WASTED');}
      if(Math.abs(c.speed)>45)g.escapeDistance+=Math.abs(c.speed)*dt;
    }else{
      const len=Math.hypot(axis.x,axis.y)||1,sprint=input.held('ShiftLeft','ShiftRight'),speed=sprint?162:108;
      g.city.move(p,axis.x/len*speed*dt,axis.y/len*speed*dt,10);
      p.moving=!!(axis.x||axis.y);if(p.moving)p.step+=dt*(sprint?14:10);
      const aim=g.screenToWorld(input.mouse.x,input.mouse.y);p.a=Math.atan2(aim.y-p.y,aim.x-p.x);
      if(input.mouse.down&&!p.reload&&p.fireCD<=0){if(p.ammo>0)shoot(g,p.x+Math.cos(p.a)*17,p.y+Math.sin(p.a)*17,p.a);else S.reload(g);}
    }
    if(input.take('KeyR'))S.reload(g);
  }
  function destroyCar(g,c){
    if(c.dead)return;c.dead=true;c.hp=0;c.speed=0;S.effects(g,c.x,c.y,'#f5ac5e',35,150);g.shake=9;g.sound('crash');
    if(c===g.specialCar&&g.mission.active&&g.mission.index===2)g.mission.retry('The Aurelia was destroyed. Mara has another lead.');
  }
  function updateTraffic(g,c,dt){
    if(Math.hypot(c.tx-c.x,c.ty-c.y)<26)chooseTrafficNode(g,c);
    let desired=c.cruise;
    const ahead={x:c.x+Math.cos(c.a)*53,y:c.y+Math.sin(c.a)*53};
    if(g.cars.some(other=>other!==c&&!other.dead&&S.dist(ahead,other)<35))desired=0;
    if(!g.player.car&&S.dist(ahead,g.player)<32)desired=0;
    const n=g.city.nearestRoad(c.x,c.y),intersection=Math.hypot(n.x-c.x,n.y-c.y)<81;
    if(intersection){const vertical=Math.abs(Math.sin(c.a))>.65,phase=Math.floor(g.time/7)%2;if((vertical?1:0)!==phase&&Math.hypot(n.x-c.x,n.y-c.y)>48)desired=0;else desired=Math.min(desired,60);}
    c.speed=S.lerp(c.speed,desired,Math.min(1,dt*2));
    const wanted=Math.atan2(c.ty-c.y,c.tx-c.x);c.a+=S.clamp(S.angle(c.a,wanted),-dt*2.2,dt*2.2);
    if(g.city.move(c,Math.cos(c.a)*c.speed*dt,Math.sin(c.a)*c.speed*dt,17)){c.speed=0;c.stuck+=dt;if(c.stuck>2){c.x=C.xs[c.lastNode.i]-Math.sin(wanted)*27;c.y=C.ys[c.lastNode.j]+Math.cos(wanted)*27;c.a=wanted;c.stuck=0;}}else c.stuck=0;
  }
  function spawnPolice(g){
    const t=S.target(g);let best=null;
    for(let n=0;n<40;n++){
      const a=g.random()*TAU,d=590+g.random()*240;const x=t.x+Math.cos(a)*d,y=t.y+Math.sin(a)*d;
      const node=g.city.nearestRoad(x,y);if(S.dist(node,t)<510||S.dist(node,t)>1050)continue;
      best=node;break;
    }
    if(!best)return;
    const c=S.makeCar(best.x+27,best.y,-Math.PI/2,'#ede7cc','police');c.hp=130;c.maxHp=130;c.name='CIVIC INTERCEPTOR';c.pathTimer=0;c.shootCD=1.8;g.cars.push(c);
  }
  function updatePolice(g,c,dt){
    const t=S.target(g),d=S.dist(c,t);c.pathTimer-=dt;c.shootCD-=dt;
    if(g.heat<=0){c.speed=S.lerp(c.speed,0,dt*2);return;}
    const seeing=d<(g.player.car?660:470)&&g.city.clear(c,t);
    if(seeing){g.seen=true;g.lastSeen=g.time;g.lastKnown={x:t.x,y:t.y};}
    const goal=seeing?t:g.lastKnown;
    if(c.pathTimer<=0){c.path=g.city.route(c,goal);c.pathTimer=.9+g.random()*.3;}
    while(c.path.length&&S.dist(c,c.path[0])<27)c.path.shift();
    let target=c.path[0]||goal;
    if(seeing&&d<180&&g.city.clear(c,t))target=t;
    const angle=Math.atan2(target.y-c.y,target.x-c.x),turn=S.angle(c.a,angle);
    c.a+=S.clamp(turn,-3.4*dt,3.4*dt);
    const wantedSpeed=(d<65?60:178+S.starCount(g)*18)*(Math.abs(turn)>1.1?.4:1);
    c.speed=S.lerp(c.speed,wantedSpeed,Math.min(1,dt*2));
    if(g.city.move(c,Math.cos(c.a)*c.speed*dt,Math.sin(c.a)*c.speed*dt,17)){c.stuck+=dt;c.speed*=.7;if(c.stuck>1.5){c.pathTimer=0;if(c.path[0]){const a=Math.atan2(c.path[0].y-c.y,c.path[0].x-c.x);c.a=a;g.city.move(c,Math.cos(a)*35*dt,Math.sin(a)*35*dt,17);}}}else c.stuck=0;
    if(seeing&&S.starCount(g)>=3&&d<325&&c.shootCD<=0){shoot(g,c.x+Math.cos(angle)*28,c.y+Math.sin(angle)*28,angle+(g.random()-.5)*.2,true);c.shootCD=1.6-g.heat*.13;}
    if(d<(g.player.car?49:35)&&c.hitCD<=0){
      if(g.player.car){g.player.car.hp-=6;c.speed*=-.4;S.damagePlayer(g,2);g.shake=4;}else S.damagePlayer(g,7,'BUSTED');c.hitCD=.9;
    }
  }
  function updatePed(g,p,dt){
    if(p.dead){p.dead-=dt;if(p.dead<=0){const fresh=makePed(g,p.id);Object.assign(p,fresh);}return;}
    p.hitCD=Math.max(0,p.hitCD-dt);p.flee=Math.max(0,p.flee-dt);
    const t=S.target(g),near=S.dist(p,t),danger=(g.player.car&&Math.abs(g.player.car.speed)>100&&near<145)||(g.heat>2&&near<100);
    if(danger)p.flee=Math.max(p.flee,2);
    let dx=0,dy=0;
    if(p.flee>0){let a=Math.atan2(p.y-t.y,p.x-t.x);if(g.city.solid(p.x+Math.cos(a)*30,p.y+Math.sin(a)*30,9))a+=Math.PI/2;p.a=a;dx=Math.cos(a)*93*dt;dy=Math.sin(a)*93*dt;}
    else{
      if(p.horizontal){dx=p.dir*p.speed*dt;dy=S.clamp(p.line-p.y,-25*dt,25*dt);if(p.x<175||p.x>2900)p.dir*=-1;}
      else{dy=p.dir*p.speed*dt;dx=S.clamp(p.line-p.x,-25*dt,25*dt);if(p.y<145||p.y>2850)p.dir*=-1;}
      p.a=Math.atan2(dy,dx);
    }
    if(g.city.move(p,dx,dy,8))p.dir*=-1;p.step+=dt*(p.flee?15:8);
    for(const c of g.cars){if(c.dead||Math.abs(c.speed)<55||S.dist(p,c)>27||p.hitCD>0)continue;
      p.hp=0;p.dead=16;p.hitCD=2;S.effects(g,p.x,p.y,'#e6bd87',7,45);
      if(c===g.player.car){c.speed*=.8;S.crime(g,.8,p.x,p.y,true);g.notify('PEDESTRIAN STRUCK  /  WITNESSES CALLING');}
    }
  }
  function updateBullets(g,dt){
    for(const b of g.bullets){b.life-=dt;b.px=b.x;b.py=b.y;const length=Math.hypot(b.vx,b.vy)*dt,steps=Math.ceil(length/9);
      for(let k=0;k<steps&&b.life>0;k++){
        b.x+=b.vx*dt/steps;b.y+=b.vy*dt/steps;
        if(g.city.solid(b.x,b.y,1)){b.life=0;S.effects(g,b.x,b.y,'#e6c897',3,25);break;}
        if(b.enemy){if(S.dist(b,S.target(g))<(g.player.car?23:13)){if(g.player.car){g.player.car.hp-=3;if(g.player.car.hp<=0)g.fail('WASTED');}else S.damagePlayer(g,7);b.life=0;}}
        else {
          for(const p of g.peds){if(p.dead||S.dist(p,b)>12)continue;p.hp-=24;p.flee=8;b.life=0;S.effects(g,p.x,p.y,'#e6b886',5,40);S.crime(g,.55,p.x,p.y,true);if(p.hp<=0)p.dead=16;break;}
          if(b.life>0)for(const c of g.cars){if(c===g.player.car||c.dead||S.dist(c,b)>24)continue;c.hp-=16;c.flash=.15;b.life=0;S.effects(g,b.x,b.y,'#ffd28a',5,70);if(c.kind==='police')S.crime(g,.7,c.x,c.y,true);if(c.hp<=0)destroyCar(g,c);break;}
        }
      }
    }
    g.bullets=g.bullets.filter(b=>b.life>0);
  }
  S.tickEntities=function(g,dt,input){
    updatePlayer(g,dt,input);g.seen=false;const t=S.target(g);
    for(const c of g.cars){c.flash=Math.max(0,c.flash-dt);c.hitCD=Math.max(0,c.hitCD-dt);if(c.dead||c===g.player.car)continue;
      if(c.kind==='traffic')updateTraffic(g,c,dt);if(c.kind==='police')updatePolice(g,c,dt);
    }
    // Collision impulses are bounded, so a pileup cannot instantly consume all health.
    const own=g.player.car;
    if(own&&!own.dead)for(const c of g.cars){if(c===own||c.dead||S.dist(c,own)>38||own.hitCD>0)continue;
      const impact=Math.abs(own.speed-c.speed);if(impact>35){own.hp-=Math.min(13,impact*.045);c.hp-=Math.min(20,impact*.06);S.effects(g,(c.x+own.x)/2,(c.y+own.y)/2,'#ffdb8d',8,70);g.shake=4;g.sound('crash');if(c.kind!=='police')S.crime(g,.4,c.x,c.y);}
      own.hitCD=.55;own.speed*=-.22;c.speed*=.3;const a=Math.atan2(c.y-own.y,c.x-own.x);g.city.move(c,Math.cos(a)*9,Math.sin(a)*9,18);if(c.hp<=0)destroyCar(g,c);
    }
    for(const p of g.peds)updatePed(g,p,dt);updateBullets(g,dt);
    g.spawnCD-=dt;
    const cops=g.cars.filter(c=>c.kind==='police'&&!c.dead);
    if(g.heat>0&&g.spawnCD<=0&&cops.length<Math.min(6,S.starCount(g)+1)){spawnPolice(g);g.spawnCD=3;}
    if(g.heat>0){
      if(!g.seen&&g.time-g.lastSeen>5&&g.time-g.lastCrime>6)g.heat=Math.max(0,g.heat-dt*.105);
      if(g.heat===0){g.notify('PURSUIT EVADED  /  YOU ARE CLEAR');g.sound('success');g.save();}
      if(!g.player.car&&cops.some(c=>S.dist(c,t)<49&&g.city.clear(c,t)))g.bust+=dt;else g.bust=Math.max(0,g.bust-dt*2);
      if(g.bust>3)g.fail('BUSTED');
    }else g.bust=0;
    g.cars=g.cars.filter(c=>c===g.specialCar||c===g.player.car||c.kind!=='police'||(g.heat>0&&S.dist(c,t)<1350)||S.dist(c,t)<480);
    for(const e of g.particles){e.life-=dt;e.x+=e.vx*dt;e.y+=e.vy*dt;e.vx*=.96;e.vy*=.96;}g.particles=g.particles.filter(e=>e.life>0);
    for(const s of g.skids)s.life-=dt;g.skids=g.skids.filter(s=>s.life>0);
    if(g.player.car&&g.player.car.hp<=0&&g.mode==='play'){destroyCar(g,g.player.car);g.fail('WASTED');}
  };
})(window.Sunline);
