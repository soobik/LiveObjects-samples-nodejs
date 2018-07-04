/**
	LiveObjects device simulation
	    - mqtt device mode
		- notifies of connection / disconnection
		- send device config (parameters of each type)
		- send device resources
		- send a command
		- subscribe to device mode topics
		- automatic responds to config/commands/resourceUpdate
		- stdin menu allow to show device configuration, and to plan config/resourceUpdate failure
**/
// requirements
var http = require('http');// download firmware
var mqtt = require('mqtt');
var fs = require('fs');
var log4js = require('log4js');
const readline = require('readline');

// logging
var logger = log4js.getLogger();
logger.setLevel('DEBUG');

// device
var deviceNamespace = "NodeJS";
// Topic Mqtt Device Mode
var topicConfigUpdate = "dev/cfg/upd";
var topicConfig = "dev/cfg";
var topicData = "dev/data";
var topicResource = "dev/rsc";
var topicCommand = "dev/cmd";
var topicCommandRsp = "dev/cmd/res";
var topicResourceUpd = "dev/rsc/upd";
var topicResourceUpdResp = "dev/rsc/upd/res";
var topicResourceUpdErr = "dev/rsc/upd/err";

// number of connect retries allowed
const MAX_CONNECT_RETRIES=2;

// reading arguments
if (process.argv.length < 3) {
	console.log("MQTT script simulating a device: ");
	console.log("");
	console.log("usage: node mqtt-deviceMode.js <serverURL> <apiKey> <deviceId>");
	console.log("   <serverURL>:    URL of MQTT server");
	console.log("                   (ex: 'mqtt://<host>:<port>', 'mqtts://<host>:<port>')");
	console.log("   <apiKey>:       LiveObjects API keys");
	console.log("   <deviceId>:     device identifier (urn will be 'urn:lo:nsid:"+deviceNamespace+":<deviceId>'");
	return;
}
var serverURL = process.argv[2];
var apiKey = process.argv[3];
var deviceId = process.argv[4];

//~ calculated with arguments
var deviceUrn = "urn:lo:nsid:"+deviceNamespace+":"+deviceId;
var nodeResponse = "this is an answer from nodeJs client";

var deviceResources = {
    "rsc": {
        "X11_firmware": {
            "v": "1.2",
            "m": {
                "username": "78723-672-1232"
            }
        },
        "X11_modem_driver": {
            "v": "4.0.M2"
        }
    }
};

var deviceConfig = {
    "cfg": {
        "paramString": {
            "t": "str",
            "v": "DEBUG"
        },
        "paramRaw": {
            "t": "bin",
            "v": "Nzg3ODY4Ng=="
        },
        "paramInt32": {
            "t": "i32",
            "v" : -15
        },
        "paramUInt32": {
            "t": "u32",
            "v" : 0
        },
        "paramFloat": {
            "t": "f64",
            "v" : 15.06
        }
    }
};

var deviceData = {
    "s":   deviceId+"!temp",
    "ts":  "2016-01-01T12:15:02Z",
    "m":   "tempV1",
    "loc": [45.4535, 4.5032],
    "v": {
        "temp":     12.75,
        "humidity": 62.1,
        "gpsFix":   true,
        "gpsSats":   [12, 14, 21]
    }
};

//~ work attributes
var reconnectRetry=0;

var configFailure=0;
var resourceFailure=0;
var withDeviceError = false;


var handledConfig=0;
var handledCommands=0;
var handledResource=0;

// Key input
readline.emitKeypressEvents(process.stdin);
process.stdin.setRawMode(true);

function deviceInfo() {
  console.log("  * urn: " + deviceUrn);
  if ((configFailure+resourceFailure) > 0) {
    console.log("    planned failures : " + configFailure + " cfg, "
    + resourceFailure + " rsc "
    + (withDeviceError ? "(custom error)":""));
  }
  if ((handledConfig+handledCommands+handledResource) > 0) {
    console.log("    handled " + handledConfig + " cfg, " +handledCommands + " cmd " + handledResource + " rsc");
  }
}

function deviceInfoExtra() {
  console.log("  * urn: " + deviceUrn);
  console.log("    config: " + JSON.stringify(deviceConfig));
  console.log("    resources: " + JSON.stringify(deviceResources));
}

function bye() {
    console.log("bye");
    process.exit();
}

function menu() {
  console.log("  * ~~help menu~~");
  console.log("    h  display help menu");
  console.log("    c  add config update failure");
  console.log("    r  add resource update failure");
  console.log("    d  toggle resource update failure custom device error");
  console.log("    i  display device info");
  console.log("    x  display device internal info");
  console.log("    q or <CTRL> + <c>  quit");
}

process.stdin.on('keypress', (str, key) => {
  if ((key.name == 'q')
   || (key && key.ctrl && key.name == 'c')) {
    bye();
  }
  switch (key.name) { // input menu key dispatcher
    case 'h': menu(); break;
    case 'i': deviceInfo(); break;
    case 'x': deviceInfoExtra(); break;
    case 'c': configFailure++; console.log("."); break;
    case 'r': resourceFailure++; console.log("."); break;
    case 'd': withDeviceError = !withDeviceError; console.log("."); break;
    case 'return': break; // ignore
    default : console.log('unknown command ' + key.name);
  }
})

// MQTT connection
logger.info("type 'h' to see help");
logger.info(deviceUrn + " connect to " + serverURL);
var client = mqtt.connect(serverURL, {
	clientId: deviceUrn,
	username: "json+device+key",
	password: apiKey,
	protocolId: 'MQIsdp',
	protocolVersion: 3,
	rejectUnauthorized : false,
	keepAlive:30
});


function subscribeTopic(topic) {
	logger.info("subscribe ["+topic+"]");
	client.subscribe(topic);
}

function publishDeviceResources() {
	var msgResourceStr = JSON.stringify(deviceResources);
	logger.info("["+topicResource+"]> " + msgResourceStr);
	client.publish(topicResource,msgResourceStr);
}

function publishDeviceConfig() {
	var msgConfigStr = JSON.stringify(deviceConfig);
	logger.info("["+topicConfig+"]> " + msgConfigStr);
	client.publish(topicConfig,msgConfigStr);
}

function publishDeviceData() {
	var msgDataStr = JSON.stringify(deviceData);
	logger.info("["+topicData+"]> " + msgDataStr);
	client.publish(topicData,msgDataStr);
}

function downloadFile(resourceId, resourceNewVersion, resourceUrl, resourceSize, resourceMd5, endDownloadCb) {
    logger.debug("download resource "+ resourceId + " version " + resourceNewVersion + " from " + resourceUrl);
    var file = fs.createWriteStream("lastfirmware.raw");
    http.get(resourceUrl, function(response) {
        response.pipe(file);
        file.on('finish', function() {
              logger.debug("download done");
              file.close(endDownloadCb);  // close() is async, call endDownloadCb after close completes.
        });
    });
}

function handleConfigUpdate(message) {

    var request = JSON.parse(message);
    var jsonRequest = JSON.stringify(request);

    logger.info("<["+topicConfigUpdate+"] ", jsonRequest);
    if (configFailure > 0) {

        // hack a wrong value for a requested parameter
        var msgWrongCfg = request;
        var firstParam = Object.keys(request.cfg)[0];
        msgWrongCfg.cfg[firstParam]["v"] = 666;

        var msgWrongCfgStr = JSON.stringify(msgWrongCfg);
        logger.info("FAILED config ["+topicConfig+"]> " + msgWrongCfgStr);
        client.publish(topicConfig, msgWrongCfgStr);
        configFailure--;

    } else { // success

        deviceConfig = request;
        publishDeviceConfig();

    }
    handledConfig++;
}

function handleCommand(message) {

    var request = JSON.parse(message);
    var jsonRequest = JSON.stringify(request)
    logger.info("<["+topicCommand+"] ", jsonRequest)

    var msgCommand = { "res": { "data": nodeResponse }, "cid": request.cid }
    var msgCommandStr = JSON.stringify(msgCommand);

    logger.info("OK result ["+topicCommandRsp+"]>" + msgCommandStr);
    client.publish(topicCommandRsp, msgCommandStr);
    handledCommands++;

}


function handleResourceUpdate(message) {

    var request = JSON.parse(message);
    var jsonRequest = JSON.stringify(request);
    logger.info("<["+topicResourceUpd+"] ", jsonRequest)

    if (resourceFailure > 0) {

      if (withDeviceError) { // device custom details

          var msgDeviceError = { "errorCode": "NY_NODE_JS_UNKNOWN_RESOURCE", "errorDetails": nodeResponse };
          var msgDeviceErrorStr = JSON.stringify(msgDeviceError);
          logger.info("["+topicResourceUpdErr+"]>" + msgDeviceErrorStr);
          client.publish(topicResourceUpdErr, msgDeviceErrorStr);

      } else {

          // one of predefined error
          var possibleErrors = [
            // 2.1 // "UNKNOWN_RESOURCE",
            "INVALID_RESOURCE",
            "WRONG_SOURCE_VERSION",
            "WRONG_TARGET_VERSION",
            "NOT_AUTHORIZED",
            "INTERNAL_ERROR"
          ];
          var randomError = possibleErrors[Math.floor(Math.random()*possibleErrors.length)];

          var msgError = { "res": randomError, "cid": request.cid }
          var msgErrorStr = JSON.stringify(msgError);
          logger.info("FAILED ["+topicResourceUpdResp+"]>" + msgErrorStr);
          client.publish(topicResourceUpdResp, msgErrorStr);
      }

      resourceFailure--;

    } else {

      // good resource update
      var correlationId = request.cid;

      var resourceId = request.id;
      var resourceNewVersion = request.new;
      var resourceUrl = request.m.uri;
      var resourceSize = request.m.size;
      var resourceMd5 = request.m.md5;

      // accept update
      var msgOk = { "res": "OK", "cid": correlationId }
      var msgOkStr = JSON.stringify(msgOk);
      logger.info("OK ["+topicResourceUpdResp+"]>" + msgOkStr);
      client.publish(topicResourceUpdResp, msgOkStr);

      // download resource
      downloadFile(resourceId, resourceNewVersion, resourceUrl, resourceSize, resourceMd5, function() {
          // act version update internally
          deviceResources.rsc[resourceId]["v"] = resourceNewVersion;

          // publish new version
          publishDeviceResources()
      });
    }
    handledResource++;

}

// After connection actions
client.on('connect', function() {
	logger.info("connected");
	reconnectRetry = 0;

    publishDeviceConfig();

    subscribeTopic(topicConfigUpdate);

    publishDeviceData();

    publishDeviceResources();

    subscribeTopic(topicCommand);

    subscribeTopic(topicResourceUpd);
});

// On message actions
client.on('message', function (topic, message) {

	if (topic == topicConfigUpdate) {       // dev/cfg
        handleConfigUpdate(message);
	} else if (topic == topicCommand) {     // dev/cmd
        handleCommand(message);
	} else if (topic == topicResourceUpd){  // dev/rsc/upd
        handleResourceUpdate(message)
	} else {
		logger.error("received unexpected message: <["+topic+"] ", message);
	}

});

client.on('close', function () {
	logger.info("connection closed");
});


// Other callbacks
client.on('suback', function (topic, message) {
	logger.info("subscribed to "+topic);
});

client.on('error', function (error) { // https://nodejs.org/api/errors.html#errors_class_error
    if (error.code) {
	  logger.error("error code:" + error.code + " message:" + error.message);
	} else {
	  logger.error("error:" + error.message);
	}
	if (reconnectRetry >= MAX_CONNECT_RETRIES) {
		logger.error("aborted after : "+MAX_CONNECT_RETRIES+ " retries");
		process.exit(1);
	}
});

client.on('offline', function () {
    // useless // logger.info("offline");
});

client.on('reconnect', function () {
	reconnectRetry++;
	logger.info("reconnect (retry " + reconnectRetry + ")");
});
