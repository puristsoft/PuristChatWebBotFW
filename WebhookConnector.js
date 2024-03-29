"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Message_1 = require("../Message");
var utils = require("../utils");
var urlJoin = require("url-join"); 
var logger = require("../logger");
var request = require("request");

var readline = require("readline");
var async = require("async");
var WebhookConnector = (function () {
    function WebhookConnector(setting) {

        if(!setting || setting === {})
        throw new Error("PuristChat WebhookConnector Invalid Setting ");
        
        this.auth = {
            user:setting.user,
            pass:setting.password,
            operator:setting.operator,
            operator_password:setting.operator_password
        };
        this.replyCnt = 0;
        this.access_token='';
       // this.joined=true;
    }
    WebhookConnector.prototype.listen = function () {
        var _this = this;
        return function (req, res, next) {
                var requestData = '';
                req.on('data', function (chunk) {
                    requestData += chunk;
                });
                req.on('end', function () {
                    try {
                        req.body = JSON.parse(requestData);
                    }
                    catch (err) {
                        logger.error('WebhookConnector: receive - invalid request data received.');
                        res.send(400);
                        res.end();
                        return;
                    }
                 //   _this.verifyBotFramework(req, res, next || defaultNext);
                 console.log(req.body);
                    
                 if(req.body.event==='join') {
                        console.log("WebhookConnector:Listen()");
                        _this.PuristLogin(function(token) {
                               console.log('after login token: ' + token);
                            _this.access_token = token;
                            console('_this.access_token :' + _this.access_token);
                            var sayhi = 'Hello ' + req.body.end_customer_name;
                            //_this.processMessage(sayhi);

                        });
                       
                  }
                  else
                    _this.processMessage(req.body);
                });
            }
    };
    WebhookConnector.prototype.processMessage = function (PuristMsg) {
        if (this.onEventHandler) {
            
            // only for message events we should post message
            if(PuristMsg.event==='message') {
            
                var msg = new Message_1.Message()
                .address({
                channelId: 'PuristChat',
                user: { id: PuristMsg.end_customer_id, name: PuristMsg.end_customer_name },
                bot: { id: 'bot', name: 'PuristWebhook' },
                conversation: { id: PuristMsg.conversation_id }
            })
                .timestamp()
                .text(PuristMsg.body);
            this.onEventHandler([msg.toMessage()]);
          }
        }
        return this;
    };
    WebhookConnector.prototype.processEvent = function (event) {
        if (this.onEventHandler) {
            this.onEventHandler([event]);
        }
        return this;
    };
    WebhookConnector.prototype.onEvent = function (handler) {
        this.onEventHandler = handler;
    };
    WebhookConnector.prototype.onInvoke = function (handler) {
        this.onInvokeHandler = handler;
    };
    WebhookConnector.prototype.send = function (messages, done) {
        var _this = this;
        var addresses = [];
        async.forEachOfSeries(messages, function (msg, idx, cb) {
            try {
                if (msg.type == 'delay') {
                    setTimeout(cb, msg.value);
                }
                else if (msg.type == 'message') {
                    if (_this.replyCnt++ > 0) {
                        console.log();
                    }
                    if (msg.text) {
                        log(msg.text);
                    }
                    if (msg.attachments && msg.attachments.length > 0) {
                        for (var j = 0; j < msg.attachments.length; j++) {
                            if (j > 0) {
                                console.log();
                            }
                            renderAttachment(msg.attachments[j]);
                        }
                    }
                    var adr = utils.clone(msg.address);
                    adr.id = idx.toString();
                    //addresses.push(adr);
                   
                    _this.postMessage(msg, (idx == messages.length - 1), function (err, address) {
                        addresses.push(address);
                        cb(err);
                    });

                    cb(null);
                }
                else {
                    cb(null);
                }
            }
            catch (e) {
                cb(e);
            }
        }, function (err) { return done(err, !err ? addresses : null); });
    };

    WebhookConnector.prototype.postMessage = function (msg, lastMsg, cb, method) {
        // we need the local value access_token
        var _this = this;

        if (method === void 0) { method = 'POST'; }
        // EMRAN
        //logger.info(address, 'WebhookConnector: sending message.');
       // this.prepOutgoingMessage(msg);
        logger.info(msg, 'WebhookConnector: sending message.');
        var address = msg.address;
        msg['from'] = address.bot;
        msg['recipient'] = address.user;
        delete msg.address;
        if (msg.type === 'message' && !msg.inputHint) {
            msg.inputHint = lastMsg ? 'acceptingInput' : 'ignoringInput';
        }
        var path = '/v3/conversations/' + encodeURIComponent(address.conversation.id) + '/activities';
        if (address.id && address.channelId !== 'skype') {
            path += '/' + encodeURIComponent(address.id);
        }
        var sendAPI = 'http://api.puristchat.com/admin/v1/conversations/' + address.conversation.id + '/messages/';
        
        console.log(sendAPI);

        var options = {
            method: method,
            url: urlJoin(address.serviceUrl, path),
            body: msg,
            json: true
        };

        var token =  '92911d63f1795ee73d5fd4006d03bc77' ;
        var opt = {
            url:sendAPI,
            method: 'POST',               
            headers: {     
                'Content-Type': 'application/json',
                'Authorization':'Bearer ' +  token //_this.access_token
                //9436b193bc341735dcca642714aaa866'
            },  
            useQuerystring : true,
            json: true,
            sendImmediately:  false,      
            body:{ "body" : msg.text }
        };
  
            request(opt,function(error,httpResponse,retdata){
                 console.log('Request : ' + JSON.stringify(opt))   

                if (httpResponse.statusCode === 202) {
                  // this message has been queued for delivery on the Teams-side
                       if (cb) { return cb(null, {}); };
                
                    }

                });

    };
    WebhookConnector.prototype.startConversation = function (address, cb) {
        var adr = utils.clone(address);
        adr.conversation = { id: 'Convo1' };
        cb(null, adr);
    };
    WebhookConnector.prototype.PuristLogin = function (cb) {
        console.log('This.PuristLogin');
        var opt = {
            url:'http://api.puristchat.com/admin/v1/oauth/token',
            method: 'POST',            
            'auth': {
                'user': 'liev5eZvK9gXYk4n9PDu1I0JYZcJLrv', //_this.auth.user,
                'pass': '12341234',  //_this.auth.pass,
                'sendImmediately': true
            },   
            headers: {     
                'Content-Type': 'application/json'
         //       'Authorization':'Basic ' +  'IaiXaPQEEePKxAfo7fEsORe4AsnIo4Pr'
    
            }, 
            useQuerystring : true,
            json: true,
            sendImmediately:  false,      
            body:{
                "grant_type": "password",
                "username":_this.auth.operator,
                "password":_this.auth.operator_password,
                "client_id":"na"
            }
        };
    
            request(opt,function(error,httpResponse,retdata){
                 console.log('Request : ' + JSON.stringify(opt))   
                 if (error) {
                    console.error('post failed:', error);
                     cb(null);
                  }

                if (httpResponse.statusCode === 201) {
                  // this message has been queued for delivery on the Teams-side
                      //return retdata.access_token;
                     // this.access_token = retdata.access_token
                     console.log(retdata);

                      cb(retdata.access_token);
                
                    }
                    cb(null);
                    //this.access_token = retdata.access_token
                    //return {};
                });
       
    return this;
    };
    
    return WebhookConnector;
}());

exports.WebhookConnector = WebhookConnector;


function renderAttachment(a) {
    switch (a.contentType) {
        case 'application/vnd.microsoft.card.hero':
        case 'application/vnd.microsoft.card.thumbnail':
            var tc = a.content;
            if (tc.title) {
                if (tc.title.length <= 40) {
                    line('=', 60, tc.title);
                }
                else {
                    line('=', 60);
                    wrap(tc.title, 60, 3);
                }
            }
            if (tc.subtitle) {
                wrap(tc.subtitle, 60, 3);
            }
            if (tc.text) {
                wrap(tc.text, 60, 3);
            }
            renderImages(tc.images);
            renderButtons(tc.buttons);
            break;
        case 'application/vnd.microsoft.card.signin':
        case 'application/vnd.microsoft.card.receipt':
        default:
            line('.', 60, a.contentType);
            if (a.contentUrl) {
                wrap(a.contentUrl, 60, 3);
            }
            else {
                log(JSON.stringify(a.content));
            }
            break;
    }
}
function renderImages(images) {
    if (images && images.length) {
        line('.', 60, 'images');
        var bullet = images.length > 1 ? '* ' : '';
        for (var i = 0; i < images.length; i++) {
            var img = images[i];
            if (img.alt) {
                wrap(bullet + img.alt + ': ' + img.url, 60, 3);
            }
            else {
                wrap(bullet + img.url, 60, 3);
            }
        }
    }
}
function renderButtons(actions) {
    if (actions && actions.length) {
        line('.', 60, 'buttons');
        var bullet = actions.length > 1 ? '* ' : '';
        for (var i = 0; i < actions.length; i++) {
            var a = actions[i];
            if (a.title == a.value) {
                wrap(bullet + a.title, 60, 3);
            }
            else {
                wrap(bullet + a.title + ' [' + a.value + ']', 60, 3);
            }
        }
    }
}
function line(char, length, title) {
    if (title) {
        var txt = repeat(char, 2);
        txt += '[' + title + ']';
        if (length > txt.length) {
            txt += repeat(char, length - txt.length);
        }
        log(txt);
    }
    else {
        log(repeat(char, length));
    }
}
function wrap(text, length, indent) {
    if (indent === void 0) { indent = 0; }
    var buffer = '';
    var pad = indent ? repeat(' ', indent) : '';
    var tokens = text.split(' ');
    length -= pad.length;
    for (var i = 0; i < tokens.length; i++) {
        var t = tokens[i];
        if (buffer.length) {
            if ((buffer.length + 1 + t.length) > length) {
                log(pad + buffer);
                buffer = t;
            }
            else {
                buffer += ' ' + t;
            }
        }
        else if (t.length < length) {
            buffer = t;
        }
        else {
            log(pad + t);
        }
    }
    if (buffer.length) {
        log(pad + buffer);
    }
}
function repeat(char, length) {
    var txt = '';
    for (var i = 0; i < length; i++) {
        txt += char;
    }
    return txt;
}
function log(text) {
    console.log(text);
}
