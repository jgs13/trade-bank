import { useEffect, useMemo, useState } from "react";
import {
  createUserWithEmailAndPassword, onAuthStateChanged, sendPasswordResetEmail,
  signInWithEmailAndPassword, signOut, updateProfile
} from "firebase/auth";
import {
  addDoc, collection, deleteDoc, doc, getDoc, onSnapshot, orderBy, query, setDoc
} from "firebase/firestore";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis
} from "recharts";
import {
  Activity, ArrowDownRight, ArrowUpRight, BarChart3, Download, LogOut,
  PlusCircle, ShieldCheck, Target, Trash2, TrendingDown, TrendingUp, Wallet, Eye, EyeOff
} from "lucide-react";
import { auth, db } from "./firebase";

const money = (value) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value || 0));
const dateToday = () => new Date().toLocaleDateString("en-CA");
const operationResult = (op, pointValue) => {
  const points = op.side === "compra" ? Number(op.exit) - Number(op.entry) : Number(op.entry) - Number(op.exit);
  return points * Number(op.contracts) * Number(pointValue);
};
const friendlyError = (error) => ({
  "auth/email-already-in-use": "Este e-mail já está cadastrado.",
  "auth/invalid-email": "E-mail inválido.",
  "auth/weak-password": "A senha precisa ter pelo menos 6 caracteres.",
  "auth/invalid-credential": "E-mail ou senha incorretos.",
  "auth/too-many-requests": "Muitas tentativas. Aguarde um pouco e tente novamente."
}[error.code] || error.message || "Ocorreu um erro. Tente novamente.");

function AuthScreen() {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(event) {
    event.preventDefault(); setMessage(""); setBusy(true);
    try {
      if (mode === "register") {
        const result = await createUserWithEmailAndPassword(auth, email.trim(), password);
        if (name.trim()) await updateProfile(result.user, { displayName: name.trim() });
      } else if (mode === "reset") {
        await sendPasswordResetEmail(auth, email.trim());
        setMessage("Enviamos um link de recuperação para seu e-mail.");
        return;
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
    } catch (error) { setMessage(friendlyError(error)); }
    finally { setBusy(false); }
  }
  return <main className="auth-wrap">
    <div className="auth-card">
      <div className="brand-mark"><Activity size={25}/></div>
      <p className="eyebrow">CONTROLE DE PERFORMANCE</p>
      <h1>Trade Bank <span>WIN</span></h1>
      <p className="muted">Sua banca de day trade organizada.</p>
      <div className="auth-tabs">
        <button className={mode === "login" ? "selected" : ""} onClick={() => {setMode("login");setMessage("");}}>Entrar</button>
        <button className={mode === "register" ? "selected" : ""} onClick={() => {setMode("register");setMessage("");}}>Criar conta</button>
      </div>
      <form onSubmit={submit} className="form-stack">
        {mode === "register" && <label>Nome<input value={name} onChange={e=>setName(e.target.value)} placeholder="Seu nome" required /></label>}
        <label>E-mail<input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="voce@email.com" required /></label>
        {mode !== "reset" && <label>Senha<div className="password-field"><input type={showPassword ? "text" : "password"} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Mínimo de 6 caracteres" minLength="6" required /><button type="button" className="password-toggle" onClick={()=>setShowPassword(v=>!v)} aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"} title={showPassword ? "Ocultar senha" : "Mostrar senha"}>{showPassword ? <EyeOff size={19}/> : <Eye size={19}/>}</button></div></label>}
        {message && <p className="notice">{message}</p>}
        <button className="primary-btn" disabled={busy}>{busy ? "Aguarde..." : mode === "register" ? "Criar minha conta" : mode === "reset" ? "Enviar recuperação" : "Entrar"}</button>
      </form>
      {mode === "login" && <button className="text-btn" onClick={()=>{setMode("reset");setMessage("");}}>Esqueci minha senha</button>}
      {mode === "reset" && <button className="text-btn" onClick={()=>{setMode("login");setMessage("");}}>Voltar ao login</button>}
      <p className="security-note"><ShieldCheck size={15}/> Seus dados são privados e vinculados à sua conta.</p>
    </div>
  </main>;
}

function StatCard({label,value,icon:Icon,tone="neutral",detail}) {
  return <div className="stat-card"><div className="stat-top"><span>{label}</span><span className={"stat-icon "+tone}><Icon size={18}/></span></div><strong>{value}</strong>{detail && <small>{detail}</small>}</div>;
}

export default function App() {
  const [user,setUser] = useState(undefined);
  const [ops,setOps] = useState([]);
  const [settings,setSettings] = useState({capital:1000, pointValue:0.2, dailyStop:200, dailyGoal:200});
  const [tab,setTab] = useState("painel");
  const [loading,setLoading] = useState(true);
  const [saving,setSaving] = useState(false);
  const [notice,setNotice] = useState("");
  const [form,setForm] = useState({date:dateToday(),side:"compra",contracts:1,entry:"",exit:"",notes:""});
  useEffect(()=>onAuthStateChanged(auth, current=>{setUser(current);setLoading(false);}),[]);
  useEffect(()=>{
    if (!user) {setOps([]);return;}
    const base=doc(db,"users",user.uid,"settings","main");
    getDoc(base).then(s=>{if(s.exists())setSettings(v=>({...v,...s.data()}));}).catch(e=>setNotice(friendlyError(e)));
    return onSnapshot(query(collection(db,"users",user.uid,"operations"),orderBy("date","desc")),snap=>{
      setOps(snap.docs.map(d=>({id:d.id,...d.data()})));
    },e=>setNotice(friendlyError(e)));
  },[user]);
  const sorted = useMemo(()=>[...ops].sort((a,b)=>a.date.localeCompare(b.date) || (a.createdAt||0)-(b.createdAt||0)),[ops]);
  const enriched = useMemo(()=>sorted.map(op=>({...op,result:operationResult(op,settings.pointValue)})),[sorted,settings.pointValue]);
  const total = enriched.reduce((sum,op)=>sum+op.result,0);
  const todayOps = enriched.filter(op=>op.date===dateToday());
  const todayResult = todayOps.reduce((sum,op)=>sum+op.result,0);
  const wins = enriched.filter(op=>op.result>0);
  const losses = enriched.filter(op=>op.result<0);
  const grossWins = wins.reduce((s,o)=>s+o.result,0);
  const grossLosses = Math.abs(losses.reduce((s,o)=>s+o.result,0));
  const payoff = losses.length ? (grossWins/wins.length)/(grossLosses/losses.length) : 0;
  const days = Object.values(enriched.reduce((acc,op)=>{acc[op.date]=(acc[op.date]||0)+op.result;return acc;},{}));
  const chartData = [{date:"Início",balance:Number(settings.capital)||0},...(()=>{let balance=Number(settings.capital)||0;return enriched.map(op=>{balance+=op.result;return {date:op.date.slice(5).split("-").reverse().join("/"),balance};});})()];
  const drawdown = useMemo(()=>{let peak=Number(settings.capital)||0,dd=0;for(const p of chartData){peak=Math.max(peak,p.balance);dd=Math.max(dd,peak-p.balance);}return dd;},[chartData,settings.capital]);
  const dailyStatus = Number(settings.dailyStop)>0 && todayResult<=-Number(settings.dailyStop) ? "Você atingiu seu stop diário." : Number(settings.dailyGoal)>0 && todayResult>=Number(settings.dailyGoal) ? "Você atingiu sua meta diária." : "";
  async function saveOperation(event) {
    event.preventDefault();setNotice("");
    if (!Number.isFinite(Number(form.entry)) || !Number.isFinite(Number(form.exit)) || Number(form.contracts)<1) {setNotice("Confira entrada, saída e quantidade de contratos.");return;}
    setSaving(true);
    try {
      await addDoc(collection(db,"users",user.uid,"operations"),{...form,contracts:Number(form.contracts),entry:Number(form.entry),exit:Number(form.exit),createdAt:Date.now()});
      setForm(v=>({...v,date:dateToday(),entry:"",exit:"",notes:""}));setNotice("Operação salva.");
    } catch(e){setNotice(friendlyError(e));}
    finally{setSaving(false);}
  }
  async function saveSettings(event) {
    event.preventDefault();setSaving(true);setNotice("");
    try {await setDoc(doc(db,"users",user.uid,"settings","main"),{capital:Number(settings.capital),pointValue:Number(settings.pointValue),dailyStop:Number(settings.dailyStop),dailyGoal:Number(settings.dailyGoal)},{merge:true});setNotice("Configurações salvas.");}
    catch(e){setNotice(friendlyError(e));} finally{setSaving(false);}
  }
  async function removeOperation(id) {
    if(!window.confirm("Excluir esta operação?"))return;
    try{await deleteDoc(doc(db,"users",user.uid,"operations",id));setNotice("Operação excluída.");}catch(e){setNotice(friendlyError(e));}
  }
  function exportCSV(){
    const rows=[["Data","Direção","Contratos","Entrada","Saída","Resultado pontos","Resultado R$","Observação"],...enriched.map(o=>[o.date,o.side,o.contracts,o.entry,o.exit,o.side==="compra"?o.exit-o.entry:o.entry-o.exit,o.result,o.notes||""])];
    const csv="\uFEFF"+rows.map(r=>r.map(v=>'"'+String(v??"").replaceAll('"','""')+'"').join(";")).join("\n");
    const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8;"}));const a=document.createElement("a");a.href=url;a.download="trade-bank-operacoes.csv";a.click();URL.revokeObjectURL(url);
  }
  if(loading)return <div className="loading-screen">Carregando Trade Bank...</div>;
  if(!user)return <AuthScreen/>;
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="sidebar-brand"><div className="brand-mark small"><Activity size={20}/></div><div><b>Trade Bank</b><small>WIN · B3</small></div></div>
      <nav>
        {[["painel",Wallet,"Painel"],["operacoes",PlusCircle,"Operações"],["estatisticas",BarChart3,"Estatísticas"],["config",Target,"Risco e banca"]].map(([id,Icon,label])=><button key={id} className={tab===id?"nav-active":""} onClick={()=>setTab(id)}><Icon size={18}/>{label}</button>)}
      </nav>
      <div className="sidebar-user"><span>{user.displayName||user.email}</span><button onClick={()=>signOut(auth)}><LogOut size={17}/> Sair</button></div>
    </aside>
    <main className="main-content">
      <header className="topbar"><div><p className="eyebrow">GESTÃO DE BANCA</p><h1>{tab==="painel"?"Visão geral":tab==="operacoes"?"Registrar operação":tab==="estatisticas"?"Estatísticas":"Risco e banca"}</h1></div><span className="user-pill">{user.email}</span></header>
      {notice && <div className="notice global-notice">{notice}<button onClick={()=>setNotice("")}>×</button></div>}
      {dailyStatus && <div className="risk-alert"><ShieldCheck size={18}/>{dailyStatus}</div>}
      {tab==="painel" && <>
        <section className="stats-grid">
          <StatCard label="Saldo da banca" value={money(Number(settings.capital)+total)} icon={Wallet} tone="blue" detail={"Capital inicial: "+money(settings.capital)}/>
          <StatCard label="Resultado de hoje" value={money(todayResult)} icon={todayResult>=0?TrendingUp:TrendingDown} tone={todayResult>=0?"green":"red"} detail={todayOps.length+" operações hoje"}/>
          <StatCard label="Resultado acumulado" value={money(total)} icon={Activity} tone={total>=0?"green":"red"}/>
          <StatCard label="Drawdown máximo" value={money(drawdown)} icon={ArrowDownRight} tone="red"/>
        </section>
        <section className="panel chart-panel"><div className="panel-heading"><div><h2>Curva de capital</h2><p>Saldo estimado após cada operação</p></div><span className="chart-tag">Banca</span></div>
          <div className="chart-area"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData}><defs><linearGradient id="balanceFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#38bdf8" stopOpacity={0.3}/><stop offset="100%" stopColor="#38bdf8" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="#243248" strokeDasharray="3 3"/><XAxis dataKey="date" stroke="#8190a7" tick={{fontSize:11}}/><YAxis stroke="#8190a7" tick={{fontSize:11}}/><Tooltip formatter={v=>money(v)}/><Area type="monotone" dataKey="balance" stroke="#38bdf8" fill="url(#balanceFill)" strokeWidth={2}/></AreaChart></ResponsiveContainer></div>
        </section>
        <section className="panel"><div className="panel-heading"><div><h2>Operações recentes</h2><p>Últimos lançamentos da sua conta</p></div><button className="secondary-btn" onClick={()=>setTab("operacoes")}>Nova operação</button></div><OperationsTable items={[...enriched].reverse().slice(0,5)} onDelete={removeOperation}/></section>
      </>}
      {tab==="operacoes" && <section className="panel form-panel"><div className="panel-heading"><div><h2>Nova operação WIN</h2><p>Informe os dados executados no mercado</p></div></div>
        <form className="trade-form" onSubmit={saveOperation}>
          <label>Data<input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} required/></label>
          <label>Tipo de operação<select value={form.side} onChange={e=>setForm({...form,side:e.target.value})}><option value="compra">Compra</option><option value="venda">Venda</option></select></label>
          <label>Contratos<input type="number" min="1" step="1" value={form.contracts} onChange={e=>setForm({...form,contracts:e.target.value})} required/></label>
          <label>Preço de entrada (pontos)<input type="number" step="0.5" value={form.entry} onChange={e=>setForm({...form,entry:e.target.value})} required/></label>
          <label>Preço de saída (pontos)<input type="number" step="0.5" value={form.exit} onChange={e=>setForm({...form,exit:e.target.value})} required/></label>
          <label className="wide">Observação<textarea rows="3" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Estratégia, motivo da entrada..."/></label>
          <div className="preview-result"><span>Resultado estimado</span><b className={(form.entry!==""&&form.exit!==""?(form.side==="compra"?Number(form.exit)-Number(form.entry):Number(form.entry)-Number(form.exit))*Number(form.contracts)*Number(settings.pointValue):0)>=0?"positive":"negative"}>{money(form.entry!==""&&form.exit!==""?(form.side==="compra"?Number(form.exit)-Number(form.entry):Number(form.entry)-Number(form.exit))*Number(form.contracts)*Number(settings.pointValue):0)}</b><small>Antes de taxas, emolumentos e corretagem</small></div>
          <button className="primary-btn wide" disabled={saving}>{saving?"Salvando...":"Salvar operação"}</button>
        </form>
      </section>}
      {tab==="estatisticas" && <><section className="stats-grid"><StatCard label="Taxa de acerto" value={(enriched.length?(wins.length/enriched.length)*100:0).toFixed(1)+"%"} icon={Target} tone="blue" detail={wins.length+" ganhos · "+losses.length+" perdas"}/><StatCard label="Payoff" value={payoff?payoff.toFixed(2)+"x":"—"} icon={Activity}/><StatCard label="Melhor dia" value={days.length?money(Math.max(...days)):money(0)} icon={ArrowUpRight} tone="green"/><StatCard label="Pior dia" value={days.length?money(Math.min(...days)):money(0)} icon={ArrowDownRight} tone="red"/></section><section className="panel"><div className="panel-heading"><div><h2>Desempenho</h2><p>Resumo de todas as operações registradas</p></div><button className="secondary-btn" onClick={exportCSV}><Download size={16}/> Exportar CSV</button></div><div className="stats-details"><div><span>Total de operações</span><b>{enriched.length}</b></div><div><span>Resultado positivo</span><b className="positive">{money(grossWins)}</b></div><div><span>Resultado negativo</span><b className="negative">{money(-grossLosses)}</b></div><div><span>Média por operação</span><b>{money(enriched.length?total/enriched.length:0)}</b></div></div></section></>}
      {tab==="config" && <section className="panel form-panel"><div className="panel-heading"><div><h2>Configurações financeiras</h2><p>Defina sua banca e limites de risco</p></div></div><form className="trade-form" onSubmit={saveSettings}><label>Capital inicial (R$)<input type="number" min="0" step="0.01" value={settings.capital} onChange={e=>setSettings({...settings,capital:e.target.value})}/></label><label>Valor por ponto/contrato (R$)<input type="number" min="0.01" step="0.01" value={settings.pointValue} onChange={e=>setSettings({...settings,pointValue:e.target.value})}/></label><label>Stop diário (R$)<input type="number" min="0" step="0.01" value={settings.dailyStop} onChange={e=>setSettings({...settings,dailyStop:e.target.value})}/></label><label>Meta diária (R$)<input type="number" min="0" step="0.01" value={settings.dailyGoal} onChange={e=>setSettings({...settings,dailyGoal:e.target.value})}/></label><p className="muted wide">No WIN, o valor padrão é R$ 0,20 por ponto por contrato. Resultado calculado antes dos custos operacionais.</p><button className="primary-btn wide" disabled={saving}>Salvar configurações</button></form></section>}
      <footer>Trade Bank WIN · Controle pessoal de operações · B3</footer>
    </main>
  </div>;
}

function OperationsTable({items,onDelete}) {
  if(!items.length)return <div className="empty-state">Nenhuma operação registrada ainda.</div>;
  return <div className="table-scroll"><table><thead><tr><th>Data</th><th>Tipo</th><th>Contratos</th><th>Entrada → saída</th><th>Resultado</th><th></th></tr></thead><tbody>{items.map(op=><tr key={op.id}><td>{op.date?.split("-").reverse().join("/")}</td><td><span className={"side-tag "+op.side}>{op.side}</span></td><td>{op.contracts}</td><td>{op.entry} → {op.exit}</td><td className={op.result>=0?"positive":"negative"}>{money(op.result)}</td><td><button className="icon-btn" title="Excluir operação" onClick={()=>onDelete(op.id)}><Trash2 size={16}/></button></td></tr>)}</tbody></table></div>;
}