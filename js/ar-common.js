/* =========================================================
   ar-common.js：五個 AR 關卡共用的功能
   需要先載入 A-Frame 與 js/store.js

   每關的 HTML 要有這些元素（id）：
     #cam（video）、a-scene 裡的 #cam3d（相機）
     #s-gps（含 #dist #acc #btn-sim）、#s-intro（含 #btn-start）
     #hud（含 #hint）、#s-win（含 #reward #coins #btn-back）、#toast
     （選用）#reticle：準心

   每關只要寫：
     FN.init({ level: 3, checkpoint: {...}, reward: 50, onStart(){ 建立關卡 } });
     過關時呼叫 FN.finishLevel();
   ========================================================= */
(function(){
  const $ = s => document.querySelector(s);
  const FN = { $, running:false, level:0, reward:50 };

  /* ---------- 畫面切換與提示 ---------- */
  FN.show = function(name){
    document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
    const hud=$('#hud'); if(hud) hud.classList.toggle('active', name==='ar');
    if(name!=='ar') $('#s-'+name).classList.add('active');
  };
  let toastTimer;
  FN.toast = function(msg, ms=1700){
    const t=$('#toast'); if(!t) return;
    t.textContent=msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer=setTimeout(()=>t.classList.remove('show'), ms);
  };
  FN.hint = function(msg){ const h=$('#hint'); if(h) h.textContent=msg; };
  FN.vibrate = function(p){ try{ navigator.vibrate && navigator.vibrate(p); }catch(e){} };
  /** 簡易補間動畫：fn(p) 收到 0→1 的進度 */
  FN.tween = function(dur, fn, done){
    const t0=performance.now();
    (function f(now){ const p=Math.min(1,(now-t0)/dur); fn(p); p<1?requestAnimationFrame(f):done&&done(); })(t0);
  };
  FN.rand = (a,b)=>a+Math.random()*(b-a);
  FN.shuffle = arr=>arr.map(v=>[Math.random(),v]).sort((a,b)=>a[0]-b[0]).map(x=>x[1]);

  /* ---------- GPS 抵達判斷 ---------- */
  FN.distanceM = function(a,b){
    const R=6371000, r=x=>x*Math.PI/180;
    const dLat=r(b.lat-a.lat), dLng=r(b.lng-a.lng);
    const h=Math.sin(dLat/2)**2+Math.cos(r(a.lat))*Math.cos(r(b.lat))*Math.sin(dLng/2)**2;
    return 2*R*Math.asin(Math.sqrt(h));
  };
  let triggered=false, watchId=null;
  FN.startGPS = function(checkpoint){
    if(!('geolocation' in navigator)){ $('#dist').textContent='不支援定位'; return; }
    watchId=navigator.geolocation.watchPosition(pos=>{
      const d=FN.distanceM({lat:pos.coords.latitude,lng:pos.coords.longitude}, checkpoint);
      $('#dist').textContent=Math.round(d)+' 公尺';
      $('#acc').textContent='GPS 精度 ±'+Math.round(pos.coords.accuracy)+' 公尺';
      if(!triggered && d<=checkpoint.radius) FN.arrive();
    }, err=>{
      $('#dist').textContent='無法定位';
      $('#acc').textContent=err.message+'（請允許定位，且網址需為 https）';
    }, {enableHighAccuracy:true, maximumAge:2000, timeout:15000});
  };
  FN.arrive = function(){
    triggered=true;
    if(watchId!==null) navigator.geolocation.clearWatch(watchId);
    FN.vibrate([200,100,200]);
    FN.show('intro');
  };

  /* ---------- 相機與陀螺儀 ---------- */
  FN.startCamera = async function(){
    // iOS 必須在按鈕點擊當下請求動作感測權限
    try{
      if(typeof DeviceOrientationEvent!=='undefined' && typeof DeviceOrientationEvent.requestPermission==='function'){
        const r=await DeviceOrientationEvent.requestPermission();
        if(r!=='granted') FN.toast('沒有動作感測權限，畫面無法跟著手機轉動', 3000);
      }
    }catch(e){}
    try{
      const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});
      const v=$('#cam'); v.srcObject=stream; await v.play();
    }catch(e){ FN.toast('無法開啟相機，先用無背景模式遊玩', 2500); }
  };
  FN.stopCamera = function(){
    const v=$('#cam'); v && v.srcObject && v.srcObject.getTracks().forEach(t=>t.stop());
  };

  /* ---------- 視線與點擊判定 ---------- */
  let fwd, camPos, tmp, raycaster, ndc;
  function vecs(){
    if(!fwd){ fwd=new THREE.Vector3(); camPos=new THREE.Vector3(); tmp=new THREE.Vector3();
      raycaster=new THREE.Raycaster(); ndc=new THREE.Vector2(); }
  }
  /** 更新鏡頭方向，回傳 {fwd, pos}；相機還沒好回傳 null */
  FN.camVectors = function(){
    vecs();
    const c=$('#cam3d') && $('#cam3d').getObject3D('camera'); if(!c) return null;
    c.getWorldDirection(fwd); c.getWorldPosition(camPos);
    return {fwd, pos:camPos};
  };
  /** 物件與準心（畫面中央）的夾角（度）。先呼叫 camVectors() */
  FN.viewAngle = function(obj3d, yOff=0){
    vecs();
    obj3d.getWorldPosition(tmp); tmp.y+=yOff; tmp.sub(camPos).normalize();
    return THREE.MathUtils.radToDeg(fwd.angleTo(tmp));
  };
  /** 從一組候選中找出最接近準心的。getObj(item) 回傳 object3D */
  FN.closestToCenter = function(items, getObj, yOff=0){
    let best=null, bestA=999;
    if(!FN.camVectors()) return {item:null, angle:999};
    items.forEach(it=>{ const a=FN.viewAngle(getObj(it), yOff); if(a<bestA){bestA=a;best=it;} });
    return {item:best, angle:bestA};
  };
  /** 螢幕座標射線判定：回傳命中的 A-Frame 元素（往上找到有 match(el) 為真的那層） */
  FN.pick = function(root, cx, cy, match){
    vecs();
    const cam=$('#cam3d').getObject3D('camera'); if(!cam) return null;
    ndc.set(cx/innerWidth*2-1, -(cy/innerHeight)*2+1);
    raycaster.setFromCamera(ndc,cam);
    const hits=raycaster.intersectObject(root.object3D,true);
    for(const h of hits){
      let o=h.object;
      while(o){ if(o.el && match(o.el)) return {el:o.el, point:h.point}; o=o.parent; }
    }
    return null;
  };
  /** 準心進度圈（0~1） */
  FN.setRing = function(p){ const r=$('#reticle'); if(r) r.style.setProperty('--p', Math.max(0,Math.min(1,p))); };
  /** 讓物件面向玩家（玩家在原點） */
  FN.faceOrigin = function(x,z){ return THREE.MathUtils.radToDeg(Math.atan2(-x,-z)); };

  /* ---------- 音效（不需要音檔） ---------- */
  let actx=null;
  FN.unlockAudio = function(){
    try{ if(!actx) actx=new (window.AudioContext||window.webkitAudioContext)(); if(actx.state==='suspended') actx.resume(); }catch(e){}
  };
  /** 鈴聲：freq 頻率（Hz）、dur 秒 */
  FN.tone = function(freq, dur=0.6, type='sine', vol=0.35){
    if(!actx) return;
    const t=actx.currentTime, o=actx.createOscillator(), g=actx.createGain();
    o.type=type; o.frequency.value=freq;
    g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(vol,t+0.01);
    g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    o.connect(g).connect(actx.destination); o.start(t); o.stop(t+dur+0.05);
    // 加一個高八度泛音，聽起來更像鈴鐺
    if(type==='sine'){
      const o2=actx.createOscillator(), g2=actx.createGain();
      o2.frequency.value=freq*2.76; g2.gain.setValueAtTime(vol*0.25,t); g2.gain.exponentialRampToValueAtTime(0.0001,t+dur*0.5);
      o2.connect(g2).connect(actx.destination); o2.start(t); o2.stop(t+dur);
    }
  };
  FN.sfxGood = ()=>{ FN.tone(880,0.15,'triangle',0.2); setTimeout(()=>FN.tone(1320,0.2,'triangle',0.2),110); };
  FN.sfxBad  = ()=>FN.tone(160,0.25,'square',0.12);

  /* ---------- 過關 ---------- */
  FN.finishLevel = function(){
    FN.running=false;
    const coins=Store.addCoins(FN.reward);
    Store.markDone(FN.level);
    $('#reward').textContent=FN.reward; $('#coins').textContent=coins;
    // 整合用：若主遊戲用 iframe 載入本關，可監聽這個訊息
    try{ window.parent.postMessage({type:'LEVEL_COMPLETE', level:FN.level, reward:FN.reward},'*'); }catch(e){}
    FN.stopCamera();
    FN.sfxGood();
    FN.show('win');
  };

  /* ---------- 初始化 ---------- */
  FN.init = function(opt){
    FN.level=opt.level; FN.reward=opt.reward ?? 50;
    const rw=$('#reward'); if(rw) rw.textContent=FN.reward;
    $('#btn-sim').onclick=FN.arrive;
    $('#btn-start').onclick=async ()=>{
      FN.unlockAudio();
      await FN.startCamera();
      FN.show('ar');
      const go=()=>{ opt.onStart(); FN.running=true; };
      const scene=$('a-scene');
      scene.hasLoaded ? go() : scene.addEventListener('loaded', go, {once:true});
    };
    $('#btn-back').onclick=()=>{ location.href='../index.html'; };
    // 網址加 ?skipgps 可直接跳過 GPS（電腦測試用）
    if(/[?&]skipgps/.test(location.search)) FN.arrive(); else FN.startGPS(opt.checkpoint);
  };

  window.FN = FN;
})();
