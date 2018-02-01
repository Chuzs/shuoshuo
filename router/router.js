var formidable = require("formidable");
var db = require("../models/db.js");
var md5 = require("../models/md5.js");
var path = require("path");
var fs = require("fs");
var gm = require("gm");
var ObjectID = require('mongodb').ObjectID;

var bodyParser = require('body-parser');

exports.showIndex = function(req,res,next){
	//检索数据库，查找此人头像
	if (req.session.login == "1") {
		var username = req.session.username;
		var login = true;
	}else {
		var username = "";
		var login = false;
	}
	db.find("users",{username: username},function(err,result){
		if (result.length == 0) {
			var avatar = "moren.jpg";
		}else {
            var avatar = result[0].avatar;
            var _id = result[0]._id;
		}
		res.render("index",{
			"login": login,
			"username": username,
			"avatar": avatar,
            "active": "首页",
            "_id": _id
		});
	});
};
//注册页面

exports.showRegist = function(req,res,next){
	res.render("regist",{
        "login": req.session.login == "1" ? true : false,
        "username": req.session.login == "1" ? req.session.username : "",
        "active": "注册"
    });
};

//注册业务
exports.doRegist = function(req,res,next){
	//得到用户填写的东西
    var form = new formidable.IncomingForm();
    form.parse(req, function (err, fields, files) {
        //得到表单之后做的事情
        var username = fields.username;
        var password = fields.password;

        console.log(username,password);
        //查询数据库中是不是有这个人
        db.find("users", {"username": username}, function (err, result) {
            if (err) {
                res.send("-3"); //服务器错误
                return;
            }
            if (result.length != 0) {
                res.send("-1"); //被占用
                return;
            }
            //没有相同的人，就可以执行接下来的代码了：
            //设置md5加密
            password = md5(md5(password) + "考拉");

            //现在可以证明，用户名没有被占用
            db.insertOne("users", {
                "username": username,
                "password": password,
                "avatar": "moren.jpg"
            }, function (err, result) {
                if (err) {
                    res.send("-3"); //服务器错误
                    return;
                }
                req.session.login = "1";
                req.session.username = username;

                res.send("1"); //注册成功，写入session
            })
        });
    });
};

//登录页面

exports.showLogin = function(req, res, next){
    res.render("login",{
        "login": req.session.login == "1" ? true : false,
        "username": req.session.login == "1" ? req.session.username : "",
        "active": "登陆"
    })
};
//登录业务
exports.doLogin = function(req,res,next){
    var form = new formidable.IncomingForm();
    form.parse(req,function(err,fields,files){
        var username = fields.username;
        var password = fields.password;
        var jiamihou = md5(md5(password) + "考拉");

        db.find("users",{"username":username},function(err,result){
            if (err) {
                res.send("-5");
                return;
            }
            if (result.length == 0) {
                res.send("-1"); //用户名不存在
                return;
            }
            if (jiamihou = result[0].password) {
                req.session.login = "1";  
                req.session.username = username;
                res.send("1");   //登陆成功
                return;
            } else {
                res.send("-2");   //密码错误
                return;
            }

        });
    });
};
//退出登录
exports.doLogout = function(req,res,next){
    req.session.login = "-1";
    req.session.username = "";
    res.redirect("/login");
};

//设置头像页面，必须保证是登录状态
exports.showSetavatar = function(req,res,next){
    if (req.session.login != "1") {
        res.redirect("/login");
    }
    res.render("setavatar",{
        "login": true,
        "username": req.session.username || "小花花",
        "active": "修改头像"
    });
};
//设置头像
exports.doSetavatar = function(req,res,next){
     if (req.session.login != "1") {
        res.redirect("/login");
    }
    var form = new formidable.IncomingForm();
    form.uploadDir = path.normalize(__dirname + "/../avatar");

    form.parse(req,function(err,fields,files){
        console.log(files);
        var oldpath = files.touxiang.path;
        var newpath = path.normalize(__dirname + "/../avatar") + "/" +req.session.username + ".jpg";
        fs.rename(oldpath,newpath,function(err){
            if (err) {
                res.send("失败")
                return;
            }
            req.session.avatar = req.session.username + ".jpg";
            res.redirect("/cut");
        });
    });
};
//显示切图页面
exports.showcut = function(req,res,next){
    if (req.session.login != "1") {
        res.redirect("/login");
    }
    res.render("cut",{
        "login": true,
        "username": req.session.username || "小花花",
        avatar: req.session.avatar,
        active:"裁剪"
    });
};
//执行切图
exports.docut = function(req,res,next){
    if (req.session.login != "1") {
        res.redirect("/login");
    }
    //这个页面接收几个GET请求参数
    //w、h、x、y
    var filename = req.session.avatar;
    var w = req.query.w;
    var h = req.query.h;
    var x = req.query.x;
    var y = req.query.y;


     gm("./avatar/" + filename)
        .crop(w, h, x, y)
        .resize(100, 100, "!")
        .write("./avatar/" + filename, function (err) {
            if (err) {
                res.send("-1");
                return;
            }
            //更改数据库当前用户的avatar这个值
            db.updateMany("users", {"username": req.session.username}, {
                $set: {"avatar": req.session.avatar}
            }, function (err, results) {
                res.send("1");
            });
        });

};

//发表说说
exports.doPost = function(req,res,next){
    if (req.session.login != "1") {
        res.redirect("/login");
    }
    var username = req.session.username;
    var form = new formidable.IncomingForm();

    form.parse(req,function(err,fields,files){
        var content = fields.content;
        var author = fields.author;

        db.insertOne("posts",{
            "author": ObjectID(author),
            "username": username,
            "datetime": (new Date()).toLocaleDateString() + " " + (new Date()).toLocaleTimeString(),
            "content": content,
            "vote": 0,
            "devote": 0,
            "voted": {}
        },function(err,result){
            if (err) {
                res.send("3");
            }
            res.send("1");
        });
    });
};

//得到所有说说
exports.getAllShuoshuo = function(req,res,next){
    var page = req.query.page;
    db.find("posts",{},{"pageamount":6,"page":page,"sort":{"datetime":-1}},function(err,result){
        res.json(result);
    });
};

// 通过用户名得到某个说说
exports.getShuoshuoByUsername = function(req,res,next){
    var username = req.query.username;
    db.find("posts",{"username":username},function(err,result){
        if (err || result.length == 0) {
            res.json("");
            return;
        }
        var obj = {
            "voted":result[0].voted
        }
        res.json(obj);
    });
};

// 通过说说ID得到某个说说
exports.getShuoshuoByPostId = function(req,res,next){
    var postId = req.query.postId;
    db.find("posts",{_id: ObjectID(postId)},function(err,result){
        if (err || result.length == 0) {
            res.json("");
            return;
        }
        var obj = {
            "voted":result[0].voted
        }
        res.json(obj);
    });
};


exports.deleteShuoshuoByPostId = function(req,res,next){
    var postId = req.query._id;
    console.log(postId);
    db.deleteMany("posts",{_id:ObjectID(postId)},function(err,result){
        if(err){
            return;
        }
        res.send("1")
    });
};

exports.getuserinfo = function(req,res,next){
    var username = req.query.username;
    db.find("users",{"username":username},function(err,result){
        if (err || result.length == 0) {
            res.json("");
            return;
        }
        var obj = {
            "username":result[0].username,
            "avatar":result[0].avatar,
            "_id":result[0]._id
        }
        res.json(obj);
    });
};
//显示某一个用户的个人主页
exports.showUser = function(req,res,next){
    var user = req.params["user"];
    db.find("posts",{"username":user},function(err,result){
       db.find("users",{"username":user},function(err,result2){
           res.render("user",{
               "login": req.session.login == "1" ? true : false,
               "username": req.session.login == "1" ? req.session.username : "",
               "user" : user,
               "active" : "我的说说",
               "cirenshuoshuo" : result,
               "cirentouxiang" : result2[0].avatar
           });
       });
    });

}

//显示所有注册用户
exports.showuserlist = function(req,res,next){
    db.find("users",{},function(err,result){
        res.render("userlist",{
            "login": req.session.login == "1" ? true : false,
            "username": req.session.login == "1" ? req.session.username : "",
            "active" : "成员列表",
            "suoyouchengyuan" : result
        });
    });
};


//说说总数
exports.getshuoshuoamount = function(req,res,next){
    db.getAllCount("posts",function(count){
        res.send(count.toString());
    });
};

//点赞
exports.doVote = function(req,res,next){
    if (req.session.login !== "1") {
        res.send("2");
    }else {
        var form = new formidable.IncomingForm();
        form.parse(req,function(err,fields,files){
            var vote = fields.vote;
            var devote = fields.devote;
            var postId = fields.postId;
            var voted = JSON.parse(fields.voted);
            // console.log(JSON.parse(voted));
            db.updateMany("posts", {"_id": ObjectID(postId)}, {
                $set: {"vote": vote, "devote": devote, "voted": voted} 
            },function(err,result){
                if (err) {
                    res.send("3");
                }
                res.send("1");
            });

        });
        
        
        
    }
    
};