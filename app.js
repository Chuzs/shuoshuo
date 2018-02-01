var express = require('express');
var app = express();
var router = require("./router/router.js");

var session = require("express-session");
var bodyParser = require('body-parser');
//使用session
app.use(session({
	secret:'keyboard',
	resave:false,
	saveUninitialized:true
}));

//模板引擎
app.set("view engine","ejs");
//静态页面
app.use(express.static("./public"));
app.use("/avatar",express.static("./avatar"));



//路由表
app.get("/",router.showIndex);				//显示首页
app.get("/regist",router.showRegist);
app.post("/doregist",router.doRegist);
app.get("/login",router.showLogin);
app.post("/dologin",router.doLogin);
app.get("/dologout",router.doLogout)
app.get("/setavatar",router.showSetavatar);
app.post("/dosetavatar",router.doSetavatar);
app.get("/cut",router.showcut);
app.get("/docut",router.docut);
app.post("/post",router.doPost);
app.get("/getAllShuoshuo",router.getAllShuoshuo);  //列出所有说说Ajax服务
app.get("/getuserinfo",router.getuserinfo);  //列出所有说说Ajax服务
app.get("/getshuoshuoamount",router.getshuoshuoamount);  //说说总数
app.get("/user/:user",router.showUser);
app.get("/post/:oid",router.showUser);
app.get("/userlist",router.showuserlist);
app.post("/doVote",router.doVote);
app.get("/getShuoshuoByUsername",router.getShuoshuoByUsername);
app.get("/getShuoshuoByPostId",router.getShuoshuoByPostId);
app.get("/deleteShuoshuoById:postId",router.deleteShuoshuoByPostId);

app.listen(3000);