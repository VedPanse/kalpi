// Drawing-driven vehicle assembly. The recognizer supplies silhouettes, not independent boxes.
export function vehicleComponents(v, color) {
  const parts=[];
  const part=(name,type,position,size,material,color,finish=null,rotation=[0,0,0])=>{const p={name,type,position,size,material,color,finish,rotation,sections:[]};parts.push(p);return p;};
  const interp=(profile,z,index)=>{let i=1;while(i<profile.length-1&&profile[i][0]<z)i++;const a=profile[i-1],b=profile[i],t=Math.max(0,Math.min(1,(z-a[0])/(b[0]-a[0])));return a[index]*(1-t)+b[index]*t;};
  function loft(name,sections,color,finish='lacquer') {
    const z0=sections[0][0],z1=sections.at(-1)[0],lo=Math.min(...sections.map(s=>s[1])),hi=Math.max(...sections.map(s=>s[3])),w=Math.max(...sections.map(s=>s[4]))*2;
    const p=part(name,'loft',[0,(lo+hi)/2-.5,(z0+z1)/2-.5],[w,hi-lo,z1-z0],'satin',color,finish);
    p.sections=sections.map(([z,b,s,t,x,r])=>[(z-z0)/(z1-z0),(b-lo)/(hi-lo),(s-lo)/(hi-lo),(t-lo)/(hi-lo),x/w,r/w]);return p;
  }
  const wheelRz=v.wheelRadius*v.dimensions.height/v.dimensions.depth*1.08;
  let stations=[...new Set([...v.bodyProfile.map(r=>r[0]),...v.wheelCenters.flatMap(z=>[-1,-.866,-.5,0,.5,.866,1].map(t=>Math.max(0,Math.min(1,z+t*wheelRz))))])].sort((a,b)=>a-b);
  if(stations.length>24)stations=Array.from({length:24},(_,i)=>stations[Math.round(i*(stations.length-1)/23)]);
  loft('Body',stations.map(z=>{
    let b=interp(v.bodyProfile,z,1),t=interp(v.bodyProfile,z,2),w=interp(v.bodyProfile,z,3);
    for(const axle of v.wheelCenters){const d=Math.abs(z-axle)/wheelRz;if(d<=1)b=Math.max(b,Math.min(t-.014,v.wheelRadius+v.wheelRadius*1.06*Math.sqrt(1-d*d)));}
    return [z,b,Math.max(b,t-.025),t,w,w*.96];
  }),color);
  const belt=z=>interp(v.bodyProfile,z,2), roof=v.roofProfile.map(([z,y,w])=>[z,Math.max(y,belt(z)+.012),w]);
  loft('Window glazing',roof.map(([z,y,w])=>[z,belt(z)+.003,Math.max(belt(z)+.005,y-.012),y,.43,w]),'#182e38');
  const peak=Math.max(...roof.map(r=>r[1])),plateau=roof.filter(r=>r[1]>=peak-.025);
  loft('Roof',(plateau.length>=2?plateau:roof.slice(1,-1)).map(([z,y,w])=>[z,y-.006,y-.002,y+.002,w,w*.99]),color);
  // Slim body-colored pillars and copper belt trim follow each side of the cabin.
  for(const sign of [-1,1]) {
    for(const [a,b,name] of [[roof[0],roof[1],'Rear pillar'],[roof.at(-2),roof.at(-1),'Front pillar']]) {
      const z=(a[0]+b[0])/2,y=(a[1]+b[1])/2,dy=b[1]-a[1],dz=b[0]-a[0];
      part(name,'box',[sign*(a[2]+b[2])/2,y-.5,z-.5],[.018,Math.hypot(dy,dz),.012],'satin',color,'lacquer',[Math.atan2(dz,dy),0,0]);
    }
    const step=Math.ceil((v.bodyProfile.length-1)/5);
    for(let i=step;i-step<v.bodyProfile.length-1;i+=step) {
      const a=v.bodyProfile[i-step],b=v.bodyProfile[Math.min(i,v.bodyProfile.length-1)],dy=b[2]-a[2],dz=b[0]-a[0];
      part('Copper beltline','box',[sign*((a[3]+b[3])/2+.002),(a[2]+b[2])/2-.52,(a[0]+b[0])/2-.5],[.005,Math.hypot(dy,dz),.006],'metal','#b48760','polishedMetal',[Math.atan2(dz,dy),0,0]);
    }
    const doorRear=roof[0][0]+.035,doorFront=roof.at(-1)[0]-.015,doorBottom=.18;
    for(const z of [doorRear,doorFront]){const h=belt(z)-doorBottom;part('Door seam','box',[sign*(interp(v.bodyProfile,z,3)+.003),(belt(z)+doorBottom)/2-.5,z-.5],[.003,h,.003],'satin','#11252b');}
    part('Door lower seam','box',[sign*(interp(v.bodyProfile,.5,3)+.003),doorBottom-.5,(doorRear+doorFront)/2-.5],[.003,.003,doorFront-doorRear],'satin','#11252b');
    part('Door handle','box',[sign*(interp(v.bodyProfile,doorRear+.04,3)+.006),belt(doorRear)-.565,doorRear-.46],[.006,.008,.045],'metal','#b9c6c3','polishedMetal');
    const z=(roof[1][0]+roof.at(-2)[0])/2,top=interp(roof,z,1),bottom=belt(z);
    part('Window pillar','box',[sign*.427,(top+bottom)/2-.5,z-.5],[.012,top-bottom,.018],'satin',color,'lacquer');
  }
  for(const z of v.wheelCenters)for(const sign of [-1,1]){
    const diameter=2*v.wheelRadius; // radius is a fraction of total physical height
    const sx=diameter,sz=diameter*v.dimensions.height/v.dimensions.depth;
    const x=sign*(.5-v.wheelWidth/2),y=v.wheelRadius-.5;
    part('Tire','cylinder',[x,y,z-.5],[sx,v.wheelWidth,sz],'satin','#15191a','powderCoat',[0,0,Math.PI/2]);
    part('Alloy rim','rim',[x+sign*v.wheelWidth*.51,y,z-.5],[sx*.79,.012,sz*.79],'metal','#a4b3b3','polishedMetal',[0,0,Math.PI/2]);
  }
  for(const sign of [-1,1]) {
    part('Headlight','box',[sign*v.bodyProfile.at(-1)[3]*.64,belt(1)-.52,.501],[v.bodyProfile.at(-1)[3]*.48,.022,.002],'ceramic','#e5ede3',null);
    part('Rear light','box',[sign*v.bodyProfile[0][3]*.64,belt(0)-.52,-.501],[v.bodyProfile[0][3]*.48,.022,.002],'satin','#b77a4d',null);
  }
  part('Front intake','box',[0,interp(v.bodyProfile,.99,1)-.46,.501],[.62,.06,.002],'satin','#111d20','powderCoat');
  return parts;
}
export function validateVehicle(v) {
  for(const [key,min,max] of [['bodyProfile',4,16],['roofProfile',4,12]]){
    const rows=v[key];if(!Array.isArray(rows)||rows.length<min||rows.length>max)throw Error('Invalid vehicle '+key);
    let last=-1;for(const row of rows){if(row.length!==(key==='bodyProfile'?4:3)||row.some(n=>!Number.isFinite(n)||n<0||n>1)||row[0]<=last)throw Error('Invalid vehicle silhouette');last=row[0];if(key==='bodyProfile'&&(row[1]>=row[2]||row[3]>.5||row[3]<.1))throw Error('Invalid vehicle body');if(key==='roofProfile'&&(row[2]>.45||row[2]<.15))throw Error('Invalid roof width');}
  }
  if(v.bodyProfile[0][0]!==0||v.bodyProfile.at(-1)[0]!==1)throw Error('Vehicle body must span its length');
  if(!Array.isArray(v.wheelCenters)||v.wheelCenters.length!==2||v.wheelCenters.some(n=>n<.05||n>.95)||v.wheelCenters[0]>=v.wheelCenters[1])throw Error('Invalid axle positions');
  if(!Number.isFinite(v.wheelRadius)||v.wheelRadius<.1||v.wheelRadius>.35||!Number.isFinite(v.wheelWidth)||v.wheelWidth<.04||v.wheelWidth>.18)throw Error('Invalid wheel dimensions');
  return v;
}
