$(document).ready(function () {
    $('#loginModal').modal('show');
    document.getElementById("ozelSide").disabled = true;
    document.getElementById("grupEkleSide").disabled = true;
    document.getElementById("joinRoomSide").disabled = true;
    //Genel
    var socket = io.connect('http://localhost:8080');
    //Login
    var form = $("#formLogin");var $nickBox = $('#uname');var $nickForm = $("#formLogin");
    //Chat
    var $messageList = $('#messageList');var $messageForm = $('#goMessage');
    var $messageBox = $('#message');var $actives = $('#actives');
   
    // Doğrulma
    var kimlik=null; var oda= 'general';
    // Özel Mesaj için
    var $ozelForm = $('#formOzel');
    var $recipient_name = $('#recipient-name');
    var $message_text = $('#message-text');
    
    //Room için
    var roomform = $("#roomAddForm"); var $roomBox = $('#rname'); var $roomForm = $("#roomAddForm");
    var $joinBox = $('#jrname'); var joinForm = $("#joinForm");var $joinForm = $("#joinForm");

  //Login Boş nick girilirse
  $("#btnLogin").click(function(event) {
    //Fetch form to apply custom Bootstrap validation
    if (form[0].checkValidity() === false) {
        event.preventDefault();
        event.stopPropagation();
        $('#formBaslik').addClass('bg-warning');
    }
    form.addClass('was-validated');
  });

  //Group Boş girilirse
  $("#btnRoom").click(function(event) {
    //Fetch form to apply custom Bootstrap validation
    if (roomform[0].checkValidity() === false) {
        event.preventDefault();
        event.stopPropagation();
        $('#roomFormBaslik').addClass('bg-warning');
    }
    roomform.addClass('was-validated');
  });
  //Group Boş girilirse
  $("#btnJoinRoom").click(function(event) {
    //Fetch form to apply custom Bootstrap validation
    if (joinForm[0].checkValidity() === false) {
        event.preventDefault();
        event.stopPropagation();
        $('#roomFormJoinBaslik').addClass('bg-warning');
    }
    joinForm.addClass('was-validated');
  });

   $('#privateMessageDiv').on('show.bs.modal', function (event) {
     var button = $(event.relatedTarget) 
     var recipient = button.data('whatever')
     var modal = $(this)
     modal.find('.modal-title').text('New message to ' + recipient)
     modal.find('.modal-body input').val(recipient)
  })

    //Kullanıcıyı nodejs'e bildiriyoruz.Chat Giriş yapıyoruz.
    $nickForm.submit(function (e){
        e.preventDefault();
        kimlik=$nickBox.val();
        oda='general';
        socket.emit('init_user', $nickBox.val(), function (feedBack) {
        if (feedBack){
            $('#loginModal').modal('hide');
            $('#bolum1').show();
      }else {
            $('#formBaslik').addClass('bg-danger');
            $("#bilgilendirme").html('Bu nick kullanılıyor!');
        }
        });
        $nickBox.val('');
        document.getElementById("genelSide").disabled = true;
        document.getElementById("ozelSide").disabled = false;
        document.getElementById("grupEkleSide").disabled = false;
        document.getElementById("joinRoomSide").disabled = false;
        
    });
    //Kullanıcıya eski mesajlar bildirilir.
    socket.on('old_messages',function (data) {
        data.forEach(function (item){
            //p2p mesajlar kırmızı benim mesajlarım veya bana gelen mesajlar
            if(item.type == 'p2p' && (kimlik == item.nick || kimlik == item.room )){
                $messageList.append("<li style=\"text-align: right; \"class=\"list-group-item list-group-item-danger\">" + item.msg  + "<b> :" +  item.nick +"'den "+ item.room +" 'e" + "</b>" + "</li><hr/>");
            }
            //Mesajları ben yolladıysam ve grub mesajı ise sarı
            else if(kimlik == item.nick && item.room !=='general'){
                $messageList.append("<li style=\"text-align: right; \"class=\"list-group-item list-group-item-warning\">" + item.msg  + "<b> :" +  item.nick +"'den "+ "("+item.room +")"+" 'e" + "</b>" + "</li><hr/>");
            }
            else if(kimlik == item.nick)
                $messageList.append("<li style=\"text-align: right; \"class=\"list-group-item list-group-item-success\">" + item.msg  + "<b> :" +  item.nick + "</b>" + "</li><hr/>");
            else if(item.room=='general')  
                $messageList.append("<li class=\"list-group-item list-group-item-dark\"><b>" + item.nick + "</b> :" + item.msg + "</li><hr/>");
        });
        $(".messagesDiv").animate({ scrollTop: $("#messageList")[0].scrollHeight }, 1000);
    });

    // 1-Sunucuya bağlı tüm kullanıcılara mesaj gönderme
    // 3- Grub Mesaj
    $messageForm.submit(function (e) {
        e.preventDefault();
        if(oda=='general'){
            console.log(oda);
            socket.emit('new_message', $messageBox.val(),function (feedback) {
        //bu kısımda bir hata varsa rapor feedback alıcam
        });
        }
        else{
            var mesGroup=[oda, $messageBox.val(),kimlik];
            socket.emit('send_chat', mesGroup ,function (feedback){
            });
        }
            

    $messageBox.val('');
  });

    // 1-Sunucudan geri dönen mesaj(Sunucuya bağlı tüm kullanıcılar alır)
    socket.on('general_message', function (data){
        if(kimlik == data.nick)
            $messageList.append("<li style=\"text-align: right; \"class=\"list-group-item list-group-item-success\">" + data.msg  + "<b> :" +  data.nick + "</b>" + "</li><hr/>");
        else   
            $messageList.append("<li class=\"list-group-item list-group-item-dark\"><b>" + data.nick + "</b> :" + data.msg + "</li><hr/>");
        
        $(".messagesDiv").animate({ scrollTop: $("#messageList")[0].scrollHeight }, 1000);
    });





    // 2-Grup oluştur
    $roomForm.submit(function (e){
        e.preventDefault();
        oda=$roomBox.val();
        socket.emit('create_room', $roomBox.val(), function (feedBack) {
        if (feedBack){
            $('#roomModal').modal('hide');
            $('#bolum1').show();
            $("#roomName").html(oda);
            $('#roomName').removeClass('bg-info');
            $('#roomName').addClass('bg-danger');
      }else {
            $("#bilgilendirmeRoom").html('Bu oda zaten mevcut!');
            $('#roomFormBaslik').addClass('bg-danger');
        }
        });
        $roomBox.val('');
        document.getElementById("genelSide").disabled = true;
        document.getElementById("ozelSide").disabled = false;
        document.getElementById("grupEkleSide").disabled = false;
        
    });

    // 2-Grup gir
    $joinForm.submit(function (e){
        e.preventDefault();
        room=$joinBox.val();
        var data = [ room, kimlik];
        socket.emit('add_user', data);
        $joinBox.val('');
        document.getElementById("genelSide").disabled = true;
        document.getElementById("ozelSide").disabled = false;
        document.getElementById("grupEkleSide").disabled = false;
        document.getElementById("joinRoomSide").disabled = false;
    });

    function myFunction (e) {
        room=e;
        var data = [ room, kimlik];
        socket.emit('add_user', data);
        document.getElementById("genelSide").disabled = true;
        document.getElementById("ozelSide").disabled = false;
        document.getElementById("grupEkleSide").disabled = false;
        document.getElementById("joinRoomSide").disabled = false;
    }
    $( "#NodeSide" ).click(function() {
        myFunction('Node.js');
    });
    $( "#SocketSide" ).click(function() {
        myFunction('Socket');
    });
    $( "#MongoSide" ).click(function() {
        myFunction('Mongo');
    });

    //Kullanıcıya eski mesajlar bildirilir.
    socket.on('old_room_messages',function (data) {
       // $("li").remove(".list-group-item");
       $("#messageList").empty();
        data.forEach(function (item){
            if(kimlik == item.nick)
                $messageList.append("<li style=\"text-align: right; \"class=\"list-group-item list-group-item-danger\">" + item.msg  + "<b> :" +  item.nick + " ( "+item.room+" ) " + "</b>" + "</li><hr/>");
            else  
                $messageList.append("<li class=\"list-group-item list-group-item-warning\"><b>" + item.nick+" ( "+item.room+" ) " + "</b> :" + item.msg + "</li><hr/>");
        });
        $(".messagesDiv").animate({ scrollTop: $("#messageList")[0].scrollHeight }, 1000);
    });

    //Grub chat için serverdan gelen mesajları yakalar.
    socket.on('group_chat',function(data, feedback){
        console.log(data.nick);
        if(kimlik == data.nick)
            $messageList.append("<li style=\"text-align: right; \"class=\"list-group-item list-group-item-danger\">" + data.msg  + "<b> :" +  data.nick +" ( "+data.room+" ) " +  "</b>" + "</li><hr/>");
        else   
            $messageList.append("<li class=\"list-group-item list-group-item-warning\"><b>" + data.nick +" ( "+data.room+" ) " +  "</b> :" + data.msg + "</li><hr/>");
        
        $(".messagesDiv").animate({ scrollTop: $("#messageList")[0].scrollHeight }, 1000);
    });

    //Grub update et
    socket.on('update_chat', function (feedBack, data) {
        var user = {};
        console.log("room   "+ feedBack );//server
        var temp= feedBack;
        console.log("message"+ data );
        if (feedBack !== 'SERVER_FALSE'){
            oda=temp;
            $('#joinModal').modal('hide');
            $('#bolum1').show();
            $("#roomName").html(oda);
            $('#roomName').removeClass('bg-info');
            $('#roomName').addClass('bg-danger');
      }else{
            console.log("Room Yok");
            $("#bilgilendirmeJoinRoom").html('Bu oda yok İlk önce Oluşturun!');
            $('#roomFormJoinBaslik').addClass('bg-danger');
        }
        
    });

      socket.on('room_created', function (data) {
        console.log(data);
        console.log(data+" add_user");
        socket.emit('add_user', data);

      });


    // 3- Özel kullanıcıya mesaj atma
    $ozelForm.submit(function (e){
        e.preventDefault();
        console.log("ÖZEL MESAJ");
        var mes=[$recipient_name.val(), $message_text.val(),kimlik];
        socket.emit('new_private_message', mes, function (feedBack) {
            if(feedBack =="Same") {
                console.log("Same");
                $("#privateBilgilendirme").html('Kendineze özel mesaj gönderemezsiniz!');
            }
            else if (feedBack){
             console.log("Başarılı");
                $('#privateMessageDiv').modal('hide');
            }else{
                $("#privateBilgilendirme").html('Kişi Yok veya online değil!');
            }

        });
        $message_text.val('');
    });

    // 3- Özel Kullanıcının mesajı alması
    socket.on('private_message', function (data) {
        console.log("private message  "+ data);
        if(kimlik == data.room || kimlik == data.nick)
            $messageList.append("<li style=\"text-align: right; \"class=\"list-group-item list-group-item-danger\">" + data.msg  + "<b> :" +  data.nick +"'den "+ data.room +" 'e" + "</b>" + "</li><hr/>");

        $(".messagesDiv").animate({ scrollTop: $("#messageList")[0].scrollHeight }, 1000);
    });



    //1-3 Aktif kullanıcıların listesi doldurulur.
    socket.on('username', function (data) {
            var number=0;
            var html = '';
            data.forEach(function (item) {
                number++;
                if(item == kimlik)
                    html +="<li class= \"list-group-item list-group-item-success\">" + item + "</li>";
                else if(number%2 == 1)
                    html +="<li class= \"list-group-item list-group-item-dark\">" + item + "</li>";
                
                else
                     html +="<li class= \"list-group-item list-group-item-light\">" + item + "</li>";
            });
            $actives.html(html);
        });

    //1-3Liste yenilenir
    socket.on('user_disconnect', function (data) {
        console.log("userdisconnect");
        $messageList.append("<li style='color: brown'> user <b>" + data + "</b> disconnected </li>");
    })    
  

    





});



function openNav() {
    document.getElementById("mySidenav").style.width = "250px";
    document.getElementById("main").style.marginLeft = "250px";
    document.body.style.backgroundColor = "rgba(0,0,0,0.4)";
}

function closeNav() {
    document.getElementById("mySidenav").style.width = "0";
    document.getElementById("main").style.marginLeft= "0";
    document.body.style.backgroundColor = "white";
}
