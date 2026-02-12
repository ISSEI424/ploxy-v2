const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");
const app = express();

app.use(express.static("public"));

app.use("/proxy", createProxyMiddleware({
 target:"https://example.com",
 changeOrigin:true
}));

app.listen(process.env.PORT || 3000,()=>{
 console.log("server running");
});
