'use strict';
(function(S){
  const C=S.C;
  const jobs=[
    {title:'DEAD AIR',label:'01 / DEAD AIR',reward:350,brief:'The city is selling our shoreline to the Veyra Consortium. I found the real land deeds, but my runner went quiet. Get his tape from the Sundial courtyard. Bring it back to me.',goal:'Collect the courier’s tape',place:'SUNDIAL COURTYARD',point:C.package,returnText:'That tape proves the eviction notices were forged. You just gave half this city a fighting chance. There’s more work, if you’re in.'},
    {title:'SALT WATER',label:'02 / SALT WATER',reward:700,brief:'My harbor contact can copy the tape. Pick up the encrypted reel here, then take it to the pier at Salt Harbor. Veyra owns the dispatch desk. Expect company.',goal:'Deliver the reel to the harbor',place:'SALT HARBOR PIER',point:C.dock,returnText:'The reel is safe. Our harbor friend found a second ledger, hidden in a Veyra executive’s car. Time to borrow something expensive.'},
    {title:'GOLD STANDARD',label:'03 / GOLD STANDARD',reward:1100,brief:'Find the gold Aurelia GT on Canal Street. The ledger is in its onboard recorder. Steal it, shake the patrols, and bring the car to Calder’s workshop in Salt Harbor. Keep it in one piece.',goal:'Steal the gold Aurelia GT',place:'GOLD COAST / CANAL ST',point:C.coupe,returnText:'Calder pulled the ledger. Every bribe, every false signature. One last thing: the city needs to hear it before Veyra buries the signal.'},
    {title:'THE SUNLINE',label:'04 / THE SUNLINE',reward:1800,brief:'Take the evidence to the transmitter in Sundial Gardens. They’ll send every patrol they have. Reach the broadcast van, then lose a three-star pursuit. Bring the truth home.',goal:'Reach the broadcast transmitter',place:'SUNDIAL TRANSMITTER',point:C.broadcast,returnText:''}
  ];
  S.Missions=class {
    constructor(g,index=0){this.g=g;this.index=S.clamp(index,0,4);this.active=false;this.stage=0;this.timer=0;this.progress=0;this.job=jobs[this.index];this.courierCD=0;}
    marker(){
      if(!this.active)return this.index<4?{...C.contact,type:'contact',label:'MARA / NEW JOB'}:null;
      let point,label;
      if(this.index===0){point=this.stage===0?C.package:C.contact;label=this.stage===0?'COURIER TAPE':'MARA / RETURN THE TAPE';}
      if(this.index===1){point=C.dock;label='DELIVERY / SALT HARBOR';}
      if(this.index===2){point=this.stage===0?this.g.specialCar:C.garage;label=this.stage===0?'AURELIA GT':'CALDER / DELIVER THE CAR';}
      if(this.index===3){point=this.stage===0?C.broadcast:C.contact;label=this.stage===0?'BROADCAST TRANSMITTER':this.g.heat>0?'LOSE THE POLICE':'MARA / ONE LAST TIME';}
      return {...point,type:this.index===2&&this.stage===0?'car':'objective',label};
    }
    objective(){
      if(this.index>=4)return 'The signal is yours. Explore Solenne. Take courier jobs at Mara’s.';
      if(!this.active)return 'Meet Mara at the radio shop to begin the next job.';
      if(this.index===0)return this.stage===0?'Find the courier’s tape in Sundial courtyard.':'Return the tape to Mara’s radio shop.';
      if(this.index===1)return 'Deliver the encrypted reel to Salt Harbor pier.';
      if(this.index===2)return this.stage===0?'Steal the gold Aurelia GT on Canal Street.':'Deliver the Aurelia to Calder’s workshop intact.';
      return this.stage===0?'Reach the transmitter in Sundial Gardens.':this.g.heat>0?'Lose the 3-star pursuit. Break line of sight.':'Return to Mara. It’s time for the city to hear.';
    }
    prompt(){
      const g=this.g,t=S.target(g),m=this.marker();
      if(m&&S.dist(t,m)<72){
        if(!this.active)return g.player.car?'EXIT VEHICLE TO TALK TO MARA':'F / TALK TO MARA';
        if(this.index===2&&this.stage===0)return 'E / STEAL THE AURELIA GT';
        if(this.index===2&&g.player.car!==g.specialCar)return 'BRING THE GOLD AURELIA GT';
        if(this.index===3&&this.stage===1&&g.heat>0)return 'LOSE THE POLICE BEFORE RETURNING';
        if(this.index===0&&this.stage===1&&g.player.car)return 'EXIT VEHICLE TO GIVE MARA THE TAPE';
        return 'F / '+(this.index===0&&this.stage===0?'PICK UP TAPE':this.index===3&&this.stage===0?'START THE BROADCAST':'COMPLETE OBJECTIVE');
      }
      if(S.dist(t,C.garage)<90)return 'F / WORKSHOP · REPAIR & HEAL · $100';
      if(this.index>=4&&S.dist(t,C.contact)<70)return 'F / TAKE A COURIER JOB';
      return null;
    }
    interact(){
      const g=this.g,t=S.target(g),m=this.marker();
      if(!this.active&&this.index<4&&S.dist(t,C.contact)<75&&!g.player.car){this.brief();return true;}
      if(this.active&&m&&S.dist(t,m)<77){
        if(this.index===0){if(this.stage===0){this.stage=1;g.notify('TAPE RECOVERED  /  RETURN TO MARA');g.sound('pickup');S.effects(g,t.x,t.y,'#ffcc77',16,70);}else if(!g.player.car)this.complete();}
        else if(this.index===1)this.complete();
        else if(this.index===2&&this.stage===1&&g.player.car===g.specialCar){g.specialCar.hp=100;this.complete();}
        else if(this.index===3){if(this.stage===0){this.stage=1;this.progress=0;S.crime(g,3,t.x,t.y,true);g.heat=Math.max(g.heat,3);g.notify('SIGNAL LIVE  /  LOSE THE THREE-STAR PURSUIT');g.sound('alert');}else if(g.heat===0){this.complete();}}
        return true;
      }
      if(S.dist(t,C.garage)<90){
        if(g.heat>0&&g.seen){g.notify('WORKSHOP CLOSED WHILE POLICE CAN SEE YOU');return true;}
        if(g.cash<100){g.notify('REPAIR COSTS $100');return true;}
        g.cash-=100;g.player.hp=100;if(g.player.car)g.player.car.hp=100;g.player.ammo=12;g.save();g.notify('CALDER / ALL PATCHED UP. STAY SHARP.');g.sound('success');return true;
      }
      if(this.index>=4&&S.dist(t,C.contact)<75){
        if(this.courier){if(S.dist(t,this.courier)<75){g.cash+=250;this.courier=null;g.save();g.notify('COURIER COMPLETE / +$250');}}
        else{this.courier={...C.dock};g.notify('FREE ROAM JOB / DELIVER A RADIO PART TO SALT HARBOR FOR $250');}
        return true;
      }
      return false;
    }
    brief(){
      const j=jobs[this.index];this.job=j;
      this.g.dialog({eyebrow:'THE SOLENNE JOB / '+j.label,title:j.title,speaker:true,text:j.brief,reward:j.reward,objective:j.goal,button:'Accept job',action:()=>this.start()});
    }
    start(){
      const g=this.g;this.active=true;this.stage=0;this.timer=0;this.job=jobs[this.index];
      if(this.index===1){S.crime(g,1.9,g.player.x,g.player.y,true);g.heat=Math.max(2,g.heat);g.notify('REEL COLLECTED  /  DISPATCH HAS YOUR DESCRIPTION');}
      if(this.index===2){const c=g.specialCar;c.x=C.coupe.x;c.y=C.coupe.y;c.a=Math.PI;c.hp=100;c.dead=false;c.owned=false;if(g.player.car===c)g.player.car=null;}
      g.sound('pickup');g.closeScreen();g.save();
    }
    retry(reason){
      this.active=false;this.stage=0;this.g.notify(reason);this.g.save();
    }
    complete(){
      const g=this.g,j=jobs[this.index];g.cash+=j.reward;this.active=false;this.index++;this.stage=0;g.save();g.sound('success');
      if(this.index>=4){
        g.heat=0;g.dialog({eyebrow:'THE SOLENNE JOB / COMPLETE',title:'THE CITY IS LISTENING.',ending:true,text:'Mara turns the dial. The ledger goes out over every radio in Solenne. By sunrise, the shoreline deal is frozen. For once, the city belongs to the people who live here.\n\nYou kept the signal alive. The streets are still yours.',reward:j.reward,objective:'Story complete · Free roam unlocked',button:'Back to the city',action:()=>{g.closeScreen();g.notify('FREE ROAM / MARA HAS COURIER WORK. CALDER CAN REPAIR YOUR CAR.');}});
      }else{
        g.dialog({eyebrow:'JOB COMPLETE / '+j.title,title:'GOOD WORK, RUNNER.',speaker:true,text:j.returnText,reward:j.reward,objective:'Return to Mara for the next job',button:'Back to Solenne',action:()=>g.closeScreen()});
      }
    }
    tick(dt){
      const g=this.g;this.timer+=dt;
      if(this.active&&this.index===2&&this.stage===0&&g.player.car===g.specialCar){this.stage=1;S.crime(g,1.8,g.player.x,g.player.y,true);g.heat=Math.max(2,g.heat);g.notify('AURELIA ACQUIRED / DELIVER TO CALDER’S WORKSHOP');}
      if(this.active&&this.index===3&&this.stage===1&&g.heat===0&&this.progress===0){this.progress=1;g.notify('POLICE EVADED / RETURN TO MARA');}
      if(this.courier&&S.dist(S.target(g),this.courier)<75){g.cash+=250;this.courier=null;g.save();g.notify('COURIER COMPLETE / +$250');g.sound('success');}
    }
  };
  S.jobs=jobs;
})(window.Sunline);
