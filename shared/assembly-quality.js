// Conservative checks for assembled concepts. These run before a design is saved,
// never as a repair of an existing user's model. They do not infer unseen shape.
export function prepareAssembly(components, evidence = '') {
  const parts = structuredClone(components), adjustments = [];
  const aligned = p => p.rotation.every(v => Math.abs(v) < 1e-5);
  const box = p => ['box','roundedBox'].includes(p.type) && aligned(p);
  const volume = p => p.size.reduce((a,b)=>a*b,1);
  const shell = parts.filter(box).sort((a,b)=>volume(b)-volume(a))[0];
  if (!shell) return {parts,adjustments};
  const front = p => p.position[2]+p.size[2]/2;
  const overlap = (a,b) => [0,1].every(i => Math.abs(a.position[i]-b.position[i]) < (a.size[i]+b.size[i])/2);
  const panels=parts.filter(p=>p!==shell && box(p) && /grille|front.*panel|badge|plaque|label/i.test(p.name) && p.size[2]<shell.size[2]*.15 && p.position[2]>shell.position[2] && overlap(p,shell)).sort((a,b)=>b.size[0]*b.size[1]-a.size[0]*a.size[1]);
  const surfaces=[shell];
  for (const p of panels) {
    const supporting=surfaces.filter(s=>overlap(p,s));
    const required=Math.max(...supporting.map(front))+.003+p.size[2]/2;
    if(p.position[2]<required){
      const distance=required-p.position[2];
      if(distance>shell.size[2]*.12)throw Error(`The ${p.name} is buried inside the body. This reconstruction needs clearer front/side views; no design was saved.`);
      p.position[2]=required;
      adjustments.push(`Separated ${p.name} from supporting surfaces to prevent hidden or flickering geometry.`);
    }
    surfaces.push(p);
  }
  if(/(?:matte|unglazed)[\s\S]{0,60}(?:ceramic|terracotta)|(?:ceramic|terracotta)[\s\S]{0,60}(?:matte|unglazed)/i.test(evidence)) {
    for (const p of parts) if(p.material==='ceramic' && p.finish==='ceramic') {p.finish='powderCoat';adjustments.push(`Used a matte finish for ${p.name}, following the board annotation.`);}
  }
  return {parts,adjustments};
}
