
var new_connect;
var last_player=0;

$(document).ready(function() {
 console.log("get_cfg");
 $.getJSON("/config.json", cfg_loaded);

     var _originalSize = $(window).width() + $(window).height()
    $(window).resize(function() {
        if ($(window).width() + $(window).height() != _originalSize) {
            console.log("keyboard active");
            $(".footer").removeClass("fixed");
        } else {
            console.log("keyboard closed");
            $(".footer").addClass("fixed");
        }
    });

});



 function cfg_loaded(config) {
    console.log("loaded_cfg");
    console.log(config);
    // WebSocket
    var socket = io.connect('http://'+config.ip+':' + config.port, { 'connect timeout': 5000 });

  socket.on('error', function(err){
    if (err == 'Invalid namespace') {
      console.warn("Attempted to connect to invalid namespace");
      //handle the case here...
    } else {
      console.warn("Error on socket.io client", err);
    }
  });

    socket.on( 'darts', function (data) {
        if(data.dart>0){
        $('#playerscore'+last_player).find("td").find("div").eq(0).html( data.last_darts[1]);
        $('#playerscore'+last_player).find("td").find("div").eq(1).html( data.last_darts[2]);
        $('#playerscore'+last_player).find("td").find("div").eq(2).html( data.last_darts[3]); 
        console.log(data.score_sum +' / '+data.darts_thrown);
        $('#playerscore'+last_player).find("td").find("div").eq(3).html('Ø ' +  (data.score_sum/data.darts_thrown).toFixed(1));
        }
    } );


    socket.on( 'connect', function () {
        new_connect=true;
        console.log( 'connected to server' );
    } );

    // neue Nachricht
    socket.on('chat', function (data) {
        var zeit = new Date(data.zeit);
        $('#msg li:not(:last)').remove();
        $('#msg').append(
            $('<li></li>').append(
                // Uhrzeit
                $('<span>').text('[' +
                    (zeit.getHours() < 10 ? '0' + zeit.getHours() : zeit.getHours())
                    + ':' +
                    (zeit.getMinutes() < 10 ? '0' + zeit.getMinutes() : zeit.getMinutes())
                    + '] '
                ),
                // Name
                $('<b>').text(typeof(data.name) != 'undefined' ? data.name + ': ' : ''),
                // Text
                $('<span>').text(data.text))
        );
        $('#msg li').delay(5000).fadeOut(1000,function () {
    });
    });

    socket.on('status', function (data) {
    var i=0;
        data.game.players.forEach(function(player) {
            i++;
            if ( $('#player'+i).length ) {
                $('#player'+i).replaceWith('<tr id="player'+i+'" class="tr_'+i%2+'"><td>' + i +'</td><td>' + player.name +'</td><td>' + player.score +'</td><td class="edit_score"><i class="material-icons" name="'+player.name+'" player_id="'+i+'">edit</i></td></tr>');
            }else{
                $('#player tbody').append('<tr id="player'+i+'" class="tr_'+i%2+'"><td>' + i +'</td><td>' + player.name +'</td><td>' + player.score +'</td><td class="edit_score"><i class="material-icons" name="'+player.name+'" player_id="'+i+'">edit</i></td></tr>');
                $('#player tbody').append('<tr style=" border-top: 1px solid;min-height:1px;"><td></td><td style="padding:0px;"></td><td></td><td></td></tr>');
            }
        });
        $('#last').remove();
        $('#player tbody').append('<tr id="last" style="background:#FFFFFF;border:none;height:20vh;"><td></td><td></td><td></td></tr>');

        if(i==0)
        {
        $('#player tbody').empty();
        }

        if(data.game.round==0){
            $('#endgame').hide();
            $('#restartgame').hide();
            $('#nextplayer').hide();
            $('#score').hide();
            $("tr").removeClass("highlight");
        }
        if(data.game.round==1 || (new_connect && data.game.round>0 )){
            $('#endgame').hide();
            $('#restartgame').hide();
            $('#nextplayer').show();
            $('#score').show();
        }

        if(data.game.round>0 && last_player != data.game.activePlayer){
        $('#playerscore'+last_player).delay(5000).fadeOut(3000,function () {
          //  var pixel = $('#player'+last_player).offset().top - $('#player tbody').offset().top;
        //    $('#player tbody').animate({scrollTop:pixel}, 'slow');
    });

            last_player = data.game.activePlayer;
            player = data.game.players[last_player-1];
            console.log(player);
            var punkte_avg = (player.score_sum /player.darts_thrown).toFixed(1);
            if (isNaN(punkte_avg))
            punkte_avg= '';
            $('#player'+last_player).after('<tr id="playerscore'+last_player+'"><td class="playerscore tr_'+last_player%2+'"></td><td class="playerscore tr_'+last_player%2+'"><div class="punkte">-</div><div class="punkte">-</div><div class="punkte">-</div><div class="punkte_avg">Ø '+ punkte_avg +'</div></td><td class="playerscore tr_'+last_player%2+'"></td><td class="edit_score playerscore tr_'+last_player%2+'"></td></tr>');
            var pixel = $('#player'+last_player).offset().top - $('#player tbody').offset().top;
            $('#player tbody').animate({scrollTop:pixel}, 'slow');
        }
        $("tr").removeClass("highlight");
        $('#player'+data.game.activePlayer).addClass('highlight');
        $('#playerscore'+data.game.activePlayer).addClass('highlight');

        if(data.game.end ==1){
            $('#nextplayer').hide();
            $('#score').hide();
            $('#endgame').show();
            $('#restartgame').show();
            $("tr").removeClass("highlight");
            $('#player'+data.game.activePlayer).addClass('highlight');
            $('#playerscore'+data.game.activePlayer).fadeOut(3000);
        }


        new_connect=false;
    });


    function adduser(){
        // Eingabefelder auslesen
        var name = $('#name').val();
        // Socket senden
        socket.emit('adduser', { name: name});
            $('#player_list tbody').append('<tr id="player'+$('#player_list tr').length+'"><td><i class="material-icons">add</i></td><td>-</td><td>'+name+'</td><td><i class="material-icons" name="'+name+'">delete</i></td></tr>');
        // Text-Eingabe leeren
        $('#name').val('');
    }

    $('body').on('click', '.material-icons', function() {
        if($(this).html()=="delete"){
            socket.emit('deluser', { name: $(this).attr("name")});
            $(this).parent().parent().remove();
        }
        if($(this).html()=="add"){
            ++last_player;
            $(this).parent().parent().children('td').eq(1).html(last_player);
            socket.emit('addplayer', { name: $(this).attr("name")});
            $(this).hide();
        }
        if($(this).html()=="edit"){
            var score = prompt("Edit Score " + $(this).attr("name"), "");

            if (score == null || score == "") {
               // User cancelled the prompt
            } else {
                socket.emit('correctScore', { player_id: $(this).attr("player_id"), score: score});
            } 
        }
    });

    function startgame(){
        socket.emit('startgame');
    }

    socket.on( 'gamestarted', function () {
        window.location = 'game.html';
    } );

    function endgame(){
        socket.emit('endgame');
        window.location = 'index.html';
    }
    function restartgame(){
        socket.emit('restartgame');
    }
    function nextplayer(){
    if ( $('#number').val()>0) {
      score_1();
    }
    if( $('#number').val() == 0)
    {
        socket.emit('nextplayer');   
    }
        $('#number').val("");
        $('#number').focus();
    }
    function score(factor){
        var score = $('#number').val() * factor;
        $('#number').val("");
        $('#number').focus();
        console.log("score" + score * factor);
        socket.emit('score', { punkte: score});
    }
    function score_1(){
        score(1);
    }
    function score_2(){
        score(2);
    }
    function score_3(){
        score(3);
    }
    $('#restartgame').click(restartgame);
    $('#endgame').click(endgame);
    $('#score_1').click(score_1);
    $('#score_2').click(score_2);
    $('#score_3').click(score_3);
    $('#nextplayer').click(nextplayer);
    $('#startgame').click(startgame);
    $('#adduser').click(adduser);
    // oder mit der Enter-Taste
    $('#name').keypress(function (e) {
        if (e.which == 13) {
            adduser();
        }
    });
    $('#number').keypress(function (e) {
        if (e.which == 13) {
            score_1();
        }
    });


};
