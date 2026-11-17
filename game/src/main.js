'use strict';
(function(S){
  const C=S.C;
  class Game {
    constructor(){
      this.canvas=document.getElementById('game');this.screen=document.getElementById('screen');this.panel=document.getElementById('panel');this.status=document.getElementById('status');this.toast=document.getElementById('toast');
      this.random=S.rng(198603);this.city=new S.City();this.input=new S.Input(this.canvas);this.renderer=new S.Renderer(this.canvas,this);this.audio=null;this.muted=false;
      this.camera={x:1460,y:1500,zoom:1};this.mode='title';this.saved=this.readSave();this.reset(false);this.showTitle();
      this.last=performance.now();this.accumulator=0;
      document.addEventListener('visibilitychange',()=>{if(document.hidden&&this.mode==='play')this.pause();});
      window.addEventListener('blur',()=>{if(this.mode==='play')this.pause();});
      requestAnimationFrame(now=>this.frame(now));
    }
    readSave(){try{const s=JSON.parse(localStorage.getItem(C.saveKey));if(s&&s.v===1&&Number.isFinite(s.cash)&&Number.isInteger(s.mission))return{cash:S.clamp(s.cash,0,1e7),mission:S.clamp(s.mission,0,4)};}catch{}return null;}
    save(){try{localStorage.setItem(C.saveKey,JSON.stringify({v:1,cash:Math.round(this.cash),mission:this.mission.index}));this.saved={cash:this.cash,mission:this.mission.index};}catch{}}
    reset(useSave){
      const save=useSave?this.saved:null;this.time=0;this.cash=save?save.cash:150;this.heat=0;this.bust=0;this.seen=false;this.lastCrime=-100;this.lastSeen=-100;this.lastKnown={...C.contact};this.spawnCD=1;this.shake=0;this.escapeDistance=0;this.lastSkid=0;this.autosave=0;
      this.player={x:1180,y:1463,a:-Math.PI/2,hp:100,ammo:12,reload:0,fireCD:0,hurt:0,invuln:0,car:null,step:0,moving:false};
      S.populate(this);this.mission=new S.Missions(this,save?save.mission:0);this.camera.x=1280;this.camera.y=1440;this.camera.zoom=1;
    }
    start(useSave=false){this.initAudio();this.reset(useSave);this.mode='play';this.screen.className='screen hidden';this.input.flush();this.input.mouse.down=false;this.save();this.notify(useSave?'WELCOME BACK TO SOLENNE':'MARA’S WAITING UP THE BLOCK / FOLLOW THE MINT MARKER');this.status.textContent='Playing Sunline. WASD moves; E enters a car; F interacts.';}
    showTitle(){
      this.mode='title';this.screen.className='screen title';this.panel.className='panel';
      this.panel.innerHTML='<p class="eyebrow">AN ORIGINAL OPEN-CITY ACTION GAME</p><h1 class="logo">SUNLINE</h1><p class="subtitle">THE SOLENNE JOB</p><div class="rule"></div><p class="blurb">A stolen shoreline. A city on the take.<br>You’re a wheelman with one last chance to get out.<br>Mara has a different plan: steal the truth back.</p><div class="buttons">'+(this.saved?'<button class="primary" id="continue">Continue / '+(this.saved.mission>=4?'Free roam':'Job '+(this.saved.mission+1))+'</button>':'')+'<button class="'+(this.saved?'':'primary')+'" id="start">'+(this.saved?'New story':'Start your story')+'</button></div><div class="controls"><span><b>WASD / ↑↓←→</b> Walk / drive</span><span><b>E</b> Enter / exit a car</span><span><b>MOUSE / CLICK</b> Aim / shoot</span><span><b>F</b> Talk / collect / deliver</span><span><b>SHIFT / SPACE</b> Sprint / handbrake</span><span><b>R · M · ESC</b> Reload · map · pause</span></div><p class="fineprint">4 STORY JOBS · SAVES AUTOMATICALLY · PLAY OFFLINE</p>';
      document.getElementById('start').onclick=()=>{if(this.saved)this.confirmNew();else this.start();};
      if(this.saved)document.getElementById('continue').onclick=()=>this.start(true);
    }
    confirmNew(){this.dialog({eyebrow:'NEW STORY',title:'BACK TO THE BEGINNING?',text:'Start a fresh run in Solenne. This replaces the saved story and cash in this browser.',button:'Start new story',action:()=>this.start(),secondary:'Keep my save',back:()=>this.showTitle()});}
    closeScreen(){this.mode='play';this.screen.className='screen hidden';this.input.flush();this.input.mouse.down=false;}
    dialog(data){
      this.mode='dialog';this.screen.className='screen';this.panel.className='panel'+(data.ending?' ending':'');
      this.panel.innerHTML='<p class="eyebrow">'+data.eyebrow+'</p>'+(data.speaker?'<div class="speaker"><div class="portrait">MV</div><p>RADIO OPERATOR<strong>Mara Vela</strong></p></div>':'')+'<h2>'+data.title+'</h2><p class="quote">'+data.text.replace(/\n/g,'<br>')+'</p>'+(data.objective?'<div class="reward">'+data.objective+'<br><strong>'+(data.reward?S.money(data.reward)+' CASH REWARD':'')+'</strong></div>':'')+'<div class="buttons"><button id="dialog-action" class="primary">'+(data.button||'Continue')+'</button>'+(data.secondary?'<button id="dialog-back">'+data.secondary+'</button>':'')+'</div>';
      document.getElementById('dialog-action').onclick=data.action||(()=>this.closeScreen());if(data.back)document.getElementById('dialog-back').onclick=data.back;
      this.input.flush();this.input.mouse.down=false;this.status.textContent=data.title+'. '+data.text;
    }
    pause(){
      if(this.mode!=='play'&&this.mode!=='map')return;this.save();this.mode='pause';this.screen.className='screen';this.panel.className='panel';
      this.panel.innerHTML='<p class="eyebrow">SOLENNE / TAKING A BREATHER</p><h2>THE CITY CAN WAIT.</h2><p class="blurb">Your cash and completed jobs are saved. Active jobs restart at Mara’s if you leave.</p><div class="controls"><span><b>E</b> Enter / exit car</span><span><b>F</b> Mission / workshop</span><span><b>R</b> Reload pistol</span><span><b>M</b> City map</span><span><b>SHIFT</b> Sprint on foot</span><span><b>SPACE</b> Handbrake in car</span></div><div class="buttons"><button id="resume" class="primary">Resume</button><button id="sound">Sound: '+(this.muted?'Off':'On')+'</button><button id="menu">Main menu</button></div>';
      document.getElementById('resume').onclick=()=>this.closeScreen();document.getElementById('sound').onclick=e=>{this.muted=!this.muted;e.target.textContent='Sound: '+(this.muted?'Off':'On');};document.getElementById('menu').onclick=()=>{this.saved=this.readSave();this.reset(true);this.showTitle();};this.input.mouse.down=false;
    }
    fail(reason){
      if(this.mode!=='play')return;this.mode='dead';this.save();this.screen.className='screen';this.panel.className='panel dead';
      this.panel.innerHTML='<p class="eyebrow">SOLENNE / '+(reason==='BUSTED'?'CIVIC DETENTION':'COUNTY MEDICAL')+'</p><h2>'+reason+'</h2><p class="blurb">'+(reason==='BUSTED'?'They got you this time. Mara paid your bail.':'You wake up at Calder’s. The city hasn’t finished with you.')+'<br>Recovery fee: '+S.money(Math.min(this.cash,100))+'. Completed jobs are safe.</p><div class="buttons"><button id="respawn" class="primary">Back on the street</button></div>';
      document.getElementById('respawn').onclick=()=>this.respawn();this.input.mouse.down=false;
    }
    respawn(){
      const cash=Math.max(0,this.cash-100),index=this.mission.index;this.reset(false);this.cash=cash;this.mission=new S.Missions(this,index);this.player.invuln=3;this.closeScreen();this.save();this.notify('BACK IN SOLENNE / RETURN TO MARA TO RETRY THE JOB');
    }
    notify(message){this.toast.textContent=message;this.toast.classList.add('show');this.toastEnd=performance.now()+3800;this.status.textContent=message;}
    hint(){
      const p=this.player,m=this.mission.prompt();if(m)return m;
      if(p.car)return 'E / EXIT VEHICLE';
      const c=this.cars.find(c=>!c.dead&&S.dist(c,p)<62);return c?'E / '+(c.owned?'DRIVE ':'STEAL ')+c.name:null;
    }
    worldToScreen(x,y){const c=this.camera;return{x:(x-c.x)*c.zoom+this.renderer.w/2,y:(y-c.y)*c.zoom+this.renderer.h/2};}
    screenToWorld(x,y){const c=this.camera;return{x:(x-this.renderer.w/2)/c.zoom+c.x,y:(y-this.renderer.h/2)/c.zoom+c.y};}
    initAudio(){
      if(this.audio)return;try{this.audio=new (window.AudioContext||window.webkitAudioContext)();this.audio.resume();}catch{}
    }
    sound(kind){
      if(!this.audio||this.muted||this.audio.state!=='running')return;
      const params={shot:[140,.065,'sawtooth',.055],enemy:[90,.07,'square',.018],pickup:[680,.12,'sine',.08],success:[860,.3,'sine',.08],alert:[390,.17,'square',.035],door:[110,.06,'triangle',.08],crash:[55,.14,'sawtooth',.045],hurt:[80,.13,'triangle',.05],reload:[260,.06,'triangle',.04]}[kind];
      if(!params)return;const [f,d,type,volume]=params,o=this.audio.createOscillator(),v=this.audio.createGain(),now=this.audio.currentTime;o.type=type;o.frequency.setValueAtTime(f,now);o.frequency.exponentialRampToValueAtTime(kind==='success'?f*1.6:Math.max(30,f*.5),now+d);v.gain.setValueAtTime(volume,now);v.gain.exponentialRampToValueAtTime(.0001,now+d);o.connect(v);v.connect(this.audio.destination);o.start(now);o.stop(now+d);
    }
    actions(){
      const input=this.input;
      if(input.take('Escape','KeyP')){if(this.mode==='play')this.pause();else if(this.mode==='pause')this.closeScreen();else if(this.mode==='map')this.mode='play';}
      if(input.take('KeyM')){if(this.mode==='play')this.mode='map';else if(this.mode==='map')this.mode='play';}
      if(input.take('Enter')){
        if(this.mode==='title'){if(this.saved)this.start(true);else this.start();}
        else if(this.mode==='dialog')document.getElementById('dialog-action')?.click();else if(this.mode==='dead')this.respawn();else if(this.mode==='pause')this.closeScreen();
      }
      if(this.mode==='play'){
        if(input.take('KeyE'))S.enterExit(this);
        if(input.take('KeyF')){if(!this.mission.interact())this.notify('F / INTERACT AT A CONTACT, OBJECTIVE OR WORKSHOP');}
      }
    }
    tick(dt){
      if(this.mode!=='play')return;
      this.time+=dt;S.tickEntities(this,dt,this.input);if(this.mode!=='play')return;this.mission.tick(dt);this.shake=Math.max(0,this.shake-dt*20);
      this.autosave+=dt;if(this.autosave>15){this.autosave=0;this.save();}
    }
    frame(now){
      const dt=Math.min((now-this.last)/1000,.1);this.last=now;this.actions();
      if(this.mode==='play'){this.accumulator+=dt;let n=0;while(this.accumulator>=1/60&&n++<6){this.tick(1/60);this.accumulator-=1/60;}}else this.accumulator=0;
      const t=S.target(this);
      if(this.mode==='title'){
        this.time+=dt;this.camera.x=1510+Math.sin(this.time*.05)*120;this.camera.y=1485+Math.cos(this.time*.04)*80;this.camera.zoom=.92;
      }else if(this.mode!=='map'){
        const moving=this.player.car,look=moving?S.clamp(moving.speed*.45,-40,100):0,tx=t.x+Math.cos(t.a)*look,ty=t.y+Math.sin(t.a)*look;
        this.camera.x=S.lerp(this.camera.x,tx,1-Math.exp(-dt*5));this.camera.y=S.lerp(this.camera.y,ty,1-Math.exp(-dt*5));
        this.camera.zoom=S.lerp(this.camera.zoom,moving?.9:1.12,1-Math.exp(-dt*2));
      }
      if(this.toastEnd&&now>this.toastEnd){this.toast.classList.remove('show');this.toastEnd=0;}
      this.renderer.draw();this.input.flush();requestAnimationFrame(n=>this.frame(n));
    }
  }
  S.Game=Game;S.game=new Game();
})(window.Sunline);
