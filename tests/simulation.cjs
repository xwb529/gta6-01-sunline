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
check('mission 3 steal and deliver specific vehicle',()=>{moveTo(C.contact);g.mission.interact();finishDialog();moveTo(C.coupe);S.enterExit(g);assert.equal(g.player.car,g.specialCar);tick(1);assert.equal(g.mission.stage,1);moveTo(C.garage);g.mission.interact();assert.equal(g.mission.index,3);assert.equal(g.cash,2300);finishDialog();g.player.car=null;});
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
console.log('ALL RUNTIME TESTS PASSED');
