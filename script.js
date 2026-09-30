document.addEventListener("DOMContentLoaded",()=>{
  document.querySelectorAll("#year").forEach(e=>e.textContent=new Date().getFullYear());
  const f=document.getElementById("contactForm");
  if(f)f.addEventListener("submit",e=>{e.preventDefault();const m=document.getElementById("formMsg");if(m)m.textContent="Thanks! This demo form is ready to connect to a backend.";f.reset()});

  const mapEl=document.getElementById("map");
  if(!mapEl || !window.L) return;

  const pakistanCenter=[30.3753,69.3451];
  const pakistanBounds=[[23.4,60.4],[37.4,77.9]];
  const cityFallback={karachi:[24.8607,67.0011],lahore:[31.5204,74.3587],islamabad:[33.6844,73.0479],rawalpindi:[33.5651,73.0169],peshawar:[34.0151,71.5249],quetta:[30.1798,66.9750],multan:[30.1575,71.5249],faisalabad:[31.4504,73.1350],hyderabad:[25.3960,68.3578],sialkot:[32.4945,74.5229],gujranwala:[32.1877,74.1945],sahiwal:[30.6682,73.1114],bahawalpur:[29.3956,71.6836],sukkur:[27.7244,68.8228],gwadar:[25.1264,62.3225],murree:[33.9070,73.3943],abbottabad:[34.1688,73.2215],mardan:[34.1989,72.0458],okara:[30.8103,73.4597],kasur:[31.1177,74.4467]};

  const map=L.map("map",{scrollWheelZoom:true,maxBounds:pakistanBounds,maxBoundsViscosity:.8,minZoom:5}).setView(pakistanCenter,5.2);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:"© OpenStreetMap contributors"}).addTo(map);
  map.fitBounds(pakistanBounds,{padding:[8,8]});

  let pickup=null,destination=null,pickupMarker=null,destinationMarker=null,routeLine=null,pickMode=null;
  const status=document.getElementById("mapStatus"),estimate=document.getElementById("estimate");
  const pickupInput=document.getElementById("pickup"),destinationInput=document.getElementById("destination");
  const setStatus=t=>{if(status)status.textContent=t};
  const label=(name,lat,lon)=>({name,lat,lon});

  function marker(point,type){
    const icon=L.divIcon({className:"safe-marker",html:`<div class="marker-pin ${type}"></div>`,iconSize:[24,32],iconAnchor:[12,30]});
    return L.marker([point.lat,point.lon],{icon}).addTo(map).bindPopup(`<b>${type==="pickup"?"Pickup":"Destination"}</b><br>${point.name}`);
  }
  function setPoint(point,type){
    if(type==="pickup"){pickup=point;if(pickupMarker)map.removeLayer(pickupMarker);pickupMarker=marker(point,"pickup");pickupInput.value=point.name}
    else{destination=point;if(destinationMarker)map.removeLayer(destinationMarker);destinationMarker=marker(point,"destination");destinationInput.value=point.name}
    map.panTo([point.lat,point.lon]);
  }
  function cityPoint(q){
    const clean=q.toLowerCase().replace(/[^a-z0-9 ]/g," ").replace(/\s+/g," ").trim();
    for(const [name,c] of Object.entries(cityFallback)) if(clean===name || clean.includes(name)) return label(name.replace(/\b\w/g,c=>c.toUpperCase())+", Pakistan",c[0],c[1]);
    return null;
  }
  async function geocode(q){
    const fallback=cityPoint(q);
    try{
      const u="https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=pk&q="+encodeURIComponent(q+", Pakistan");
      const r=await fetch(u,{headers:{Accept:"application/json"}});if(r.ok){const d=await r.json();if(d.length)return label(d[0].display_name,+d[0].lat,+d[0].lon)}
    }catch(e){}
    return fallback;
  }
  async function route(a,b){
    const u=`https://router.project-osrm.org/route/v1/driving/${a.lon},${a.lat};${b.lon},${b.lat}?overview=full&geometries=geojson`;
    const r=await fetch(u);if(!r.ok)throw Error("route");const d=await r.json();if(!d.routes?.length)throw Error("route");return d.routes[0];
  }
  function fare(km,type){const base={economy:180,comfort:280,xl:380}[type]||180;const per={economy:35,comfort:50,xl:70}[type]||35;return Math.round(base+km*per)}
  async function build(){
    const pText=pickupInput.value.trim(),dText=destinationInput.value.trim(),type=document.getElementById("rideType").value;
    if(!pText||!dText){alert("Please enter pickup and destination.");return}
    estimate.innerHTML="Finding locations and road route…";setStatus("Building your road route…");
    try{
      pickup=pickup&&pickupInput.value===pickup.name?pickup:await geocode(pText);
      destination=destination&&destinationInput.value===destination.name?destination:await geocode(dText);
      if(!pickup||!destination)throw Error("location");
      const r=await route(pickup,destination),km=r.distance/1000;
      if(pickupMarker)map.removeLayer(pickupMarker);if(destinationMarker)map.removeLayer(destinationMarker);if(routeLine)map.removeLayer(routeLine);
      pickupMarker=marker(pickup,"pickup");destinationMarker=marker(destination,"destination");
      routeLine=L.geoJSON(r.geometry,{style:{weight:5,opacity:.9}}).addTo(map);
      map.fitBounds(routeLine.getBounds(),{padding:[35,35]});
      estimate.innerHTML=`<b>Estimated fare: PKR ${fare(km,type).toLocaleString()}</b><span>${km.toFixed(1)} km road distance • ${pickup.name.split(",")[0]} → ${destination.name.split(",")[0]}</span>`;
      setStatus("Route ready ✓");
    }catch(e){console.error(e);estimate.innerHTML="<b>Route not found.</b><span>Try a Pakistan city/address or use the map pick buttons.</span>";setStatus("Could not build route. Please try again.")}
  }

  document.getElementById("estimateBtn")?.addEventListener("click",build);
  document.getElementById("pickPickupBtn")?.addEventListener("click",()=>{pickMode="pickup";setStatus("Click anywhere on the map to set pickup.")});
  document.getElementById("pickDestinationBtn")?.addEventListener("click",()=>{pickMode="destination";setStatus("Click anywhere on the map to set destination.")});
  map.on("click",e=>{if(!pickMode)return;const p=label(`Selected location (${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)})`,e.latlng.lat,e.latlng.lng);setPoint(p,pickMode);setStatus(pickMode==="pickup"?"Pickup selected. Now set destination.":"Destination selected. Click Show Route & Estimate Fare.");pickMode=null});
  document.getElementById("resetMapBtn")?.addEventListener("click",()=>{if(pickupMarker)map.removeLayer(pickupMarker);if(destinationMarker)map.removeLayer(destinationMarker);if(routeLine)map.removeLayer(routeLine);pickup=destination=pickupMarker=destinationMarker=routeLine=null;pickupInput.value="";destinationInput.value="";estimate.textContent="Enter two locations to calculate your route.";setStatus("Map ready — enter locations or pick points on the map.");map.fitBounds(pakistanBounds,{padding:[8,8]})});
  document.getElementById("myLocationBtn")?.addEventListener("click",()=>{if(!navigator.geolocation){alert("Location is not supported by this browser.");return}setStatus("Getting your current location…");navigator.geolocation.getCurrentPosition(async p=>{const point=label(`Current location (${p.coords.latitude.toFixed(4)}, ${p.coords.longitude.toFixed(4)})`,p.coords.latitude,p.coords.longitude);setPoint(point,"pickup");map.setView([point.lat,point.lon],15);try{const r=await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${point.lat}&lon=${point.lon}&zoom=18`);if(r.ok){const d=await r.json();if(d.display_name){pickup.name=d.display_name;pickupInput.value=d.display_name}}}catch(e){}setStatus("Current location selected as pickup.")},()=>{setStatus("Location permission was not granted.");alert("Please allow location access in your browser.")},{enableHighAccuracy:true,timeout:10000})});
  pickupInput.addEventListener("input",()=>{pickup=null});destinationInput.addEventListener("input",()=>{destination=null});
  document.getElementById("sosBtn")?.addEventListener("click",()=>alert("SOS demo: in a real service this should connect to an approved emergency workflow and trusted contacts. Call local emergency services directly when necessary."));
  setTimeout(()=>map.invalidateSize(),200);
});