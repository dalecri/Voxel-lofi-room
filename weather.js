// Optional live weather. Only a toggle, last sky condition and successful-fetch
// time and a small forecast summary are persisted in lr.meta. Coordinates stay in memory.
(function(root) {
  const STATES=['clear','rain','storm','snow'],INTERVAL=30*60*1000;
  const WMO=Object.freeze(Object.fromEntries([
    ...[0,1,2,3,45,48].map(n=>[n,'clear']),
    ...[51,53,55,56,57,61,63,65,66,67,80,81,82].map(n=>[n,'rain']),
    ...[71,73,75,77,85,86].map(n=>[n,'snow']),
    ...[95,96,99].map(n=>[n,'storm']),
  ]));
  const condition=code=>WMO[code] || 'clear';
  const windFactor=speed=>Math.min(1,Math.max(0,Number(speed) || 0)/40); // km/h; 40 reaches the existing wind layer's full level.
  function rounded(position) {
    const {latitude,longitude}=position?.coords || {};
    if(!Number.isFinite(latitude)||!Number.isFinite(longitude)||Math.abs(latitude)>90||Math.abs(longitude)>180)throw Error('Location unavailable');
    return {latitude:Number(latitude.toFixed(1)),longitude:Number(longitude.toFixed(1))};
  }
  function forecastURL(coords) {
    const p=rounded({coords});
    return `https://api.open-meteo.com/v1/forecast?latitude=${p.latitude.toFixed(1)}&longitude=${p.longitude.toFixed(1)}&current=weathercode,wind_speed_10m,temperature_2m,precipitation&hourly=precipitation_probability&daily=weathercode,temperature_2m_max,temperature_2m_min&forecast_days=7&timeformat=unixtime&timezone=auto`;
  }
  function forecast(body){const d=body?.daily;if(!Array.isArray(d?.time))return [];return d.time.slice(0,7).flatMap((t,i)=>{const date=typeof t==='number'?new Date((t+(Number(body.utc_offset_seconds)||0))*1000).toISOString().slice(0,10):t,high=d.temperature_2m_max?.[i],low=d.temperature_2m_min?.[i],code=d.weathercode?.[i];return /^\d{4}-\d{2}-\d{2}$/.test(date)&&Number.isFinite(high)&&Number.isFinite(low)&&Number.isInteger(code)?[{date,high,low,condition:condition(code)}]:[];});}
  function details(body,time=Date.now()) {
    const c=body?.current || {},times=body?.hourly?.time || [],values=body?.hourly?.precipitation_probability || [];
    // Hourly timestamps are Unix seconds, so this also works across local DST.
    let index=-1;for(let i=0;i<times.length;i++)if(Number.isFinite(times[i])&&times[i]*1000<=time&&time<times[i]*1000+3600000)index=i;
    const probability=values[index],validProbability=Number.isFinite(probability)&&probability>=0&&probability<=100;
    return {temperature:Number.isFinite(c.temperature_2m)?c.temperature_2m:null,precipitation:Number.isFinite(c.precipitation)&&c.precipitation>=0?c.precipitation:null,interval:Number.isFinite(c.interval)&&c.interval>0?c.interval:900,
      probability:validProbability?Math.round(probability):null,probabilityAt:validProbability?times[index]*1000:null};
  }
  function intensity(data) {
    // Measured mm/hour drives density. Forecast probability is not rainfall.
    if(!Number.isFinite(data?.precipitation))return 1;
    const rate=data.precipitation*3600/(data.interval || 900);
    return Math.max(.2,Math.min(1.3,.2+rate*.15));
  }
  function create({meta,save,applyWeather,notice=()=>{},changed=()=>{},geolocation=root.navigator?.geolocation,fetchWeather=(...args)=>root.fetch(...args),now=()=>Date.now(),visible=()=>!root.document?.hidden}) {
    let position=null,wind=null,nextAt=0,pending=null,controller=null,generation=0;
    const enabled=()=>meta.liveWeather===true;
    function locate(){return new Promise((resolve,reject)=>{
      if(!geolocation?.getCurrentPosition){reject({code:2});return;}
      geolocation.getCurrentPosition(p=>{try{resolve(rounded(p));}catch(e){reject(e);}},reject,{enableHighAccuracy:false,timeout:15000,maximumAge:30*60*1000});
    });}
    function clearRequest(){generation++;controller?.abort();controller=null;pending=null;position=null;wind=null;nextAt=0;}
    function setEnabled(on) {
      clearRequest();meta.liveWeather=!!on;save();changed();
      return on?refresh(true):Promise.resolve(false);
    }
    function manual(apply=()=>{}){const wasLive=enabled();if(wasLive)setEnabled(false);apply();if(wasLive)notice("Live weather off — you're in charge of the sky now");return wasLive;}
    function refresh(force=false) {
      if(!enabled()||!visible())return Promise.resolve(false);
      if(pending)return pending;
      if(!force && now()<nextAt)return Promise.resolve(false);
      const token=generation;nextAt=now()+INTERVAL;
      // Defer work so pending is assigned before synchronous geolocation mocks settle.
      const task=Promise.resolve().then(async()=>{
        if(!position){
          try {const p=await locate();if(token!==generation||!enabled())return false;position=p;}
          catch(e){if(token===generation && enabled()){setEnabled(false);notice(e?.code===1?'Location denied — live weather stays off':'Location unavailable — live weather stays off');}return false;}
        }
        if(token!==generation||!enabled())return false;
        if(!visible()){nextAt=0;return false;}
        const abort=new AbortController();controller=abort;
        const timeout=setTimeout(()=>abort.abort(),15000);
        try {
          const response=await fetchWeather(forecastURL(position),{credentials:'omit',referrerPolicy:'no-referrer',cache:'no-store',signal:abort.signal});
          if(!response.ok)throw Error('Weather unavailable');
          const body=await response.json(),current=body?.current,code=current?.weathercode,speed=current?.wind_speed_10m;
          if(!Number.isInteger(code)||code<0||code>99||!Number.isFinite(speed)||speed<0)throw Error('Invalid weather');
          if(token!==generation||!enabled())return false;
          const sky=condition(code);meta.weatherDetails={...details(body,now()),forecast:forecast(body)};meta.weatherFetchedAt=now();applyWeather(sky,true);wind=speed;meta.weather=sky;save();changed();return true;
        }catch(e){return false;} // Keep the last good condition and retry next cycle.
        finally {clearTimeout(timeout);if(controller===abort)controller=null;}
      });
      pending=task;task.finally(()=>{if(pending===task)pending=null;});return task;
    }
    return {setEnabled,refresh,manual,soundWind:fallback=>enabled()&&wind!=null?windFactor(wind):fallback,get details(){return enabled()?meta.weatherDetails || null:null;},get intensity(){return enabled()?intensity(meta.weatherDetails):1;},get enabled(){return enabled();}};
  }
  const api={STATES,WMO,INTERVAL,condition,windFactor,rounded,forecastURL,forecast,details,intensity,create};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.LRWeather=api;
})(typeof window!=='undefined'?window:globalThis);
