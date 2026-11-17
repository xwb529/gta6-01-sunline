'use strict';
(function(S){
  const C=S.C,cream='#fff0cb',gold='#ffcf69',teal='#16373b',muted='#afc7b8';
  class Renderer {
    constructor(canvas,g){this.canvas=canvas;this.c=canvas.getContext('2d',{alpha:false});this.g=g;this.w=innerWidth;this.h=innerHeight;this.visualRandom=S.rng(941);this.route=[];this.routeKey='';this.routeAt=-10;this.resize();window.addEventListener('resize',()=>this.resize());}
    resize(){this.w=innerWidth;this.h=innerHeight;this.dpr=Math.min(2,devicePixelRatio||1);this.canvas.width=Math.round(this.w*this.dpr);this.canvas.height=Math.round(this.h*this.dpr);this.ui=S.clamp(Math.min(this.w/1280,this.h/720),.7,1.2);}
    text(str,x,y,size=12,color=cream,weight='400',align='left'){
      const c=this.c;c.font=weight+' '+size+'px Arial, Helvetica, sans-serif';c.fillStyle=color;c.textAlign=align;c.textBaseline='alphabetic';c.fillText(str,x,y);
    }
    box(x,y,w,h,fill=teal,r=8){const c=this.c;S.roundRect(c,x,y,w,h,r);c.fillStyle=fill;c.fill();}
    wrap(str,x,y,maxWidth,size=13,color=cream,line=20){
      const c=this.c;c.font='500 '+size+'px Arial';c.fillStyle=color;c.textAlign='left';c.textBaseline='alphabetic';let row='',yy=y;
      for(const word of str.split(' ')){const next=row+word+' ';if(c.measureText(next).width>maxWidth&&row){c.fillText(row,x,yy);row=word+' ';yy+=line;}else row=next;}c.fillText(row,x,yy);return yy;
    }
    visible(x,y,pad=80){const cam=this.g.camera;return Math.abs(x-cam.x)<this.w/(2*cam.zoom)+pad&&Math.abs(y-cam.y)<this.h/(2*cam.zoom)+pad;}
    draw(){
      const c=this.c,g=this.g,w=this.w,h=this.h,cam=g.camera;
      c.setTransform(this.dpr,0,0,this.dpr,0,0);c.fillStyle='#378d98';c.fillRect(0,0,w,h);
      const shake=g.mode==='play'?g.shake:0;
      c.save();c.translate(w/2+(this.visualRandom()-.5)*shake,h/2+(this.visualRandom()-.5)*shake*.65);c.scale(cam.zoom,cam.zoom);c.translate(-cam.x,-cam.y);
      // Only the visible piece of the prepainted city is copied each frame.
      const left=Math.max(0,cam.x-w/cam.zoom/2-10),top=Math.max(0,cam.y-h/cam.zoom/2-10),right=Math.min(C.W,cam.x+w/cam.zoom/2+10),bottom=Math.min(C.H,cam.y+h/cam.zoom/2+10);
      if(right>left&&bottom>top)c.drawImage(g.city.canvas,left,top,right-left,bottom-top,left,top,right-left,bottom-top);
      this.drawWorldDetails();
      if(g.mode==='play')this.drawRoute();
      for(const s of g.skids){if(!this.visible(s.x,s.y))continue;c.save();c.globalAlpha=Math.min(.35,s.life*.08);c.translate(s.x,s.y);c.rotate(s.a);c.fillStyle='#183b39';c.fillRect(-5,-11,11,3);c.fillRect(-5,8,11,3);c.restore();}
      const marker=g.mission.marker();if(marker)this.drawMarker(marker);
      for(const p of g.peds)if(this.visible(p.x,p.y))this.drawPerson(p,false);
      this.drawContact();
      for(const car of g.cars)if(this.visible(car.x,car.y))this.drawCar(car);
      if(!g.player.car)this.drawPerson(g.player,true);
      for(const b of g.bullets){c.strokeStyle=b.enemy?'#ff886a':'#fff3ab';c.lineWidth=b.enemy?2:2.5;c.beginPath();c.moveTo(b.px,b.py);c.lineTo(b.x,b.y);c.stroke();}
      for(const e of g.particles){c.globalAlpha=S.clamp(e.life/e.max,0,1);c.fillStyle=e.color;if(e.type==='flash'){c.save();c.translate(e.x,e.y);c.rotate(e.a);c.beginPath();c.moveTo(-3,0);c.lineTo(5,-5);c.lineTo(19,0);c.lineTo(5,5);c.fill();c.restore();}else c.fillRect(e.x-e.size/2,e.y-e.size/2,e.size,e.size);}c.globalAlpha=1;
      if(g.player.car&&g.player.car.hp<35){const car=g.player.car;for(let k=0;k<4;k++){c.fillStyle='#49564c55';c.beginPath();c.arc(car.x+Math.cos(g.time*4+k)*8,car.y-16-k*10,7+k*2,0,7);c.fill();}}
      c.restore();
      // Soft lens shading keeps the sunlit roads bright in the center.
      const vignette=c.createRadialGradient(w*.5,h*.5,h*.25,w*.5,h*.5,w*.7);vignette.addColorStop(0,'#122e2c00');vignette.addColorStop(1,'#123c3c44');c.fillStyle=vignette;c.fillRect(0,0,w,h);
      if(g.mode!=='title')this.hud();else this.titleStamp();
      if(g.mode==='map')this.fullMap();
      if(g.player.hurt>0&&g.mode==='play'){c.fillStyle='#d5554633';c.fillRect(0,0,w,h);}
      if(g.mode==='play'&&!g.player.car)this.crosshair();
    }
    drawRoute(){
      const g=this.g,m=g.mission.marker(),t=S.target(g);if(!m||S.dist(t,m)<100)return;
      // A short, cached breadcrumb trail highlights the next road turns.
      const key=m.label+':'+Math.round(m.x/40)+':'+Math.round(m.y/40);
      if(key!==this.routeKey||g.time<this.routeAt||g.time-this.routeAt>1.2){this.route=g.city.route(t,m);this.routeKey=key;this.routeAt=g.time;}
      if(!this.route.length)return;
      const c=this.c,color=m.type==='contact'?'#8edbbd':'#f5d288';c.save();c.lineWidth=3;c.lineJoin='round';c.strokeStyle=color;c.globalAlpha=.38;c.setLineDash([5,15]);c.lineDashOffset=-g.time*18;c.beginPath();
      let open=false;
      for(const p of this.route){if(this.visible(p.x,p.y,20)){if(!open)c.moveTo(p.x,p.y);else c.lineTo(p.x,p.y);open=true;}else open=false;}c.stroke();c.setLineDash([]);c.globalAlpha=.85;
      const next=this.route.find(p=>S.dist(t,p)>100&&this.visible(p.x,p.y));
      if(next){c.translate(next.x,next.y);const i=this.route.indexOf(next),after=this.route[i+1]||m;c.rotate(Math.atan2(after.y-next.y,after.x-next.x));c.beginPath();c.moveTo(-5,-6);c.lineTo(2,0);c.lineTo(-5,6);c.stroke();}c.restore();
    }
    drawWorldDetails(){
      const c=this.c,g=this.g;
      // Transmitter van is a landmark and never a drivable mission vehicle.
      const p=C.broadcast;
      if(this.visible(p.x,p.y)){c.save();c.translate(p.x+20,p.y+20);c.fillStyle='#2e4f4033';c.fillRect(-18,-32,46,67);c.fillStyle='#dfd9bb';S.roundRect(c,-21,-36,42,66,5);c.fill();c.fillStyle='#537e79';c.fillRect(-17,8,34,16);c.fillStyle='#d87c5e';c.fillRect(-20,-12,40,16);c.fillStyle='#f8e1b1';c.font='bold 9px Arial';c.textAlign='center';c.fillText('SOL FM',0,-1);c.fillStyle='#a7b9ac';c.beginPath();c.ellipse(0,-20,16,9,-.5,0,7);c.fill();c.strokeStyle='#4c7165';c.lineWidth=2;c.beginPath();c.moveTo(0,-20);c.lineTo(4,-39);c.stroke();c.restore();}
      // Package glints on the sidewalk until it is collected.
      if(g.mission.active&&g.mission.index===0&&g.mission.stage===0){const p=C.package;c.save();c.translate(p.x,p.y);c.rotate(-.2);c.fillStyle='#6a74533f';c.fillRect(-8,-4,21,19);c.fillStyle='#cba76d';c.fillRect(-10,-10,20,18);c.fillStyle='#f8dba0';c.fillRect(-3,-10,6,18);c.restore();}
      const gp=C.garage;if(this.visible(gp.x,gp.y)){c.strokeStyle='#e4c37a';c.lineWidth=2;c.setLineDash([7,6]);c.strokeRect(gp.x-30,gp.y-27,60,58);c.setLineDash([]);this.text('+',gp.x,gp.y+8,26,'#e9c778','700','center');}
    }
    drawMarker(m){
      if(!this.visible(m.x,m.y,130))return;
      const c=this.c,t=this.g.time,pulse=Math.sin(t*3)*3,color=m.type==='contact'?'#81d1bf':gold;
      c.strokeStyle=color;c.lineWidth=2;c.globalAlpha=.7;c.beginPath();c.ellipse(m.x,m.y+5,30+pulse,15+pulse*.4,0,0,7);c.stroke();
      c.globalAlpha=.12;c.fillStyle=color;c.fill();c.globalAlpha=1;
      c.save();c.translate(m.x,m.y-44+Math.sin(t*3)*3);c.rotate(Math.PI/4);c.fillStyle=color;S.roundRect(c,-11,-11,22,22,3);c.fill();c.rotate(-Math.PI/4);this.text(m.type==='contact'?'M':m.type==='car'?'V':'!',0,4,12,teal,'900','center');c.restore();
      if(S.dist(S.target(this.g),m)>90){c.font='700 10px Arial';const tw=c.measureText(m.label).width;this.box(m.x-tw/2-10,m.y-86,tw+20,22,'#15393bea',3);this.text(m.label,m.x,m.y-71,10,color,'700','center');}
    }
    drawContact(){
      const p=S.C.contact;if(!this.visible(p.x,p.y))return;
      this.drawPerson({x:p.x+8,y:p.y-5,a:Math.PI/2,step:0,color:'#b66854',skin:'#af7954',dead:0},false);
      const c=this.c;c.fillStyle='#e2c792';c.fillRect(p.x+1,p.y-19,15,3);c.fillStyle='#cbb58d';c.fillRect(p.x+4,p.y-24,9,7);
    }
    drawPerson(p,player){
      const c=this.c;c.save();c.translate(p.x,p.y);
      if(p.dead){c.rotate(p.a);c.globalAlpha=.55;c.fillStyle='#45574c';c.beginPath();c.ellipse(0,2,15,6,0,0,7);c.fill();c.fillStyle=p.color;c.fillRect(-9,-4,15,8);c.fillStyle=p.skin;c.beginPath();c.arc(10,0,4,0,7);c.fill();c.restore();return;}
      const walk=player?p.moving?Math.sin(p.step)*3:0:Math.sin(p.step)*3;
      c.fillStyle='#253f393d';c.beginPath();c.ellipse(3,6,10,6,0,0,7);c.fill();c.rotate(p.a);
      c.fillStyle='#314940';c.fillRect(-7,-6+walk,8,4);c.fillRect(-7,2-walk,8,4);
      c.fillStyle=player?'#f3deae':p.color;S.roundRect(c,-5,-8,12,16,4);c.fill();
      c.fillStyle=player?'#c0835b':p.skin;c.fillRect(2,-10,7,4);c.fillRect(2,6,7,4);
      if(player){c.fillStyle='#c0835b';c.fillRect(6,-6,10,4);c.fillStyle='#263c38';c.fillRect(13,-7,10,4);c.fillStyle='#dfa36d';c.beginPath();c.arc(0,0,5,0,7);c.fill();c.fillStyle='#3e4c3e';c.beginPath();c.arc(-1,0,5,Math.PI/2,Math.PI*1.5);c.fill();c.fillStyle='#5aa29a';c.fillRect(-4,-8,3,16);}
      else{c.fillStyle=p.skin;c.beginPath();c.arc(0,0,5,0,7);c.fill();c.fillStyle='#4d4f3c';c.beginPath();c.arc(-1,0,4,Math.PI/2,Math.PI*1.5);c.fill();}
      c.restore();
      if(!player&&p.flee>0)this.text('!',p.x,p.y-18,13,'#f7d287','700','center');
      if(player){c.strokeStyle='#fff3c780';c.lineWidth=1.5;c.beginPath();c.arc(p.x,p.y,16,.2,2.7);c.stroke();}
    }
    drawCar(car){
      const c=this.c,g=this.g;c.save();c.translate(car.x,car.y);c.rotate(car.a+Math.PI/2);
      const w=car.w,h=car.h;
      c.fillStyle='#1e3d3855';S.roundRect(c,-w/2+5,-h/2+6,w+3,h+3,6);c.fill();
      c.fillStyle='#223c39';for(const x of [-w/2-2,w/2-1]){c.fillRect(x,-h*.3,4,11);c.fillRect(x,h*.2,4,11);}
      c.fillStyle=car.dead?'#626e5b':car.flash>0?'#fff0c4':car.color;S.roundRect(c,-w/2,-h/2,w,h,5);c.fill();
      c.fillStyle='#ffffff35';c.fillRect(-w/2+3,-h/2+4,2,h-11);
      c.fillStyle=car.dead?'#37483e':'#3b6869';c.beginPath();c.moveTo(-w/2+3,-h/2+12);c.lineTo(w/2-3,-h/2+12);c.lineTo(w/2-4,-2);c.lineTo(-w/2+4,-2);c.closePath();c.fill();
      c.fillStyle=car.kind==='police'?'#284e51':car.color;S.roundRect(c,-w/2+4,-2,w-8,17,2);c.fill();
      c.fillStyle='#345c5e';c.fillRect(-w/2+4,15,w-8,6);
      if(car.model===1){c.fillStyle='#355e60';c.fillRect(-w/2+4,6,w-8,10);}
      if(car.model===2){c.fillStyle='#3b6260';c.fillRect(-w/2+4,4,w-8,15);c.fillStyle='#d9d4b3';c.fillRect(-w/2+4,-1,2,18);c.fillRect(w/2-6,-1,2,18);}
      if(car.model===3){c.fillStyle='#604d39';c.fillRect(-w/2+3,h/2-9,w-6,3);}
      c.fillStyle=car.dead?'#727766':car.color;c.fillRect(-w/2-3,-4,4,4);c.fillRect(w/2-1,-4,4,4);
      c.strokeStyle='#324e4660';c.lineWidth=1;c.beginPath();c.moveTo(-w/2+3,-h/2+6);c.lineTo(w/2-3,-h/2+6);c.stroke();
      c.fillStyle='#fff2bb';c.fillRect(-w/2+2,-h/2+1,5,3);c.fillRect(w/2-7,-h/2+1,5,3);c.fillStyle=car.braking&&!car.dead?'#ff7151':'#ae5745';c.fillRect(-w/2+2,h/2-3,4,3);c.fillRect(w/2-6,h/2-3,4,3);
      if(car.braking&&!car.dead){c.fillStyle='#ff805b30';c.fillRect(-w/2,h/2,7,9);c.fillRect(w/2-7,h/2,7,9);}
      if(car.hp<60&&!car.dead){c.strokeStyle='#233e39';c.beginPath();c.moveTo(-5,-12);c.lineTo(2,-6);c.lineTo(-1,-1);c.moveTo(2,-6);c.lineTo(7,-8);c.stroke();}
      c.fillStyle='#bec6ad';c.fillRect(-3,h/2-2,6,2);
      if(car.kind==='police'){
        c.fillStyle='#1c4247';c.fillRect(-w/2,-3,w,12);c.fillStyle='#e8ddbb';c.beginPath();c.arc(0,3,4,0,7);c.fill();c.fillStyle=Math.sin(g.time*13)>0?'#fa735e':'#b85451';c.fillRect(-8,-2,7,4);c.fillStyle=Math.sin(g.time*13)<0?'#8fe4ef':'#537c9b';c.fillRect(1,-2,7,4);
      }
      if(car===g.specialCar&&!car.dead){c.fillStyle='#efe0a6';c.fillRect(-2,-h/2+5,4,10);c.fillRect(-2,h/2-6,4,4);}
      if(car.dead){c.strokeStyle='#b0a18a';c.lineWidth=2;c.beginPath();c.moveTo(-8,-10);c.lineTo(4,8);c.lineTo(-3,18);c.moveTo(6,-13);c.lineTo(-2,3);c.stroke();}
      c.restore();
      if(car.kind==='police'&&g.heat>0&&!car.dead){const color=Math.sin(g.time*13)>0?'#f87e6460':'#7ac8e76a';const grd=c.createRadialGradient(car.x,car.y,5,car.x,car.y,47);grd.addColorStop(0,color);grd.addColorStop(1,'#ffffff00');c.fillStyle=grd;c.beginPath();c.arc(car.x,car.y,47,0,7);c.fill();}
    }
    hud(){
      const c=this.c,g=this.g,s=this.ui,W=this.w/s,H=this.h/s,t=S.target(g),stars=S.starCount(g);
      c.save();c.scale(s,s);
      // Header identity.
      this.box(24,22,251,66,'#143237ed',7);c.fillStyle=gold;c.fillRect(24,35,3,39);
      this.text('SUNLINE',42,50,24,cream,'900');this.text('SOLENNE  /  '+g.city.district(t.x,t.y),43,71,9,muted,'700');
      if(W>1180){this.text('17:42',294,43,12,cream,'700');this.text('GOLDEN HOUR',294,61,8,'#d9d4af','700');}
      // Player status uses discrete labels above readable bars.
      const rx=W-307;
      this.box(rx,22,283,86,'#143237ed',7);
      this.text(S.money(g.cash),rx+264,49,24,gold,'700','right');
      this.text('RUNNER',rx+17,42,8,muted,'700');this.text(Math.ceil(g.player.hp)+' / 100',rx+17,59,11,cream,'700');
      this.box(rx+17,68,100,4,'#36534f',2);this.box(rx+17,68,Math.max(0,g.player.hp),4,g.player.hp<30?'#ed8061':'#7dc7a5',2);
      if(stars){this.text(g.seen?'IN PURSUIT':'SEARCHING',rx+264,94,9,g.seen?'#f59277':'#88cebe','700','right');}
      else this.text('NO ACTIVE WARRANT',rx+264,94,8,muted,'700','right');
      for(let i=0;i<5;i++)this.text('★',rx+16+i*22,96,20,i<stars?(g.seen&&Math.floor(g.time*3)%2?'#ff9979':gold):'#48615b','700');
      // Minimap and its compact place label.
      const mx=24,my=H-226,mw=202,mh=174;
      this.box(mx-1,my-29,mw+2,mh+60,'#143237f5',8);this.text('SOLENNE / CITY MAP',mx+12,my-11,9,muted,'700');this.text('M',mx+mw-12,my-11,10,gold,'700','right');
      c.save();S.roundRect(c,mx+5,my,mw-10,mh,3);c.clip();
      c.drawImage(g.city.mini,mx+5,my,mw-10,mh);
      const fx=(mw-10)/C.W,fy=mh/C.H;
      const dot=(p,color,r)=>{c.fillStyle=color;c.beginPath();c.arc(mx+5+p.x*fx,my+p.y*fy,r,0,7);c.fill();};
      for(const car of g.cars)if(car.kind==='police'&&!car.dead)dot(car,g.seen?'#ff7e69':'#e8b671',3);
      const marker=g.mission.marker();if(marker){c.strokeStyle='#e9ca6c99';c.lineWidth=1;c.setLineDash([3,3]);c.beginPath();c.moveTo(mx+5+t.x*fx,my+t.y*fy);c.lineTo(mx+5+marker.x*fx,my+marker.y*fy);c.stroke();c.setLineDash([]);dot(marker,marker.type==='contact'?'#a0e4ca':gold,4+Math.sin(g.time*3));}
      dot(C.garage,'#bfe2c1',2.5);
      c.save();c.translate(mx+5+t.x*fx,my+t.y*fy);c.rotate((g.player.car?g.player.car.a:g.player.a)+Math.PI/2);c.fillStyle=cream;c.strokeStyle='#183936';c.lineWidth=1.5;c.beginPath();c.moveTo(0,-7);c.lineTo(5,5);c.lineTo(0,2);c.lineTo(-5,5);c.closePath();c.fill();c.stroke();c.restore();c.restore();
      this.text('N ↑',mx+12,my+mh+20,9,cream,'700');
      this.text(marker?Math.round(S.dist(t,marker))+' m  /  '+(marker.type==='contact'?'CONTACT':'OBJECTIVE'):'FREE ROAM',mx+mw-12,my+mh+20,9,gold,'700','right');
      // Mission card.
      const bx=W-373,by=H-153;
      this.box(bx,by,349,125,'#143237f2',8);c.fillStyle=gold;c.fillRect(bx,by+16,3,92);
      this.text(g.mission.active?'THE SOLENNE JOB  /  '+String(g.mission.index+1).padStart(2,'0')+' OF 04':g.mission.index>=4?'STORY COMPLETE / FREE ROAM':'MARA VELA / RADIO CONTACT',bx+19,by+23,9,gold,'700');
      this.text(g.mission.index>=4?'A CITY OF YOUR OWN':S.jobs[g.mission.index].title,bx+19,by+49,19,cream,'700');
      this.wrap(g.mission.objective(),bx+19,by+72,309,12,'#ccdac7',18);
      this.text(g.mission.active||g.mission.courier?'GOLD TRAIL / NEXT OBJECTIVE':'MINT TRAIL / MARA’S RADIO',bx+19,by+109,8,muted,'700');
      // Weapon or vehicle readout sits above the mission.
      this.box(W-226,H-227,202,61,'#143237eb',7);
      if(g.player.car){const car=g.player.car;this.text(Math.round(Math.abs(car.speed)*.28).toString().padStart(3,'0'),W-209,H-190,32,cream,'700');this.text('KM/H',W-143,H-190,9,muted,'700');this.text('HULL '+Math.max(0,Math.ceil(car.hp/car.maxHp*100))+'%',W-39,H-203,10,car.hp<30?'#ff8d70':gold,'700','right');this.text(car.name,W-39,H-183,8,muted,'700','right');}
      else{this.text('P  /  PISTOL',W-209,H-202,10,muted,'700');this.text(g.player.reload?'RELOADING':String(g.player.ammo).padStart(2,'0')+' / ∞',W-39,H-182,20,cream,'700','right');this.text('R  RELOAD',W-209,H-183,8,gold,'700');}
      // Persistent controls and contextual action prompt.
      this.text(g.player.car?'W/S  THROTTLE & BRAKE    A/D  STEER    SPACE  HANDBRAKE':'WASD  MOVE    SHIFT  SPRINT    MOUSE  AIM & FIRE',W/2,H-24,9,'#f8e7be','700','center');
      const hint=g.hint();if(hint){c.font='bold 11px Arial';const hw=c.measureText(hint).width+36;this.box((W-hw)/2,H-88,hw,35,'#f4d596',5);this.text(hint,W/2,H-66,11,teal,'700','center');}
      if(g.heat>0){
        const grace=Math.max(0,5-(g.time-g.lastSeen),6-(g.time-g.lastCrime));
        const msg=g.seen?'BREAK LINE OF SIGHT':grace>0?'SEARCHING / KEEP OUT OF SIGHT':'HIDDEN / CLEAR IN '+Math.ceil(g.heat/.14)+'s';
        this.box(W/2-130,25,260,45,g.seen?'#733f36ed':'#173d3bed',6);this.text(msg,W/2,44,10,g.seen?'#ffd1a9':'#a5dfc6','700','center');
        this.box(W/2-112,53,224,3,'#314d46',1);this.box(W/2-112,53,224*g.heat/5,3,g.seen?'#ff9275':'#a3d7ad',1);
      }
      if(g.bust>.1){const bw=200;this.box(W/2-bw/2,98,bw,31,'#713e34e6',5);this.text('ARREST  '+Math.floor(g.bust/3*100)+'%',W/2,118,11,'#ffe3b7','700','center');}
      c.restore();
      this.offscreenMarker();
    }
    offscreenMarker(){
      const g=this.g,m=g.mission.marker();if(!m||g.mode!=='play')return;
      const p=g.worldToScreen(m.x,m.y);if(p.x>65&&p.x<this.w-65&&p.y>130&&p.y<this.h-130)return;
      const dx=p.x-this.w/2,dy=p.y-this.h/2,angle=Math.atan2(dy,dx),limit=Math.min((this.w/2-55)/Math.max(.001,Math.abs(Math.cos(angle))),(this.h/2-125)/Math.max(.001,Math.abs(Math.sin(angle))));
      const x=this.w/2+Math.cos(angle)*limit,y=this.h/2+Math.sin(angle)*limit,c=this.c;
      c.save();c.translate(x,y);c.fillStyle='#12373be8';c.beginPath();c.arc(0,0,23,0,Math.PI*2);c.fill();c.strokeStyle=m.type==='contact'?'#91d8bc':gold;c.lineWidth=1.5;c.stroke();c.rotate(angle);c.fillStyle=c.strokeStyle;c.beginPath();c.moveTo(13,0);c.lineTo(-7,-8);c.lineTo(-3,0);c.lineTo(-7,8);c.closePath();c.fill();c.restore();this.box(x-28,y+26,56,19,'#12373be8',4);this.text(Math.round(S.dist(S.target(g),m))+' m',x,y+39,10,cream,'700','center');
    }
    crosshair(){
      const c=this.c,m=this.g.input.mouse;c.strokeStyle='#153b3b';c.lineWidth=3;c.beginPath();c.arc(m.x,m.y,6,0,7);c.stroke();c.strokeStyle='#ffedbc';c.lineWidth=1;c.beginPath();c.arc(m.x,m.y,6,0,7);c.moveTo(m.x-11,m.y);c.lineTo(m.x-7,m.y);c.moveTo(m.x+7,m.y);c.lineTo(m.x+11,m.y);c.moveTo(m.x,m.y-11);c.lineTo(m.x,m.y-7);c.moveTo(m.x,m.y+7);c.lineTo(m.x,m.y+11);c.stroke();
    }
    titleStamp(){
      const c=this.c,w=this.w,h=this.h;c.save();c.translate(w-55,h-47);this.text('A CITY WORTH STEALING BACK.',0,-23,11,cream,'700','right');this.text('SOLENNE  /  17:42',0,0,18,cream,'700','right');c.restore();
      c.save();c.translate(w*.76,h*.24);c.rotate(-.12);this.text('WELCOME TO',0,-23,12,'#fff0cbca','700','center');this.text('Solenne',0,20,66,'#fff0cbdf','900','center');c.restore();
    }
    fullMap(){
      const c=this.c,g=this.g,w=this.w,h=this.h;c.fillStyle='#102c32f5';c.fillRect(0,0,w,h);
      const scale=Math.min((w-200)/320,(h-160)/300),mw=320*scale,mh=300*scale,x=(w-mw)/2,y=(h-mh)/2;
      this.text('SOLENNE',36,49,28,cream,'900');this.text('CITY MAP / M OR ESC TO CLOSE',36,72,10,muted,'700');
      c.drawImage(g.city.mini,x,y,mw,mh);
      const point=(p,col,r,label)=>{const px=x+p.x/C.W*mw,py=y+p.y/C.H*mh;c.fillStyle=col;c.beginPath();c.arc(px,py,r,0,7);c.fill();if(label){c.font='700 11px Arial';const tw=c.measureText(label).width+20,lx=S.clamp(px+12,12,w-tw-12);this.box(lx,py-13,tw,25,'#183d3bf0',4);this.text(label,lx+8,py+4,11,col,'700');}};
      const m=g.mission.marker();point(C.garage,'#a8dec0',5,'CALDER / REPAIR');if(!m||S.dist(m,C.contact)>10)point(C.contact,'#81d1bf',5,'MARA / CONTACT');if(m)point(m,m.type==='contact'?'#81d1bf':gold,7,m.label);
      for(const p of g.cars)if(p.kind==='police'&&!p.dead)point(p,'#f58b70',4);
      point(S.target(g),cream,6,'YOU');
      this.text('MINT / CONTACT     GOLD / OBJECTIVE     CORAL / POLICE     WHITE / YOU',w/2,h-28,10,muted,'700','center');
    }
  }
  S.Renderer=Renderer;
})(window.Sunline);
