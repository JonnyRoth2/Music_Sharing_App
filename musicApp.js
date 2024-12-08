const path = require('path');
const express= require('express');
// const bcrypt = require('bcrypt')
const app=express();
const bodyParser= require("body-parser");
require("dotenv").config({ path: path.resolve(__dirname, '.env') });
const { MongoClient, ServerApiVersion } = require('mongodb');
const portNumber = 5000;
const client_id=process.env.CLIENT_ID;
const client_secret=process.env.CLIENT_SECRET;
const databaseName= process.env.MONGO_DB_NAME;
const mongoCollection=process.env.MONGO_COLLECTION;
const uri = process.env.MONGO_CONNECTION_STRING;
const databaseAndCollection = {db: databaseName, collection:mongoCollection};
console.log(client_id);
console.log(client_secret);
let token;
let existsCheck;
app.set("views", path.resolve(__dirname, "templates"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended:false}));
app.listen(portNumber);
app.use(express.static(path.join(__dirname,'public')));
console.log(`Web server is running at http://localhost:${portNumber}`);
process.stdin.setEncoding("utf8");
const prompt = "Stop to shutdown the server: "
process.stdout.write(prompt);
process.stdin.on("readable", function () {const dataInput = process.stdin.read();
    const command = dataInput.trim();
    if(command.toLowerCase() === "stop"){
    	    process.stdout.write("Shutting down the server") 
            process.exit(0); 
    	      } 
    	    else{ 
          process.stdout.write(`Invalid command: ${command}\n`);
    	    } 
        }); 

async function getToken() {
 const response = await fetch(`https://accounts.spotify.com/api/token`, {
  method: 'POST',
  headers: {
   'Content-Type': 'application/x-www-form-urlencoded',
    'Authorization': 'Basic ' + (Buffer.from(client_id + ':' + client_secret).toString('base64')),
      },
     body: `grant_type=client_credentials`,
      });
        
       const body = await response.json();
      return body.access_token;
      }
async function applyToken(){
   token=await getToken();
  //  console.log(token);
}
applyToken();
app.get("/", (req, res) => res.render('index'));
app.get("/remove", (req, res)=> res.render('remove.ejs'));
// app.get("/signup", (req, res)=> res.render('signup.ejs'));
app.get("/addProfile", (req, res)=> res.render('addProfile.ejs', {error: ''}));
let usercheck=true;
app.post("/addProfile", async (req, res) => { 
  let {user,song1,song2,song3,key}=req.body;
  songs=[song1,song2,song3];
  let ids;
  await reviewConnectDB(user);
  console.log(usercheck)
  if(usercheck==false){
  ids=await getIDs(songs);
  let idstring='';
  ids.forEach(el=>{
    if(el.length!=0){
      idstring+=el+',';
    }
  });
  idstring=idstring.substring(0,idstring.length-1);
  let tracks;
  tracks=await makeProfile(idstring);
  console.log(tracks);
  await insertConnectDB(user,idstring,key);
  res.render("profile.ejs",{table: tracks});
}else{
  res.render('addProfile.ejs', {error: 'Username Already Exists'})
}
});

let entry;
app.post("/index", async (req,res) => {
  let {user} = req.body;
  await reviewConnectDB(user);
  if(existsCheck){
    console.log(entry)
    table=await makeProfile(entry.ID_String);
    console.log(entry)
    res.render("profile.ejs",{user: `<h1>${entry.Username}'s Profile</h1>`, table: table});
  }else{
    res.render("error.ejs");
  }
});
let removed;
app.post("/remove", async (req,res) =>{
  let {user,key}=req.body;
  await removeProfile(user,key);
  if(removed==1){
    res.render("removed.ejs");
  }else{
    res.render("removeError.ejs")
  }
});
async function getIDs(songs){
  let ids=['','',''];
  for(let i=0;i<3;i++){
    if(songs[i]!=undefined&&songs[i].length!=0){
    let res=await fetch(`https://api.spotify.com/v1/search?q=${songs[i]}&type=track&limit=1`,{
      headers: {
        'Authorization': 'Bearer ' + token
    }
    });
    let data=await res.json();
    ids[i]=(data.tracks.items[0].id);
  }
  }
  return ids;
}
async function makeProfile(idstring){
    console.log(idstring+'a');
    const response=await fetch(`https://api.spotify.com/v1/tracks?ids=${idstring}`,{
      headers: {
        'Authorization': 'Bearer ' + token
    }
    });
    const data=await response.json();
    console.log(data);
    // console.log(data.length);
    let result='<table border=1 style="background-color:off-white; display:inline-block"><tr><th>Cover Art</th><th>Song Title</th><th>Artist</th></tr>';
    for(let i=0;i<data.tracks.length;i++){
      console.log(data.tracks[i].artists[0].name);
      result+=`<tr><td><img src=${data.tracks[i].album.images[0].url} alt="" height=150 width=150></td><td>${data.tracks[i].name}</td><td>${data.tracks[i].artists[0].name}</td></tr>`;
    };
    result+="</table>";
    return result;
}
async function insertConnectDB(user,idstring,key){
  const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
  try {
      await client.connect();
      let applicant={Username: user, ID_String: idstring, Key: key}
      await insertUser(client, databaseAndCollection,applicant)
  } catch (e) {
      console.error(e);
  } finally {
      await client.close();
  }
}
async function insertUser(client, databaseAndCollection,user){
  const result= await client.db(databaseAndCollection.db).collection(databaseAndCollection.collection).insertOne(user);
  // console.log(`Application entry created with id ${result.insertedId}`);
}
async function reviewConnectDB(user){
  const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
  try {
      await client.connect();
      await lookUpOneEntry(client, databaseAndCollection, user);
  } catch (e) {
      console.error(e);
  } finally {
      await client.close();
  }
}
async function lookUpOneEntry(client, databaseAndCollection,user) {
  let filter = {Username: user};
  const cursor = await client.db(databaseAndCollection.db)
                      .collection(databaseAndCollection.collection)
                      .findOne(filter);

 if (cursor) {
  //    console.log(cursor.Name);
  usercheck=true;
  console.log(cursor);
  existsCheck=true;
  entry=cursor;
 } else {
    usercheck=false;
      existsCheck=false;
 }
}

async function removeProfile(name,key) {
  const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

  try {
      await client.connect();
      await deleteOne(client, databaseAndCollection, name,key);
  } catch (e) {
      console.error(e);
  } finally {
      await client.close();
  }
}

async function deleteOne(client, databaseAndCollection, name, key) {
  let filter = {Username: name, Key: key};

  const result = await client.db(databaseAndCollection.db)
                 .collection(databaseAndCollection.collection)
                 .deleteOne(filter);
  removed=result.deletedCount;
}
