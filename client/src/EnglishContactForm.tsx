import { useState } from "react";
import { trpc } from "./lib/trpc";
export default function EnglishContactForm(){
 const [name,setName]=useState("");
 const [email,setEmail]=useState("");
 const [company,setCompany]=useState("");
 const [service,setService]=useState("");
 const [message,setMessage]=useState("");
 const [submitted,setSubmitted]=useState(false);
 const send=trpc.leads.create.useMutation({onSuccess:result=>{if(result.persisted)setSubmitted(true)},onError:()=>setSubmitted(false)});
 if(submitted)return <div className="en-contact-success" role="status"><h2>Thank you — your message has been received.</h2><p>We will get back to you using the email address you provided.</p></div>;
 return <form className="en-contact-form" onSubmit={e=>{e.preventDefault();send.mutate({name:name.trim(),email:email.trim(),company:company.trim(),service:service.trim(),message:message.trim()})}}>
  <label>Full name *<input required minLength={2} value={name} onChange={e=>setName(e.target.value)} autoComplete="name"/></label>
  <label>Email address *<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email"/></label>
  <label>Company<input value={company} onChange={e=>setCompany(e.target.value)} autoComplete="organization"/></label>
  <label>Service of interest<select value={service} onChange={e=>setService(e.target.value)}><option value="">Select a service</option><option value="strategy">Business strategy</option><option value="brand">Brand positioning</option><option value="growth">Growth & lead generation</option><option value="other">Other</option></select></label>
  <label>Tell us about your project *<textarea required minLength={8} rows={6} value={message} onChange={e=>setMessage(e.target.value)}/></label>
  {send.isError&&<p className="cms-error" role="alert">We could not save your message. Please email bussneis.owner@gmail.com instead.</p>}
  <button className="en-button" type="submit" disabled={send.isPending}>{send.isPending?"Sending…":"Send your message"}</button>
 </form>;
}
