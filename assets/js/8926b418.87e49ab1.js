"use strict";(self.webpackChunkwebsite=self.webpackChunkwebsite||[]).push([[998],{9753:(e,n,t)=>{t.r(n),t.d(n,{default:()=>m});var a=t(6359),s=t(8120),i=t(5533),r=t(1386),o=t(7294);const l={editor:"editor_P0MV"};var c=t(5893);function u(e){const[n,t]=(0,o.useState)(null),u=(0,o.useRef)(null);return(0,o.useEffect)((()=>{if(u.current)return t(new i.tk({parent:u.current,extensions:[r.Xy,(0,a.C)(),s.yy.readOnly.of(e.readOnly),s.yy.tabSize.of(e.tabSize),i.tk.updateListener.of((n=>{n.docChanged&&e.onDocChange?.(n.state.doc.toString())}))]})),()=>n?.destroy()}),[]),(0,o.useEffect)((()=>{n?.state.update({effects:s.Py.reconfigure.of(s.yy.tabSize.of(e.tabSize))})}),[n,e.tabSize]),(0,o.useEffect)((()=>{n?.dispatch({changes:{from:0,to:n.state.doc.length,insert:e.doc??e.defaultDoc}})}),[n,e.doc]),(0,c.jsx)("div",{className:l.editor,ref:u})}var d=t(6040),b=t(9735),p=t.n(b),f=t(4935);const h={playgroundContainer:"playgroundContainer_mnOu",optionsContainer:"optionsContainer_P6rR",options:"options_XaF9",subOptions:"subOptions_epG8",editors:"editors_PrJG"},g='public interface MyInterface {\n  String foo();\n  int[] bar();\n}\n\npublic abstract class Foo implements MyInterface {\n  @Override public String foo() {\n            // TODO: return an actual value here\n        return "hello";\n      }\n  @Override public int[] bar() {\n    return new int[] {  1,\n\n      2, 3,\n    };\n  }\n\n  public final static boolean baz(final String foo, final int bar, final boolean baz) {\n    return baz;\n  }\n}';function m(){const[e,n]=(0,o.useState)(80),[t,a]=(0,o.useState)(2),[s,i]=(0,o.useState)(!1),[r,l]=(0,o.useState)(g),[b,m]=(0,o.useState)("");return(0,o.useEffect)((()=>{f.ZP.format(r,{parser:"java",plugins:[p()],printWidth:e,tabWidth:t,useTabs:s}).then(m).catch((e=>m(e.message)))}),[e,t,s,r]),(0,c.jsx)(d.Z,{noFooter:!0,children:(0,c.jsx)("main",{children:(0,c.jsxs)("div",{className:h.playgroundContainer,children:[(0,c.jsx)("div",{className:h.optionsContainer,children:(0,c.jsx)("div",{className:h.options,children:(0,c.jsxs)("details",{className:h.subOptions,open:!0,children:[(0,c.jsx)("summary",{children:"Global"}),(0,c.jsxs)("label",{title:"The line length that the printer will wrap on.",children:["--print-width"," ",(0,c.jsx)("input",{type:"number",min:0,value:e,onChange:e=>n(e.target.valueAsNumber)})]}),(0,c.jsxs)("label",{title:"The number of spaces per indentation-level.",children:["--tab-width"," ",(0,c.jsx)("input",{type:"number",min:0,value:t,onChange:e=>a(e.target.valueAsNumber)})]}),(0,c.jsxs)("label",{title:"Indent lines with tabs instead of spaces.",children:[(0,c.jsx)("input",{type:"checkbox",checked:s,onChange:e=>i(e.target.checked)})," ","--use-tabs"]})]})})}),(0,c.jsxs)("div",{className:h.editors,children:[(0,c.jsx)(u,{defaultDoc:r,onDocChange:l}),(0,c.jsx)(u,{readOnly:!0,tabSize:t,doc:b})]})]})})})}}}]);