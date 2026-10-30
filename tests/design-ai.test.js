import test from "node:test";
import assert from "node:assert/strict";
import { proposeEdit } from "../providers/design-ai.js";
import { defaultProduct } from "../shared/product.js";
test("OpenAI typed edits validate the complete draft; unsupported facts never execute", async (t) => {
  const previous = {
    fetch: global.fetch,
    provider: process.env.AI_PROVIDER,
    key: process.env.OPENAI_API_KEY,
  };
  process.env.AI_PROVIDER = "openai";
  process.env.OPENAI_API_KEY = "test-only";
  try {
    const document = defaultProduct("bottle");
    let body;
    global.fetch = async (url, options) => {
      assert.equal(url, "https://api.openai.com/v1/responses");
      body = JSON.parse(options.body);
      return Response.json({
        output: [
          {
            type: "function_call",
            name: "edit_product",
            arguments: JSON.stringify({
              explanation: "Faceted glass",
              changes: [
                { field: "shape.crossSection", valueJson: '"faceted"' },
                { field: "material.type", valueJson: '"glass"' },
              ],
            }),
          },
        ],
      });
    };
    const result = await proposeEdit({
      prompt: "Make this chiseled glass",
      document,
      selectedPart: "Body",
    });
    assert.equal(result.changes[0].value, "faceted");
    assert.equal(body.store, false);
    assert.equal(body.tools[0].strict, true);
    assert.equal(document.shape.crossSection, "circle");
    global.fetch = async () =>
      Response.json({
        output: [
          {
            type: "function_call",
            name: "edit_product",
            arguments: JSON.stringify({
              explanation: "Invalid",
              changes: [{ field: "facts.price", valueJson: "65" }],
            }),
          },
        ],
      });
    await assert.rejects(
      () => proposeEdit({ prompt: "Set the price", document }),
      /facts.price|unsupported|cannot|not allowed/i,
    );
    global.fetch = async () =>
      Response.json({
        output: [
          {
            type: "message",
            content: [
              { type: "output_text", text: "Which part should change?" },
            ],
          },
        ],
      });
    assert.deepEqual(
      await proposeEdit({ prompt: "Make it better", document }),
      { clarification: "Which part should change?" },
    );
    global.fetch = async () =>
      Response.json({ error: { code: "insufficient_quota" } }, { status: 429 });
    await assert.rejects(
      () => proposeEdit({ prompt: "Glass", document }),
      /API credit/,
    );
  } finally {
    global.fetch = previous.fetch;
    for (const [key, value] of [
      ["AI_PROVIDER", previous.provider],
      ["OPENAI_API_KEY", previous.key],
    ])
      value === undefined
        ? delete process.env[key]
        : (process.env[key] = value);
  }
});

test('AI repairs invalid facet parameters once without asking the user',async()=>{
 const oldFetch=global.fetch,oldKey=process.env.OPENAI_API_KEY,oldProvider=process.env.AI_PROVIDER;
 process.env.OPENAI_API_KEY='test-only';process.env.AI_PROVIDER='openai';let count=0;
 try{global.fetch=async(url,options)=>{count++;const input=JSON.parse(options.body);assert.match(input.instructions,/do not ask for optional/i);if(count===2)assert.match(JSON.stringify(input.input),/validationFeedback/);return Response.json({output:[{type:'function_call',name:'edit_product',arguments:JSON.stringify({explanation:'Rounded triangular glass',changes:[{field:'shape.crossSection',valueJson:'"triangular"'},{field:'shape.facets',valueJson:count===1?'3':'12'}]})}]});};
 const result=await proposeEdit({prompt:'spherical bottle with triangular cuts',document:defaultProduct('bottle')});assert.equal(count,2);assert.equal(result.changes[1].value,12);
 }finally{global.fetch=oldFetch;if(oldKey===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=oldKey;if(oldProvider===undefined)delete process.env.AI_PROVIDER;else process.env.AI_PROVIDER=oldProvider;}
});

test('imported mesh AI exposes only operations that actually change the model',async()=>{
 const {libraryProduct}=await import('../shared/library-product.js');const previous={fetch:global.fetch,provider:process.env.AI_PROVIDER,key:process.env.OPENAI_API_KEY};process.env.AI_PROVIDER='openai';process.env.OPENAI_API_KEY='test-only';
 try{global.fetch=async(url,o)=>{const body=JSON.parse(o.body),fields=body.tools[0].parameters.properties.changes.items.properties.field.enum;assert.equal(fields.some(f=>f.startsWith('shape.')),false);assert.ok(fields.includes('material.color'));assert.match(body.instructions,/primitive assembly instructions above DO NOT apply/);return Response.json({output:[{type:'function_call',name:'edit_product',arguments:JSON.stringify({explanation:'Changed the color',changes:[{field:'material.color',valueJson:'"#774499"'}]})}]});};const result=await proposeEdit({document:libraryProduct('perfume-parts'),prompt:'Make it violet'});assert.equal(result.changes[0].value,'#774499');}finally{global.fetch=previous.fetch;for(const [k,v] of [['AI_PROVIDER',previous.provider],['OPENAI_API_KEY',previous.key]])v===undefined?delete process.env[k]:process.env[k]=v;}
});

test('packaging review returns a validated proposal without mutating the draft',async()=>{
 const oldFetch=global.fetch,oldKey=process.env.OPENAI_API_KEY,oldProvider=process.env.AI_PROVIDER;
 process.env.OPENAI_API_KEY='test-only';process.env.AI_PROVIDER='openai';
 const document=defaultProduct('bottle'),before=JSON.stringify(document);
 try{global.fetch=async(url,options)=>{const request=JSON.parse(options.body);assert.match(request.instructions,/preview/);return Response.json({output:[{type:'function_call',name:'edit_product',arguments:JSON.stringify({explanation:'A broader label could improve shelf readability.',changes:[{field:'label.width',valueJson:'0.7'}]})}]});};
 const result=await proposeEdit({prompt:'Review my packaging',document,intent:'review'});assert.equal(JSON.stringify(document),before);assert.equal(result.changes[0].value,.7);
 }finally{global.fetch=oldFetch;if(oldKey===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=oldKey;if(oldProvider===undefined)delete process.env.AI_PROVIDER;else process.env.AI_PROVIDER=oldProvider;}
});

test('partial cap finishes preserve defaults and body overrides receive global color edits',async()=>{
 const oldFetch=global.fetch,oldKey=process.env.OPENAI_API_KEY,oldProvider=process.env.AI_PROVIDER;process.env.OPENAI_API_KEY='test-only';process.env.AI_PROVIDER='openai';
 const document=defaultProduct('bottle');document.parts.Body={...document.material,color:'#ff0000'};
 try{global.fetch=async()=>Response.json({output:[{type:'function_call',name:'edit_product',arguments:JSON.stringify({explanation:'Blue body, black cap',changes:[{field:'material.color',valueJson:'"#0000ff"'},{field:'parts.Cap',valueJson:'{"color":"#000000"}'}]})}]});const result=await proposeEdit({prompt:'Blue body and black cap',document});assert.equal(result.changes.find(c=>c.field==='parts.Body').value.color,'#0000ff');assert.equal(result.changes.find(c=>c.field==='parts.Cap').value.roughness,document.material.roughness);
 }finally{global.fetch=oldFetch;if(oldKey===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=oldKey;if(oldProvider===undefined)delete process.env.AI_PROVIDER;else process.env.AI_PROVIDER=oldProvider;}
});
