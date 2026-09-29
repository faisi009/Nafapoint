const express=require("express"),session=require("express-session"),bcrypt=require("bcryptjs"),Database=require("better-sqlite3"),path=require("path");
const app=express(), db=new Database("nafapoint.db");
const PORT=process.env.PORT||3000;
app.use(express.json());
app.use(session({secret:process.env.SESSION_SECRET||"dev-only-change-me",resave:false,saveUninitialized:false,cookie:{httpOnly:true,sameSite:"lax"}}));
db.exec(`CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,email TEXT UNIQUE NOT NULL,password TEXT NOT NULL,role TEXT NOT NULL DEFAULT 'user',balance INTEGER NOT NULL DEFAULT 25000,invested INTEGER NOT NULL DEFAULT 0,profit INTEGER NOT NULL DEFAULT 0,created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS transactions(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER,type TEXT,amount INTEGER,status TEXT DEFAULT 'demo',created_at TEXT DEFAULT CURRENT_TIMESTAMP);`);

const adminEmail=process.env.ADMIN_EMAIL||"admin@example.com";
const adminPassword=process.env.ADMIN_PASSWORD||"change-this-admin-password";
if(!db.prepare("SELECT id FROM users WHERE email=?").get(adminEmail)){
  db.prepare("INSERT INTO users(name,email,password,role) VALUES(?,?,?,?)").run("NafaPoint Admin",adminEmail,bcrypt.hashSync(adminPassword,10),"admin");
}
app.use(express.static(path.join(__dirname,"public")));

function user(req,res,next){const u=req.session.user;if(!u)return res.status(401).json({error:"Login required"});req.user=db.prepare("SELECT * FROM users WHERE id=?").get(u.id);next()}
function admin(req,res,next){if(!req.user||req.user.role!=="admin")return res.status(403).json({error:"Admin only"});next()}

app.post("/api/signup",(req,res)=>{
 const {name,email,password}=req.body||{};
 if(!name||!email||!password||password.length<6)return res.status(400).json({error:"Name, email and password (6+ chars) are required"});
 if(db.prepare("SELECT id FROM users WHERE email=?").get(email.toLowerCase()))return res.status(409).json({error:"Email already registered"});
 const hash=bcrypt.hashSync(password,10);
 const info=db.prepare("INSERT INTO users(name,email,password) VALUES(?,?,?)").run(name,email.toLowerCase(),hash);
 req.session.user={id:info.lastInsertRowid}; res.json({ok:true});
});
app.post("/api/login",(req,res)=>{
 const u=db.prepare("SELECT * FROM users WHERE email=?").get((req.body.email||"").toLowerCase());
 if(!u||!bcrypt.compareSync(req.body.password||"",u.password))return res.status(401).json({error:"Invalid email or password"});
 req.session.user={id:u.id};res.json({ok:true,role:u.role});
});
app.post("/api/logout",(req,res)=>req.session.destroy(()=>res.json({ok:true})));

app.get("/api/me",user,(req,res)=>res.json({id:req.user.id,name:req.user.name,email:req.user.email,role:req.user.role,balance:req.user.balance,invested:req.user.invested,profit:req.user.profit}));

app.get("/api/transactions",user,(req,res)=>{
 res.json(db.prepare("SELECT type,amount,status,created_at FROM transactions WHERE user_id=? ORDER BY id DESC").all(req.user.id));
});

/* Virtual/demo operations only. No real payment processing exists. */
app.post("/api/invest",user,(req,res)=>{
 const amount=Number(req.body.amount);
 if(!Number.isInteger(amount)||amount<1000||amount>req.user.balance)return res.status(400).json({error:"Invalid virtual amount"});
 const daily=Math.floor(amount/1000)*10;
 db.prepare("UPDATE users SET balance=balance-?,invested=invested+?,profit=profit+? WHERE id=?").run(amount,amount,daily,req.user.id);
 db.prepare("INSERT INTO transactions(user_id,type,amount) VALUES(?,?,?)").run(req.user.id,"Virtual Investment",amount);
 res.json({ok:true,daily});
});
app.post("/api/demo-deposit",user,(req,res)=>{
 const amount=Number(req.body.amount); if(!Number.isInteger(amount)||amount<=0)return res.status(400).json({error:"Invalid amount"});
 db.prepare("UPDATE users SET balance=balance+? WHERE id=?").run(amount,req.user.id);
 db.prepare("INSERT INTO transactions(user_id,type,amount) VALUES(?,?,?)").run(req.user.id,"Demo Deposit",amount);
 res.json({ok:true});
});
app.post("/api/demo-withdraw",user,(req,res)=>{
 const amount=Number(req.body.amount); if(!Number.isInteger(amount)||amount<=0||amount>req.user.balance)return res.status(400).json({error:"Invalid virtual amount"});
 db.prepare("UPDATE users SET balance=balance-? WHERE id=?").run(amount,req.user.id);
 db.prepare("INSERT INTO transactions(user_id,type,amount) VALUES(?,?,?)").run(req.user.id,"Demo Withdrawal",amount);
 res.json({ok:true});
});

app.get("/api/admin/users",user,admin,(req,res)=>res.json(db.prepare("SELECT id,name,email,role,balance,invested,profit,created_at FROM users ORDER BY id DESC").all()));
app.get("/api/admin/transactions",user,admin,(req,res)=>res.json(db.prepare("SELECT t.*,u.name,u.email FROM transactions t JOIN users u ON u.id=t.user_id ORDER BY t.id DESC").all()));

app.listen(PORT,()=>console.log(`NafaPoint running on port ${PORT}`));