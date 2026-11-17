// Deterministic gameplay regression test. Canvas and DOM calls are stubbed;
// these checks exercise the real simulation, not browser rendering or layout.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const gradients={addColorStop(){}};
const canvasContext=new Proxy({measureText:s=>({width:String(s).length*6}),createRadialGradient:()=>gradients,createLinearGradient:()=>gradients}, {get(o,k){return k in o?o[k]:()=>{};},set(o,k,v){o[k]=v;return true;}});
const elements={};
const elem=id=>elements[id]||(elements[id]={id,style:{},classList:{add(){},remove(){}},className:'',innerHTML:'',textContent:'',getContext:()=>canvasContext,addEventListener(){},click(){this.onclick?.();}});
const storage={};const win={innerWidth:1280,innerHeight:800,devicePixelRatio:1,addEventListener(){}};
const ctx={console,window:win,innerWidth:1280,innerHeight:800,devicePixelRatio:1,document:{getElementById:elem,createElement:()=>elem('canvas'+Math.random()),addEventListener(){}},requestAnimationFrame(){},performance:{now:()=>0},localStorage:{getItem:k=>storage[k]||null,setItem:(k,v)=>storage[k]=v},Math,Float32Array,Int32Array,Uint8Array,Set,Map,Number,JSON};
vm.createContext(ctx);
for(const file of ['config','world','input','entities','missions','render','main'])vm.runInContext(fs.readFileSync(path.join(root,'game/src',file+'.js'),'utf8'),ctx,{filename:file+'.js'});
const S=win.Sunline,g=S.game,C=S.C;
const check=(name,fn)=>{fn();console.log('PASS',name);};
function tick(n){for(let i=0;i<n;i++)g.tick(1/60);}
function moveTo(p){if(g.player.car){g.player.car.x=p.x;g.player.car.y=p.y;g.player.car.speed=0;}g.player.x=p.x;g.player.y=p.y;}
function finishDialog(){elem('dialog-action').click();}
check('title render',()=>{assert.equal(g.mode,'title');g.renderer.draw();});
g.start();
check('mission destinations and parked vehicles are accessible',()=>{for(const key of ['contact','package','dock','coupe','garage','broadcast'])assert(!g.city.solid(C[key].x,C[key].y,18),key);for(const c of g.cars)assert(!g.city.solid(c.x,c.y,17),c.name);});
check('start + city world size',()=>{assert.equal(g.mode,'play');assert(g.city.buildings.length>50);assert.equal(g.cars.length,24);assert.equal(g.peds.length,26);assert(!g.city.solid(g.player.x,g.player.y,10));g.renderer.draw();});
check('entry + drive + brake + exit',()=>{S.enterExit(g);assert(g.player.car);g.input.keys.add('KeyW');tick(70);g.input.keys.clear();assert(g.player.car.speed>30);assert(g.heat>0);g.player.car.speed=0;S.enterExit(g);assert(!g.player.car);});
check('player building collision',()=>{const b=g.city.buildings[0];const p={x:b.x-11,y:b.y+30};g.city.move(p,25,0,10);assert(p.x<b.x);});
check('navigation routes remain clear',()=>{let checks=0;for(const a of [C.contact,C.dock,C.coupe,C.garage])for(const b of [C.package,C.contact,C.broadcast,C.garage]){if(S.dist(a,b)<1)continue;const route=g.city.route(a,b);assert(route.length,JSON.stringify([a,b]));for(const n of route)assert(!g.city.solid(n.x,n.y,18));checks++;}console.log('routes',checks);});
check('line of sight occluded by buildings',()=>{const b=g.city.buildings[0];assert(!g.city.clear({x:b.x-10,y:b.y+10},{x:b.x+b.w+10,y:b.y+10}));assert(g.city.clear({x:260,y:240},{x:680,y:240}));});
check('dialogue starts mission 1',()=>{moveTo(C.contact);g.mission.interact();assert.equal(g.mode,'dialog');finishDialog();assert.equal(g.mode,'play');assert(g.mission.active);});
check('mission 1 pickup and delivery',()=>{moveTo(C.package);g.mission.interact();assert.equal(g.mission.stage,1);moveTo(C.contact);g.mission.interact();assert.equal(g.mission.index,1);assert.equal(g.cash,500);finishDialog();});
check('mission 2 chased delivery',()=>{g.mission.interact();finishDialog();assert(g.heat>=2);moveTo(C.dock);g.mission.interact();assert.equal(g.mission.index,2);assert.equal(g.cash,1200);finishDialog();});
check('mission 3 requires the Aurelia and a cleared pursuit',()=>{moveTo(C.contact);g.mission.interact();finishDialog();moveTo(C.coupe);S.enterExit(g);assert.equal(g.player.car,g.specialCar);tick(1);assert.equal(g.mission.stage,1);moveTo(C.garage);g.seen=true;g.mission.interact();assert.equal(g.mission.index,2);g.heat=0;g.seen=false;g.mission.interact();assert.equal(g.mission.index,3);assert.equal(g.cash,2300);finishDialog();g.player.car=null;});
check('mission 4 broadcast, chase, return, ending',()=>{moveTo(C.contact);g.mission.interact();finishDialog();moveTo(C.broadcast);g.mission.interact();assert(g.heat>=3);assert.equal(g.mission.stage,1);g.heat=0;moveTo(C.contact);g.mission.interact();assert.equal(g.mission.index,4);assert.equal(g.cash,4100);assert.equal(g.mode,'dialog');assert(elem('panel').innerHTML.includes('THE CITY IS LISTENING'));finishDialog();assert.equal(g.mode,'play');});
check('save and continue story complete',()=>{g.save();g.reset(true);assert.equal(g.mission.index,4);assert.equal(g.cash,4100);});
check('free roam courier activity',()=>{moveTo(C.contact);g.mission.interact();assert(g.mission.courier);moveTo(C.dock);g.mission.tick(1/60);assert.equal(g.cash,4350);});
check('pause and full map draw',()=>{g.mode='play';g.pause();assert.equal(g.mode,'pause');g.closeScreen();g.mode='map';g.renderer.draw();g.mode='play';});
check('shooting, magazine and reload',()=>{g.player.car=null;g.player.fireCD=0;g.player.ammo=12;g.input.mouse.down=true;tick(1);g.input.mouse.down=false;assert.equal(g.player.ammo,11);S.reload(g);tick(70);assert.equal(g.player.ammo,12);});
check('busted screen and respawn',()=>{g.fail('BUSTED');assert.equal(g.mode,'dead');g.respawn();assert.equal(g.mode,'play');assert.equal(g.player.hp,100);assert.equal(g.heat,0);assert.equal(g.mission.index,4);});
check('police spawn, pursuit and decay',()=>{g.player.invuln=1000;S.crime(g,3,g.player.x,g.player.y,true);tick(240);assert(g.cars.some(c=>c.kind==='police'));g.renderer.draw();console.log('response cars',g.cars.filter(c=>c.kind==='police').length);g.cars=g.cars.filter(c=>c.kind!=='police');g.spawnCD=1000;g.lastSeen=-100;g.lastCrime=-100;tick(2400);assert.equal(g.heat,0);});
check('long simulation remains finite',()=>{g.player.invuln=1000;tick(3600);g.renderer.draw();for(const c of g.cars){assert(Number.isFinite(c.x));assert(Number.isFinite(c.y));}assert(g.particles.length<=150);assert(g.cars.length<40);});
check('all mission routes fit a car',()=>{
  for(const [a,b] of [[C.contact,C.package],[C.package,C.contact],[C.contact,C.dock],[C.contact,C.coupe],[C.coupe,C.garage],[C.contact,C.broadcast]]){
    const p={...a},route=g.city.route(a,b);
    for(const waypoint of route){
      for(let n=0;n<80&&S.dist(p,waypoint)>1;n++){
        const d=S.dist(p,waypoint),step=Math.min(3,d);
        g.city.move(p,(waypoint.x-p.x)/d*step,(waypoint.y-p.y)/d*step,18);
      }
      assert(S.dist(p,waypoint)<2,'route corner blocked');
    }
    assert(S.dist(p,b)<85,'mission cannot be reached');
  }
});
check('five-star response and wreck recovery',()=>{
  g.start();g.peds=[];g.cars=[];
  assert(!S.crime(g,1,1180,1400));assert.equal(g.heat,0);
  const testCar=S.makeCar(g.player.x,g.player.y,0,'#fff');testCar.hp=100000;
  g.player.car=testCar;g.cars.push(testCar);
  S.crime(g,5,1180,1400,true);g.player.invuln=10000;tick(1800);
  assert.equal(S.starCount(g),5);
  const count=g.cars.filter(c=>c.kind==='police').length;assert(count>=4&&count<=6);
  g.player.car=S.makeCar(g.player.x,g.player.y,0,'#fff');g.player.car.hp=0;
  tick(1);assert.equal(g.mode,'dead');g.respawn();assert.equal(g.mode,'play');
});
check('corrupted and out-of-range saves never unlock story progress',()=>{
  for(const value of ['{','null','[]','{"v":1,"cash":200,"mission":99}','{"v":1,"cash":-1,"mission":2}','{"v":1,"cash":"200","mission":1}','{"v":2,"cash":200,"mission":1}','{"v":1,"cash":200,"mission":1.5}']){
    storage[C.saveKey]=value;assert.equal(g.readSave(),null,value);
  }
  storage[C.saveKey]='{"v":1,"cash":345.6,"mission":2}';assert.equal(g.readSave().cash,346);assert.equal(g.readSave().mission,2);
});
check('blocked storage preserves an in-memory continue checkpoint',()=>{
  g.start();g.cash=725;g.mission.index=2;
  const set=ctx.localStorage.setItem;ctx.localStorage.setItem=()=>{throw Error('storage disabled');};
  try{g.save();assert(g.saveUnavailable);assert.equal(g.saved.cash,725);g.pause();elem('menu').click();assert.equal(g.cash,725);assert.equal(g.mission.index,2);g.start(true);assert.equal(g.cash,725);}
  finally{ctx.localStorage.setItem=set;}
  g.save();assert(!g.saveUnavailable);
});
check('reload works on a render frame with no physics step',()=>{
  g.start();g.player.ammo=2;g.input.pressed.add('KeyR');g.actions();g.input.flush();assert(g.player.reload>0);tick(70);assert.equal(g.player.ammo,12);
});
check('pause and focus clear held keys and queued actions',()=>{
  g.input.keys.add('KeyW');g.input.pressed.add('KeyE');g.input.mouse.down=true;g.pause();assert.equal(g.input.keys.size,0);assert.equal(g.input.pressed.size,0);assert(!g.input.mouse.down);g.closeScreen();
});
check('scripted heat raises to a floor without stacking',()=>{
  g.heat=1;S.raiseHeat(g,2,g.player.x,g.player.y);assert.equal(g.heat,2);
  S.raiseHeat(g,2,g.player.x,g.player.y);assert.equal(g.heat,2);
  S.raiseHeat(g,3,g.player.x,g.player.y);assert.equal(g.heat,3);
  g.heat=5;S.raiseHeat(g,3,g.player.x,g.player.y);assert.equal(g.heat,5);
  g.heat=.0005;assert.equal(S.starCount(g),1);g.heat=0;
});
check('fast cars cannot be entered and entry synchronizes position',()=>{
  g.start();g.peds=[];const car=S.makeCar(260,1500,0,'#fff');g.cars=[car];moveTo({x:280,y:1500});car.speed=130;S.enterExit(g);assert(!g.player.car);
  car.speed=0;S.enterExit(g);assert.equal(g.player.car,car);assert.equal(g.player.x,car.x);assert.equal(g.player.y,car.y);
});
check('exit searches both sides and never places player inside a car',()=>{
  const car=g.player.car;g.cars.push(S.makeCar(car.x,car.y+36,0,'#fff'));S.enterExit(g);assert(!g.player.car);assert(g.player.y<car.y);assert(!g.city.solid(g.player.x,g.player.y,11));
  g.player.car=car;car.speed=86;S.enterExit(g);assert.equal(g.player.car,car);
});
check('abandoned Aurelia is tracked and destroyed mission car is recoverable',()=>{
  g.start();g.mission=new S.Missions(g,2);g.mission.start();g.closeScreen();g.player.car=g.specialCar;g.mission.tick(1/60);g.player.car=null;
  Object.assign(g.specialCar,{x:260,y:1920});assert.equal(g.mission.marker().x,260);assert.equal(g.mission.marker().type,'car');
  Object.assign(g.specialCar,{dead:true,hp:0,speed:220,hitCD:4,turn:1});g.mission.tick(1/60);assert(!g.mission.active);g.mission.start();assert(!g.specialCar.dead);assert.equal(g.specialCar.speed,0);assert.equal(g.specialCar.hitCD,0);assert.equal(g.specialCar.hp,100);assert.equal(g.specialCar.x,C.coupe.x);
});
check('mission objectives cannot be collected through a building',()=>{
  g.start();
  // Use a real building corner with walkable points on either side. The story
  // package's usual sidewalk position need not allow an occluded pickup attempt.
  const setup=g.city.buildings.map(b=>({
    point:{x:b.x-12,y:b.y+24},player:{x:b.x+24,y:b.y-12}
  })).find(({point,player})=>!g.city.solid(point.x,point.y,11)&&!g.city.solid(player.x,player.y,11)&&S.dist(player,point)<75&&!g.city.clear(player,point));
  assert(setup,'city must provide a walkable, in-range pickup blocked by a building');
  const original={...C.package};
  try{
    Object.assign(C.package,setup.point);g.mission.start();moveTo(setup.player);
    assert(!g.city.solid(g.player.x,g.player.y,11),'player must be outside buildings');
    assert(!g.city.solid(C.package.x,C.package.y,11),'package must be outside buildings');
    assert(S.dist(g.player,C.package)<75,'pickup must be within interaction range');
    assert(!g.city.clear(g.player,C.package),'building must block the pickup');
    g.mission.interact();assert.equal(g.mission.stage,0,'blocked pickup must not advance the mission');
    moveTo(C.package);assert(g.city.clear(g.player,C.package));
    g.mission.interact();assert.equal(g.mission.stage,1,'unobstructed pickup must advance the mission');
  }finally{Object.assign(C.package,original);}
});
check('courier marker, guidance and payout stay consistent',()=>{
  g.start();g.mission=new S.Missions(g,4);moveTo(C.contact);g.mission.interact();assert.equal(g.mission.marker().x,C.dock.x);assert(g.mission.objective().includes('$250'));moveTo(C.dock);g.mission.tick(1/60);assert.equal(g.cash,400);g.mission.tick(1/60);assert.equal(g.cash,400);assert.equal(g.mission.marker().x,C.contact.x);
});
check('repair uses vehicle maximum health and finishes reload',()=>{
  g.start();moveTo(C.garage);const car=S.makeCar(C.garage.x,C.garage.y,0,'#fff','police');car.maxHp=130;car.hp=20;g.cars=[car];g.player.car=car;g.player.reload=.5;g.player.hp=50;g.mission.interact();assert.equal(car.hp,130);assert.equal(g.player.hp,100);assert.equal(g.player.reload,0);assert.equal(g.cash,50);
});
check('steering ramps smoothly, releases smoothly and reverses direction',()=>{
  g.start();g.peds=[];g.heat=0;const car=S.makeCar(260,1300,-Math.PI/2,'#fff');g.cars=[car];g.player.car=car;car.speed=160;
  g.input.keys.add('KeyD');tick(1);assert(car.turn>0&&car.turn<.2);const angle=car.a;assert(angle>-Math.PI/2&&angle<-Math.PI/2+.02);g.input.keys.clear();tick(1);assert(car.turn>0&&car.turn<.12);
  car.a=0;car.turn=0;car.speed=-60;g.input.keys.add('KeyD');tick(1);assert(car.a<0);g.input.clear();
});
check('off-road speed bleeds off instead of snapping to the limit',()=>{
  g.start();g.peds=[];const car=S.makeCar(1596,742,0,'#fff','special');g.cars=[car];g.player.car=car;car.speed=300;g.input.keys.add('KeyW');tick(1);assert(car.speed>290&&car.speed<300);g.input.clear();
});
check('head-on collisions use relative velocity, even at equal speed',()=>{
  g.start();g.peds=[];const own=S.makeCar(260,1500,0,'#fff'),other=S.makeCar(292,1500,Math.PI,'#fff');own.speed=100;other.speed=100;g.cars=[own,other];g.player.car=own;tick(1);assert(own.hp<100);assert(other.hp<100);assert(g.shake>0);
});
check('lethal vehicle damage stops the tick before other systems run',()=>{
  g.start();g.player.car=g.cars[0];g.player.car.hp=0;g.spawnCD=-1;g.heat=5;const count=g.cars.length;tick(1);assert.equal(g.mode,'dead');assert(g.player.car.dead);assert.equal(g.cars.length,count);
});
check('police wrecks and distant abandoned interceptors are reclaimed',()=>{
  g.start();g.peds=[];g.cars=[];g.spawnCD=1000;
  for(let i=0;i<20;i++){const c=S.makeCar(260,240,0,'#fff','police');c.dead=true;c.deadAge=17.99;g.cars.push(c);}
  const stolen=S.makeCar(260,240,0,'#fff','police');stolen.kind='parked';g.cars.push(stolen);tick(2);assert.equal(g.cars.length,0);
});
check('unseen police search old sightings without hidden-player reinforcements',()=>{
  g.start();g.peds=[];g.cars=[];moveTo(C.dock);g.heat=3;g.lastKnown={x:260,y:240};g.lastSeen=-10;g.lastCrime=-10;g.spawnCD=0;
  const cop=S.makeCar(260,240,0,'#fff','police');g.cars=[cop];tick(1);assert(cop.searchGoal);assert(S.dist(cop.searchGoal,g.lastKnown)<=420);assert.equal(g.cars.filter(c=>c.kind==='police').length,0); // Far-away officer is culled, not replaced at the player.
  tick(1500);assert.equal(g.heat,0);assert.equal(g.cars.length,0);
});
check('multiple police cannot stack ram damage in a single tick',()=>{
  g.start();g.peds=[];const own=S.makeCar(1100,1500,0,'#fff');g.player.car=own;g.cars=[own];g.heat=3;g.lastSeen=g.time;g.lastCrime=g.time;g.spawnCD=1000;
  for(let i=0;i<4;i++){const cop=S.makeCar(1135,1500+i*2,Math.PI,'#fff','police');g.cars.push(cop);}
  tick(1);assert(own.hp>=95);assert(g.player.hp>=99);
});
check('pedestrians react to approaching civilian traffic',()=>{
  g.start();g.cars=[];g.peds=g.peds.slice(0,1);const p=g.peds[0];Object.assign(p,{x:260,y:1100,flee:0});moveTo(C.dock);const c=S.makeCar(260,1010,Math.PI/2,'#fff');c.speed=100;g.cars=[c];tick(1);assert(p.flee>0);assert.equal(p.threat.y,1010);
});
check('rendering never advances the gameplay random stream',()=>{
  g.start();g.random=S.rng(57);const expected=S.rng(57)();g.shake=8;g.renderer.draw();g.renderer.draw();assert.equal(g.random(),expected);
});
check('toast queue deduplicates messages and remains bounded',()=>{
  g.start();for(let i=0;i<20;i++)g.notify('notice '+i);assert.equal(g.toastQueue.length,4);g.notify('notice 19');assert.equal(g.toastQueue.length,4);
});
check('map, world and HUD draw at common desktop sizes',()=>{
  for(const [w,h] of [[1920,1080],[1280,720],[960,640],[800,600]]){ctx.innerWidth=w;ctx.innerHeight=h;g.renderer.resize();g.mode='play';g.renderer.draw();g.mode='map';g.renderer.draw();}g.mode='play';
});
console.log('ALL RUNTIME TESTS PASSED');
