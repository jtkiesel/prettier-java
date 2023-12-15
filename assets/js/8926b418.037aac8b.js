"use strict";(self.webpackChunkwebsite=self.webpackChunkwebsite||[]).push([[998],{9753:(e,t,n)=>{n.r(t),n.d(t,{default:()=>x});var a=n(5383),r=n(6359),s=n(8120),i=n(5533),l=n(7627),o=n(7294);const c={editor:"editor_P0MV"};var d=n(5893);function u(e){const[t,n]=(0,o.useState)(),u=(0,o.useRef)();return(0,o.useEffect)((()=>{const t=new i.tk({parent:u.current,extensions:[l.Xy,(0,r.C)(),i.$f.of([a.oc]),s.yy.readOnly.of(e.readOnly),i.tk.updateListener.of((t=>{t.docChanged&&e.onDocChange?.(t.state.doc.toString())}))]});return n(t),()=>t.destroy()}),[]),(0,o.useEffect)((()=>{t?.dispatch({changes:{from:0,to:t.state.doc.length,insert:e.doc??e.defaultDoc}})}),[t,e.doc]),(0,d.jsx)("div",{className:c.editor,ref:u})}var h=n(6040),p=n(9735),b=n.n(p),f=n(4935);const m={playground:"playground_i2w8",options:"options_XaF9",editors:"editors_PrJG"},g='public interface MyInterface {\n  String foo();\n  int[] bar();\n}\n\npublic abstract class Foo implements MyInterface {\n  @Override public String foo() {\n            // TODO: return an actual value here\n        return "hello";\n      }\n  @Override public int[] bar() {\n    return new int[] {  1,\n\n      2, 3,\n    };\n  }\n\n  public final static boolean baz(final String foo, final int bar, final boolean baz) {\n    return baz;\n  }\n}';function x(){const[e,t]=(0,o.useState)(80),[n,a]=(0,o.useState)(2),[r,s]=(0,o.useState)(!1),[i,l]=(0,o.useState)("all"),[c,p]=(0,o.useState)(!1),[x,j]=(0,o.useState)(g),[v,y]=(0,o.useState)("");return(0,o.useEffect)((()=>{f.ZP.format(x,{parser:"java",plugins:[b()],printWidth:e,tabWidth:n,useTabs:r,trailingComma:i,requirePragma:c}).then(y).catch((e=>y(e.message)))}),[e,n,r,i,c,x]),(0,d.jsx)(h.Z,{noFooter:!0,title:"Playground",children:(0,d.jsx)("main",{children:(0,d.jsxs)("div",{className:m.playground,children:[(0,d.jsxs)("div",{className:m.options,children:[(0,d.jsxs)("details",{open:!0,children:[(0,d.jsx)("summary",{children:"Global"}),(0,d.jsxs)("label",{title:"The line length that the printer will wrap on.",children:["--print-width"," ",(0,d.jsx)("input",{type:"number",min:0,value:e,onChange:e=>t(e.target.valueAsNumber)})]}),(0,d.jsxs)("label",{title:"The number of spaces per indentation-level.",children:["--tab-width"," ",(0,d.jsx)("input",{type:"number",min:0,value:n,onChange:e=>a(e.target.valueAsNumber)})]}),(0,d.jsxs)("label",{title:"Indent lines with tabs instead of spaces.",children:[(0,d.jsx)("input",{type:"checkbox",checked:r,onChange:e=>s(e.target.checked)})," ","--use-tabs"]})]}),(0,d.jsxs)("details",{open:!0,children:[(0,d.jsx)("summary",{children:"Java"}),(0,d.jsxs)("label",{title:"Print trailing commas wherever possible when multi-line.",children:["--trailing-comma"," ",(0,d.jsxs)("select",{disabled:!0,value:i,onChange:e=>l(e.target.value),children:[(0,d.jsx)("option",{children:"all"}),(0,d.jsx)("option",{children:"none"})]})]})]}),(0,d.jsxs)("details",{open:!0,children:[(0,d.jsx)("summary",{children:"Special"}),(0,d.jsxs)("label",{title:"Require either '@prettier' or '@format' to be present in the file's first docblock comment in order for it to be formatted.",children:[(0,d.jsx)("input",{type:"checkbox",checked:c,onChange:e=>p(e.target.checked)})," ","--require-pragma"]})]})]}),(0,d.jsxs)("div",{className:m.editors,children:[(0,d.jsx)(u,{defaultDoc:x,onDocChange:j}),(0,d.jsx)(u,{readOnly:!0,doc:v})]})]})})})}}}]);