var users = [];
// Optional. You will see this name in eg. 'ps' or 'top' command
process.title = 'dart-counter';



try {
var config = require('./public/config.json');
}
catch (e) {
var config ={};
config.port = '80';
config.ip = '127.0.0.1';
}


// Port where we'll run the websocket server
var webSocketsServerPort = config.port;

// websocket and http servers
const fs = require('fs');
var app = require('express')();
require('express-session')
app.set('port', process.env.PORT || webSocketsServerPort);
const http = require('http').Server(app);
const io = require('socket.io')(http);
const url = require('url');
const path = require('path');
var session = require('express-session')
var ip = require('ip');
console.log(ip.address());
var root = path.dirname(process.mainModule.filename); // In root will be absolute path to your application

config.ip = ip.address();
fs.writeFile(root + "/public/config.json", JSON.stringify(config), function(err) {
    if (err) {
        console.log(err);
    }
});
app.use(session({
    secret: '546fhfg',
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: true,
        expires: new Date(Date.now() + 360 * 24 * 60 * 60), //setting cookie to not expire on session end
        maxAge: 360 * 24 * 60 * 60,
        key: 'sid'
    }
}));

var users = require('./users.json');

function savegame(spiel)
{
        spiel.players.forEach(function(player) {
            delete player.last_darts;
            delete player.dart; 
        });
        delete spiel.activePlayer;   
        delete spiel.end; 
        fs.writeFile(root + "/games/"+spiel.date+".json", JSON.stringify(spiel), function(err) {
            if (err) {
                console.log(err);
            }
        });
};

class game {
    constructor() {
        var date = new Date();
        this.name = date.getDate() + '. ' + date.getMonth()+ '. ' + date.getHours() + 'h';
        this.date = date.getTime();
        this.players = [ ];
        this.activePlayer = 0;
        this.round = 0;
        this.end = 0;
    }
    addPlayer(name){
    var p = new player(name);
        this.players.push(p)
        io.sockets.emit('status',{game: this})
    }
    startGame(){
        if(this.players.length == 0)
        {
            io.sockets.emit('chat', { zeit: new Date(), text: "Not enough players to start" });
            return;
        }
        this.round = 1;
        this.activePlayer  = 1;
        io.sockets.emit('status',{game: this})
    }
    count(punkte){
        if(this.players.length == 0)
            return;
        this.players[this.activePlayer - 1].count(punkte);
        if(this.players[this.activePlayer - 1].score == 0)
         {
         spiel.end = 1;
         var sieger = this.players[this.activePlayer - 1].name;
         this.players.sort(compare_player_asc);

            for (var i = 0, len = this.players.length; i < len; i++) {
              if(this.players[i].name==sieger)
              {
                this.activePlayer = i+1;
              }
              }
         }
        io.sockets.emit('status',{game: this})
    }
    resetGame(){
        this.round = 1;
        this.activePlayer  = 1;
        this.players.forEach(function(player) {
          player.correct(301);
        });
        io.sockets.emit('status',{game: this})
    }
    nextPlayer(){

    var playerthis= this.players[this.activePlayer - 1];
    io.sockets.emit('darts',{dart: playerthis.dart, last_darts: playerthis.last_darts, score_sum: playerthis.score_sum, darts_thrown: playerthis.darts_thrown})
    if (playerthis.dart>0) {
    playerthis.darts_thrown+=3-playerthis.dart;
    }
        playerthis.next();
            this.activePlayer++;
            if (this.activePlayer > this.players.length)
            {
                this.activePlayer  = 1;
                this.round++;
                io.sockets.emit('chat', { zeit: new Date(), text: "Round" + this.round});
            }
            io.sockets.emit('status',{game: this})
    }
    
    correctScore(player_id, score){
        this.players[player_id-1].correct(score);
        io.sockets.emit('status',{game: this})
    }
}
class player {

    next(){
        this.dart = 0;
        this.last_darts ={};
        this.last_darts[1] = "-";
        this.last_darts[2] = "-";
        this.last_darts[3] = "-";
    }

    constructor(name) {
        this.name = name;
            this.score = 301;
        this.score_sum=0;
        this.darts_thrown = 0;
        this.dart = 0;
            this.last_darts ={};
            this.last_darts[1] = "-";
            this.last_darts[2] = "-";
            this.last_darts[3] = "-";
    }

    count(punkte){
        this.dart++;
    this.darts_thrown++;
    this.score_sum+=punkte;
        this.last_darts[this.dart]  = punkte;
        this.score -= this.last_darts[this.dart];

        if (this.score < 0){
                for (var i = 1; i <= 3; i++){
                  this.score+=parseInt(this.last_darts[i]) || 0;
                };
            this.dart = 3;
        };
        console.log("dart" + this.dart);
        io.sockets.emit('darts',{dart: this.dart, last_darts: this.last_darts, score_sum: this.score_sum, darts_thrown: this.darts_thrown})
                                     
        if (this.score == 0){
            console.log("End Game");
            io.sockets.emit('chat', { zeit: new Date(), text: this.name + " hat gewonnen" });
        return;
        }
        if (this.dart == 3){
            console.log("next");
            spiel.nextPlayer();
        }

    }

    correct(score){
    switch (score.charAt(0)) {
      case '+':
      score=parseInt(score.substring(1));
        if (!isNaN( score ))
        {
            this.score  += score;
            this.score_sum  += score;
        }
        break;
      case '-':
      score=parseInt(score.substring(1));
        if (!isNaN( score ))
        {
            this.score  -= score;
            this.score_sum  -= score;
        }
          break;
      default:
      score=parseInt(score);
        if (!isNaN( score ))
        {
            this.score  = score;
            this.score_sum  = score;
        }
    }

    }
}

    function compare_player_asc(a,b) {
      if (a.score < b.score)
        return -1;
      if (a.score > b.score)
        return 1;
      return 0;
    }
    function compare_player_desc(a,b) {
      if (a.score > b.score)
        return -1;
      if (a.score < b.score)
        return 1;
      return 0;
    }


var games = [];

var spiel = new game();

app.get('/*', function(req, res){

/*
    if(!users[req.session.name]){
        users[req.session.name]={login:false, name:"", socketid:""};
    }

    if(users[req.session.name]){
        if(users[req.session.name].login == true){
            //Authenticated AND Logged in
        }
        else{
            //authenticated but not logged in
        }
    }
    else{
        //not authenticated
    }
    */

  // parse URL
  const parsedUrl = url.parse(req.url);
  // extract URL path
  let pathname = `.${parsedUrl.pathname}`;
  pathname = root + "/public/" + pathname;
  // maps file extention to MIME types
  const mimeType = {
    '.ico': 'image/x-icon',
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.css': 'text/css',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.wav': 'audio/wav',
    '.mp3': 'audio/mpeg',
    '.svg': 'image/svg+xml',
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.eot': 'appliaction/vnd.ms-fontobject',
    '.ttf': 'aplication/font-sfnt',
    '.woff2': 'font/woff2',
        '.woff': 'font/woff',
  };
  fs.exists(pathname, function (exist) {
    if(!exist) {
      // if the file is not found, return 404
      res.statusCode = 404;
      res.end(`File ${pathname} not found!`);
      return;
    }
    // if is a directory, then look for index.html
    if (fs.statSync(pathname).isDirectory()) {
      pathname += '/index.html';
    }

      var usr_str="";
    if(pathname.includes("index.html"))
    {
        if (spiel.round > 0)
        {
            res.writeHead(302, {
              'Location': 'game.html'
            });
            res.end();
            return;
        }
            users.forEach(function(user) {
            if (user!=null)
              usr_str+='<tr><td><i class="material-icons" name="'+user.name+'">add</i></td><td>-</td><td>'+user.name+'</td><td><i class="material-icons" name="'+user.name+'">delete</i></td></tr>';
            });
    }
    if(pathname.includes("game.html"))
    {
        if (spiel.round == 0)
        {
            res.writeHead(302, {
              'Location': 'index.html'
            });
            res.end();
            return;
        }
    }
    // read file from file system
    fs.readFile(pathname, function(err, data){
      if(err){
        res.statusCode = 500;
        res.end(`Error getting the file: ${err}.`);
      } else {

        // based on the URL path, extract the file extention. e.g. .js, .doc, ...
        const ext = path.parse(pathname).ext;
if( mimeType[ext] == 'text/html')
{
        data = data.toString().replace("known_users",usr_str);
  }
//console.log(pathname +'     ' + mimeType[ext]);
        // if the file is found, set Content-type and send data
        res.setHeader('Content-type', mimeType[ext] || 'text/plain' );
        res.end(data);
      }
    });
  });
});

http.listen(webSocketsServerPort, function() {
    console.log((new Date().toUTCString()) + ":Server is listening on port " + webSocketsServerPort);
});

io.on('connection', function (socket) {
/*
    if(typeof users[req.session.name] =="undefined")
    {
        users[req.session.name] = {};
    }
    users[req.session.name].login = false;
    users[req.session.name].socketid = socket.id;

    socket.on('login', function(data){
        users[req.session.name] = true;
    });
*/
    // der Client ist verbunden
    socket.emit('chat', { zeit: new Date(), text: 'Du bist nun mit dem Server verbunden!' });
    console.log("Client Connected");

    if (spiel.round > 0)
    {
    console.log("send initial status");
    io.sockets.emit('status',{game: spiel})
    }

    socket.on('addplayer', function (data) {
        console.log("add player " + data.name);
        spiel.addPlayer(data.name);
    });

    socket.on('adduser', function (data) {
    if(data.name.length >1)
    {
        users.push({name: data.name});
        console.log("add user " + data.name);
        users.sort(function(a,b){
            return a.name.localeCompare(b.name);
        })
    fs.writeFile(
    root+'/users.json',
    JSON.stringify(users),
    function (err) {
        if (err) {
            console.error('Crap happens');
        }
    }
    );
    }
    });

    socket.on('deluser', function (data) {
        var key = null;
        for (var k in users){
          if (users[k].name == data.name){
            key = k;
            break;
          }
        }
        if (key != null)
          users.splice(key, 1);

        console.log("del user " + data.name);
        users.sort(function(a,b){
            return a.name.localeCompare(b.name);
        })
        fs.writeFile(
        root+'/users.json',
        JSON.stringify(users),
        function (err) {
            if (err) {
                console.error('Crap happens');
            }
        }
        );
    });

    socket.on('startgame', function () {
        console.log("startgame ");
        spiel.startGame();
        if(spiel.round ==1)
            io.sockets.emit('gamestarted')
    });

    socket.on('endgame', function () {
        savegame(spiel);
        console.log("endgame");
        spiel = new game();
        io.sockets.emit('status',{game: spiel})
    });
    socket.on('restartgame', function () {
        savegame(spiel);
        console.log("restartgame");
        var old_players = spiel.players;
        spiel.players.sort(compare_player_desc);
        spiel = new game();
        old_players.forEach(function(pld_player) {
              spiel.addPlayer(pld_player.name);
        });
        spiel.startGame();
        if(spiel.round ==1)
            io.sockets.emit('gamestarted')
    });

    socket.on('nextplayer', function () {
        console.log("nextplayer ");
        spiel.nextPlayer();
    });

    socket.on('score', function (data) {
        console.log("score " + data.punkte);
        spiel.count(data.punkte);
    });
    
    socket.on('correctScore', function (data) {
        console.log("correctScore " + data.player_id);
        spiel.correctScore(data.player_id,data.score);
    });

    socket.on('disconnect', function () {
        socket.emit('chat', { zeit: new Date(), text: "disconnect" });
        console.log("Client disconnect");
    });
    socket.on('close', function (data) {
        socket.emit('chat', { zeit: new Date(), text: "close" });
        console.log("Client close");
    });
});

process.on ('SIGINT', () => {
  console.log ('\nCTRL+C...');
  io.sockets.emit('chat', { zeit: new Date(), text: "Server is closing" });
  io.close();
  process.exit (0);
});
