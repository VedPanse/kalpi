import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { defaultProduct, validateProduct, applyChanges } from '../shared/product.js';
import { productModel, disposeObject } from '../src/geometry.js';
test('arbitrary asymmetric outline extrudes at declared physical size with holes', () => {
  const p = defaultProduct('freeform');
  p.dimensions = {width:.6,height:.4,depth:.03};
  p.shape.outlines = [{points:[[0,0],[1,0],[.8,.6],[.2,1],[0,.7]],holes:[[[.3,.2],[.5,.2],[.4,.4]]],color:'#889944'}];
  const model = productModel(p), size = new T.Box3().setFromObject(model).getSize(new T.Vector3());
  for (const [axis,value] of [['x',.6],['y',.4],['z',.03]]) assert.ok(Math.abs(size[axis]-value)<1e-6);
  assert.ok(model.children[0].geometry.index === null);
  disposeObject(model);
  const edited = applyChanges({...p,scale:{confirmed:true,source:'measured'}},[{field:'dimensions.depth',value:.06}]);
  assert.equal(edited.scale.confirmed,false);
  assert.throws(()=>validateProduct({...p,shape:{outlines:[{points:[[0,0],[2,1],[0,1]],holes:[],color:'#ffffff'}]}}));
});

test('general assemblies preserve declared bounds across rotated parts and hollow primitives',()=>{
  const p=defaultProduct('assembly');p.dimensions={width:.3,height:.5,depth:.2};
  p.shape.components=[
    {name:'Vessel',type:'cup',position:[0,0,0],size:[.7,1,.7],rotation:[0,0,0],color:'#ffffff',material:'ceramic'},
    {name:'Handle',type:'torus',position:[.4,0,0],size:[.5,.6,.12],rotation:[0,.3,0],color:'#ffffff',material:'ceramic'}
  ];
  const root=productModel(p),bounds=new T.Box3().setFromObject(root),size=bounds.getSize(new T.Vector3());
  for(const [axis,value] of [['x',.3],['y',.5],['z',.2]])assert.ok(Math.abs(size[axis]-value)<1e-6);
  assert.ok(Math.abs(bounds.min.y)<1e-6);assert.equal(root.children[1].name,'Handle');disposeObject(root);
  assert.throws(()=>validateProduct({...p,shape:{components:[{...p.shape.components[0],size:[-1,1,1]}]}}));
});

test('triangular bottle facets are non-coplanar cuts and preserve physical bounds',()=>{
  const p=defaultProduct('bottle');p.dimensions={width:.1,height:.12,depth:.1};
  p.shape.crossSection='triangular';p.shape.facets=12;p.shape.profile=[[0,.28],[.08,.6],[.22,.86],[.45,1],[.65,.94],[.82,.72],[.94,.35],[1,.28]];
  const root=productModel(p),g=root.children[0].geometry,n=g.attributes.normal;
  assert.equal(g.index,null);
  let different=false;for(let i=0;i<n.count-3;i+=6)if(new T.Vector3().fromBufferAttribute(n,i).distanceTo(new T.Vector3().fromBufferAttribute(n,i+3))>.01)different=true;
  assert.ok(different,'triangles must not just split flat quad faces');
  const size=new T.Box3().setFromObject(root).getSize(new T.Vector3());for(const [k,v] of [['x',.1],['y',.12],['z',.1]])assert.ok(Math.abs(size[k]-v)<1e-6);
  disposeObject(root);
});
