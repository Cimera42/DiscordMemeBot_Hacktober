var request = require("request");

var api = "https://discordapp.com/api";

var fs = require("fs");

var bot_token = process.env.BOT;//fs.readFileSync("./bot_token.key").toString();
var imgur_token = process.env.IMGUR;//fs.readFileSync("./imgur_token.key").toString();
console.log(bot_token, imgur_token);


function sendMessage(messageContent, channel)
{
	var options = {
		url: api + "/channels/" + channel + "/messages",
		headers: {
			"Authorization": "Bot " + bot_token,
		},
		body: {
			"content": messageContent,
		},
		json:true
	};
	request.post(options, function(err,res,body) {
		if(err)
			return console.log(err);

		if(res.statusCode !== 200){
			console.log('Invalid Status Code Returned: ' + res.statusCode);
			return console.log(body);
		}

		console.log("Message created:", body);
	});
}

function sendImage(imageData, type, channel_id)
{
	var options = {
		url: api + "/channels/" + channel_id + "/messages",
		headers: {
			"Authorization": "Bot " + bot_token,
		},
		formData: {
			"file": {
				"value": imageData,
				"options": {
					"filename": "image." + type,
					"contentType": "image/" + type
				}
			}
		}
	};
	request.post(options, function(err,res,body) {
		if(err)
			return console.log(err);

		if(res.statusCode !== 200){
			console.log('Invalid Status Code Returned: ' + res.statusCode);
			return console.log(body);
		}

		console.log("Image sent:", body);
	});
}

var WebSocket = require("ws");
var gm = require('gm');

request.get(api + "/gateway", function(err,res,body) {
	
	var jsonBody = JSON.parse(body);
	var ws = new WebSocket(jsonBody.url);
	var heartbeatTimer;
	
	var channels = {};
	
	ws.on('open', function() {
		console.log("Connection opened");
		
		var j = JSON.stringify({
			"op": 2,
			"d": {
				"token": bot_token,
				"properties": {
					"$os": "linux",
					"$browser": "sometestingbrowser",
					"$device": "sometestingdevice",
					"$referrer": "",
					"$referring_domain": "",
				},
				"compress": false,
				"large_threshold": 250,
			}
		});
		ws.send(j);
	});
	
	ws.on('close', function(a,b) {
		console.log("Connection closed", a,b);
	});
	ws.on('message', function(message) {
		var parsed = JSON.parse(message);
		console.log(parsed.t);
		if(parsed.t == "READY")
		{
			heartbeatTimer = setInterval(function() {
				var heartbeatPackage = JSON.stringify({
					"op": 1,
					"d": null
				});
				ws.send(heartbeatPackage);
			}, parsed.d.heartbeat_interval);
			
			var j = JSON.stringify({
				"op": 3,
				"d": {
					"idle_since": null,
					"game": {
						"name": "Meme generation",
					}
				}
			});
			ws.send(j);
		}
		else if(parsed.t == "MESSAGE_CREATE")
		{
			var message = parsed.d;
			var prefix = "-";
			if(message.content == prefix + "help")
			{
				var commandList = "";
				commandList += "`here`: Tell the bot to watch for commands in this channel.";
				commandList += "\n\n`nohere`: Tell the bot to stop watching for commands in this channel.";
				sendMessage("Here you go <@" + message.author.id + ">\n" + commandList + "", message.channel_id);
			}
			else if(message.content == prefix + "here")
			{
				channels[message.channel_id] = true;
				sendMessage("Now doing things in this channel :stuck_out_tongue:", message.channel_id);
			}
			else if(message.content == prefix + "nohere")
			{
				channels[message.channel_id] = false;
				sendMessage("No longer doing things in this channel :sob:", message.channel_id);
			}
			else if(message.author.bot != true)
			{
				//if(channels[message.channel_id] == true)
				{
					if(message.content.startsWith(prefix + "meme"))
					{
						var args = message.content.replace(prefix + "meme ", "");
						sendMessage("<@" + message.author.id + "> generating a meme for you of *" + args + "*", message.channel_id);
						
						var options = {
							url: "https://api.imgur.com/3/memegen/defaults",
							headers: {
								"Authorization": "Client-ID " + imgur_token,
							},
						};
						
						request.get(options, function(err,res,body) {
							var parsed = JSON.parse(body);
							
							var backgroundImgNum = Math.floor(Math.random() * parsed.data.length);
							console.log(backgroundImgNum);
							
							request(parsed.data[backgroundImgNum].link + "", {encoding: null}, function(err,res,body) {
								var img = gm(body);
								console.log(body);
								var width = 0;
								var height = 0;
								img.size(function(err, value){
									width = value.width;
									height = value.height;
									
									var textImage = gm(1000,1000, "#000000");
									
									textImage.transparent("#000000")
										.fontSize(height/8)
										.font("Impact")
										.fill("#ffffff")
										.stroke("#000000")
										.strokeWidth(2)
										.drawText(0,0, args.toUpperCase(),"Center")
										.trim()
										.resize(width, null, ">")
										.write("./temp.png", function(err) {
											img.composite("./temp.png")
												.gravity("South")
												.geometry("+0+" + height/8);
												
											img.toBuffer("PNG", function(er, buffer) {
												sendImage(buffer, "png", message.channel_id);
											});
										});
								})
							});
						});
					}
				}
			}
		}
		//console.log(parsed);
	});
	ws.on('error', function(data, flags) {
		console.log("Error: ",data);
	});
});

/*var http = require('http');
var server = http.createServer(function(req, res) {
	res.write("Running Discord Bot");
	res.end();
});

server.listen(process.env.PORT, function(){
    console.log("Server started on ", process.env.PORT);
});*/
