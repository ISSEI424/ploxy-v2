const express = require("express");
const fetch = require("node-fetch");
const app = express();

app.use(express.static("public"));

app.get("/proxy", async (req,res)=>{
 const url=req.query.url;
 if(!url)return res.send("no url");

 let target=url;
 if(!target.startsWith("http")) target="https://"+target;

 try{
  const r=await fetch(target);
  const t=await r.text();
  res.send(t);
 }catch{
  res.send("error");
 }
});

app.listen(process.env.PORT || 3000,()=>{
 console.log("running");
});
