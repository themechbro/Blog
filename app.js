

const dbUrl=process.env.DB_URL;
const express= require('express');
const mongoose= require('mongoose');
const path= require('path');
const ejsMate=require('ejs-mate');
const app= express();
const session= require('express-session');
const User= require('./models/user');
const Blog= require('./models/blog');
const methodOverride= require('method-override');
const flash= require('connect-flash');
const MongoStore = require('connect-mongo')(session);
const mongoSanitize= require('express-mongo-sanitize');


mongoose.connect('mongodb+srv://themechbro:jKE0L6XtkzzYe6dE@cluster0.dsbmioa.mongodb.net/blogger?retryWrites=true&w=majority', {
    useNewUrlParser:true, 
    useUnifiedTopology:true
}).then(()=>{
    console.log(" Mongo Connection open")
})
.catch(err=>{
console.log("Mongo Error");
console.log(err);
});

const passport= require('passport');
const LocalStrategy= require('passport-local');


app.engine('ejs', ejsMate);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname,'views'));
app.use(express.urlencoded({extended:true}));
app.use(methodOverride('_method'));
app.use(flash());
app.use(express.static(path.join(__dirname, 'public')));
app.use(mongoSanitize({
replaceWith: '_'
})); 


const store= new MongoStore({
url:'mongodb+srv://themechbro:jKE0L6XtkzzYe6dE@cluster0.dsbmioa.mongodb.net/blogger?retryWrites=true&w=majority',
secret:'thiscouldbeabettersecret',
touchAfter: 24*60*60
});

store.on('error', function(e){
console.log('SESSION STORE ERROR', e);
}) ;

const sessionConfig= {
store,
name:'Cookie1',
    secret: 'thiscouldbeabettersecret',
    resave:false,
    saveUninitialized:true,
    cookie:{
        expires:Date.now() + (1000*60*60*24*7),
        maxAge:1000*60*60*24*7,
        httpOnly: true,
}
}

app.use(session(sessionConfig));
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());
app.use((req, res, next)=>{
    res.locals.currentUser=req.user;// req.user is used to check whether user is logged in or not inorder to render logout button on navbar.ejs
    res.locals.success=req.flash('success');//req.flash is used to render flash .ejs in pages
    res.locals.error= req.flash('error');
    next();
})
//===========================================================================================================================================
//index page
app.get('/',(req, res)=>{
res.render('index');
})

//Register routes
app.get('/register',(req, res)=>{
if(req.user){
res.redirect('/home');
}else{
res.render('users/register');}
});
app.post('/register',async (req,res)=>{
try{
const {email, username, password}= req.body;
const user= new User({email, username});
const registerUser= await User.register(user, password);// this line of code is used to hash password using passport and not by using bcrypt.
req.login(registerUser, err =>{     //req.login is used to directly login to account after registration
    if(err) return next(err);
req.flash('success','Welcome to Blogger!');
res.redirect('/home');
})
}
catch(e){
        req.flash('error',e.message);
        res.redirect('register');
    }
})

//Login routes
app.get('/login',(req, res)=>{
if(req.user){ 
res.redirect('/home');
 } else{res.render('users/login');}
});
app.post('/login',passport.authenticate('local',{failureFlash:true, failureRedirect:'/login'}),(req,res)=>{
req.flash('success', `Welcome Back ${req.user.username}!`);
const redirectUrl= req.session.returnTo || '/home'; //req.session.returnTo is used to store the url that we tried to access without log in this is setup in middleware.js
    res.redirect(redirectUrl);
});


//Home route
app.get('/home',(req, res)=>{
if(req.user){
res.render('blog/home');
}
else{
res.redirect('/login');
}
});

app.post('/home', async(req, res)=>{
if(req.user){
const {title, body}= req.body;
const {user}= req.user;
const postBlog= new Blog({title,body});
postBlog.author=req.user.id;
await postBlog.save();
req.flash('success','Successfully posted your Blog')
res.redirect('/blogs');
}else{
res.redirect('/login');
}
});

//blog route
app.get('/blogs', async(req, res)=>{
if(req.user){
const blogsUpinserver= await Blog.find({}).populate('author');
res.render('blog/blogs', {blogsUpinserver});
}else{res.redirect('/login')}
});

//view route
app.get('/view/:id',async(req, res)=>{
if(req.user){
const {id}= req.params;
const foundBlog= await Blog.findById(id).populate('author');
res.render('blog/view',{foundBlog});
}else{
res.redirect('/login');
}
})

app.delete('/view/:id', async(req, res)=>{
if(req.user){
const{id}= req.params;
const foundBlog= await Blog.findByIdAndDelete(id);
res.redirect('/home');
}else{
res.redirect('/login');
}
});

//edit route
app.get('/:id/edit', async (req, res)=>{
const {id}= req.params;
const foundBlog= await Blog.findById(id);
res.render('blog/edit' ,{foundBlog});
})

//edit put route
app.put('/:id', async(req, res)=>{
const {id}= req.params;
const foundBlog= await Blog.findByIdAndUpdate(id, {...req.body});
foundBlog.save();
req.flash('success', 'Successfully updated the Blog ');
res.redirect(`/view/${id}`);
})




//Logout route
app.get('/logout',(req, res)=>{
req.logout();
 req.flash('success', 'Successfully logged you out');
res.redirect('/login');
}); 

app.listen(3000, (req, res)=>{
console.log('Server running on PORT 3000');
})